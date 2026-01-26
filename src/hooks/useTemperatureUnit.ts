import { useState, useEffect, useCallback } from 'react';

export type TemperatureUnit = 'fahrenheit' | 'celsius';

const STORAGE_KEY = 'temperature-unit';

export function useTemperatureUnit() {
  const [unit, setUnit] = useState<TemperatureUnit>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'celsius' || stored === 'fahrenheit') {
        return stored;
      }
    }
    return 'fahrenheit';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, unit);
  }, [unit]);

  const toggleUnit = useCallback(() => {
    setUnit(prev => prev === 'fahrenheit' ? 'celsius' : 'fahrenheit');
  }, []);

  const convertTemp = useCallback((fahrenheit: number): number => {
    if (unit === 'celsius') {
      return Math.round((fahrenheit - 32) * 5 / 9);
    }
    return fahrenheit;
  }, [unit]);

  const formatTemp = useCallback((fahrenheit: number, showUnit = true): string => {
    const temp = convertTemp(fahrenheit);
    return showUnit ? `${temp}°${unit === 'celsius' ? 'C' : 'F'}` : `${temp}°`;
  }, [convertTemp, unit]);

  return {
    unit,
    setUnit,
    toggleUnit,
    convertTemp,
    formatTemp,
    isCelsius: unit === 'celsius',
    isFahrenheit: unit === 'fahrenheit',
  };
}
