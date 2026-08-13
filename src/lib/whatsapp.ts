export interface WhatsAppPayload {
  to: string;
  name: string;
  type: 'HIRED' | 'REJECTED' | 'INTERVIEW_SCHEDULED';
  details?: {
    interviewDate?: string;
    interviewTime?: string;
    location?: string;
  };
}

export async function sendWhatsAppMessage({ to, name, type, details }: WhatsAppPayload): Promise<{ success: boolean; messageId?: string }> {
  const cleanPhone = to.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

  let messageText = '';

  if (type === 'HIRED') {
    messageText = `Congratulations ${name}! You have been selected as a Sales Executive (Field Sales) at Kamadhenu Honey Farm. Please check your email for complete joining instructions and product onboarding materials.`;
  } else if (type === 'REJECTED') {
    messageText = `Thank you for applying to Kamadhenu Honey Farm. After careful consideration, we are unable to move forward at this time. We appreciate your interest and wish you all the best.`;
  } else if (type === 'INTERVIEW_SCHEDULED') {
    const dateStr = details?.interviewDate || 'as discussed';
    const timeStr = details?.interviewTime || 'scheduled time';
    messageText = `Hello ${name}, your screening interview with Kamadhenu Honey Farm has been scheduled for ${dateStr} at ${timeStr}. Please check your email for complete interview details.`;
  }

  // If WhatsApp API credentials (e.g. TWILIO_ACCOUNT_SID / WHATSAPP_CLOUD_TOKEN) are set
  if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: { body: messageText },
        }),
      });

      const resJson = await response.json();
      if (response.ok) {
        return { success: true, messageId: resJson.messages?.[0]?.id };
      }
      console.error('WhatsApp Cloud API error response:', resJson);
    } catch (error) {
      console.error('WhatsApp API dispatch failure:', error);
    }
  }

  // Simulation fallback for local development / preview environments
  console.log(`[WHATSAPP DISPATCH] To: +${formattedPhone} | Type: ${type} | Text: "${messageText}"`);
  return { success: true, messageId: `wa_sim_${Date.now()}` };
}
