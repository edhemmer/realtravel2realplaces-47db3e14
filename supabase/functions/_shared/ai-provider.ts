export type AiProvider = "openai" | "anthropic" | "gemini";

export class AiProviderConfigError extends Error {
  constructor(message = "AI provider is not configured") {
    super(message);
    this.name = "AiProviderConfigError";
  }
}

export interface AiChatRequest {
  model?: string;
  messages: unknown[];
  tools?: unknown[];
  tool_choice?: unknown;
  toolChoice?: unknown;
  temperature?: number;
  max_tokens?: number;
}

function provider(): AiProvider {
  const raw = (Deno.env.get("AI_PROVIDER") ?? "openai").toLowerCase();
  if (raw === "anthropic" || raw === "claude") return "anthropic";
  if (raw === "gemini" || raw === "google") return "gemini";
  return "openai";
}

function apiKey(p: AiProvider): string {
  if (p === "anthropic") return Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("AI_API_KEY") ?? "";
  if (p === "gemini") return Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_AI_API_KEY") ?? Deno.env.get("AI_API_KEY") ?? "";
  return Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("AI_API_KEY") ?? "";
}

function defaultModel(p: AiProvider, requested?: string): string {
  if (p === "anthropic") return Deno.env.get("ANTHROPIC_MODEL") ?? "claude-3-5-sonnet-latest";
  if (p === "gemini") {
    if (requested?.includes("2.5-pro")) return Deno.env.get("GEMINI_PRO_MODEL") ?? "gemini-2.5-pro";
    return Deno.env.get("GEMINI_FLASH_MODEL") ?? "gemini-2.5-flash";
  }
  if (requested?.includes("2.5-pro")) return Deno.env.get("OPENAI_PRO_MODEL") ?? Deno.env.get("OPENAI_MODEL") ?? "gpt-4o";
  return Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
}

function endpoint(p: AiProvider): string {
  const base = Deno.env.get("AI_BASE_URL");
  if (base) return base.replace(/\/$/, "") + "/chat/completions";
  if (p === "gemini") return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  return "https://api.openai.com/v1/chat/completions";
}

export async function callAiChatCompletion(request: AiChatRequest): Promise<Response> {
  const p = provider();
  const key = apiKey(p);
  if (!key) throw new AiProviderConfigError();
  if (p === "anthropic" && !Deno.env.get("AI_BASE_URL")) {
    throw new AiProviderConfigError("Claude requires AI_BASE_URL for an OpenAI-compatible provider endpoint");
  }

  const body = {
    ...request,
    model: defaultModel(p, request.model),
    tool_choice: request.tool_choice ?? request.toolChoice,
  };
  delete (body as Record<string, unknown>).toolChoice;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };

  return fetch(endpoint(p), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}
