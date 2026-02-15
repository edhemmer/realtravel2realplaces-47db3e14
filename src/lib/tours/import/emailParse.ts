/**
 * v3.8.5: Email/Text Tour Stop Parser
 * 
 * Deterministic, regex-based parsing. No AI calls.
 * Extracts dates, times, venue/location text from pasted content or .eml files.
 */

import { TourImportItem, generateImportId, ImportIssue } from './types';
import { extractDate, extractTime } from './dateTimeParser';

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Parse pasted text or email body into TourImportItems.
 * Each non-empty line is treated as a potential stop.
 */
export function parseEmailToItems(textOrEml: string): TourImportItem[] {
  if (!textOrEml?.trim()) return [];

  // Strip common email headers if present
  const body = stripEmailHeaders(textOrEml);
  const lines = body.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);

  return lines.map(line => parseLineToItem(line));
}

// ============================================================================
// INTERNALS
// ============================================================================

function stripEmailHeaders(text: string): string {
  // Remove common email headers (From:, To:, Subject:, Date:, etc.)
  const lines = text.split('\n');
  let bodyStart = 0;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (/^(from|to|cc|bcc|subject|date|reply-to|content-type|mime-version):/i.test(lines[i].trim())) {
      bodyStart = i + 1;
    } else if (lines[i].trim() === '' && bodyStart > 0) {
      bodyStart = i + 1;
      break;
    }
  }
  return lines.slice(bodyStart).join('\n');
}

function parseLineToItem(line: string): TourImportItem {
  const issues: ImportIssue[] = [];
  const date = extractDate(line);
  const time = extractTime(line);

  if (!date) {
    issues.push({ type: 'BLOCKING', code: 'MISSING_DATE', message: 'No date detected in this line.' });
  }

  // Extract title: use the portion before the first date/time pattern, or the whole line
  const title = extractTitle(line);

  // Best-effort location: anything after the date/time that looks like an address
  const rawLocationText = extractLocationText(line);

  if (!rawLocationText) {
    issues.push({ type: 'BLOCKING', code: 'MISSING_LOCATION', message: 'No location detected. Please select a city.' });
  }

  return {
    id: generateImportId(),
    title: title || null,
    date,
    time,
    timeCertainty: time ? 'CONFIRMED' : 'TBD',
    venue: null,
    rawLocationText,
    location: null,
    notes: null,
    source: 'EMAIL',
    confidence: date ? (rawLocationText ? 0.7 : 0.4) : 0.2,
    issues,
  };
}

function extractTitle(line: string): string {
  // Split by common delimiters and take the first segment as title
  const parts = line.split(/[,;|]/).map(p => p.trim());
  if (parts.length > 0) {
    // Remove date/time patterns from the first part
    let title = parts[0]
      .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/, '')
      .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/, '')
      .replace(/\b\d{1,2}:\d{2}\s*(am|pm|a\.m\.|p\.m\.)?\b/gi, '')
      .replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+\d{1,2}[\s,]*\d{0,4}/gi, '')
      .trim();
    // Clean up leading/trailing punctuation
    title = title.replace(/^[\s,\-–—]+|[\s,\-–—]+$/g, '').trim();
    return title || parts[0];
  }
  return line;
}

function extractLocationText(line: string): string | null {
  const parts = line.split(/[,;|]/).map(p => p.trim());
  // Look for parts that resemble locations (contain numbers + street words, or state abbreviations)
  const locationParts: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    // Skip parts that are just dates or times
    if (extractDate(part) || extractTime(part)) continue;
    // Skip very short parts (likely not locations)
    if (part.length < 3) continue;
    locationParts.push(part);
  }
  
  if (locationParts.length > 0) {
    return locationParts.join(', ');
  }
  return null;
}
