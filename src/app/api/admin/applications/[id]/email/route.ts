import { NextRequest, NextResponse } from 'next/server';
import { getApplicationsStore } from '@/lib/store';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    const { type } = body;

    const apps = getApplicationsStore();
    const app = apps.find((a) => a.id === id);

    if (!app) {
      return NextResponse.json({ success: false, message: 'Candidate not found' }, { status: 404 });
    }

    let subject = '';
    let html = '';

    if (type === 'interview') {
      subject = `Phone Interview Invitation - Kamadhenu Honey Farms (${app.applicationNo})`;
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #D8A64F; border-radius: 8px;">
          <h2 style="color: #B6852F;">Phone Screening Interview Invitation</h2>
          <p>Dear ${app.fullName},</p>
          <p>We were impressed by your background and sales interest. We would like to invite you for a 10-minute phone screening interview for the <strong>Sales Agent</strong> role.</p>
          <p>Our hiring manager will call you at <strong>${app.mobileNumber}</strong> within the next 24 hours.</p>
          <p>Best regards,<br/>Kamadhenu Honey Farms Recruitment Team</p>
        </div>
      `;
    } else if (type === 'select') {
      subject = `Congratulations! Selected as Sales Partner - Kamadhenu Honey Farms`;
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #10B981; border-radius: 8px;">
          <h2 style="color: #059669;">🎉 Congratulations ${app.fullName}!</h2>
          <p>You have been officially selected to join the <strong>Kamadhenu Honey Farm Sales Partner Network</strong>!</p>
          <p>Your flat commission rate is <strong>₹100 per KG</strong> with weekly Monday payouts.</p>
          <p>Our onboarding team will send your Partner ID and product catalog materials via WhatsApp shortly.</p>
          <p>Welcome aboard!<br/>Kamadhenu Honey Farms</p>
        </div>
      `;
    } else if (type === 'reject') {
      subject = `Update regarding your Sales Agent Application - Kamadhenu Honey Farms`;
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #E5E7EB; border-radius: 8px;">
          <h2>Application Status Update</h2>
          <p>Dear ${app.fullName},</p>
          <p>Thank you for taking the time to apply for the Sales Agent position with Kamadhenu Honey Farms.</p>
          <p>After reviewing our current territory requirements, we regret to inform you that we are unable to move forward with your application at this time. We will keep your profile on file for future openings.</p>
          <p>We wish you all the best in your future endeavors.</p>
        </div>
      `;
    }

    const result = await sendEmail({ to: app.email, subject, html });

    return NextResponse.json({
      success: true,
      message: 'Email dispatched',
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Email failure' }, { status: 500 });
  }
}
