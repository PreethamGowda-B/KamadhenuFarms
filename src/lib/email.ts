import nodemailer from 'nodemailer';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
  // If SMTP environment variables are configured, send real email
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: '"Kamadhenu Honey Farms Recruitment" <careers@kamadhenuhoneyfarms.com>',
        to,
        subject,
        html,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email Dispatch Error:', error);
      return { success: false };
    }
  }

  // Graceful fallback for local development / demo mode
  console.log(`[EMAIL SIMULATION] Sent to: ${to} | Subject: ${subject}`);
  return { success: true, messageId: `sim_${Date.now()}` };
}

export function getApplicantConfirmationTemplate(applicantName: string, applicationNo: string) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8F5EF; padding: 30px; color: #2E2E2E;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #EACF8C; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #B6852F; margin: 0; font-size: 26px;">🍯 Kamadhenu Honey Farms</h1>
          <p style="color: #6A471A; font-size: 14px; margin-top: 5px;">Pure Raw Honey Direct From Beekeepers</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #F3E2B6; margin: 20px 0;" />
        <h2 style="color: #2E2E2E; font-size: 20px;">Application Received!</h2>
        <p>Dear <strong>${applicantName}</strong>,</p>
        <p>Thank you for applying to join the <strong>Kamadhenu Honey Farm Sales Partner Network</strong>. We have successfully received your application!</p>
        <div style="background-color: #FDF9F0; border-left: 4px solid #D8A64F; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #4A3113;"><strong>Application Reference Number:</strong></p>
          <p style="margin: 5px 0 0 0; font-size: 22px; font-weight: bold; color: #B6852F;">${applicationNo}</p>
        </div>
        <h3 style="color: #B6852F; font-size: 16px;">Next Steps:</h3>
        <ol style="line-height: 1.6; color: #4A4A4A;">
          <li>Our recruitment team will review your credentials and sales background.</li>
          <li>If shortlisted, you will receive a phone interview invitation within 24-48 hours.</li>
          <li>Upon selection, product onboarding and sales materials will be dispatched.</li>
        </ol>
        <p>If you have any urgent queries, reply to this email or WhatsApp us at <strong>+91 9980114675</strong>.</p>
        <hr style="border: 0; border-top: 1px solid #F3E2B6; margin: 25px 0;" />
        <p style="font-size: 12px; color: #8F6321; text-align: center; margin: 0;">
          Kamadhenu Honey Farms • Cholanayakanahalli, Magadi Main Road, Bangalore, KA 562130
        </p>
      </div>
    </div>
  `;
}

export function getAdminNotificationTemplate(applicantName: string, applicationNo: string, city: string, phone: string) {
  return `
    <div style="font-family: Arial, sans-serif; background: #ffffff; padding: 20px; border: 1px solid #D8A64F; border-radius: 8px;">
      <h2 style="color: #B6852F; margin-top: 0;">🚨 New Candidate Application Received</h2>
      <p>A new application has been submitted to the Kamadhenu Careers portal.</p>
      <ul>
        <li><strong>Candidate Name:</strong> ${applicantName}</li>
        <li><strong>Application No:</strong> ${applicationNo}</li>
        <li><strong>City / Location:</strong> ${city}</li>
        <li><strong>Phone Number:</strong> ${phone}</li>
      </ul>
      <p><a href="https://kamadhenuhoneyfarms.com/admin/recruitment" style="background: #B6852F; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">View in Admin Dashboard</a></p>
    </div>
  `;
}
