import { describe, it, expect } from 'vitest';
import {
  resolveTripFrame,
  validateConfirmationAlignment,
  isFrameResolved,
  FrameBooking,
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
});
