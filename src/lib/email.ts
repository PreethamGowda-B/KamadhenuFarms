import nodemailer from 'nodemailer';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER || 'kamadhenuhoneyfarms@gmail.com';
  const pass = process.env.SMTP_PASS || 'narmnawnbgpauxil';

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false, // port 587 uses STARTTLS
        requireTLS: true,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const info = await transporter.sendMail({
        from: `"Kamadhenu Honey Farms Recruitment" <${user}>`,
        to,
        subject,
        html,
      });

      console.log(`[EMAIL DISPATCH SUCCESS] Sent to: ${to} | Subject: ${subject} | MessageID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email Dispatch Error:', error);
      return { success: false };
    }
  }

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
        <h2 style="color: #2E2E2E; font-size: 20px;">Application Received Successfully!</h2>
        <p>Dear <strong>${applicantName}</strong>,</p>
        <p>Thank you for applying for the position of <strong>Sales Executive (Field Sales)</strong> at <strong>Kamadhenu Honey Farms</strong>. We have safely received your profile in our recruitment database.</p>
        
        <div style="background-color: #FDF9F0; border-left: 4px solid #D8A64F; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; font-size: 13px; color: #4A3113;"><strong>Your Application ID:</strong></p>
          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #B6852F;">${applicationNo}</p>
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="https://kamadhenuhoneyfarms.in/track?id=${applicationNo}" style="background-color: #B6852F; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(182, 133, 47, 0.3);">
            Track Application Status Live 🔍
          </a>
        </div>

        <h3 style="color: #B6852F; font-size: 16px; margin-top: 25px;">Recruitment Process & Next Steps:</h3>
        <ol style="line-height: 1.6; color: #4A4A4A; padding-left: 20px;">
          <li>Our HR team will evaluate your retail sales experience and preferred territory.</li>
          <li>If shortlisted, you will be invited for a phone interview within 24–48 hours.</li>
          <li>Upon selection, your formal Offer Letter and Onboarding Pack will be issued.</li>
        </ol>

        <hr style="border: 0; border-top: 1px solid #F3E2B6; margin: 25px 0;" />
        <p style="font-size: 13px; color: #4A4A4A; margin-bottom: 5px;">Need assistance or have questions?</p>
        <p style="font-size: 13px; color: #B6852F; margin: 0;">
          📞 <strong>Phone / WhatsApp:</strong> +91 9980114675 / +91 9535134351<br/>
          ✉️ <strong>Email:</strong> kamadhenuhoneyfarms@gmail.com
        </p>
        <hr style="border: 0; border-top: 1px solid #F3E2B6; margin: 20px 0;" />
        <p style="font-size: 11px; color: #8F6321; text-align: center; margin: 0;">
          Kamadhenu Honey Farms • Cholanayakanahalli, Magadi Main Road, Taverekere, Bangalore Urban, KA 562130
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
      <p><a href="https://admin.kamadhenuhoneyfarms.in/admin/recruitment" style="background: #B6852F; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">View in Admin Dashboard</a></p>
    </div>
  `;
}

export function getHiredSelectionTemplate(applicantName: string, applicationNo: string) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8F5EF; padding: 30px; color: #2E2E2E;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #10B981;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #059669; margin: 0; font-size: 26px;">🎉 Congratulations & Welcome Aboard!</h1>
          <p style="color: #047857; font-size: 14px; margin-top: 5px;">Kamadhenu Honey Farms Field Sales Program</p>
        </div>
        <p>Dear <strong>${applicantName}</strong>,</p>
        <p>We are thrilled to inform you that you have been officially selected as a <strong>Sales Executive (Field Sales)</strong> for <strong>Kamadhenu Honey Farms</strong> (Ref: <strong>${applicationNo}</strong>)!</p>
        
        <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 16px; margin: 20px 0; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; color: #065F46;">Joining Summary & Terms:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #047857;">
            <li><strong>Commission Rate:</strong> ₹100–₹150 per KG (20%–25%) of pure raw honey sold</li>
            <li><strong>Payout Schedule:</strong> Every Monday via Bank Direct Transfer / UPI</li>
            <li><strong>Territory Coverage:</strong> Your registered local area in Karnataka</li>
          </ul>
        </div>

        <h3 style="color: #059669;">Next Steps:</h3>
        <ol style="line-height: 1.6;">
          <li>Expect a WhatsApp message from our regional lead (+91 9980114675) with your digital starter pack.</li>
          <li>Review product details and tasting sample jar delivery.</li>
          <li>Begin accepting customer orders in your locality.</li>
        </ol>

        <p>We look forward to a successful and prosperous partnership!</p>
        <p>Warm regards,<br/><strong>Recruitment Team</strong><br/>Kamadhenu Honey Farms</p>
      </div>
    </div>
  `;
}

export function getPoliteRejectionTemplate(applicantName: string, applicationNo: string) {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #F9FAFB; padding: 30px; color: #374151;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; border: 1px solid #E5E7EB;">
        <h2 style="color: #1F2937; margin-top: 0;">Application Status Update (${applicationNo})</h2>
        <p>Dear <strong>${applicantName}</strong>,</p>
        <p>Thank you for your interest in joining Kamadhenu Honey Farms as a Sales Executive (Field Sales) and taking the time to submit your credentials.</p>
        <p>After a thorough review of our current territory coverage and distribution capacity, we regret to inform you that we are unable to advance your application at this time.</p>
        <p>We will retain your application in our talent database should suitable opportunities open up in your region in the future.</p>
        <p>We sincerely appreciate your interest in our farm and wish you great success in your career endeavors.</p>
        <p>Sincerely,<br/><strong>Recruitment Team</strong><br/>Kamadhenu Honey Farms</p>
      </div>
    </div>
  `;
}

export function getInterviewScheduleTemplate(applicantName: string, applicationNo: string, date: string, time: string, locationOrLink: string) {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #FFFBEB; padding: 30px; color: #1E293B;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; padding: 30px; border: 1px solid #FCD34D;">
        <h2 style="color: #D97706; margin-top: 0;">🗓️ Phone Interview Scheduled (${applicationNo})</h2>
        <p>Dear <strong>${applicantName}</strong>,</p>
        <p>We are pleased to invite you for a 10-minute screening interview for the <strong>Sales Agent</strong> position at Kamadhenu Honey Farms.</p>

        <div style="background: #FEF3C7; border-left: 4px solid #D97706; padding: 15px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 0 0 6px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 0 0 6px 0;"><strong>Time:</strong> ${time}</p>
          <p style="margin: 0 0 6px 0;"><strong>Location / Link:</strong> ${locationOrLink}</p>
          <p style="margin: 0;"><strong>Hiring Lead:</strong> Kamadhenu HR Lead (+91 9980114675)</p>
        </div>

        <p>Please ensure you are available at the specified time. If you need to reschedule, please reply to this email.</p>
        <p>Best regards,<br/><strong>Kamadhenu Honey Farms Recruitment Team</strong></p>
      </div>
    </div>
  `;
}
