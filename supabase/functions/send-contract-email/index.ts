// @ts-ignore - Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Deno.env
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

interface SendContractEmailPayload {
  email: string;
  clientName: string;
  reservationId: string;
  pdfBase64: string;
  sender: string;
  language: "fr" | "ar";
  documentType?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: SendContractEmailPayload = await req.json();

    // Validate required fields
    if (!payload.email || !payload.sender || !payload.pdfBase64) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: email, sender, or pdfBase64",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Brevo API key from environment
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "BREVO_API_KEY not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build document type label
    const documentTypeLabels: Record<string, Record<string, string>> = {
      contract: { fr: "Contrat de Location", ar: "عقد التأجير" },
      inspection: { fr: "Rapport d'Inspection", ar: "تقرير فحص المركبة" },
      engagement: { fr: "Lettre d'Engagement", ar: "رسالة الالتزام" },
      recu: { fr: "Reçu de Paiement", ar: "إيصال الدفع" },
      facture: { fr: "Facture", ar: "الفاتورة" },
      devis: { fr: "Devis", ar: "عرض الأسعار" },
    };

    const docType = payload.documentType || "contract";
    const docLabel =
      documentTypeLabels[docType]?.[payload.language || "fr"] ||
      documentTypeLabels["contract"][payload.language || "fr"];

    // Send email via Brevo with PDF attachment
    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "AUTO LOCATION",
          email: payload.sender || "noreply@autolocation.com",
        },
        to: [
          {
            email: payload.email,
          },
        ],
        subject:
          payload.language === "fr"
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
        payload.language === "fr"
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
      console.error("Brevo API error:", emailResponse.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Brevo API error: ${emailResponse.status}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailData = await emailResponse.json();

    // Always send a copy to the fixed internal address
    const COPY_EMAIL = "icarmhd@gmail.com";
    const copyResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "AUTO LOCATION",
          email: payload.sender || "noreply@autolocation.com",
        },
        to: [{ email: COPY_EMAIL }],
        subject:
          payload.language === "fr"
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
        payload.language === "fr"
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
      console.error("Failed to send copy:", errText);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `${docLabel} PDF sent successfully`,
        details: {
          to: payload.email,
          from: payload.sender || "noreply@autolocation.com",
          subject:
            payload.language === "fr"
              ? `${docLabel} - AUTO LOCATION`
              : `${docLabel} - AUTO LOCATION`,
          documentType: docType,
          language: payload.language,
          messageId: emailData.messageId,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
