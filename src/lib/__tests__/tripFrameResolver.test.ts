import { describe, it, expect } from 'vitest';
import {
  resolveTripFrame,
  validateConfirmationAlignment,
  isFrameResolved,
  applyValidationGate,
  FrameBooking,
  ResolvedFrame,
} from '../tripFrameResolver';

// ============================================================================
// HELPERS
// ============================================================================

function flight(start: string, end?: string, depCode?: string, arrCode?: string): FrameBooking {
  return {
    booking_type: 'flight',
    start_datetime: start,
    end_datetime: end ?? null,
    departure_airport_code: depCode ?? null,
    arrival_airport_code: arrCode ?? null,
  };
}

function stay(start: string, end: string): FrameBooking {
  return { booking_type: 'stay', start_datetime: start, end_datetime: end };
}

function rental(start: string, end: string): FrameBooking {
  return { booking_type: 'car_rental', start_datetime: start, end_datetime: end };
}

function validFrame(overrides?: Partial<ResolvedFrame>): ResolvedFrame {
  return {
    startDate: '2025-03-01',
    endDate: '2025-03-05',
    mode: 'fly',
    confidence: 0.9,
    isAutoCreateSafe: true,
    warnings: [],
    ...overrides,
  };
}

// ============================================================================
// resolveTripFrame
// ============================================================================

describe('resolveTripFrame', () => {
  it('manual dates always win regardless of mode', () => {
    const frame = resolveTripFrame('fly', [], { startDate: '2025-03-01', endDate: '2025-03-10' });
    expect(frame.startDate).toBe('2025-03-01');
    expect(frame.endDate).toBe('2025-03-10');
    expect(frame.confidence).toBe(1.0);
    expect(frame.isAutoCreateSafe).toBe(true);
  });

  describe('fly mode', () => {
    it('derives frame from round-trip flights', () => {
      const bookings = [
        flight('2025-02-22T08:00:00', '2025-02-22T11:00:00', 'DEN', 'LAX'),
        flight('2025-02-25T14:00:00', '2025-02-25T17:00:00', 'LAX', 'DEN'),
      ];
      const frame = resolveTripFrame('fly', bookings);
      expect(frame.startDate).toBe('2025-02-22');
      expect(frame.endDate).toBe('2025-02-25');
      expect(frame.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('extends frame with hotel that goes beyond flights', () => {
      const bookings = [
        flight('2025-02-22T08:00:00', '2025-02-22T11:00:00'),
        stay('2025-02-22T15:00:00', '2025-02-26T11:00:00'),
        flight('2025-02-25T14:00:00', '2025-02-25T17:00:00'),
      ];
      const frame = resolveTripFrame('fly', bookings);
      expect(frame.startDate).toBe('2025-02-22');
      expect(frame.endDate).toBe('2025-02-26');
    });

    it('falls back to all bookings if no flights', () => {
      const bookings = [stay('2025-03-01T15:00:00', '2025-03-05T11:00:00')];
      const frame = resolveTripFrame('fly', bookings);
      expect(frame.startDate).toBe('2025-03-01');
      expect(frame.endDate).toBe('2025-03-05');
      expect(frame.warnings.length).toBeGreaterThan(0);
    });

    it('returns empty frame with warnings when no bookings', () => {
      const frame = resolveTripFrame('fly', []);
      expect(frame.startDate).toBe('');
      expect(frame.endDate).toBe('');
      expect(frame.isAutoCreateSafe).toBe(false);
    });
  });

  describe('drive mode', () => {
    it('requires explicit manual dates', () => {
      const frame = resolveTripFrame('drive', [], { startDate: '2025-04-01', endDate: '2025-04-05' });
      expect(frame.startDate).toBe('2025-04-01');
      expect(frame.endDate).toBe('2025-04-05');
      expect(frame.confidence).toBe(1.0);
    });

    it('warns when no dates provided and no bookings', () => {
      const frame = resolveTripFrame('drive', []);
      expect(frame.isAutoCreateSafe).toBe(false);
      expect(frame.warnings.length).toBeGreaterThan(0);
    });

    it('uses bookings as fallback', () => {
      const bookings = [stay('2025-04-01', '2025-04-03')];
      const frame = resolveTripFrame('drive', bookings);
      expect(frame.startDate).toBe('2025-04-01');
      expect(frame.endDate).toBe('2025-04-03');
    });
  });

  describe('train mode', () => {
    it('requires manual dates', () => {
      const frame = resolveTripFrame('train', []);
      expect(frame.isAutoCreateSafe).toBe(false);
    });

    it('allows manual override', () => {
      const frame = resolveTripFrame('train', [], { startDate: '2025-05-01', endDate: '2025-05-03' });
      expect(frame.confidence).toBe(1.0);
    });
  });
});

// ============================================================================
// validateConfirmationAlignment
// ============================================================================

describe('validateConfirmationAlignment', () => {
  it('single booking always aligns', () => {
    const result = validateConfirmationAlignment(
      [flight('2025-02-22T08:00:00', '2025-02-22T11:00:00')],
      'fly'
    );
    expect(result.aligned).toBe(true);
    expect(result.frame).not.toBeNull();
  });

  it('contiguous bookings align into one trip', () => {
    const bookings = [
      flight('2025-02-22T08:00:00', '2025-02-22T11:00:00', 'DEN', 'LAX'),
      stay('2025-02-22T15:00:00', '2025-02-25T11:00:00'),
      flight('2025-02-25T14:00:00', '2025-02-25T17:00:00', 'LAX', 'DEN'),
    ];
    const result = validateConfirmationAlignment(bookings, 'fly');
    expect(result.aligned).toBe(true);
    expect(result.frame?.startDate).toBe('2025-02-22');
    expect(result.frame?.endDate).toBe('2025-02-25');
  });

  it('splits bookings with large gaps into separate groups', () => {
    const bookings = [
      flight('2025-02-22T08:00:00', '2025-02-22T11:00:00'),
      flight('2025-03-15T08:00:00', '2025-03-15T11:00:00'), // 3+ weeks later
    ];
    const result = validateConfirmationAlignment(bookings, 'fly');
    expect(result.aligned).toBe(false);
    expect(result.splitGroups?.length).toBe(2);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('warns when flights go to many different airports', () => {
    const bookings = [
      flight('2025-02-22T08:00:00', '2025-02-22T11:00:00', 'DEN', 'LAX'),
      flight('2025-02-23T08:00:00', '2025-02-23T11:00:00', 'DEN', 'JFK'),
      flight('2025-02-24T08:00:00', '2025-02-24T11:00:00', 'DEN', 'ORD'),
    ];
    const result = validateConfirmationAlignment(bookings, 'fly');
    expect(result.warnings.some(w => w.includes('different airports'))).toBe(true);
  });
});

// ============================================================================
// isFrameResolved
// ============================================================================

describe('isFrameResolved', () => {
  it('returns false for null', () => {
    expect(isFrameResolved(null)).toBe(false);
  });

  it('returns false for empty dates', () => {
    expect(isFrameResolved({
      startDate: '', endDate: '', mode: 'fly',
      confidence: 0, isAutoCreateSafe: false, warnings: [],
    })).toBe(false);
  });

  it('returns false when end < start', () => {
    expect(isFrameResolved({
      startDate: '2025-03-10', endDate: '2025-03-01', mode: 'fly',
      confidence: 1, isAutoCreateSafe: true, warnings: [],
    })).toBe(false);
  });

  it('returns true for valid frame', () => {
    expect(isFrameResolved({
      startDate: '2025-03-01', endDate: '2025-03-05', mode: 'fly',
      confidence: 0.9, isAutoCreateSafe: true, warnings: [],
    })).toBe(true);
  });

  it('returns true when start equals end (same-day trip)', () => {
    expect(isFrameResolved({
      startDate: '2025-03-01', endDate: '2025-03-01', mode: 'drive',
      confidence: 1, isAutoCreateSafe: true, warnings: [],
    })).toBe(true);
  });

  // v2.2.13: Validation gate tests
  it('returns false when framePendingValidation is true', () => {
    expect(isFrameResolved({
      startDate: '2025-03-01', endDate: '2025-03-05', mode: 'fly',
      confidence: 0.9, isAutoCreateSafe: true, warnings: [],
      framePendingValidation: true,
    })).toBe(false);
  });

  it('returns true when framePendingValidation is false', () => {
    expect(isFrameResolved({
      startDate: '2025-03-01', endDate: '2025-03-05', mode: 'fly',
      confidence: 0.9, isAutoCreateSafe: true, warnings: [],
      framePendingValidation: false,
    })).toBe(true);
  });
});

// ============================================================================
// v2.2.13: applyValidationGate
// ============================================================================

describe('applyValidationGate', () => {
  it('all-times-valid: no pending flag', () => {
    const frame = validFrame();
    const result = applyValidationGate(frame, [
      { bookingId: 'b1', timeIsEstimated: false },
      { bookingId: 'b2', timeIsEstimated: false },
    ]);
    expect(result.framePendingValidation).toBe(false);
    expect(result.isAutoCreateSafe).toBe(true);
    expect(isFrameResolved(result)).toBe(true);
  });

  it('one-mismatch: sets pending flag and blocks finalization', () => {
    const frame = validFrame();
    const result = applyValidationGate(frame, [
      { bookingId: 'b1', timeIsEstimated: false },
      { bookingId: 'b2', timeIsEstimated: true }, // low-confidence
    ]);
    expect(result.framePendingValidation).toBe(true);
    expect(result.isAutoCreateSafe).toBe(false);
    expect(isFrameResolved(result)).toBe(false);
  });

  it('all-mismatches: sets pending flag', () => {
    const frame = validFrame();
    const result = applyValidationGate(frame, [
      { bookingId: 'b1', timeIsEstimated: true },
      { bookingId: 'b2', timeIsEstimated: true },
    ]);
    expect(result.framePendingValidation).toBe(true);
    expect(isFrameResolved(result)).toBe(false);
  });

  it('post-confirmation: clearing flags allows finalization', () => {
    const frame = validFrame();
    // First: one booking is estimated
    const pending = applyValidationGate(frame, [
      { bookingId: 'b1', timeIsEstimated: false },
      { bookingId: 'b2', timeIsEstimated: true },
    ]);
    expect(isFrameResolved(pending)).toBe(false);

    // User confirms — all flags cleared
    const resolved = applyValidationGate(frame, [
      { bookingId: 'b1', timeIsEstimated: false },
      { bookingId: 'b2', timeIsEstimated: false },
    ]);
    expect(resolved.framePendingValidation).toBe(false);
    expect(isFrameResolved(resolved)).toBe(true);
  });

  it('manual-only trip (no booking flags): no pending flag', () => {
    const frame = validFrame();
    const result = applyValidationGate(frame, []);
    expect(result.framePendingValidation).toBe(false);
    expect(isFrameResolved(result)).toBe(true);
  });

  it('preserves original frame fields', () => {
    const frame = validFrame({ mode: 'drive', confidence: 0.75 });
    const result = applyValidationGate(frame, [
      { bookingId: 'b1', timeIsEstimated: false },
    ]);
    expect(result.startDate).toBe('2025-03-01');
    expect(result.endDate).toBe('2025-03-05');
    expect(result.mode).toBe('drive');
    expect(result.confidence).toBe(0.75);
  });
});
