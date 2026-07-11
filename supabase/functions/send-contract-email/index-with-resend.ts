// @ts-ignore - Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

interface SendContractEmailPayload {
  email: string;
  clientName: string;
  reservationId: string;
  htmlBase64: string;
  sender: string;
  language: "fr" | "ar";
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
    if (!payload.email || !payload.sender || !payload.htmlBase64) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: email, sender, or htmlBase64",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Resend API key from environment
    // @ts-ignore - Deno.env
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Decode HTML from base64
    const htmlString = atob(payload.htmlBase64);

    // Prepare email subject based on language
    const emailSubject =
      payload.language === "fr"
        ? "Votre Contrat de Location"
        : "عقد التأجير الخاص بك";

    // Prepare plain text version
    const emailText =
      payload.language === "fr"
        ? `Bonjour ${payload.clientName},\n\nVeuillez trouver ci-joint votre contrat de location.\n\nCordialement`
        : `مرحبا ${payload.clientName},\n\nيرجى العثور على عقد التأجير المرفق.\n\nمع أطيب التحيات`;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: payload.sender,
        to: payload.email,
        subject: emailSubject,
        html: htmlString,
        text: emailText,
        reply_to: payload.sender,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      throw new Error(`Email service error: ${JSON.stringify(error)}`);
    }

    const result = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contract email sent successfully",
        details: {
          to: payload.email,
          from: payload.sender,
          subject: emailSubject,
          language: payload.language,
          resendId: result.id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
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
