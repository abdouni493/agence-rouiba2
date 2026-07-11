// @ts-nocheck - Vercel runtime types
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
    res.status(200).send('ok');
    return;
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;

    // Validate required fields
    if (!payload.email || !payload.pdfBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email or pdfBase64',
      });
    }

    console.log(`📧 Processing email for: ${payload.email}`);
    console.log(`📄 Document Type: ${payload.documentType}`);
    console.log(`👤 Language: ${payload.language}`);

    // BREVO EMAIL SERVICE INTEGRATION
    const BREVO_API_KEY = process.env.BREVO_API_KEY;

    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY not configured');
    }

    // Build document type label
    const documentTypeLabels: Record<string, Record<string, string>> = {
      contract: { fr: 'Contrat de Location', ar: 'عقد التأجير' },
      inspection: { fr: "Rapport d'Inspection", ar: 'تقرير فحص المركبة' },
      engagement: { fr: "Lettre d'Engagement", ar: 'رسالة الالتزام' },
      recu: { fr: 'Reçu de Paiement', ar: 'إيصال الدفع' },
      facture: { fr: 'Facture', ar: 'الفاتورة' },
      devis: { fr: 'Devis', ar: 'عرض الأسعار' },
    };

    const docType = payload.documentType || 'contract';
    const docLabel =
      documentTypeLabels[docType]?.[payload.language || 'fr'] ||
      documentTypeLabels['contract'][payload.language || 'fr'];

    console.log('📤 Sending email via Brevo API with PDF attachment...');

    // Send email using Brevo SMTP Send API with PDF attachment
    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'AUTO LOCATION',
          email: payload.sender || 'noreply@autolocation.com',
        },
        to: [
          {
            email: payload.email,
          },
        ],
        subject:
          payload.language === 'fr'
            ? `${docLabel} - AUTO LOCATION`
            : `${docLabel} - AUTO LOCATION`,
        htmlContent: `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #2d7a4d; margin: 0;">AUTO LOCATION</h2>
    </div>
    <p style="font-size: 14px;">
      ${
        payload.language === 'fr'
          ? `Bonjour ${payload.clientName},<br><br>Veuillez trouver ci-joint votre ${docLabel.toLowerCase()} en format PDF.<br><br>Cordialement,<br>AUTO LOCATION`
          : `مرحبا ${payload.clientName},<br><br>يرجى العثور على ${docLabel} الخاص بك في المرفق بصيغة PDF.<br><br>مع أطيب التحيات,<br>أوتو لوكيشن`
      }
    </p>
  </div>
</body>
</html>
        `,
        attachment: [
          {
            content: payload.pdfBase64,
            name: `${docType}_${payload.reservationId}.pdf`,
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('❌ Brevo API error:', emailResponse.status, errorText);
      throw new Error(`Brevo API error: ${emailResponse.status} - ${errorText}`);
    }

    const emailData = await emailResponse.json();

    console.log('✅ Email with PDF attachment sent successfully via Brevo!');
    console.log('📧 Message ID:', emailData.messageId);

    // Always send a copy to the fixed internal address
    const COPY_EMAIL = 'icarmhd@gmail.com';
    console.log(`📤 Sending copy to ${COPY_EMAIL}`);
    const copyResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'AUTO LOCATION',
          email: payload.sender || 'noreply@autolocation.com',
        },
        to: [{ email: COPY_EMAIL }],
        subject:
          payload.language === 'fr'
            ? `[Copie] ${docLabel} - ${payload.clientName}`
            : `[نسخة] ${docLabel} - ${payload.clientName}`,
        htmlContent: `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #2d7a4d; margin: 0;">AUTO LOCATION</h2>
    </div>
    <p style="font-size: 14px;">
      ${
        payload.language === 'fr'
          ? `Copie de l'email envoyé à ${payload.clientName} (${payload.email}).<br><br>Veuillez trouver ci-joint le ${docLabel.toLowerCase()} en format PDF.`
          : `نسخة من البريد المرسل إلى ${payload.clientName} (${payload.email}).<br><br>يرجى العثور على ${docLabel} في المرفق بصيغة PDF.`
      }
    </p>
  </div>
</body>
</html>
        `,
        attachment: [
          {
            content: payload.pdfBase64,
            name: `${docType}_${payload.reservationId}.pdf`,
          },
        ],
      }),
    });
    if (!copyResponse.ok) {
      const errText = await copyResponse.text();
      console.error('❌ Failed to send copy:', errText);
    } else {
      console.log('✅ Copy sent successfully!');
    }

    const response = {
      success: true,
      message: `${docLabel} PDF sent successfully`,
      details: {
        to: payload.email,
        from: payload.sender || 'noreply@autolocation.com',
        subject:
          payload.language === 'fr'
            ? `${docLabel} - AUTO LOCATION`
            : `${docLabel} - AUTO LOCATION`,
        documentType: docType,
        language: payload.language,
        messageId: emailData.messageId,
      },
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
