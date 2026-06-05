/**
 * Stop Parsing Utilities
 * 
 * Patch 2.1.26: Enhanced bulk Tour stop parsing
 * 
 * PARSING RULES (accuracy over cleverness):
 * - Date is REQUIRED - if not found with high confidence, skip the stop
 * - Time is OPTIONAL - only extract if clearly present
 * - Address extraction looks for common patterns (street, city, state, ZIP)
 * - Store number looks for patterns like "#1234" or "Store 1234"
 * - Never guess - if unsure, leave field blank for user review
 */

import { parse, isValid, format } from 'date-fns';

/**
 * Parsed stop result from a single line
 */
export interface ParsedStopResult {
  id: string;
  name: string;
  date: string | null; // ISO format YYYY-MM-DD
  startTime: string | null; // HH:MM format
  address: string | null;
  storeNumber: string | null;
  notes: string | null;
  rawLine: string;
  parseError?: string;
  needsReview: boolean;
}

// Common date patterns to try
const DATE_PATTERNS = [
  // ISO: 2024-02-15
  { pattern: /(\d{4}-\d{2}-\d{2})/, format: 'yyyy-MM-dd' },
  // US: 02/15/2024, 2/15/2024
  { pattern: /(\d{1,2}\/\d{1,2}\/\d{4})/, format: 'M/d/yyyy' },
  // US short: 02/15/24, 2/15/24
  { pattern: /(\d{1,2}\/\d{1,2}\/\d{2})/, format: 'M/d/yy' },
  // Written: Feb 15, 2024 or February 15, 2024
  { pattern: /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i, format: 'MMMM d, yyyy' },
  // Written short: Feb 15 or February 15 (assumes current year)
  { pattern: /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})(?!\s*,?\s*\d)/i, format: 'MMMM d' },
  // European: 15/02/2024
  { pattern: /(\d{1,2}-\d{1,2}-\d{4})/, format: 'd-M-yyyy' },
];

// Time patterns (12-hour and 24-hour)
const TIME_PATTERNS = [
  // 12-hour: 9:30 AM, 9:30AM, 9:30 am
  /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i,
  // 24-hour: 14:00, 09:30
  /(\d{1,2}):(\d{2})(?:\s|$|,)/,
  // Hour only with AM/PM: 9 AM, 9AM
  /(\d{1,2})\s*(am|pm|AM|PM)/i,
];

// Store number patterns
const STORE_NUMBER_PATTERNS = [
  /#(\d{3,6})/,                    // #1234
  /store\s*#?\s*(\d{3,6})/i,       // Store 1234, Store #1234
  /loc(?:ation)?\s*#?\s*(\d{3,6})/i, // Location 1234
  /unit\s*#?\s*(\d{3,6})/i,        // Unit 1234
];

// Address indicators (words that suggest an address follows)
const ADDRESS_INDICATORS = [
  'street', 'st.', 'st,', 'avenue', 'ave.', 'ave,', 'road', 'rd.', 'rd,',
  'drive', 'dr.', 'dr,', 'lane', 'ln.', 'ln,', 'blvd', 'boulevard',
  'way', 'circle', 'court', 'ct.', 'ct,', 'plaza', 'suite', 'ste.',
];

// US state abbreviations for address detection
const STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

/**
 * Extract date from text with high confidence
 */
function extractDate(text: string): { date: string; remaining: string } | null {
  for (const { pattern, format: dateFormat } of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      try {
        let dateStr = match[1];
        let parsed: Date;
        
        // Handle short month format (assumes current year)
        if (dateFormat === 'MMMM d') {
          const currentYear = new Date().getFullYear();
          dateStr = `${dateStr}, ${currentYear}`;
          parsed = parse(dateStr, 'MMMM d, yyyy', new Date());
        } else {
          parsed = parse(dateStr, dateFormat, new Date());
        }
        
        if (isValid(parsed)) {
          const isoDate = format(parsed, 'yyyy-MM-dd');
          const remaining = text.replace(match[0], '').trim();
          return { date: isoDate, remaining };
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Extract time from text
 */
function extractTime(text: string): { time: string; remaining: string } | null {
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? match[2] : '00';
      const ampm = match[3] || match[2];
      
      // Handle AM/PM
      if (typeof ampm === 'string' && /pm/i.test(ampm) && hours !== 12) {
        hours += 12;
      } else if (typeof ampm === 'string' && /am/i.test(ampm) && hours === 12) {
        hours = 0;
      }
      
      const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
      const remaining = text.replace(match[0], '').trim();
      return { time, remaining };
    }
  }
  return null;
}

/**
 * Extract store number from text
 */
function extractStoreNumber(text: string): { storeNumber: string; remaining: string } | null {
  for (const pattern of STORE_NUMBER_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const remaining = text.replace(match[0], '').trim();
      return { storeNumber: match[1], remaining };
    }
  }
  return null;
}

/**
 * Check if text contains address indicators
 */
function hasAddressIndicators(text: string): boolean {
  const lowerText = text.toLowerCase();
  return ADDRESS_INDICATORS.some(indicator => lowerText.includes(indicator));
}

/**
 * Check if text contains a US state abbreviation or ZIP code
 */
function hasStateOrZip(text: string): boolean {
  // Check for state abbreviations (word boundary)
  const statePattern = new RegExp(`\\b(${STATE_ABBREVIATIONS.join('|')})\\b`, 'i');
  // Check for ZIP code patterns
  const zipPattern = /\b\d{5}(-\d{4})?\b/;
  
  return statePattern.test(text) || zipPattern.test(text);
}

/**
 * Extract address from text
 * Looks for address-like patterns in the remaining text
 */
function extractAddress(text: string): { address: string | null; remaining: string } {
  // If the text looks like an address (has street indicators or state/zip)
  if (hasAddressIndicators(text) || hasStateOrZip(text)) {
    // The whole remaining text is likely the address
    return { address: text.trim(), remaining: '' };
  }
  
  // Check for comma-separated segments that look like addresses
  const segments = text.split(',').map(s => s.trim());
  if (segments.length >= 2) {
    const potentialAddress = segments.slice(1).join(', ');
    if (hasAddressIndicators(potentialAddress) || hasStateOrZip(potentialAddress)) {
      return { address: potentialAddress, remaining: segments[0] };
    }
  }
  
  return { address: null, remaining: text };
}

/**
 * Parse a single line into a stop object
 */
export function parseStopLine(line: string, index: number): ParsedStopResult {
  const rawLine = line.trim();
  const id = `bulk-${index}-${Date.now()}`;
  
  if (!rawLine) {
    return {
      id,
      name: '',
      date: null,
      startTime: null,
      address: null,
      storeNumber: null,
      notes: null,
      rawLine,
      parseError: 'Empty line',
      needsReview: true,
    };
  }
  
  let workingText = rawLine;
  let date: string | null = null;
  let startTime: string | null = null;
  let storeNumber: string | null = null;
  let address: string | null = null;
  
  // 1. Extract date (required)
  const dateResult = extractDate(workingText);
  if (dateResult) {
    date = dateResult.date;
    workingText = dateResult.remaining;
  }
  
  // 2. Extract time (optional)
  const timeResult = extractTime(workingText);
  if (timeResult) {
    startTime = timeResult.time;
    workingText = timeResult.remaining;
  }
  
  // 3. Extract store number (optional)
  const storeResult = extractStoreNumber(workingText);
  if (storeResult) {
    storeNumber = storeResult.storeNumber;
    workingText = storeResult.remaining;
  }
  
  // 4. Extract address (look for address patterns)
  const addressResult = extractAddress(workingText);
  address = addressResult.address;
  workingText = addressResult.remaining;
  
  // 5. What remains is the name (or notes if we have a name already)
  // Try to split on first separator if present
  let name = workingText;
  let notes: string | null = null;
  
  const separatorIndex = Math.min(
    workingText.indexOf(' - ') >= 0 ? workingText.indexOf(' - ') : Infinity,
    workingText.indexOf(', ') >= 0 ? workingText.indexOf(', ') : Infinity
  );
  
  if (separatorIndex !== Infinity && separatorIndex > 0) {
    name = workingText.slice(0, separatorIndex).trim();
    const afterSeparator = workingText.slice(separatorIndex + 2).trim();
    
    // Check if the after-separator part is an address
    if (hasAddressIndicators(afterSeparator) || hasStateOrZip(afterSeparator)) {
      if (!address) {
        address = afterSeparator;
      }
    } else {
      notes = afterSeparator;
    }
  }
  
  // Clean up the name
  name = name.replace(/^[-,\s]+|[-,\s]+$/g, '').trim();
  
  // Determine if this stop needs review
  const needsReview = !date || !name;
  
  return {
    id,
    name: name || rawLine.slice(0, 50), // Fallback to truncated raw line
    date,
    startTime,
    address,
    storeNumber,
    notes,
    rawLine,
    parseError: !date ? 'Could not extract date' : undefined,
    needsReview,
  };
}

/**
 * Parse multiline text into stop objects
 */
export function parseStopsFromText(text: string): ParsedStopResult[] {
  const lines = text.split('\n');
  return lines
    .map((line, index) => parseStopLine(line, index))
    .filter(stop => stop.name.length > 0 || stop.parseError);
}

/**
 * Format time for display (HH:MM -> h:mm a)
 */
export function formatTimeForDisplay(time: string | null): string {
  if (!time) return '--:--';
  
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0);
  return format(date, 'h:mm a');
}

/**
 * Build map URL for an address
 */
export function buildMapsUrl(address: string): string {
  const encodedAddress = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
}
