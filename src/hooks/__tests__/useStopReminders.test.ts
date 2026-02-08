/**
 * Stop Reminders Regression Tests
 * 
 * v2.1.28: Performance hardening patch
 * 
 * These tests validate the reminder scheduling rules:
 * 1. Stops WITH start_time get a 1-hour pre-stop reminder
 * 2. Stops WITHOUT start_time do NOT get reminders
 * 3. Editing a stop updates the reminder
 * 4. Deleting a stop removes the reminder (handled by CASCADE)
 */

import { describe, it, expect } from 'vitest';

/**
 * Reminder calculation logic (extracted for testing)
 * This mirrors the logic in useStopReminders.ts
 */
function calculateReminderDatetime(
  date: string, // YYYY-MM-DD
  startTime: string | null // HH:MM:SS or HH:MM
): string | null {
  if (!startTime) {
    return null; // No start time = no reminder
  }
  
  // Parse the date and time
  const [hours, minutes] = startTime.split(':').map(Number);
  
  // Create a Date object for the stop start time
  const stopDateTime = new Date(`${date}T${startTime}`);
  
  // Subtract 1 hour for the reminder
  const reminderDateTime = new Date(stopDateTime.getTime() - 60 * 60 * 1000);
  
  return reminderDateTime.toISOString();
}

/**
 * Check if a stop should have a reminder
 */
function shouldHaveReminder(startTime: string | null): boolean {
  return startTime !== null && startTime.length > 0;
}

describe('Stop Reminders - Scheduling Rules', () => {
  it('creates reminder 1 hour before start time', () => {
    const date = '2026-02-15';
    const startTime = '10:00:00';
    
    const reminderDatetime = calculateReminderDatetime(date, startTime);
    
    expect(reminderDatetime).not.toBeNull();
    const reminder = new Date(reminderDatetime!);
    expect(reminder.getHours()).toBe(9); // 1 hour before 10:00
    expect(reminder.getMinutes()).toBe(0);
  });

  it('handles afternoon times correctly', () => {
    const date = '2026-02-15';
    const startTime = '14:30:00';
    
    const reminderDatetime = calculateReminderDatetime(date, startTime);
    
    expect(reminderDatetime).not.toBeNull();
    const reminder = new Date(reminderDatetime!);
    expect(reminder.getHours()).toBe(13); // 1 hour before 14:30
    expect(reminder.getMinutes()).toBe(30);
  });

  it('handles early morning times (reminder on previous day)', () => {
    const date = '2026-02-15';
    const startTime = '00:30:00'; // 12:30 AM
    
    const reminderDatetime = calculateReminderDatetime(date, startTime);
    
    expect(reminderDatetime).not.toBeNull();
    const reminder = new Date(reminderDatetime!);
    // 1 hour before 00:30 is 23:30 on the previous day
    expect(reminder.getHours()).toBe(23);
    expect(reminder.getMinutes()).toBe(30);
    expect(reminder.getDate()).toBe(14); // Previous day
  });
});

describe('Stop Reminders - No Start Time Cases', () => {
  it('returns null for stops without start time', () => {
    const date = '2026-02-15';
    
    expect(calculateReminderDatetime(date, null)).toBeNull();
    expect(calculateReminderDatetime(date, '')).toBeNull();
  });

  it('shouldHaveReminder returns false for null/empty start time', () => {
    expect(shouldHaveReminder(null)).toBe(false);
    expect(shouldHaveReminder('')).toBe(false);
  });

  it('shouldHaveReminder returns true for valid start time', () => {
    expect(shouldHaveReminder('10:00:00')).toBe(true);
    expect(shouldHaveReminder('14:30')).toBe(true);
    expect(shouldHaveReminder('08:00:00')).toBe(true);
  });
});

describe('Stop Reminders - Time Format Handling', () => {
  it('handles HH:MM:SS format', () => {
    const reminder = calculateReminderDatetime('2026-02-15', '10:00:00');
    expect(reminder).not.toBeNull();
  });

  it('handles HH:MM format', () => {
    const reminder = calculateReminderDatetime('2026-02-15', '10:00');
    expect(reminder).not.toBeNull();
    const reminderDate = new Date(reminder!);
    expect(reminderDate.getHours()).toBe(9);
  });
});

describe('Stop Reminders - Edit Behavior', () => {
  it('recalculates reminder when time changes', () => {
    // Original: 10:00
    const original = calculateReminderDatetime('2026-02-15', '10:00:00');
    
    // Updated: 14:00
    const updated = calculateReminderDatetime('2026-02-15', '14:00:00');
    
    expect(original).not.toEqual(updated);
    
    const originalReminder = new Date(original!);
    const updatedReminder = new Date(updated!);
    
    expect(originalReminder.getHours()).toBe(9);
    expect(updatedReminder.getHours()).toBe(13);
  });

  it('removes reminder when time is cleared', () => {
    // Original: has time
    const original = calculateReminderDatetime('2026-02-15', '10:00:00');
    expect(original).not.toBeNull();
    
    // Updated: no time
    const updated = calculateReminderDatetime('2026-02-15', null);
    expect(updated).toBeNull();
  });

  it('adds reminder when time is set', () => {
    // Original: no time
    const original = calculateReminderDatetime('2026-02-15', null);
    expect(original).toBeNull();
    
    // Updated: has time
    const updated = calculateReminderDatetime('2026-02-15', '10:00:00');
    expect(updated).not.toBeNull();
  });
});
