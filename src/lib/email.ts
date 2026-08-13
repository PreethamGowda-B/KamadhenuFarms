import nodemailer from 'nodemailer';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail({ to, subject, html, attachments }: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
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
        attachments,
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
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 35px; border: 1.5px solid #EACF8C; box-shadow: 0 12px 35px rgba(182, 133, 47, 0.12);">
        
        <!-- Header Banner -->
        <div style="text-align: center; margin-bottom: 25px; background: linear-gradient(135deg, #FAF6EE 0%, #FFFDF9 100%); padding: 20px; border-radius: 14px; border: 1px solid #F3E2B6;">
          <h1 style="color: #B6852F; margin: 0; font-size: 28px; font-family: Georgia, serif;">🍯 Kamadhenu Honey Farms</h1>
          <p style="color: #6A471A; font-size: 13px; margin-top: 6px; font-weight: 600; letter-spacing: 0.5px;">Pure Raw Honey • Direct From Beekeepers</p>
        </div>

        <h2 style="color: #2E2E2E; font-size: 22px; font-family: Georgia, serif; text-align: center; margin: 20px 0 10px 0;">Application Received Successfully! 🎉</h2>
        
        <p style="font-size: 14px; line-height: 1.6; color: #4A4A4A;">Dear <strong>${applicantName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #4A4A4A;">Thank you for applying for the position of <strong>Sales Executive (Field Sales)</strong> at <strong>Kamadhenu Honey Farms</strong>. We have safely logged your application in our recruitment portal.</p>
        
        <!-- Application Reference Box -->
        <div style="background-color: #FDF9F0; border-left: 5px solid #D8A64F; padding: 18px 20px; margin: 25px 0; border-radius: 10px; border: 1px solid #F3E7D0;">
          <p style="margin: 0; font-size: 12px; color: #8F6321; text-transform: uppercase; font-weight: bold;">Generated Application ID</p>
          <p style="margin: 6px 0 0 0; font-size: 28px; font-weight: bold; color: #B6852F; letter-spacing: 1px; font-family: monospace;">${applicationNo}</p>
        </div>

        <!-- Live Track Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://kamadhenuhoneyfarms.in/track?id=${applicationNo}" style="background: linear-gradient(135deg, #D8A64F 0%, #B6852F 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: bold; font-size: 15px; box-shadow: 0 6px 18px rgba(182, 133, 47, 0.35);">
            Track Application Status Live 🔍
          </a>
        </div>

        <!-- Next Steps -->
        <div style="background: #FAF8F5; padding: 20px; border-radius: 12px; border: 1px solid #F0E6D2; margin: 25px 0;">
          <h3 style="color: #B6852F; font-size: 15px; margin: 0 0 12px 0; font-family: Georgia, serif;">Recruitment Process & Next Steps:</h3>
          <ol style="line-height: 1.7; color: #4A4A4A; padding-left: 20px; margin: 0; font-size: 13px;">
            <li>Our recruitment lead will review your local grocery retail network experience.</li>
            <li>If shortlisted, you will be invited for a phone interview within 24–48 hours.</li>
            <li>Upon selection, your formal Offer Letter & Complete Onboarding Pack will be issued.</li>
          </ol>
        </div>

        <hr style="border: 0; border-top: 1px solid #F3E2B6; margin: 30px 0 20px 0;" />
        
        <!-- Contact Details Footer -->
        <p style="font-size: 13px; color: #4A4A4A; margin-bottom: 6px;">Need assistance or have questions?</p>
        <p style="font-size: 13px; color: #B6852F; margin: 0; line-height: 1.6;">
          📞 <strong>Phone / WhatsApp:</strong> +91 9980114675 / +91 9535134351<br/>
          ✉️ <strong>Email:</strong> kamadhenuhoneyfarms@gmail.com
        </p>

        <hr style="border: 0; border-top: 1px solid #F3E2B6; margin: 20px 0;" />
        
        <p style="font-size: 11px; color: #8F6321; text-align: center; margin: 0; line-height: 1.5;">
          <strong>Kamadhenu Honey Farms</strong><br/>
          Cholanayakanahalli, Magadi Main Road, Taverekere, Bangalore Urban, KA - 562130
        </p>
      </div>
    </div>
  `;
}

export function getAdminNotificationTemplate(applicantName: string, applicationNo: string, city: string, phone: string) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8F5EF; padding: 25px; color: #2E2E2E;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1.5px solid #D8A64F; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
        <div style="text-align: center; margin-bottom: 20px; background: #FAF6EE; padding: 15px; border-radius: 12px;">
          <h2 style="color: #B6852F; margin: 0; font-size: 22px; font-family: Georgia, serif;">🚨 New Candidate Application Alert</h2>
          <p style="color: #6A471A; font-size: 13px; margin: 4px 0 0 0;">Kamadhenu Honey Farms Recruitment Portal</p>
        </div>
        <p style="font-size: 14px; color: #4A4A4A;">A new candidate has submitted their application for <strong>Sales Executive (Field Sales)</strong>:</p>
        <div style="background-color: #FDF9F0; border-left: 4px solid #D8A64F; padding: 16px; margin: 20px 0; border-radius: 8px; font-size: 13px; line-height: 1.8;">
          <p style="margin: 0;"><strong>Candidate Name:</strong> ${applicantName}</p>
          <p style="margin: 0;"><strong>Application Ref No:</strong> <span style="font-family: monospace; font-weight: bold; color: #B6852F;">${applicationNo}</span></p>
          <p style="margin: 0;"><strong>City / Region:</strong> ${city}</p>
          <p style="margin: 0;"><strong>Phone Number:</strong> ${phone}</p>
        </div>
        <div style="text-align: center; margin-top: 25px;">
          <a href="https://admin.kamadhenuhoneyfarms.in/admin/recruitment" style="background: #B6852F; color: #ffffff; padding: 12px 26px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold; font-size: 14px;">
            Open Admin Dashboard 🛡️
          </a>
        </div>
      </div>
    </div>
  `;
}

export function getHiredSelectionTemplate(applicantName: string, applicationNo: string) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8F5EF; padding: 30px; color: #2E2E2E;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 35px; border: 1.5px solid #10B981; box-shadow: 0 12px 35px rgba(16, 185, 129, 0.12);">
        
        <div style="text-align: center; margin-bottom: 25px; background: linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%); padding: 20px; border-radius: 14px; border: 1px solid #A7F3D0;">
          <h1 style="color: #059669; margin: 0; font-size: 26px; font-family: Georgia, serif;">🎉 Congratulations & Welcome Aboard!</h1>
          <p style="color: #047857; font-size: 13px; margin-top: 6px; font-weight: 600;">Kamadhenu Honey Farms Field Sales Program</p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #4A4A4A;">Dear <strong>${applicantName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #4A4A4A;">We are thrilled to inform you that you have been officially selected as a <strong>Sales Executive (Field Sales)</strong> for <strong>Kamadhenu Honey Farms</strong> (Ref: <strong>${applicationNo}</strong>)!</p>
        
        <div style="background-color: #ECFDF5; border-left: 5px solid #10B981; padding: 18px; margin: 25px 0; border-radius: 10px; border: 1px solid #A7F3D0;">
          <h4 style="margin: 0 0 10px 0; color: #065F46; font-size: 15px; font-family: Georgia, serif;">Key Joining Summary & Remuneration:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #047857; line-height: 1.8;">
            <li><strong>Role / Designation:</strong> Sales Executive (Field Sales)</li>
            <li><strong>Commission Rate:</strong> ₹100 – ₹150 per KG (20% – 25%) of Pure Raw Honey sold</li>
            <li><strong>Payout Schedule:</strong> Every Monday via Bank Direct Transfer / UPI</li>
            <li><strong>Territory Coverage:</strong> Your registered local grocery retail area</li>
            <li><strong>Authorization Period:</strong> 6 Calendar Months</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://kamadhenuhoneyfarms.in/track?id=${applicationNo}" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: bold; font-size: 15px; box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);">
            View Onboarding Pack & Documents 📄
          </a>
        </div>

        <h3 style="color: #059669; font-size: 15px; margin-top: 25px; font-family: Georgia, serif;">Next Onboarding Steps:</h3>
        <ol style="line-height: 1.7; color: #4A4A4A; padding-left: 20px; font-size: 13px;">
          <li>Expect a WhatsApp message from our regional onboarding lead (+91 9980114675) with your digital product starter kit.</li>
          <li>Review product samples, price catalogues, and retail store pitch scripts.</li>
          <li>Begin booking honey orders from local retail and grocery stores.</li>
        </ol>

        <hr style="border: 0; border-top: 1px solid #A7F3D0; margin: 30px 0 20px 0;" />
        <p style="font-size: 13px; color: #4A4A4A; margin-bottom: 5px;">Need support from HR?</p>
        <p style="font-size: 13px; color: #059669; margin: 0; line-height: 1.6;">
          📞 <strong>Phone / WhatsApp:</strong> +91 9980114675 / +91 9535134351<br/>
          ✉️ <strong>Email:</strong> kamadhenuhoneyfarms@gmail.com
        </p>

        <hr style="border: 0; border-top: 1px solid #A7F3D0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #065F46; text-align: center; margin: 0;">
          <strong>Kamadhenu Honey Farms</strong> • Cholanayakanahalli, Magadi Main Road, Taverekere, Bangalore Urban, KA 562130
        </p>
      </div>
    </div>
  `;
}

export function getPoliteRejectionTemplate(applicantName: string, applicationNo: string) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #F9FAFB; padding: 30px; color: #374151;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #E5E7EB; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px; background: #F3F4F6; padding: 15px; border-radius: 12px;">
          <h2 style="color: #1F2937; margin: 0; font-size: 20px; font-family: Georgia, serif;">Application Status Update</h2>
          <p style="color: #6B7280; font-size: 12px; margin-top: 4px;">Ref No: ${applicationNo}</p>
        </div>
        <p style="font-size: 14px; line-height: 1.6;">Dear <strong>${applicantName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6;">Thank you for your interest in joining <strong>Kamadhenu Honey Farms</strong> as a <strong>Sales Executive (Field Sales)</strong> and for taking the time to submit your profile.</p>
        <p style="font-size: 14px; line-height: 1.6;">After a careful review of our current regional territory requirements and distribution capacity, we regret to inform you that we are unable to advance your application at this time.</p>
        <p style="font-size: 14px; line-height: 1.6;">We will keep your application on file should suitable field sales openings arise in your locality in the future.</p>
        <p style="font-size: 14px; line-height: 1.6;">We appreciate your interest in our farm and wish you the very best in your professional endeavors.</p>
        <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 25px 0 15px 0;" />
        <p style="font-size: 12px; color: #6B7280; margin: 0;">
          Sincerely,<br/>
          <strong>Recruitment Team</strong><br/>
          Kamadhenu Honey Farms
        </p>
      </div>
    </div>
  `;
}

export function getInterviewScheduleTemplate(applicantName: string, applicationNo: string, date: string, time: string, locationOrLink: string) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #FFFBEB; padding: 30px; color: #1E293B;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 32px; border: 1.5px solid #FCD34D; box-shadow: 0 10px 30px rgba(217, 119, 6, 0.1);">
        <div style="text-align: center; margin-bottom: 20px; background: #FEF3C7; padding: 16px; border-radius: 12px;">
          <h2 style="color: #D97706; margin: 0; font-size: 22px; font-family: Georgia, serif;">🗓️ Screening Interview Scheduled</h2>
          <p style="color: #92400E; font-size: 13px; margin: 4px 0 0 0;">Application Ref: ${applicationNo}</p>
        </div>
        <p style="font-size: 14px; line-height: 1.6;">Dear <strong>${applicantName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6;">We are pleased to invite you for a 10-minute screening interview for the <strong>Sales Executive (Field Sales)</strong> position at Kamadhenu Honey Farms.</p>

        <div style="background: #FFFBEB; border-left: 5px solid #D97706; padding: 18px; margin: 25px 0; border-radius: 10px; border: 1px solid #FCD34D; font-size: 13px; line-height: 1.8;">
          <p style="margin: 0;">📅 <strong>Date:</strong> ${date}</p>
          <p style="margin: 0;">⏰ <strong>Time:</strong> ${time}</p>
          <p style="margin: 0;">📍 <strong>Mode / Location:</strong> ${locationOrLink}</p>
          <p style="margin: 0;">📞 <strong>Hiring Lead:</strong> Kamadhenu HR Lead (+91 9980114675)</p>
        </div>

        <p style="font-size: 14px; line-height: 1.6;">Please ensure you are available at the scheduled time. If you need to reschedule, please reply to this email or contact us via WhatsApp.</p>
        <hr style="border: 0; border-top: 1px solid #FCD34D; margin: 25px 0 15px 0;" />
        <p style="font-size: 12px; color: #92400E; margin: 0;">
          Best regards,<br/>
          <strong>Recruitment Team</strong><br/>
          Kamadhenu Honey Farms
        </p>
      </div>
    </div>
  `;
}
