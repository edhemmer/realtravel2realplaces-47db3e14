/**
 * Tour Stop Parsing Engine Tests
 * 
 * Patch 2.3.2: Business Tours Bulk Import & Parsing Engine
 * 
 * Tests the canonical parseTourStopsFromSource helper
 */

import { describe, it, expect } from 'vitest';
import { 
  parseTourStopsFromSource, 
  parseCSVText,
  isValidTourStop,
  TourStopInput,
} from '../tourStopParsing';

describe('parseTourStopsFromSource', () => {
  describe('text source parsing', () => {
    it('parses a simple line with date and time', () => {
      const result = parseTourStopsFromSource('text', 'Client Meeting, February 15, 2024, 9:30 AM');
      
      expect(result.stops).toHaveLength(1);
      expect(result.stops[0].name).toBe('Client Meeting');
      expect(result.stops[0].date).toBe('2024-02-15');
      expect(result.stops[0].startTime).toBe('09:30');
      expect(result.stops[0].parsed_from).toBe('text');
      expect(result.successCount).toBe(1);
    });

    it('parses multiple lines', () => {
      const input = `Meeting A, 2/15/24, 9:00 AM
Meeting B, 2/16/24, 10:00 AM
Meeting C, 2/17/24, 11:00 AM`;
      
      const result = parseTourStopsFromSource('text', input);
      
      expect(result.stops).toHaveLength(3);
      expect(result.successCount).toBe(3);
    });

    it('extracts store numbers', () => {
      const result = parseTourStopsFromSource('text', 'Walmart Store #4532, Feb 15 2024, 10:00 AM');
      
      expect(result.stops[0].storeNumber).toBe('4532');
    });

    it('extracts addresses with street indicators', () => {
      const result = parseTourStopsFromSource('text', 'Office Visit, Feb 15 2024, 123 Main Street, Denver CO 80202');
      
      expect(result.stops[0].address).toContain('Denver');
    });

    it('marks stops without dates as needing review', () => {
      const result = parseTourStopsFromSource('text', 'Meeting without date');
      
      expect(result.stops[0].needs_review).toBe(true);
      expect(result.stops[0].parseError).toBe('Could not extract date');
      expect(result.errorCount).toBe(1);
    });

    it('handles various date formats', () => {
      const formats = [
        { input: 'Meeting, 2024-02-15, 9 AM', expected: '2024-02-15' },
        { input: 'Meeting, 02/15/2024, 9 AM', expected: '2024-02-15' },
        { input: 'Meeting, 2/15/24, 9 AM', expected: '2024-02-15' },
        { input: 'Meeting, February 15, 2024, 9 AM', expected: '2024-02-15' },
      ];
      
      for (const { input, expected } of formats) {
        const result = parseTourStopsFromSource('text', input);
        expect(result.stops[0].date).toBe(expected);
      }
    });

    it('handles various time formats', () => {
      const formats = [
        { input: 'Meeting, 2/15/24, 9:30 AM', expected: '09:30' },
        { input: 'Meeting, 2/15/24, 9:30AM', expected: '09:30' },
        { input: 'Meeting, 2/15/24, 14:30', expected: '14:30' },
        { input: 'Meeting, 2/15/24, 2:00 PM', expected: '14:00' },
      ];
      
      for (const { input, expected } of formats) {
        const result = parseTourStopsFromSource('text', input);
        expect(result.stops[0].startTime).toBe(expected);
      }
    });
  });

  describe('email_body source parsing', () => {
    it('parses email body text with correct source type', () => {
      const result = parseTourStopsFromSource('email_body', 'Client Meeting, February 15, 2024, 9:30 AM');
      
      expect(result.stops[0].parsed_from).toBe('email_body');
    });
  });

  describe('csv source parsing', () => {
    it('parses CSV rows with mapped headers', () => {
      const rows = [
        { 'Date': '2024-02-15', 'Time': '9:30 AM', 'Stop': 'Client A', 'Address': '123 Main St' },
        { 'Date': '2024-02-16', 'Time': '10:00 AM', 'Stop': 'Client B', 'Address': '456 Oak Ave' },
      ];
      
      const result = parseTourStopsFromSource('csv', rows);
      
      expect(result.stops).toHaveLength(2);
      expect(result.stops[0].name).toBe('Client A');
      expect(result.stops[0].date).toBe('2024-02-15');
      expect(result.stops[0].address).toBe('123 Main St');
      expect(result.stops[0].parsed_from).toBe('csv');
    });

    it('handles various header names', () => {
      const rows = [
        { 'Stop Date': '2024-02-15', 'Start Time': '9:30 AM', 'Location': 'Client A' },
      ];
      
      const result = parseTourStopsFromSource('csv', rows);
      
      expect(result.stops[0].name).toBe('Client A');
      expect(result.stops[0].date).toBe('2024-02-15');
    });

    it('extracts store numbers from CSV', () => {
      const rows = [
        { 'Date': '2024-02-15', 'Name': 'Walmart', 'Store #': '4532' },
      ];
      
      const result = parseTourStopsFromSource('csv', rows);
      
      expect(result.stops[0].storeNumber).toBe('4532');
    });
  });

  describe('image source parsing', () => {
    it('parses OCR text with review flag always true', () => {
      const result = parseTourStopsFromSource('image', 'Client Meeting, February 15, 2024, 9:30 AM');
      
      expect(result.stops[0].parsed_from).toBe('image');
      expect(result.stops[0].needs_review).toBe(true);
      // Note is added for successfully parsed stops
      expect(result.stops[0].notes).toContain('Imported from photo');
    });
  });

  describe('invalid input handling', () => {
    it('returns error for invalid payload type', () => {
      // @ts-expect-error - Testing runtime behavior with invalid type
      const result = parseTourStopsFromSource('text', ['array', 'instead', 'of', 'string']);
      
      expect(result.stops).toHaveLength(0);
      expect(result.errorCount).toBe(1);
      expect(result.warnings).toContain('Invalid payload type for text source');
    });

    it('returns empty result for empty input', () => {
      const result = parseTourStopsFromSource('text', '');
      
      expect(result.stops).toHaveLength(0);
    });
  });
});

describe('parseCSVText', () => {
  it('parses CSV text into rows', () => {
    const csv = `Date,Time,Stop,Address
2024-02-15,9:30 AM,Client A,123 Main St
2024-02-16,10:00 AM,Client B,456 Oak Ave`;
    
    const rows = parseCSVText(csv);
    
    expect(rows).toHaveLength(2);
    expect(rows[0]['Date']).toBe('2024-02-15');
    expect(rows[0]['Stop']).toBe('Client A');
  });

  it('handles quoted values with commas', () => {
    const csv = `Name,Address
Client A,"123 Main St, Suite 100"`;
    
    const rows = parseCSVText(csv);
    
    expect(rows[0]['Address']).toBe('123 Main St, Suite 100');
  });

  it('returns empty array for header-only CSV', () => {
    const csv = `Date,Time,Stop`;
    
    const rows = parseCSVText(csv);
    
    expect(rows).toHaveLength(0);
  });
});

describe('isValidTourStop', () => {
  it('returns true for stop with name and date', () => {
    const stop: TourStopInput = {
      id: 'test-1',
      name: 'Client Meeting',
      date: '2024-02-15',
      startTime: null,
      address: null,
      storeNumber: null,
      notes: null,
      parsed_from: 'text',
      needs_review: false,
      rawInput: 'test',
    };
    
    expect(isValidTourStop(stop)).toBe(true);
  });

  it('returns false for stop without date', () => {
    const stop: TourStopInput = {
      id: 'test-1',
      name: 'Client Meeting',
      date: null,
      startTime: null,
      address: null,
      storeNumber: null,
      notes: null,
      parsed_from: 'text',
      needs_review: true,
      rawInput: 'test',
    };
    
    expect(isValidTourStop(stop)).toBe(false);
  });

  it('returns false for stop without name', () => {
    const stop: TourStopInput = {
      id: 'test-1',
      name: '',
      date: '2024-02-15',
      startTime: null,
      address: null,
      storeNumber: null,
      notes: null,
      parsed_from: 'text',
      needs_review: true,
      rawInput: 'test',
    };
    
    expect(isValidTourStop(stop)).toBe(false);
  });
});

describe('Architecture enforcement', () => {
  it('all parsed stops have parsed_from set correctly', () => {
    const sources = ['text', 'email_body', 'csv', 'image'] as const;
    const testInput = 'Meeting, Feb 15 2024, 9:30 AM';
    
    for (const source of sources) {
      const payload = source === 'csv' 
        ? [{ 'Date': '2024-02-15', 'Name': 'Meeting' }] 
        : testInput;
      const result = parseTourStopsFromSource(source, payload);
      
      if (result.stops.length > 0) {
        expect(result.stops[0].parsed_from).toBe(source);
      }
    }
  });

  it('all parsed stops have needs_review defaulted correctly', () => {
    // Valid stop with recognized date should not need review
    const validResult = parseTourStopsFromSource('text', 'Meeting, 2/15/24, 9:30 AM');
    expect(validResult.stops[0].needs_review).toBe(false);
    
    // Invalid stop (no date) should need review
    const invalidResult = parseTourStopsFromSource('text', 'Meeting without date');
    expect(invalidResult.stops[0].needs_review).toBe(true);
    
    // Image-derived stops always need review
    const imageResult = parseTourStopsFromSource('image', 'Meeting, 2/15/24, 9:30 AM');
    expect(imageResult.stops[0].needs_review).toBe(true);
  });

  it('no stop has cost/price fields (NON-MONETARY enforcement)', () => {
    const result = parseTourStopsFromSource('text', 'Meeting, 2/15/24, 9:30 AM, $50');
    
    const stop = result.stops[0];
    expect(stop).not.toHaveProperty('cost');
    expect(stop).not.toHaveProperty('price');
    expect(stop).not.toHaveProperty('amount');
    expect(stop).not.toHaveProperty('total');
  });
});
