/**
 * v3.8.5: Spreadsheet (CSV + XLSX) Tour Stop Parser
 * 
 * Uses PapaParse for CSV and xlsx for Excel files.
 * Maps columns by header name (case-insensitive).
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { TourImportItem, generateImportId, ImportIssue } from './types';
import { extractDate, extractTime } from './dateTimeParser';

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Parse a spreadsheet file (CSV or XLSX) into TourImportItems.
 */
export async function parseSheetToItems(file: File): Promise<TourImportItem[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (ext === 'csv') {
    return parseCSV(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseXLSX(file);
  }
  
  return [];
}

// ============================================================================
// CSV PARSING
// ============================================================================

function parseCSV(file: File): Promise<TourImportItem[]> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const items = mapRowsToItems(result.data as Record<string, string>[]);
        resolve(items);
      },
      error: () => {
        resolve([]);
      },
    });
  });
}

// ============================================================================
// XLSX PARSING
// ============================================================================

async function parseXLSX(file: File): Promise<TourImportItem[]> {
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    return mapRowsToItems(rows);
  } catch {
    return [];
  }
}

// ============================================================================
// ROW MAPPING
// ============================================================================

/** Case-insensitive header mapping */
const HEADER_MAP: Record<string, string[]> = {
  date: ['date', 'day', 'when'],
  time: ['time', 'start_time', 'starttime', 'start time', 'arrival'],
  title: ['title', 'name', 'stop', 'event', 'meeting', 'description'],
  venue: ['venue', 'place'],
  city: ['city', 'town'],
  region: ['state', 'region', 'province', 'state/region'],
  country: ['country'],
  address: ['address', 'street', 'full address'],
  location: ['location', 'loc'],
  notes: ['notes', 'note', 'comments', 'comment', 'details'],
};

function findColumn(headers: string[], candidates: string[]): string | null {
  for (const h of headers) {
    const lower = h.toLowerCase().trim();
    if (candidates.includes(lower)) return h;
  }
  return null;
}

function mapRowsToItems(rows: Record<string, string>[]): TourImportItem[] {
  if (rows.length === 0) return [];
  
  const headers = Object.keys(rows[0]);
  
  const dateCol = findColumn(headers, HEADER_MAP.date);
  const timeCol = findColumn(headers, HEADER_MAP.time);
  const titleCol = findColumn(headers, HEADER_MAP.title);
  const venueCol = findColumn(headers, HEADER_MAP.venue);
  const cityCol = findColumn(headers, HEADER_MAP.city);
  const regionCol = findColumn(headers, HEADER_MAP.region);
  const countryCol = findColumn(headers, HEADER_MAP.country);
  const addressCol = findColumn(headers, HEADER_MAP.address);
  const locationCol = findColumn(headers, HEADER_MAP.location);
  const notesCol = findColumn(headers, HEADER_MAP.notes);
  
  return rows.map(row => {
    const issues: ImportIssue[] = [];
    
    // Date
    const rawDate = dateCol ? String(row[dateCol] || '') : '';
    const date = extractDate(rawDate) || extractDate(rawDate.replace(/[^\d\/\-a-zA-Z\s,]/g, ''));
    if (!date) {
      issues.push({ type: 'BLOCKING', code: 'MISSING_DATE', message: 'No valid date found in this row.' });
    }
    
    // Time
    const rawTime = timeCol ? String(row[timeCol] || '') : '';
    const time = extractTime(rawTime);
    
    // Title
    const title = titleCol ? String(row[titleCol] || '').trim() : null;
    
    // Venue
    const venue = venueCol ? String(row[venueCol] || '').trim() || null : null;
    
    // Location: prefer structured (city/region/country), fall back to location/address
    let rawLocationText: string | null = null;
    const city = cityCol ? String(row[cityCol] || '').trim() : '';
    const region = regionCol ? String(row[regionCol] || '').trim() : '';
    const country = countryCol ? String(row[countryCol] || '').trim() : '';
    
    if (city || region) {
      rawLocationText = [city, region, country].filter(Boolean).join(', ');
    } else if (locationCol) {
      rawLocationText = String(row[locationCol] || '').trim() || null;
    } else if (addressCol) {
      rawLocationText = String(row[addressCol] || '').trim() || null;
    }
    
    if (!rawLocationText) {
      issues.push({ type: 'BLOCKING', code: 'MISSING_LOCATION', message: 'No location found. Please select a city.' });
    }
    
    // Notes
    const notes = notesCol ? String(row[notesCol] || '').trim() || null : null;
    
    return {
      id: generateImportId(),
      title: title || null,
      date,
      time,
      timeCertainty: time ? 'CONFIRMED' as const : 'TBD' as const,
      venue,
      rawLocationText,
      location: null,
      notes,
      source: 'SPREADSHEET' as const,
      confidence: date && rawLocationText ? 0.8 : 0.3,
      issues,
    };
  });
}
