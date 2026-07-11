#!/usr/bin/env node

/**
 * Local Edge Function Proxy for Development
 * Simulates Supabase Edge Function with proper CORS handling
 * Run with: node send-contract-proxy.cjs
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Comprehensive CORS configuration
const corsOptions = {
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

console.log('🚀 Starting Edge Function Proxy...');

// CORS headers to match Supabase
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('✅ Health check');
  res.json({ status: 'ok', message: 'Proxy is running' });
});

// Mock Supabase Edge Function
app.all('/functions/v1/send-contract-email', async (req, res) => {
  console.log(`📨 ${req.method} request received`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Preflight request handled');
    res.header(corsHeaders);
    res.status(200).send('ok');
    return;
  }

  try {
    const payload = req.body;

    // Validate required fields
    if (!payload.email || !payload.sender || !payload.pdfBase64) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, sender, or pdfBase64',
      });
    }

    console.log(`📧 Processing email for: ${payload.email}`);
    console.log(`📄 Document Type: ${payload.documentType}`);
    console.log(`👤 Language: ${payload.language}`);

    // BREVO EMAIL SERVICE INTEGRATION
    const BREVO_API_KEY = process.env.BREVO_API_KEY;

    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY not configured in environment variables');
    }

    // Decode base64 PDF content
    const pdfBuffer = Buffer.from(payload.pdfBase64, 'base64');

    console.log('📤 Sending email via Brevo API with PDF attachment...');

    // Build document type label for email
    const documentTypeLabels = {
      contract: { fr: 'Contrat de Location', ar: 'عقد التأجير' },
      inspection: { fr: 'Rapport d\'Inspection', ar: 'تقرير فحص المركبة' },
      engagement: { fr: 'Lettre d\'Engagement', ar: 'رسالة الالتزام' },
      recu: { fr: 'Reçu de Paiement', ar: 'إيصال الدفع' },
      facture: { fr: 'Facture', ar: 'الفاتورة' },
      devis: { fr: 'Devis', ar: 'عرض الأسعار' }
    };

    const docType = payload.documentType || 'contract';
    const docLabel = documentTypeLabels[docType]?.[payload.language || 'fr'] || 'Document';

    // Send email using Brevo SMTP Send API with attachment
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
      <h2 style="color: #2d7a4d; margin: 0;">${payload.language === 'fr' ? 'AUTO LOCATION' : 'أوتو لوكيشن'}</h2>
    </div>
    <p style="font-size: 14px;">
      ${payload.language === 'fr' 
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
          }
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

    res.header(corsHeaders);
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.header(corsHeaders);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Catch-all to debug unknown routes
app.all('*', (req, res) => {
  console.log(`⚠️ Unknown route: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Proxy server listening on all interfaces`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
  console.log(`📧 Mock Edge Function: http://localhost:${PORT}/functions/v1/send-contract-email`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log('\n🎯 Frontend should call: http://localhost:3002/functions/v1/send-contract-email');
  console.log('Ready to handle contract emails!\n');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});
