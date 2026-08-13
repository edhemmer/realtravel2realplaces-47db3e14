import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  from: vi.fn(),
}));

mocks.from.mockReturnValue({ createSignedUrl: mocks.createSignedUrl });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: mocks.from,
    },
  },
}));

import { resolveReceiptAccess } from './receiptAccess';

describe('resolveReceiptAccess', () => {
  beforeEach(() => {
    mocks.createSignedUrl.mockReset();
    mocks.from.mockClear();
  });

  it('uses durable storage path and mints a fresh signed URL', async () => {
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/fresh' },
      error: null,
    });

    const result = await resolveReceiptAccess({
      receipt_storage_path: 'user-1%2Freceipt.jpg',
      receipt_url: 'https://old.example/expired',
    });

    expect(mocks.from).toHaveBeenCalledWith('receipts');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith('user-1/receipt.jpg', 900);
    expect(result).toEqual({
      status: 'ready',
      url: 'https://signed.example/fresh',
      source: 'storage_path',
    });
  });

  it('fails clearly when the current account cannot sign the private object', async () => {
    mocks.createSignedUrl.mockResolvedValue({
      data: null,
      error: new Error('not allowed'),
    });

    const result = await resolveReceiptAccess({
      receipt_storage_path: 'other-user/receipt.jpg',
      receipt_url: undefined,
    });

    expect(result.status).toBe('forbidden_or_unavailable');
  });

  it('uses legacy URL only when no durable path exists', async () => {
    const result = await resolveReceiptAccess({
      receipt_storage_path: null,
      receipt_url: 'https://legacy.example/receipt',
    });

    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'ready',
      url: 'https://legacy.example/receipt',
      source: 'legacy_url',
    });
  });

  it('returns missing instead of fabricating a receipt', async () => {
    await expect(resolveReceiptAccess({
      receipt_storage_path: null,
      receipt_url: undefined,
    })).resolves.toEqual({ status: 'missing' });
  });
});
