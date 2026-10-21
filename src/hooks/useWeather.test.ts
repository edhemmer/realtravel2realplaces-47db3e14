import { describe, expect, it } from 'vitest';
import { selectGeocodingCandidate } from './useWeather';

const candidates = [
  {
    latitude: 39.7817,
    longitude: -89.6501,
    name: 'Springfield',
    admin1: 'Illinois',
    country: 'United States',
    country_code: 'US',
  },
  {
    latitude: 42.1015,
    longitude: -72.5898,
    name: 'Springfield',
    admin1: 'Massachusetts',
    country: 'United States',
    country_code: 'US',
  },
];

describe('selectGeocodingCandidate', () => {
  it('matches a US state abbreviation to the canonical state name', () => {
    expect(selectGeocodingCandidate(candidates, 'USA', 'IL')?.admin1).toBe('Illinois');
  });

  it('matches a full US state name', () => {
    expect(selectGeocodingCandidate(candidates, 'United States', 'Illinois')?.admin1).toBe('Illinois');
  });

  it('fails closed instead of accepting a same-named city in the wrong state', () => {
    expect(
      selectGeocodingCandidate(
        [candidates[1]],
        'US',
        'IL',
      ),
    ).toBeNull();
  });

  it('fails closed when a supplied US state is not recognized', () => {
    expect(selectGeocodingCandidate(candidates, 'USA', 'ZZ')).toBeNull();
  });

  it('requires a matching non-US country when country context is supplied', () => {
    const international = [
      {
        latitude: 43.6047,
        longitude: 1.4442,
        name: 'Toulouse',
        country: 'France',
        country_code: 'FR',
      },
    ];

    expect(selectGeocodingCandidate(international, 'France')?.country_code).toBe('FR');
    expect(selectGeocodingCandidate(international, 'Spain')).toBeNull();
  });
});
