import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

import { buildExpenseSyncPayload, type QueuedExpense } from '@/lib/offlineExpenseQueue';

describe('offline expense idempotency', () => {
  it('persists the stable client id into every replay payload', () => {
    const record: QueuedExpense = {
      clientExpenseId: '11111111-1111-4111-8111-111111111111',
      tripId: 'trip-1',
      expensePayload: {
        trip_id: 'trip-1',
        date: '2026-08-11',
        category: 'meals',
        amount: 42.5,
      },
      createdAt: 123,
      syncStatus: 'pending',
      retryCount: 0,
    };

    const firstAttempt = buildExpenseSyncPayload(record);
    const retryAttempt = buildExpenseSyncPayload({
      ...record,
      syncStatus: 'failed',
      retryCount: 1,
    });

    expect(firstAttempt.client_expense_id).toBe(record.clientExpenseId);
    expect(retryAttempt.client_expense_id).toBe(record.clientExpenseId);
    expect(retryAttempt).toEqual(firstAttempt);
  });

  it('does not mutate the queued expense payload when adding idempotency metadata', () => {
    const expensePayload = {
      trip_id: 'trip-2',
      date: '2026-08-12',
      category: 'transport',
      amount: 18,
    };
    const record: QueuedExpense = {
      clientExpenseId: '22222222-2222-4222-8222-222222222222',
      tripId: 'trip-2',
      expensePayload,
      createdAt: 456,
      syncStatus: 'pending',
      retryCount: 0,
    };

    buildExpenseSyncPayload(record);

    expect(expensePayload).not.toHaveProperty('client_expense_id');
  });
});
