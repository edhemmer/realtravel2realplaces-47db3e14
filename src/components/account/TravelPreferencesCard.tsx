import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plane, DollarSign, Calendar, Check, AlertCircle, Ruler, Thermometer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { searchAirports, formatAirport, getAirportByCode, Airport } from '@/lib/airportData';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD – US Dollar' },
  { value: 'EUR', label: 'EUR – Euro' },
  { value: 'GBP', label: 'GBP – British Pound' },
  { value: 'CAD', label: 'CAD – Canadian Dollar' },
  { value: 'AUD', label: 'AUD – Australian Dollar' },
  { value: 'MXN', label: 'MXN – Mexican Peso' },
];

const DATETIME_FORMAT_OPTIONS = [
  { value: 'MM/DD/YYYY 12h', label: 'MM/DD/YYYY, 12-hour clock' },
  { value: 'DD/MM/YYYY 24h', label: 'DD/MM/YYYY, 24-hour clock' },
];

interface TravelPreferencesCardProps {
  initialAirport?: string | null;
  initialCurrency?: string | null;
  initialDatetimeFormat?: string | null;
  initialDistanceUnit?: 'miles' | 'kilometers' | null;
  initialTemperatureUnit?: 'fahrenheit' | 'celsius' | null;
}

export function TravelPreferencesCard({
  initialAirport,
  initialCurrency,
  initialDatetimeFormat,
  initialDistanceUnit,
  initialTemperatureUnit,
}: TravelPreferencesCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [homeAirport, setHomeAirport] = useState(initialAirport || '');
  const [airportInput, setAirportInput] = useState('');
  const [airportSuggestions, setAirportSuggestions] = useState<Airport[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currency, setCurrency] = useState(initialCurrency || 'USD');
  const [datetimeFormat, setDatetimeFormat] = useState(initialDatetimeFormat || 'MM/DD/YYYY 12h');
  const [distanceUnit, setDistanceUnit] = useState<'miles' | 'kilometers'>(initialDistanceUnit || 'miles');
  const [temperatureUnit, setTemperatureUnit] = useState<'fahrenheit' | 'celsius'>(initialTemperatureUnit || 'fahrenheit');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize airport input display
  useEffect(() => {
    if (initialAirport) {
      const airport = getAirportByCode(initialAirport);
      if (airport) {
        setAirportInput(formatAirport(airport));
      } else {
        setAirportInput(initialAirport);
      }
    }
  }, [initialAirport]);

  // Handle click outside suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAirportInputChange = (value: string) => {
    setAirportInput(value);
    const suggestions = searchAirports(value);
    setAirportSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
    
    // If the user clears the input, clear the stored code
    if (!value.trim()) {
      setHomeAirport('');
    }
  };

  const handleSelectAirport = (airport: Airport) => {
    setHomeAirport(airport.code);
    setAirportInput(formatAirport(airport));
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_home_airport: homeAirport || null,
          preferred_currency: currency,
          preferred_datetime_format: datetimeFormat,
          distance_unit: distanceUnit,
          temperature_unit: temperatureUnit,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving preferences:', error);
        setSaveStatus('error');
      } else {
        setSaveStatus('success');
        // Invalidate user profile query to refresh preferences across the app
        queryClient.invalidateQueries({ queryKey: ['user-profile', user.id] });
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Unexpected error saving preferences:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plane className="w-5 h-5 text-primary" />
          Travel Preferences
        </CardTitle>
        <CardDescription>Customize your travel defaults</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Home Airport */}
        <div className="space-y-2">
          <Label htmlFor="home-airport">Home airport</Label>
          <div className="relative">
            <Input
              ref={inputRef}
              id="home-airport"
              value={airportInput}
              onChange={(e) => handleAirportInputChange(e.target.value)}
              onFocus={() => {
                if (airportSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Search by code or city (e.g., ATL, Denver)"
              autoComplete="off"
            />
            {showSuggestions && airportSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
              >
                {airportSuggestions.map((airport) => (
                  <button
                    key={airport.code}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm"
                    onClick={() => handleSelectAirport(airport)}
                  >
                    <span className="font-medium">{airport.code}</span>
                    <span className="text-muted-foreground"> – {airport.city}</span>
                    {airport.state && <span className="text-muted-foreground">, {airport.state}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <Label htmlFor="currency" className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            Preferred currency
          </Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date/Time Format */}
        <div className="space-y-2">
          <Label htmlFor="datetime-format" className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Date and time format
          </Label>
          <Select value={datetimeFormat} onValueChange={setDatetimeFormat}>
            <SelectTrigger id="datetime-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATETIME_FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Distance Unit */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5">
            <Ruler className="w-4 h-4 text-muted-foreground" />
            Distance unit
          </Label>
          <RadioGroup
            value={distanceUnit}
            onValueChange={(value) => setDistanceUnit(value as 'miles' | 'kilometers')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="miles" id="miles" />
              <Label htmlFor="miles" className="font-normal cursor-pointer">Miles</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="kilometers" id="kilometers" />
              <Label htmlFor="kilometers" className="font-normal cursor-pointer">Kilometers</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Temperature Unit */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-muted-foreground" />
            Temperature unit
          </Label>
          <RadioGroup
            value={temperatureUnit}
            onValueChange={(value) => setTemperatureUnit(value as 'fahrenheit' | 'celsius')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fahrenheit" id="fahrenheit" />
              <Label htmlFor="fahrenheit" className="font-normal cursor-pointer">Fahrenheit (°F)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="celsius" id="celsius" />
              <Label htmlFor="celsius" className="font-normal cursor-pointer">Celsius (°C)</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Save Button & Status */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-sm text-primary">
              <Check className="w-4 h-4" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              Failed to save. Please try again.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
