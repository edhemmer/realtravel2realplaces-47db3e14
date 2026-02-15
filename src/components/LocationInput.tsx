/**
 * v3.8.4: Canonical LocationInput Component
 * 
 * Enforces Country → Region → City selection with autocomplete.
 * Single component used by Create Trip Drive and Tour stops.
 * 
 * Rules:
 * - Country locked to US (international not yet enabled)
 * - Region selector required before City enables
 * - City must be selected from autocomplete results (no raw save)
 * - On selection: returns full LocationStructured
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocationStructured, isLocationComplete } from '@/lib/location/types';
import { PlaceCandidate, serverPlacesProvider } from '@/lib/location/provider';
import { US_STATES } from '@/lib/location/usStates';

// ============================================================================
// PROPS
// ============================================================================

interface LocationInputProps {
  /** Label displayed above the input group */
  label: string;
  /** Current structured location (controlled) */
  value: LocationStructured | null;
  /** Called when user selects a city from results */
  onChange: (location: LocationStructured | null) => void;
  /** Whether international selection is enabled (default: false → locked to US) */
  internationalEnabled?: boolean;
  /** Placeholder text for city input */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Additional className for the container */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LocationInput({
  label,
  value,
  onChange,
  internationalEnabled = false,
  placeholder = 'Search city...',
  required = false,
  className,
}: LocationInputProps) {
  // Local state
  const [regionCode, setRegionCode] = useState<string>(value?.regionCode || '');
  const [cityQuery, setCityQuery] = useState<string>(value?.cityName || '');
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSelected, setIsSelected] = useState(!!value && isLocationComplete(value));

  const countryCode = internationalEnabled ? (value?.countryCode || 'US') : 'US';
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (value) {
      setRegionCode(value.regionCode || '');
      setCityQuery(value.cityName || '');
      setIsSelected(isLocationComplete(value));
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Region change → clear city selection
  const handleRegionChange = useCallback((newRegion: string) => {
    setRegionCode(newRegion);
    setCityQuery('');
    setCandidates([]);
    setIsSelected(false);
    onChange(null);
  }, [onChange]);

  // City input change → debounced search
  const handleCityInput = useCallback((query: string) => {
    setCityQuery(query);
    setIsSelected(false);
    onChange(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2 || !regionCode) {
      setCandidates([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await serverPlacesProvider.searchCities({
          countryCode,
          regionCode,
          query: query.trim(),
        });
        setCandidates(results);
        setShowDropdown(results.length > 0);
      } catch {
        setCandidates([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [countryCode, regionCode, onChange]);

  // Select a candidate
  const handleSelect = useCallback((candidate: PlaceCandidate) => {
    const location: LocationStructured = {
      countryCode: candidate.countryCode || countryCode,
      regionCode: candidate.regionCode || regionCode,
      cityName: candidate.primary,
      provider: candidate.provider as LocationStructured['provider'],
      providerId: candidate.providerId,
      lat: candidate.lat,
      lng: candidate.lng,
      formatted: candidate.formatted,
    };

    setCityQuery(candidate.primary);
    setIsSelected(true);
    setShowDropdown(false);
    setCandidates([]);
    onChange(location);
  }, [countryCode, regionCode, onChange]);

  const cityDisabled = !regionCode;

  return (
    <div className={cn('space-y-3', className)} ref={containerRef}>
      <Label className="flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>

      {/* Region selector */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">State</Label>
        <Select value={regionCode} onValueChange={handleRegionChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select state..." />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {US_STATES.map(state => (
              <SelectItem key={state.code} value={state.code}>
                {state.name} ({state.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City autocomplete */}
      <div className="relative space-y-1.5">
        <Label className="text-xs text-muted-foreground">City</Label>
        <div className="relative">
          <Input
            value={cityQuery}
            onChange={(e) => handleCityInput(e.target.value)}
            onFocus={() => {
              if (candidates.length > 0 && !isSelected) setShowDropdown(true);
            }}
            placeholder={cityDisabled ? 'Select state first' : placeholder}
            disabled={cityDisabled}
            className={cn(
              'h-9 pr-8',
              isSelected && 'border-primary/50 bg-primary/5'
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isSelected ? (
              <Check className="w-4 h-4 text-primary" />
            ) : null}
          </div>
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && candidates.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-[200px] overflow-y-auto">
            {candidates.map((candidate, idx) => (
              <button
                key={`${candidate.providerId}-${idx}`}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
                onClick={() => handleSelect(candidate)}
              >
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <div className="font-medium">{candidate.primary}</div>
                  <div className="text-xs text-muted-foreground">{candidate.secondary}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {showDropdown && candidates.length === 0 && !isSearching && cityQuery.trim().length >= 2 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md p-3 text-sm text-muted-foreground text-center">
            No cities found
          </div>
        )}
      </div>

      {/* Selected location display */}
      {isSelected && value && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Check className="w-3 h-3 text-primary" />
          {value.formatted}
          <span className="text-[10px] opacity-60">({value.lat.toFixed(2)}, {value.lng.toFixed(2)})</span>
        </p>
      )}
    </div>
  );
}
