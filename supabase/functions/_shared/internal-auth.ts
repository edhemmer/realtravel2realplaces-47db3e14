export function validateInternalWorkerSecret(req: Request): boolean {
  const expected = Deno.env.get("INTERNAL_WORKER_SECRET") ?? "";
  const provided = req.headers.get("x-internal-secret") ?? "";
  return expected.length > 0 && provided === expected;
}
