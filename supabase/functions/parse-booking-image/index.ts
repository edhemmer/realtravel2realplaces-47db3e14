/**
 * v4.2.0: Parse Booking Image Edge Function
 * 
 * Uses canonical parse contract for universal classification
 * and required field enforcement across ALL entity types.
 * 
 * CRITICAL: This endpoint NEVER writes to the database.
 * It returns draft bookings for client-side review before save.
 * No image persistence — processed in memory only.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsJsonHeaders, handleCors } from "../_shared/cors.ts";
import { callAiChatCompletion, AiProviderConfigError } from "../_shared/ai-provider.ts";
import { 
  normalizeDatetime, 
  cleanNullStrings,
  hasServiceDates 
} from "../_shared/datetime-utils.ts";
import {
  classifyDocument,
  enforceRequiredFields,
  type DocClassification,
  ENTITY_TYPE_LABELS,
} from "../_shared/parse-contract.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ 
        success: false, data: null, message: "Please sign in to use this feature.", error: 'NOT_AUTHENTICATED'
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        success: false, data: null, message: "Your session has expired. Please sign in again.", error: 'SESSION_EXPIRED'
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    let tripId: string;
    let imageBase64: string;
    let typeHint: string;
    
    try {
      const body = await req.json();
      tripId = body.tripId;
      imageBase64 = body.imageBase64;
      typeHint = body.typeHint || 'auto';
    } catch {
      return new Response(JSON.stringify({ 
        success: false, data: null, message: "Invalid request format.", error: 'INVALID_REQUEST'
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    if (!tripId || !imageBase64) {
      return new Response(JSON.stringify({ 
        success: false, data: null, message: "Missing required fields (tripId, imageBase64).", error: 'MISSING_FIELDS'
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    const { data: hasAccess } = await supabaseClient
      .rpc('user_has_trip_access', { trip_id: tripId });

    if (!hasAccess) {
      return new Response(JSON.stringify({ 
        success: false, data: null, message: "You don't have access to this trip.", error: 'PERMISSION_DENIED'
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    const typeHintInstruction = typeHint === 'flight' 
      ? 'This image is likely a FLIGHT confirmation.' 
      : typeHint === 'stay' 
      ? 'This image is likely a HOTEL/STAY confirmation.'
      : 'Determine the booking type from the image.';

    const systemPrompt = `You are a travel booking confirmation parser with OCR/vision capabilities. 
Analyze the image of a booking confirmation and extract structured data.

${typeHintInstruction}

CRITICAL RULES:
1. If the image is blurry, unreadable, or not a booking confirmation, respond with: readable=false
2. Extract ONLY data that is clearly visible — never guess or fabricate.
3. For dates/times, ONLY extract explicitly stated values.
4. For multi-leg flights: create ONE booking record with total cost for all legs.
5. Determine if this is a CONFIRMATION (has service dates) or a RECEIPT (payment only).

BOOKING TYPE CLASSIFICATION:
- flight: Airline tickets, boarding passes, flight confirmations
- stay: Hotels, Airbnb, VRBO, vacation rentals
- car_rental: Rental cars
- activity: Tours, excursions, permits, event tickets
- transport: Train, bus, ferry tickets
- parking: Parking reservations

For flights extract: airline, passenger_name, departure_airport_code (IATA), arrival_airport_code (IATA)
For stays extract: property_name, stay_type (hotel/airbnb/vrbo/other)
For car rentals extract: rental_company, pickup_location, return_location

Return structured data via the tool call. Use null for fields you cannot determine.`;

    let response;
    try {
      response = await callAiChatCompletion({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: [
                { type: "text", text: "Please analyze this booking confirmation image and extract the booking details." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
              ]
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_booking_from_image",
                description: "Extract booking details from a confirmation image",
                parameters: {
                  type: "object",
                  properties: {
                    readable: { type: "boolean" },
                    reason: { type: "string" },
                    is_receipt_only: { type: "boolean", description: "True if receipt without service dates" },
                    booking_type: { type: "string", enum: ["flight", "stay", "car_rental", "activity", "transport", "parking"] },
                    vendor_name: { type: "string" },
                    start_datetime: { type: "string" },
                    end_datetime: { type: "string" },
                    confirmation_number: { type: "string" },
                    total_cost: { type: "number" },
                    address: { type: "string" },
                    airline: { type: "string" },
                    passenger_name: { type: "string" },
                    property_name: { type: "string" },
                    stay_type: { type: "string", enum: ["hotel", "airbnb", "vrbo", "other"] },
                    rental_company: { type: "string" },
                    pickup_location: { type: "string" },
                    return_location: { type: "string" },
                    notes: { type: "string" },
                    departure_airport_code: { type: "string" },
                    arrival_airport_code: { type: "string" },
                    location_summary: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["readable"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_booking_from_image" } },
      });
    } catch (fetchError) {
      if (fetchError instanceof AiProviderConfigError) {
        console.error("AI provider is not configured");
        return new Response(JSON.stringify({
          success: false, data: null, message: "AI parsing is temporarily unavailable.", error: 'AI_UNAVAILABLE'
        }), { status: 200, headers: corsJsonHeaders(req) });
      }
      console.error("AI gateway fetch error:", fetchError);
      return new Response(JSON.stringify({ 
        success: false, data: null, message: "Unable to connect to AI service. Please try again.", error: 'AI_FETCH_ERROR'
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      let userMessage = "We couldn't parse this image. Please enter details manually.";
      if (response.status === 429) userMessage = "AI service is busy. Please wait and try again.";
      else if (response.status === 402) userMessage = "AI parsing limit reached. Please enter details manually.";
      
      return new Response(JSON.stringify({ 
        success: false, data: null, message: userMessage, error: 'AI_ERROR'
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    let aiResponse;
    try {
      aiResponse = await response.json();
    } catch {
      return new Response(JSON.stringify({ 
        success: false, data: null, message: "Invalid AI response. Please enter details manually.", error: 'AI_PARSE_ERROR'
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ 
        success: false, data: null, message: "AI couldn't extract details from this image.", error: 'NO_DATA'
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    let parsed;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ 
        success: false, data: null, message: "AI returned incomplete data.", error: 'PARSE_FAILED'
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    if (!parsed.readable) {
      return new Response(JSON.stringify({ 
        success: false, data: null,
        message: parsed.reason || "Unable to read the image. Please take a clearer photo.",
        error: 'NOT_READABLE'
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    // Clean up parsed data
    cleanNullStrings(parsed);
    parsed.start_datetime = normalizeDatetime(parsed.start_datetime);
    parsed.end_datetime = normalizeDatetime(parsed.end_datetime);

    // Sanitize airport codes
    const IATA_RE = /^[A-Z]{3}$/i;
    if (parsed.departure_airport_code && !IATA_RE.test(parsed.departure_airport_code.trim())) {
      parsed.departure_airport_code = null;
    } else if (parsed.departure_airport_code) {
      parsed.departure_airport_code = parsed.departure_airport_code.trim().toUpperCase();
    }
    if (parsed.arrival_airport_code && !IATA_RE.test(parsed.arrival_airport_code.trim())) {
      parsed.arrival_airport_code = null;
    } else if (parsed.arrival_airport_code) {
      parsed.arrival_airport_code = parsed.arrival_airport_code.trim().toUpperCase();
    }

    // ── v4.2.0: CANONICAL CLASSIFICATION ────────────────────────
    const entityType = parsed.booking_type || 'other';
    const hasDates = hasServiceDates(parsed);
    const docClass: DocClassification = classifyDocument(parsed, hasDates);
    
    parsed._doc_classification = docClass;

    const draftBooking = {
      booking_type: entityType,
      vendor_name: parsed.vendor_name || '',
      start_datetime: parsed.start_datetime || null,
      end_datetime: parsed.end_datetime || null,
      confirmation_number: parsed.confirmation_number || null,
      total_cost: parsed.total_cost || null,
      address: parsed.address || null,
      airline: parsed.airline || null,
      passenger_name: parsed.passenger_name || null,
      property_name: parsed.property_name || null,
      stay_type: parsed.stay_type || null,
      rental_company: parsed.rental_company || null,
      pickup_location: parsed.pickup_location || null,
      return_location: parsed.return_location || null,
      notes: parsed.notes || null,
      departure_airport_code: parsed.departure_airport_code || null,
      arrival_airport_code: parsed.arrival_airport_code || null,
      location_summary: parsed.location_summary || null,
    };

    const confidence = parsed.confidence ?? 75;
    const warnings: string[] = [];

    // Receipt handling
    if (docClass === 'RECEIPT') {
      const entityLabel = ENTITY_TYPE_LABELS[entityType] || 'Booking';
      warnings.push(`This appears to be a ${entityLabel.toLowerCase()} receipt, not a confirmation`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: {
          draftBookings: [draftBooking],
          confidence,
          warnings,
          doc_classification: 'RECEIPT',
          is_receipt_only: true,
        },
        message: `Parsed ${entityLabel.toLowerCase()} receipt from ${draftBooking.vendor_name || 'image'}.`
      }), { status: 200, headers: corsJsonHeaders(req) });
    }

    // Required field enforcement
    const issue = enforceRequiredFields(parsed, entityType);
    if (issue) {
      warnings.push(issue.actionHint);
    }

    if (!draftBooking.vendor_name) warnings.push('Vendor name not detected');
    if (!draftBooking.start_datetime) warnings.push('Service dates not detected');
    if (!draftBooking.total_cost) warnings.push('Cost not detected');
    if (confidence < 60) warnings.push('Low confidence — please verify all fields');

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        draftBookings: [draftBooking],
        confidence,
        warnings,
        doc_classification: docClass,
        is_receipt_only: false,
        has_issues: !!issue,
        missing_fields: issue?.missingFields || [],
      },
      message: `Parsed ${draftBooking.booking_type} confirmation${draftBooking.vendor_name ? ` from ${draftBooking.vendor_name}` : ''}.`
    }), { status: 200, headers: corsJsonHeaders(req) });

  } catch (error) {
    console.error("Parse booking image error:", error);
    return new Response(JSON.stringify({ 
      success: false, data: null, message: "An unexpected error occurred. Please enter details manually.", error: 'INTERNAL_ERROR'
    }), { status: 200, headers: corsJsonHeaders(req) });
  }
});
