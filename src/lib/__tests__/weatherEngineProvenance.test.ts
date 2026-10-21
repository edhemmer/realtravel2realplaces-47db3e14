import { describe, expect, it } from 'vitest';
import { resolveWeather } from '../weatherEngine';

function isoDateDaysFromNow(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

describe('weatherEngine provenance', () => {
  it('preserves the provider/query fetch timestamp for forecast data', () => {
    const start = isoDateDaysFromNow(2);
    const asOf = '2026-10-20T18:30:00.000Z';

    const result = resolveWeather({
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      startDate: start,
      endDate: start,
      forecastAsOf: asOf,
      forecast: [
        {
          date: start,
          tempHigh: 63,
          tempLow: 48,
          condition: 'Partly Cloudy',
          precipitation: 20,
        },
      ],
    });

    expect(result.weatherMode).toBe('FORECAST_PRIMARY');
    expect(result.asOf).toBe(asOf);
    expect(result.envelope[0]?.source).toBe('forecast');
  });

  it('does not invent a freshness timestamp for seasonal planning guidance', () => {
    const start = isoDateDaysFromNow(30);

    const result = resolveWeather({
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      startDate: start,
      endDate: start,
    });

    expect(result.weatherMode).toBe('SEASONAL_NORMALS');
    expect(result.asOf).toBeUndefined();
    expect(result.envelope[0]?.source).toBe('normals');
  });
});
