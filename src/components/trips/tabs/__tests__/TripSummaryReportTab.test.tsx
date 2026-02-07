/**
 * TripSummaryReportTab Traveler Count Tests
 * 
 * Patch 2.x.x: Verify traveler count displays correctly based on canonical companions list.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TripSummaryReportTab } from '../TripSummaryReportTab';

// Mock the hooks
vi.mock('@/hooks/useTrips', () => ({
  useTrip: vi.fn(() => ({
    data: {
      id: 'trip-1',
      name: 'Test Trip',
      start_date: '2025-03-01',
      end_date: '2025-03-07',
      destination_city: 'Paris',
      destination_state: null,
      destination_country: 'France',
      trip_type: 'personal',
    },
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useExpenses', () => ({
  useExpenses: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/useBookings', () => ({
  useBookings: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/useParking', () => ({
  useParking: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/pages/TripDetail', () => ({
  useTripPermission: vi.fn(() => ({ isOwner: true })),
}));

// Mock useCompanions - will be overridden per test
const mockUseCompanions = vi.fn();
vi.mock('@/hooks/useCompanions', () => ({
  useCompanions: () => mockUseCompanions(),
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('TripSummaryReportTab - Traveler Count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "1 traveler" with 0 companions (solo trip)', () => {
    mockUseCompanions.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { getByText } = render(<TripSummaryReportTab tripId="trip-1" />, {
      wrapper: createTestWrapper(),
    });

    expect(getByText('1 traveler')).toBeInTheDocument();
  });

  it('shows "1 traveler" with 1 companion', () => {
    mockUseCompanions.mockReturnValue({
      data: [
        { id: 'c1', name: 'Alice', trip_id: 'trip-1', created_at: new Date().toISOString() },
      ],
      isLoading: false,
    });

    const { getByText } = render(<TripSummaryReportTab tripId="trip-1" />, {
      wrapper: createTestWrapper(),
    });

    expect(getByText('1 traveler')).toBeInTheDocument();
  });

  it('shows "2 travelers" with 2 companions', () => {
    mockUseCompanions.mockReturnValue({
      data: [
        { id: 'c1', name: 'Alice', trip_id: 'trip-1', created_at: new Date().toISOString() },
        { id: 'c2', name: 'Bob', trip_id: 'trip-1', created_at: new Date().toISOString() },
      ],
      isLoading: false,
    });

    const { getByText } = render(<TripSummaryReportTab tripId="trip-1" />, {
      wrapper: createTestWrapper(),
    });

    expect(getByText('2 travelers')).toBeInTheDocument();
  });

  it('shows "3 travelers" with 3 companions (does not add owner)', () => {
    mockUseCompanions.mockReturnValue({
      data: [
        { id: 'c1', name: 'Alice', trip_id: 'trip-1', created_at: new Date().toISOString() },
        { id: 'c2', name: 'Bob', trip_id: 'trip-1', created_at: new Date().toISOString() },
        { id: 'c3', name: 'Carol', trip_id: 'trip-1', created_at: new Date().toISOString() },
      ],
      isLoading: false,
    });

    const { getByText } = render(<TripSummaryReportTab tripId="trip-1" />, {
      wrapper: createTestWrapper(),
    });

    expect(getByText('3 travelers')).toBeInTheDocument();
  });
});
