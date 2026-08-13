import { supabase } from '@/integrations/supabase/client';
import type { Expense } from '@/types/database';

const RECEIPT_BUCKET = 'receipts';
const DEFAULT_SIGNED_TTL_SECONDS = 15 * 60;

export type ReceiptAccessResult =
  | { status: 'ready'; url: string; source: 'storage_path' | 'legacy_url' }
  | { status: 'missing' }
  | { status: 'forbidden_or_unavailable'; message: string };

function normalizeStoragePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Resolve a private receipt to a short-lived access URL at view time.
 *
 * Durable identity lives in expense.receipt_storage_path. The caller's
 * authenticated Supabase session is used to sign the object, so existing
 * storage RLS remains the authorization boundary. No service-role bypass.
 *
 * Legacy receipt_url is retained only as a backward-compatible fallback for
 * expenses whose durable object path could not be recovered.
 */
export async function resolveReceiptAccess(
  expense: Pick<Expense, 'receipt_storage_path' | 'receipt_url'>,
  ttlSeconds: number = DEFAULT_SIGNED_TTL_SECONDS,
): Promise<ReceiptAccessResult> {
  if (expense.receipt_storage_path) {
    const path = normalizeStoragePath(expense.receipt_storage_path);
    const { data, error } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .createSignedUrl(path, ttlSeconds);

    if (error || !data?.signedUrl) {
      return {
        status: 'forbidden_or_unavailable',
        message: 'This receipt is stored privately, but it is not available to this account right now.',
      };
    }

    return { status: 'ready', url: data.signedUrl, source: 'storage_path' };
  }

  if (expense.receipt_url) {
    return { status: 'ready', url: expense.receipt_url, source: 'legacy_url' };
  }

  return { status: 'missing' };
}
