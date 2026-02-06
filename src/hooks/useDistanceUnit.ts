import { useUserProfile } from './useUserProfile';

export type DistanceUnit = 'miles' | 'kilometers';

export function useDistanceUnit() {
  const { data: profile } = useUserProfile();
  
  // Default to miles if no preference is set
  const unit: DistanceUnit = profile?.distance_unit || 'miles';

  const convertDistance = (miles: number): number => {
    if (unit === 'kilometers') {
      return Math.round(miles * 1.609344 * 10) / 10; // Round to 1 decimal
    }
    return miles;
  };

  const formatDistance = (miles: number, showUnit = true): string => {
    const distance = convertDistance(miles);
    return showUnit ? `${distance} ${unit === 'kilometers' ? 'km' : 'mi'}` : `${distance}`;
  };

  return {
    unit,
    convertDistance,
    formatDistance,
    isKilometers: unit === 'kilometers',
    isMiles: unit === 'miles',
  };
}
