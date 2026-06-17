/**
 * Shared AI client for Edge Functions.
 * Returns parsed tool call arguments while delegating provider details.
 */

import { callAiChatCompletion, AiProviderConfigError } from "./ai-provider.ts";
import { errorResponse, getAiErrorMessage } from "./response.ts";

export interface AiToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

export interface AiChatResponse {
  choices?: Array<{
    message?: {
      tool_calls?: AiToolCall[];
    };
  }>;
}

export interface AiRequestOptions {
  model?: string;
  systemPrompt: string;
  userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  tools: Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  toolChoice: { type: "function"; function: { name: string } };
}

export async function callAiGateway<T = Record<string, unknown>>(
  options: AiRequestOptions,
): Promise<{ data: T | null; errorResponse?: Response }> {
  let response: Response;
  try {
    response = await callAiChatCompletion({
      model: options.model ?? "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userContent },
      ],
      tools: options.tools,
      tool_choice: options.toolChoice,
    });
  } catch (fetchError) {
    if (fetchError instanceof AiProviderConfigError) {
      console.error("AI provider is not configured");
      return {
        data: null,
        errorResponse: errorResponse("AI parsing is temporarily unavailable. Please enter details manually."),
      };
    }
    console.error("AI provider fetch error:", fetchError);
    return {
      data: null,
      errorResponse: errorResponse("Unable to connect to AI service. Please try again or enter details manually."),
    };
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI provider error:", response.status, errorText);
    return {
      data: null,
      errorResponse: errorResponse(getAiErrorMessage(response.status)),
    };
  }

  let aiResponse: AiChatResponse;
  try {
    aiResponse = await response.json();
  } catch {
    console.error("Failed to parse AI response JSON");
    return {
      data: null,
      errorResponse: errorResponse("Received an invalid response from AI. Please enter details manually."),
    };
  }

  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    return {
      data: null,
      errorResponse: errorResponse("We couldn't extract details from this. Please enter the information manually."),
    };
  }

  try {
    const parsed = JSON.parse(toolCall.function.arguments) as T;

    if (typeof parsed === "object" && parsed !== null) {
      for (const key of Object.keys(parsed as Record<string, unknown>)) {
        const value = (parsed as Record<string, unknown>)[key];
        if (value === "null" || value === "NULL") {
          (parsed as Record<string, unknown>)[key] = null;
        }
      }
    }

    return { data: parsed };
  } catch {
    console.error("Failed to parse tool call arguments");
    return {
      data: null,
      errorResponse: errorResponse("AI returned incomplete data. Please review and complete the details manually."),
    };
  }
}
