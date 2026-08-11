# RT2RP — AI Orchestration

## Purpose

AI should make RT2RP more useful, not less trustworthy.

The product uses AI where interpretation, extraction, synthesis, prioritization, or natural-language interaction materially reduces traveler work.

AI is not permitted to become a parallel source of trip truth.

---

## AI Role

AI acts as a Travel Chief of Staff.

Its job is to help:

- ingest messy travel information;
- organize ambiguous content;
- summarize relevant trip context;
- surface meaningful preparation gaps;
- explain current trip state;
- recommend actions when supported by real data;
- transform records into concise usable outputs;
- reduce manual entry and mental load.

AI is not:

- a generic travel blogger;
- a novelty chatbot;
- an authority on live travel state without provider evidence;
- a replacement for deterministic business rules;
- permission to invent missing facts.

---

## AI Trust Hierarchy

For critical trip facts, prefer in this order:

1. Verified canonical user/provider data
2. Deterministic domain logic
3. Validated structured AI extraction from source material
4. AI synthesis/recommendation grounded in canonical context
5. Generic model knowledge only when explicitly appropriate and non-critical

AI-generated text never outranks authoritative trip data.

---

## Centralized AI Capability Layer

AI calls should be routed through named capabilities rather than arbitrary prompts scattered through components.

Examples:

- `parseBookingConfirmation`
- `parseItinerary`
- `parseReceipt`
- `generatePackingSuggestions`
- `summarizeTripState`
- `explainTravelRisk`

Each capability defines:

- purpose;
- permitted inputs;
- required context;
- output schema;
- model preference;
- fallback behavior;
- validation rules;
- privacy classification;
- cost budget;
- timeout/retry policy;
- observability.

---

## Structured Output First

Where AI output affects product state, use structured output with strict schema validation.

The sequence should be:

```text
source input
 -> model
 -> schema validation
 -> normalization
 -> confidence/ambiguity checks
 -> deduplication
 -> user review if needed
 -> canonical persistence
```

Do not persist raw model output directly into canonical fields without validation.

---

## Extraction Standard

AI extraction must preserve source evidence and ambiguity.

For a confirmation, the system should distinguish:

- explicitly present value;
- inferred value;
- missing value;
- ambiguous value.

Do not transform missing information into plausible information.

Examples of unacceptable behavior:

- inventing an airport code from an uncertain city;
- assuming a PM time when AM/PM is absent;
- inventing a hotel address;
- inferring a confirmation number from unrelated digits;
- silently turning a connection into one nonstop flight.

---

## Human Review Threshold

Require user review when an extracted material field is ambiguous enough that a wrong value could meaningfully affect trip execution.

Examples:

- travel date;
- departure time;
- origin/destination;
- traveler assignment;
- cost/currency;
- duplicate-vs-new reservation decision.

The review experience should be concise and focus only on uncertain fields.

---

## Deterministic Before Generative

Do not ask a model to calculate something the domain layer can determine reliably.

Examples that should generally be deterministic:

- chronological ordering;
- total expense calculation;
- identifying a known missing required field;
- current trip date/phase;
- whether a parking expiration is within a threshold;
- whether two exact times overlap.

AI may explain the result in natural language after the deterministic decision is made.

---

## Grounded Recommendations

AI recommendations must receive bounded, relevant, canonical trip context.

A recommendation should be traceable to facts such as:

- trip dates;
- places;
- traveler count;
- actual reservations;
- actual movements;
- current weather/provider observations where available;
- unresolved tasks;
- user preferences explicitly stored.

Do not let the model reconstruct the trip from UI prose if structured data is available.

---

## Live Data Rule

AI never manufactures live state.

If RT2RP has no current provider observation for a flight, route, weather condition, platform, gate, road closure, or other live concept, AI must not speak as though it does.

The hard-locked capability rule applies equally to AI responses.

---

## Model Selection

Choose models by capability, not fashion.

Consider:

- accuracy;
- structured-output reliability;
- latency;
- cost;
- image/document support;
- context size;
- privacy/compliance implications.

A smaller/faster model is preferred when it reliably satisfies the task.

A stronger model is justified where extraction ambiguity or complex synthesis materially affects correctness.

Model names and vendors should remain behind an adapter so replacements do not rewrite product features.

---

## Prompt Governance

Prompts are production code.

Prompt changes require:

- versioning or change traceability;
- test fixtures;
- regression evaluation;
- explicit schema expectations;
- protection against prompt injection in user-provided travel documents where relevant.

Do not embed uncontrolled prompt strings throughout UI files.

---

## Evaluation Corpus

Maintain representative fixtures for:

- major airlines;
- regional carriers;
- domestic/international hotels;
- vacation rentals;
- car rentals;
- rail confirmations;
- transit/tour confirmations;
- receipts;
- multi-segment itineraries;
- messy forwarded text;
- screenshots/photos;
- conflicting or incomplete confirmations.

Evaluation should include both success and deliberate ambiguity cases.

---

## AI Failure Modes

Handle:

- timeout;
- invalid JSON/schema;
- refusal;
- truncated output;
- hallucinated fields;
- duplicate extraction;
- provider/model outage;
- rate limiting;
- unexpected language;
- image quality problems;
- prompt injection in source content.

Failure must not corrupt canonical trip state.

---

## Cost Governance

AI spend must be controlled without degrading trust.

Use:

- capability-specific model choice;
- deduplication;
- input size limits;
- caching only where semantically safe;
- bounded retries;
- observability by capability;
- rate limits/abuse protection.

Never reduce accuracy for a critical extraction merely to save a trivial amount of model cost.

---

## Privacy

Send only the minimum data required for the capability.

Avoid transmitting unrelated trip PII.

Do not send secrets, tokens, or credentials to models.

Sensitive traveler data requires deliberate necessity and provider policy review.

---

## AI Conversation Surface

A conversational interface may exist if it delivers real value.

It should behave like an interface to RT2RP's actual trip intelligence, not a generic model.

Good examples:

- "What do I need to handle before tomorrow?"
- "Show me my next three movements."
- "Which receipts are still missing?"
- "Summarize today's travel."

The assistant should answer from canonical trip state and supported providers.

If it cannot answer from reliable data, it should not imply that it can.

---

## AI Acceptance Gate

An AI capability is release-ready only when:

1. The traveler problem is clear.
2. Structured inputs are minimized and relevant.
3. Outputs are schema-validated where material.
4. Hallucination risk is bounded.
5. Ambiguity has a user-review path.
6. Errors cannot corrupt canonical state.
7. Cost and latency are acceptable.
8. Representative regression fixtures pass.
9. Privacy is reviewed.
10. User-facing wording does not exceed actual capability.
