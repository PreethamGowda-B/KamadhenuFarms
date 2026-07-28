import { NextRequest, NextResponse } from 'next/server';
import { fullApplicationSchema } from '@/lib/validations/application';
import { addApplicationStore, findDuplicateApplication } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { sendEmail, getApplicantConfirmationTemplate, getAdminNotificationTemplate } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Zod Validation
    const validationResult = fullApplicationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    let newRecord: any = null;

    // 2. Database Sync: Use Prisma PostgreSQL if DATABASE_URL is set
    if (process.env.DATABASE_URL) {
      try {
        const existing = await prisma.application.findFirst({
          where: {
            OR: [
              { mobileNumber: data.mobileNumber },
              { email: data.email.toLowerCase() },
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

        const count = await prisma.application.count();
        const numStr = String(count + 1).padStart(3, '0');
        const applicationNo = `KHF-2026-${numStr}`;

        const created = await prisma.application.create({
          data: {
            applicationNo,
            fullName: data.fullName,
            mobileNumber: data.mobileNumber,
            whatsAppNumber: data.whatsAppNumber || data.mobileNumber,
            email: data.email.toLowerCase(),
            gender: data.gender,
            age: Number(data.age),
            city: data.city,
            state: data.state,
            pinCode: data.pinCode,
            hasBike: Boolean(data.hasBike),
            hasDrivingLicense: Boolean(data.hasDrivingLicense),
            salesExperience: data.salesExperience,
            currentOccupation: data.currentOccupation,
            languagesKnown: data.languagesKnown || [],
            preferredSalesArea: data.preferredSalesArea,
            resumeUrl: data.resumeUrl || null,
            aadhaarUrl: data.aadhaarUrl || null,
            profilePhotoUrl: data.profilePhotoUrl || null,
            whyJoin: data.whyJoin,
            declarationAccepted: Boolean(data.declarationAccepted),
            status: 'APPLIED',
          },
        });

        newRecord = {
          ...created,
          notes: [],
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        };
      } catch (dbErr) {
        console.error('Prisma DB insert failed, falling back to store:', dbErr);
      }
    }

    // 3. Fallback to Local Store if Prisma not connected
    if (!newRecord) {
      const isDuplicate = findDuplicateApplication(data.mobileNumber, data.email);
      if (isDuplicate) {
        return NextResponse.json(
          {
            success: false,
            message: 'An application with this mobile number or email address has already been submitted.',
          },
          { status: 409 }
        );
      }

      newRecord = addApplicationStore(data);
    } else {
      // Also update store for memory cache
      addApplicationStore(data);
    }

    // 4. Send Confirmation Email to Applicant
    const applicantEmailHtml = getApplicantConfirmationTemplate(data.fullName, newRecord.applicationNo);
    await sendEmail({
      to: data.email,
      subject: `Application Received (${newRecord.applicationNo}) - Kamadhenu Honey Farms`,
      html: applicantEmailHtml,
    });

    // 5. Send Alert Email to Recruitment HQ
    const adminEmailHtml = getAdminNotificationTemplate(data.fullName, newRecord.applicationNo, data.city, data.mobileNumber);
    await sendEmail({
      to: 'careers@kamadhenuhoneyfarms.com',
      subject: `🚨 New Candidate Application: ${data.fullName} (${data.city})`,
      html: adminEmailHtml,
    });

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
        message: 'Internal server error while processing application',
      },
      { status: 500 }
    );
  }
}
