import { NextRequest, NextResponse } from 'next/server';
import { fullApplicationSchema } from '@/lib/validations/application';
import { addApplicationStore, findDuplicateApplication } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { sendEmail, getApplicantConfirmationTemplate, getAdminNotificationTemplate } from '@/lib/email';
import { checkRateLimitDistributed, getClientIp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // 1. Rate Limiting Check (Distributed via Upstash Redis when configured)
    const rate = await checkRateLimitDistributed(`careers_apply:${ip}`, 5, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many job application attempts. Please wait 10 minutes before submitting again.',
        },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 2. Zod Schema Validation
    const validationResult = fullApplicationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed. Please fill out all required fields correctly.',
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 2b. Reject base64 data URLs — files must be uploaded to Cloudinary first
    // A base64 data URL would make the body 3–6MB, exceeding Vercel's 4.5MB limit
    const isDataUrl = (url?: string | null) => url?.startsWith('data:');
    if (isDataUrl(data.resumeUrl) || isDataUrl(data.aadhaarUrl) || isDataUrl(data.profilePhotoUrl)) {
      return NextResponse.json(
        {
          success: false,
          message: 'File upload failed. Please re-upload your documents and try submitting again.',
        },
        { status: 400 }
      );
    }

    const cleanEmail = data.email.toLowerCase().trim();
    const cleanMobile = data.mobileNumber.trim();
    const cleanWhatsApp = (data.whatsAppNumber || data.mobileNumber).trim();

    let newRecord: any = null;

    // 3. Database Insertion with Concurrency-Safe Sequence & Retry Logic
    if (process.env.DATABASE_URL) {
      try {
        const existing = await prisma.application.findFirst({
          where: {
            OR: [
              { mobileNumber: cleanMobile },
              { email: cleanEmail },
            ],
          },
        });

        if (existing) {
          return NextResponse.json(
            {
              success: false,
              message: 'An application with this mobile number or email address has already been submitted.',
            },
            { status: 409 }
          );
        }

        // Retry loop for thread-safe Application ID creation under high concurrency
        let created = null;
        let attempts = 0;
        const maxAttempts = 5;

        while (!created && attempts < maxAttempts) {
          attempts++;
          const count = await prisma.application.count();
          const nextVal = count + attempts;
          const numStr = String(nextVal).padStart(3, '0');
          const applicationNo = `KHF-2026-${numStr}`;

          try {
            created = await prisma.application.create({
              data: {
                applicationNo,
                fullName: data.fullName.trim(),
                mobileNumber: cleanMobile,
                whatsAppNumber: cleanWhatsApp,
                email: cleanEmail,
                gender: data.gender,
                age: Number(data.age),
                city: data.city.trim(),
                state: data.state.trim(),
                pinCode: data.pinCode.trim(),
                hasBike: Boolean(data.hasBike),
                hasDrivingLicense: Boolean(data.hasDrivingLicense),
                salesExperience: data.salesExperience,
                currentOccupation: data.currentOccupation.trim(),
                languagesKnown: data.languagesKnown || [],
                preferredSalesArea: data.preferredSalesArea.trim(),
                resumeUrl: data.resumeUrl || null,
                aadhaarUrl: data.aadhaarUrl || null,
                profilePhotoUrl: data.profilePhotoUrl || null,
                whyJoin: (data.whyJoin || '').trim(),
                declarationAccepted: Boolean(data.declarationAccepted),
                status: 'APPLIED',
              },
            });
          } catch (createErr: any) {
            // Unique constraint violation on applicationNo, retry
            if (createErr?.code === 'P2002' && attempts < maxAttempts) {
              continue;
            }
            throw createErr;
          }
        }

        if (created) {
          newRecord = {
            ...created,
            notes: [],
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
          };
        }
      } catch (dbErr) {
        console.error('Prisma DB insert failed, falling back to persistent store:', dbErr);
      }
    }

    // 4. Fallback to Local Store if DB insert was skipped or failed
    if (!newRecord) {
      const isDuplicate = findDuplicateApplication(cleanMobile, cleanEmail);
      if (isDuplicate) {
        return NextResponse.json(
          {
            success: false,
            message: 'An application with this mobile number or email address has already been submitted.',
          },
          { status: 409 }
        );
      }

      newRecord = addApplicationStore({
        ...data,
        fullName: data.fullName.trim(),
        email: cleanEmail,
        mobileNumber: cleanMobile,
        whatsAppNumber: cleanWhatsApp,
        city: data.city.trim(),
        state: data.state.trim(),
        pinCode: data.pinCode.trim(),
        currentOccupation: data.currentOccupation.trim(),
        preferredSalesArea: data.preferredSalesArea.trim(),
        whyJoin: (data.whyJoin || '').trim(),
      });
    } else {
      // Sync local store cache
      addApplicationStore({
        ...data,
        fullName: data.fullName.trim(),
        email: cleanEmail,
        mobileNumber: cleanMobile,
        whatsAppNumber: cleanWhatsApp,
        city: data.city.trim(),
        state: data.state.trim(),
        pinCode: data.pinCode.trim(),
        currentOccupation: data.currentOccupation.trim(),
        preferredSalesArea: data.preferredSalesArea.trim(),
        whyJoin: (data.whyJoin || '').trim(),
      });
    }

    // 5. Asynchronous Non-Blocking Email Notifications
    Promise.allSettled([
      sendEmail({
        to: cleanEmail,
        subject: `Application Received (${newRecord.applicationNo}) - Kamadhenu Honey Farms`,
        html: getApplicantConfirmationTemplate(data.fullName, newRecord.applicationNo),
      }),
      sendEmail({
        to: process.env.ADMIN_NOTIFICATION_EMAIL || 'kamadhenuhoneyfarms@gmail.com',
        subject: `🚨 New Candidate Application: ${data.fullName} (${data.city})`,
        html: getAdminNotificationTemplate(data.fullName, newRecord.applicationNo, data.city, cleanMobile),
      }),
    ]).catch((err) => console.error('Error dispatching background emails:', err));

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      data: newRecord,
    });
  } catch (error: any) {
    console.error('API /api/careers/apply error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while processing application. Please try again.',
      },
      { status: 500 }
    );
  }
}

