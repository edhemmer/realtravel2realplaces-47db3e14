import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CompanionSummaryRequest {
  companionName: string;
  companionEmail: string;
  tripName: string;
  flightNumber?: string;
  seatNumber?: string;
  tsaNumber?: string;
  frequentFlyerNumber?: string;
  portionOwed?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Email service not configured. Please add your Resend API key." 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resend = new Resend(resendApiKey);
    
    const {
      companionName,
      companionEmail,
      tripName,
      flightNumber,
      seatNumber,
      tsaNumber,
      frequentFlyerNumber,
      portionOwed,
    }: CompanionSummaryRequest = await req.json();

    // Validate required fields
    if (!companionName || !companionEmail || !tripName) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Build the email content
    const details: string[] = [];
    if (flightNumber) details.push(`<li><strong>Flight:</strong> ${flightNumber}</li>`);
    if (seatNumber) details.push(`<li><strong>Seat:</strong> ${seatNumber}</li>`);
    if (tsaNumber) details.push(`<li><strong>TSA Known Traveler Number:</strong> ${tsaNumber}</li>`);
    if (frequentFlyerNumber) details.push(`<li><strong>Frequent Flyer Number:</strong> ${frequentFlyerNumber}</li>`);
    if (portionOwed !== undefined && portionOwed !== null) {
      details.push(`<li><strong>Your portion of trip expenses:</strong> $${portionOwed.toFixed(2)}</li>`);
    }

    const detailsHtml = details.length > 0 
      ? `<ul style="margin: 16px 0; padding-left: 20px;">${details.join('')}</ul>`
      : `<p style="color: #666; font-style: italic;">No specific details recorded yet.</p>`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Trip Details</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0ea5e9, #14b8a6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✈️ Your Trip Details</h1>
          </div>
          
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 16px;">Hi ${companionName},</p>
            
            <p style="margin-bottom: 16px;">Here are your details for <strong>${tripName}</strong>:</p>
            
            ${detailsHtml}
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            
            <p style="font-size: 14px; color: #666; margin-bottom: 4px;">
              Have a great trip! ✨
            </p>
            
            <p style="font-size: 12px; color: #999; margin-top: 24px;">
              Sent from Real Travel to Real Places
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Real Travel <noreply@resend.dev>",
      to: [companionEmail],
      subject: `Your Travel Details for ${tripName}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-companion-summary function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);