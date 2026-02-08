/**
 * Tour Stop Parsing Engine - Canonical Helper
 * 
 * Patch 2.3.2: Business Tours Bulk Import & Parsing Engine
 * 
 * SINGLE SOURCE OF TRUTH:
 * All bulk import paths (text, email, CSV, image) MUST call parseTourStopsFromSource().
 * This ensures consistent normalization and validation across all input types.
 * 
 * ARCHITECTURE:
 * - sourceType identifies the input origin for tracking and debugging
 * - All outputs normalize to TourStopInput[] for database insertion
 * - parsed_from is set automatically based on sourceType
 * - needs_review defaults to true until user confirms
 * 
 * PLAN GATING:
 * - This helper is Business-tier ONLY
 * - Access is enforced at the container level (TripTourContainer)
 * - Free/Pro users cannot reach the UI that calls this helper
 * 
 * NON-MONETARY:
 * - Tour stops have NO cost fields
 * - Never used in expense calculations
 */

import { parse, isValid, format } from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

export type TourStopSourceType = 'text' | 'email_body' | 'csv' | 'image';

/**
 * Normalized tour stop ready for database insertion
 */
export interface TourStopInput {
  id: string; // Temporary ID for UI tracking
  name: string;
  date: string | null; // ISO format YYYY-MM-DD (required for save)
  startTime: string | null; // HH:MM format (optional)
  address: string | null;
  storeNumber: string | null;
  notes: string | null;
  parsed_from: TourStopSourceType;
  needs_review: boolean;
  rawInput: string; // Original input for debugging
  parseError?: string; // Error message if parsing failed
}

/**
 * CSV row structure (flexible header mapping)
 */
export interface CSVRow {
  [key: string]: string;
}

/**
 * Result from parsing operation
 */
export interface ParseResult {
  stops: TourStopInput[];
  successCount: number;
  errorCount: number;
  warnings: string[];
}

// =============================================================================
// DATE & TIME PARSING (shared with stopParsing.ts patterns)
// =============================================================================

const DATE_PATTERNS = [
  { pattern: /(\d{4}-\d{2}-\d{2})/, format: 'yyyy-MM-dd' },
  { pattern: /(\d{1,2}\/\d{1,2}\/\d{4})/, format: 'M/d/yyyy' },
  { pattern: /(\d{1,2}\/\d{1,2}\/\d{2})/, format: 'M/d/yy' },
  { pattern: /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i, format: 'MMMM d, yyyy' },
  { pattern: /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})(?!\s*,?\s*\d)/i, format: 'MMMM d' },
];

const TIME_PATTERNS = [
  /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i,
  /(\d{1,2}):(\d{2})(?:\s|$|,)/,
  /(\d{1,2})\s*(am|pm|AM|PM)/i,
];

const STORE_NUMBER_PATTERNS = [
  /#(\d{3,6})/,
  /store\s*#?\s*(\d{3,6})/i,
  /loc(?:ation)?\s*#?\s*(\d{3,6})/i,
  /unit\s*#?\s*(\d{3,6})/i,
];

const ADDRESS_INDICATORS = [
  'street', 'st.', 'st,', 'avenue', 'ave.', 'ave,', 'road', 'rd.', 'rd,',
  'drive', 'dr.', 'dr,', 'lane', 'ln.', 'ln,', 'blvd', 'boulevard',
  'way', 'circle', 'court', 'ct.', 'ct,', 'plaza', 'suite', 'ste.',
];

const STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

// CSV header mappings
const DATE_HEADERS = ['date', 'day', 'stop date', 'visit date', 'appointment date'];
const TIME_HEADERS = ['time', 'start time', 'start', 'appointment time', 'visit time'];
const NAME_HEADERS = ['stop', 'name', 'location', 'place', 'store', 'client', 'company', 'site'];
const ADDRESS_HEADERS = ['address', 'street address', 'full address', 'location address'];
const STORE_HEADERS = ['store #', 'store number', 'store', 'location #', 'location number', 'unit', 'unit #'];

// =============================================================================
// EXTRACTION HELPERS
// =============================================================================

function extractDate(text: string): { date: string; remaining: string } | null {
  for (const { pattern, format: dateFormat } of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      try {
        let dateStr = match[1];
        let parsed: Date;
        
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

function extractTime(text: string): { time: string; remaining: string } | null {
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      let minutes = '00';
      let ampm: string | undefined;
      
      // Check which pattern matched based on capture groups
      if (match[2] && /^\d{2}$/.test(match[2])) {
        // Matched HH:MM pattern
        minutes = match[2];
        ampm = match[3]; // May be undefined
      } else if (match[2] && /^(am|pm)$/i.test(match[2])) {
        // Matched "H AM/PM" pattern (hour only with AM/PM)
        ampm = match[2];
        minutes = '00';
      }
      
      // Apply AM/PM conversion
      if (ampm && /pm/i.test(ampm) && hours !== 12) {
        hours += 12;
      } else if (ampm && /am/i.test(ampm) && hours === 12) {
        hours = 0;
      }
      
      const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
      const remaining = text.replace(match[0], '').trim();
      return { time, remaining };
    }
  }
  return null;
}

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

function hasAddressIndicators(text: string): boolean {
  const lowerText = text.toLowerCase();
  return ADDRESS_INDICATORS.some(indicator => lowerText.includes(indicator));
}

function hasStateOrZip(text: string): boolean {
  const statePattern = new RegExp(`\\b(${STATE_ABBREVIATIONS.join('|')})\\b`, 'i');
  const zipPattern = /\b\d{5}(-\d{4})?\b/;
  return statePattern.test(text) || zipPattern.test(text);
}

function extractAddress(text: string): { address: string | null; remaining: string } {
  if (hasAddressIndicators(text) || hasStateOrZip(text)) {
    return { address: text.trim(), remaining: '' };
  }
  
  const segments = text.split(',').map(s => s.trim());
  if (segments.length >= 2) {
    const potentialAddress = segments.slice(1).join(', ');
    if (hasAddressIndicators(potentialAddress) || hasStateOrZip(potentialAddress)) {
      return { address: potentialAddress, remaining: segments[0] };
    }
  }
  
  return { address: null, remaining: text };
}

function generateId(sourceType: TourStopSourceType, index: number): string {
  return `${sourceType}-${index}-${Date.now()}`;
}

// =============================================================================
// TEXT PARSING (text & email_body)
// =============================================================================

function parseTextLine(line: string, index: number, sourceType: TourStopSourceType): TourStopInput {
  const rawLine = line.trim();
  const id = generateId(sourceType, index);
  
  if (!rawLine) {
    return {
      id,
      name: '',
      date: null,
      startTime: null,
      address: null,
      storeNumber: null,
      notes: null,
      parsed_from: sourceType,
      needs_review: true,
      rawInput: rawLine,
      parseError: 'Empty line',
    };
  }
  
  let workingText = rawLine;
  let date: string | null = null;
  let startTime: string | null = null;
  let storeNumber: string | null = null;
  let address: string | null = null;
  
  // Extract structured data
  const dateResult = extractDate(workingText);
  if (dateResult) {
    date = dateResult.date;
    workingText = dateResult.remaining;
  }
  
  const timeResult = extractTime(workingText);
  if (timeResult) {
    startTime = timeResult.time;
    workingText = timeResult.remaining;
  }
  
  const storeResult = extractStoreNumber(workingText);
  if (storeResult) {
    storeNumber = storeResult.storeNumber;
    workingText = storeResult.remaining;
  }
  
  const addressResult = extractAddress(workingText);
  address = addressResult.address;
  workingText = addressResult.remaining;
  
  // Parse name and notes
  let name = workingText;
  let notes: string | null = null;
  
  const separatorIndex = Math.min(
    workingText.indexOf(' - ') >= 0 ? workingText.indexOf(' - ') : Infinity,
    workingText.indexOf(', ') >= 0 ? workingText.indexOf(', ') : Infinity
  );
  
  if (separatorIndex !== Infinity && separatorIndex > 0) {
    name = workingText.slice(0, separatorIndex).trim();
    const afterSeparator = workingText.slice(separatorIndex + 2).trim();
    
    if (hasAddressIndicators(afterSeparator) || hasStateOrZip(afterSeparator)) {
      if (!address) {
        address = afterSeparator;
      }
    } else {
      notes = afterSeparator;
    }
  }
  
  name = name.replace(/^[-,\s]+|[-,\s]+$/g, '').trim();
  const needsReview = !date || !name;
  
  return {
    id,
    name: name || rawLine.slice(0, 50),
    date,
    startTime,
    address,
    storeNumber,
    notes,
    parsed_from: sourceType,
    needs_review: needsReview,
    rawInput: rawLine,
    parseError: !date ? 'Could not extract date' : undefined,
  };
}

function parseTextPayload(payload: string, sourceType: TourStopSourceType): ParseResult {
  const lines = payload.split('\n').filter(line => line.trim().length > 0);
  const stops: TourStopInput[] = [];
  let successCount = 0;
  let errorCount = 0;
  const warnings: string[] = [];
  
  lines.forEach((line, index) => {
    const stop = parseTextLine(line, index, sourceType);
    
    if (stop.name && stop.date) {
      successCount++;
    } else if (stop.name) {
      errorCount++;
      warnings.push(`Line ${index + 1}: Missing date`);
    } else {
      errorCount++;
    }
    
    if (stop.name) {
      stops.push(stop);
    }
  });
  
  return { stops, successCount, errorCount, warnings };
}

// =============================================================================
// CSV PARSING
// =============================================================================

function findHeaderMatch(headers: string[], targetHeaders: string[]): string | null {
  const normalizedTargets = targetHeaders.map(h => h.toLowerCase().trim());
  
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (normalizedTargets.includes(normalized)) {
      return header;
    }
  }
  return null;
}

function parseCSVPayload(rows: CSVRow[], sourceType: TourStopSourceType = 'csv'): ParseResult {
  const stops: TourStopInput[] = [];
  let successCount = 0;
  let errorCount = 0;
  const warnings: string[] = [];
  
  if (rows.length === 0) {
    return { stops, successCount, errorCount, warnings: ['No data rows found'] };
  }
  
  // Detect headers from first row
  const headers = Object.keys(rows[0]);
  const dateHeader = findHeaderMatch(headers, DATE_HEADERS);
  const timeHeader = findHeaderMatch(headers, TIME_HEADERS);
  const nameHeader = findHeaderMatch(headers, NAME_HEADERS);
  const addressHeader = findHeaderMatch(headers, ADDRESS_HEADERS);
  const storeHeader = findHeaderMatch(headers, STORE_HEADERS);
  
  if (!nameHeader) {
    warnings.push('Could not detect name/location column');
  }
  
  rows.forEach((row, index) => {
    const id = generateId(sourceType, index);
    const rawInput = JSON.stringify(row);
    
    // Extract values
    let name = nameHeader ? row[nameHeader]?.trim() || '' : '';
    let date: string | null = null;
    let startTime: string | null = null;
    let address = addressHeader ? row[addressHeader]?.trim() || null : null;
    let storeNumber = storeHeader ? row[storeHeader]?.trim() || null : null;
    
    // Parse date from column
    if (dateHeader && row[dateHeader]) {
      const dateResult = extractDate(row[dateHeader]);
      if (dateResult) {
        date = dateResult.date;
      }
    }
    
    // Parse time from column
    if (timeHeader && row[timeHeader]) {
      const timeResult = extractTime(row[timeHeader]);
      if (timeResult) {
        startTime = timeResult.time;
      }
    }
    
    // Clean store number (remove # prefix if present)
    if (storeNumber) {
      storeNumber = storeNumber.replace(/^#/, '').trim();
    }
    
    // Fallback: try to extract from name column if structured fields are missing
    if (!date && name) {
      const dateResult = extractDate(name);
      if (dateResult) {
        date = dateResult.date;
        name = dateResult.remaining;
      }
    }
    
    const needsReview = !date || !name;
    
    if (name) {
      stops.push({
        id,
        name,
        date,
        startTime,
        address,
        storeNumber,
        notes: null,
        parsed_from: sourceType,
        needs_review: needsReview,
        rawInput,
        parseError: !date ? 'Could not extract date' : undefined,
      });
      
      if (date) {
        successCount++;
      } else {
        errorCount++;
        warnings.push(`Row ${index + 1}: Missing date`);
      }
    }
  });
  
  return { stops, successCount, errorCount, warnings };
}

// =============================================================================
// IMAGE/OCR PARSING
// =============================================================================

function parseImageOCRPayload(extractedText: string): ParseResult {
  // OCR text is treated as regular text with source type 'image'
  const result = parseTextPayload(extractedText, 'image');
  
  // Mark all image-derived stops with additional review note
  result.stops.forEach(stop => {
    stop.needs_review = true; // Always require review for OCR
    if (!stop.parseError) {
      stop.notes = stop.notes 
        ? `${stop.notes} (Imported from photo – please review)`
        : 'Imported from photo – please review';
    }
  });
  
  return result;
}

// =============================================================================
// MAIN CANONICAL HELPER
// =============================================================================

/**
 * parseTourStopsFromSource - THE canonical helper for all bulk import paths
 * 
 * @param sourceType - Origin of the data: 'text' | 'email_body' | 'csv' | 'image'
 * @param payload - Raw input (string for text/email/image, CSVRow[] for csv)
 * @returns ParseResult with normalized TourStopInput[]
 * 
 * USAGE:
 * - All import paths MUST call this helper
 * - Stops are never auto-saved; user confirmation is required
 * - needs_review defaults to true
 */
export function parseTourStopsFromSource(
  sourceType: TourStopSourceType,
  payload: string | CSVRow[]
): ParseResult {
  switch (sourceType) {
    case 'text':
    case 'email_body':
      if (typeof payload !== 'string') {
        return { stops: [], successCount: 0, errorCount: 1, warnings: ['Invalid payload type for text source'] };
      }
      return parseTextPayload(payload, sourceType);
    
    case 'csv':
      if (!Array.isArray(payload)) {
        return { stops: [], successCount: 0, errorCount: 1, warnings: ['Invalid payload type for CSV source'] };
      }
      return parseCSVPayload(payload as CSVRow[], 'csv');
    
    case 'image':
      if (typeof payload !== 'string') {
        return { stops: [], successCount: 0, errorCount: 1, warnings: ['Invalid payload type for image source'] };
      }
      return parseImageOCRPayload(payload);
    
    default:
      return { stops: [], successCount: 0, errorCount: 1, warnings: [`Unknown source type: ${sourceType}`] };
  }
}

/**
 * Parse CSV text into rows (for file upload)
 */
export function parseCSVText(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) return []; // Need header + at least one data row
  
  const headers = parseCSVLine(lines[0]);
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: CSVRow = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

/**
 * Parse a single CSV line respecting quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Validate a stop has required fields for database insertion
 */
export function isValidTourStop(stop: TourStopInput): boolean {
  return !!(stop.name && stop.name.trim().length > 0 && stop.date);
}

/**
 * Prepare stops for database insertion (filter valid, format fields)
 */
export function prepareTourStopsForInsert(stops: TourStopInput[], tripId: string) {
  return stops
    .filter(isValidTourStop)
    .map(stop => ({
      trip_id: tripId,
      name: stop.name.trim(),
      date: stop.date!,
      start_time: stop.startTime ? `${stop.startTime}:00` : '09:00:00',
      end_time: null,
      location: null,
      address: stop.address?.trim() || null,
      store_number: stop.storeNumber?.trim() || null,
      notes: stop.notes?.trim() || null,
      origin: 'parsed' as const,
    }));
}
