import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { handleCors, corsHeaders } from "../_shared/cors.ts";
import { validateAuth } from "../_shared/auth.ts";

interface CompanionSummaryRequest {
  tripId: string;  // Required for ownership verification
  companionId: string;  // Required to verify companion belongs to trip
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
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // SECURITY: Require authentication
    const auth = await validateAuth(req);
    if (!auth.success) {
      console.error("[send-companion-summary] Auth failed");
      return auth.errorResponse!;
    }

    const { user, client: supabaseClient } = auth;
    console.log("[send-companion-summary] Authenticated user:", user!.id);

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
      tripId,
      companionId,
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
    if (!tripId || !companionId || !companionName || !companionEmail || !tripName) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields (tripId, companionId, companionName, companionEmail, tripName)" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // SECURITY: Verify user owns the trip
    const { data: trip, error: tripError } = await supabaseClient!
      .from('trips')
      .select('id, user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error("[send-companion-summary] Trip not found:", tripError);
      return new Response(
        JSON.stringify({ success: false, message: "Trip not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (trip.user_id !== user!.id) {
      console.error("[send-companion-summary] User does not own trip:", { userId: user!.id, tripOwnerId: trip.user_id });
      return new Response(
        JSON.stringify({ success: false, message: "You don't have permission to send emails for this trip" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // SECURITY: Verify companion belongs to this trip
    const { data: companion, error: companionError } = await supabaseClient!
      .from('companions')
      .select('id, email')
      .eq('id', companionId)
      .eq('trip_id', tripId)
      .single();

    if (companionError || !companion) {
      console.error("[send-companion-summary] Companion not found in trip:", companionError);
      return new Response(
        JSON.stringify({ success: false, message: "Companion not found in this trip" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // SECURITY: Verify the email matches the companion's email (prevent sending to arbitrary addresses)
    if (companion.email !== companionEmail) {
      console.error("[send-companion-summary] Email mismatch:", { provided: companionEmail, stored: companion.email });
      return new Response(
        JSON.stringify({ success: false, message: "Email address does not match companion record" }),
        {
          status: 400,
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