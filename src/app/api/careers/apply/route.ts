import { NextRequest, NextResponse } from 'next/server';
import { fullApplicationSchema } from '@/lib/validations/application';
import { addApplicationStore, findDuplicateApplication } from '@/lib/store';
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

    // 2. Duplicate Check
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

    // 3. Save Application Record
    const newRecord = addApplicationStore(data);

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
