import { useUserProfile } from './useUserProfile';

export type TemperatureUnit = 'fahrenheit' | 'celsius';

/**
 * Hook to get temperature unit preference from user profile.
 * Falls back to 'fahrenheit' if no preference is set.
 */
export function useProfileTemperatureUnit() {
  const { data: profile, isLoading } = useUserProfile();
  
  // Default to fahrenheit if no preference is set
  const unit: TemperatureUnit = profile?.temperature_unit || 'fahrenheit';

  const convertTemp = (fahrenheit: number): number => {
    if (unit === 'celsius') {
      return Math.round((fahrenheit - 32) * 5 / 9);
    }
    return fahrenheit;
  };

  const formatTemp = (fahrenheit: number, showUnit = true): string => {
    const temp = convertTemp(fahrenheit);
    return showUnit ? `${temp}°${unit === 'celsius' ? 'C' : 'F'}` : `${temp}°`;
  };

  return {
    unit,
    convertTemp,
    formatTemp,
    isCelsius: unit === 'celsius',
    isFahrenheit: unit === 'fahrenheit',
    isLoading,
  };
}
