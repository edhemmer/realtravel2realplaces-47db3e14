/**
 * v3.8.5: Canonical Tour Import Types
 * 
 * Single source of truth for all tour import intake pipelines.
 * Used by Photo OCR, Email/Text, and Spreadsheet parsers.
 */

import { LocationStructured } from '@/lib/location/types';

// ============================================================================
// ENUMS
// ============================================================================

export type ImportSource = 'PHOTO_OCR' | 'EMAIL' | 'SPREADSHEET';
export type TimeCertainty = 'CONFIRMED' | 'TBD';
export type IssueLevel = 'BLOCKING' | 'WARNING';

// ============================================================================
// ISSUE
// ============================================================================

export interface ImportIssue {
  type: IssueLevel;
  code: string;
  message: string;
}

// ============================================================================
// TOUR IMPORT ITEM
// ============================================================================

export interface TourImportItem {
  /** Client-side unique ID for tracking in review UI */
  id: string;
  title: string | null;
  /** YYYY-MM-DD format; required to import */
  date: string | null;
  /** HH:mm format; null = TBD */
  time: string | null;
  timeCertainty: TimeCertainty;
  venue: string | null;
  /** Raw location text extracted from source (pre-resolution) */
  rawLocationText: string | null;
  /** Resolved structured location; required to import */
  location: LocationStructured | null;
  notes: string | null;
  source: ImportSource;
  /** 0–1 confidence score from parser */
  confidence: number;
  /** Blocking and warning issues */
  issues: ImportIssue[];
}

// ============================================================================
// HELPERS
// ============================================================================

let _idCounter = 0;

/** Generate a unique client-side ID for import items */
export function generateImportId(): string {
  _idCounter++;
  return `imp_${Date.now()}_${_idCounter}`;
}

/** Check if an item has any BLOCKING issues */
export function hasBlockingIssues(item: TourImportItem): boolean {
  return item.issues.some(i => i.type === 'BLOCKING');
}

/** Count blocking issues across all items */
export function countBlockingItems(items: TourImportItem[]): number {
  return items.filter(hasBlockingIssues).length;
}

/** Check if an item is ready to import (no blocking issues) */
export function isImportReady(item: TourImportItem): boolean {
  return !hasBlockingIssues(item);
}
