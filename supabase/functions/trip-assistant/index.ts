/**
 * v5.2.0: Trip Assistant — Grounded, single-turn AI assistant
 * Uses only injected trip context. No chat history, no memory.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsJsonHeaders, handleCors } from "../_shared/cors.ts";
import { validateAuth } from "../_shared/auth.ts";
import { callAiChatCompletion, AiProviderConfigError } from "../_shared/ai-provider.ts";

const SYSTEM_PROMPT = `You are a concise travel assistant embedded in a trip management app. You answer ONLY based on the trip context provided. You MUST follow these rules:

RULES:
1. Answer in 1-2 sentences maximum (3 only if absolutely necessary)
2. Be actionable — tell the user what to DO, not what to think about
3. Use ONLY the trip context data provided — never invent facts
4. If the context doesn't contain enough information, say "Based on your current trip details, I don't have enough information to answer that specifically."
5. Never ask follow-up questions
6. Never suggest external tools or apps
7. Use a calm, confident, helpful tone
8. Reference specific times, locations, or bookings from the context when relevant
9. For weather questions, only use weather data if provided in context
10. For timing questions, calculate based on the current time and next events provided

FORMAT: Plain text only. No markdown, no bullet points, no lists.`;

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await validateAuth(req);
    if (!auth.success) return auth.errorResponse!;

    const { question, tripContext } = await req.json();

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: corsJsonHeaders(req) }
      );
    }

    if (!tripContext || typeof tripContext !== "object") {
      return new Response(
        JSON.stringify({ error: "Trip context is required" }),
        { status: 400, headers: corsJsonHeaders(req) }
      );
    }

    const contextBlock = `TRIP CONTEXT (use ONLY this data):
Trip: ${tripContext.tripName || "Unknown"}
Destination: ${tripContext.destination || "Unknown"}
Dates: ${tripContext.startDate || "?"} to ${tripContext.endDate || "?"}
Current Time: ${tripContext.currentTime || "Unknown"}
Trip Phase: ${tripContext.phase || "Unknown"}

${tripContext.nextEvent ? `Next Event: ${tripContext.nextEvent.title} at ${tripContext.nextEvent.time}${tripContext.nextEvent.minutesUntil != null ? ` (in ${tripContext.nextEvent.minutesUntil} minutes)` : ""}` : "No upcoming events."}

${tripContext.upcomingEvents?.length ? `Upcoming Today:\n${tripContext.upcomingEvents.map((e: any) => `- ${e.title} at ${e.time}`).join("\n")}` : ""}

${tripContext.weather ? `Weather: High ${tripContext.weather.high}°${tripContext.weather.unit}, Low ${tripContext.weather.low}°${tripContext.weather.unit}, ${tripContext.weather.condition}${tripContext.weather.precipChance ? `, ${tripContext.weather.precipChance}% precipitation` : ""}` : "No weather data available."}

${tripContext.transportMode ? `Transport: ${tripContext.transportMode}` : ""}
${tripContext.scheduleDensity ? `Schedule: ${tripContext.scheduleDensity}` : ""}`;

    const response = await callAiChatCompletion({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${contextBlock}\n\nUSER QUESTION: ${question.trim()}` },
        ],
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: corsJsonHeaders(req) }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in workspace settings." }),
          { status: 402, headers: corsJsonHeaders(req) }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Unable to get a response right now. Please try again." }),
        { status: 500, headers: corsJsonHeaders(req) }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response generated. Please try rephrasing your question." }),
        { status: 500, headers: corsJsonHeaders(req) }
      );
    }

    return new Response(
      JSON.stringify({ answer: content.trim() }),
      { status: 200, headers: corsJsonHeaders(req) }
    );
  } catch (e) {
    if (e instanceof AiProviderConfigError) {
      return new Response(
        JSON.stringify({ error: "AI service is temporarily unavailable" }),
        { status: 500, headers: corsJsonHeaders(req) }
      );
    }
    console.error("trip-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: corsJsonHeaders(req) }
    );
  }
});
