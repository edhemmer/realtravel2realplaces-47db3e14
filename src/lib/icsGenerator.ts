import { format, parseISO } from 'date-fns';
import { Booking, Parking, Trip } from '@/types/database';

interface ICSEventOptions {
  uid: string; // Unique ID for preventing duplicates on re-import
  title: string;
  location?: string;
  description?: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  alarms?: { minutesBefore: number; description?: string }[];
  sequence?: number; // Increment when event is updated
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatICSDate(date: Date, allDay: boolean): string {
  if (allDay) {
    return format(date, 'yyyyMMdd');
  }
  return format(date, "yyyyMMdd'T'HHmmss");
}

// Generate consistent UID based on entity ID to prevent duplicates
function generateUID(entityType: string, entityId: string, suffix?: string): string {
  const base = `${entityType}-${entityId}${suffix ? `-${suffix}` : ''}`;
  return `${base}@realtravel2realplaces.app`;
}

function createICSEvent(options: ICSEventOptions): string {
  const { uid, title, location, description, start, end, allDay = false, alarms = [], sequence = 0 } = options;
  
  let event = `BEGIN:VEVENT
UID:${uid}
SEQUENCE:${sequence}
DTSTAMP:${formatICSDate(new Date(), false)}
DTSTART${allDay ? ';VALUE=DATE' : ''}:${formatICSDate(start, allDay)}`;

  if (end) {
    event += `\nDTEND${allDay ? ';VALUE=DATE' : ''}:${formatICSDate(end, allDay)}`;
  }
  
  event += `\nSUMMARY:${escapeICSText(title)}`;
  
  if (location) {
    event += `\nLOCATION:${escapeICSText(location)}`;
  }
  
  if (description) {
    event += `\nDESCRIPTION:${escapeICSText(description)}`;
  }

  // Add VALARM reminders
  alarms.forEach(alarm => {
    event += `
BEGIN:VALARM
TRIGGER:-PT${alarm.minutesBefore}M
ACTION:DISPLAY
DESCRIPTION:${escapeICSText(alarm.description || title)}
END:VALARM`;
  });

  event += '\nEND:VEVENT';
  
  return event;
}

export interface GenerateICSOptions {
  trip: Trip;
  bookings: Booking[];
  parkingList: Parking[];
  includeReminders?: boolean;
}

export function generateTripICS(options: GenerateICSOptions): string {
  const { trip, bookings, parkingList, includeReminders = true } = options;
  const events: string[] = [];
  
  const destinationDisplay = trip.destination_state 
    ? `${trip.destination_city}, ${trip.destination_state}, ${trip.destination_country}`
    : `${trip.destination_city}, ${trip.destination_country}`;

  // Trip overview event (all day) - uses trip ID for consistent UID
  events.push(createICSEvent({
    uid: generateUID('trip', trip.id),
    title: `🌍 Trip: ${trip.name}`,
    location: destinationDisplay,
    description: `Trip to ${destinationDisplay}${trip.notes ? `\\n\\nNotes: ${trip.notes}` : ''}`,
    start: parseISO(trip.start_date),
    end: parseISO(trip.end_date),
    allDay: true,
    alarms: includeReminders ? [
      { minutesBefore: 60 * 24 * 2, description: `2 days until ${trip.name} - start packing!` },
      { minutesBefore: 60 * 24, description: `Tomorrow: ${trip.name} begins` },
    ] : [],
  }));

  // Process bookings
  bookings.forEach(booking => {
    const startTime = parseISO(booking.start_datetime);
    const endTime = booking.end_datetime ? parseISO(booking.end_datetime) : undefined;
    
    let title: string;
    let description: string;
    let alarms: { minutesBefore: number; description?: string }[] = [];
    
    switch (booking.booking_type) {
      case 'flight':
        title = `✈️ Flight: ${booking.airline || booking.vendor_name}`;
        description = [
          booking.confirmation_number && `Confirmation: ${booking.confirmation_number}`,
          booking.passenger_name && `Passenger: ${booking.passenger_name}`,
          booking.tsa_precheck_number && `TSA PreCheck: ${booking.tsa_precheck_number}`,
          booking.frequent_flyer_number && `FF#: ${booking.frequent_flyer_number}`,
          booking.notes,
        ].filter(Boolean).join('\\n');
        
        if (includeReminders) {
          alarms = [
            { minutesBefore: 180, description: '3 hours before flight - Head to airport!' }, // 3 hours
            { minutesBefore: 120, description: '2 hours before flight - Be at airport' }, // 2 hours
            { minutesBefore: 30, description: 'Flight boards in 30 minutes' }, // 30 min
          ];
        }
        break;
        
      case 'stay':
        title = `🏨 ${booking.stay_type || 'Lodging'}: ${booking.property_name || booking.vendor_name}`;
        description = [
          booking.confirmation_number && `Confirmation: ${booking.confirmation_number}`,
          booking.address && `Address: ${booking.address}`,
          booking.notes,
        ].filter(Boolean).join('\\n');
        
        if (includeReminders) {
          alarms = [
            { minutesBefore: 60, description: `Check-in at ${booking.property_name || booking.vendor_name} in 1 hour` },
            { minutesBefore: 30, description: 'Check-in time approaching' },
          ];
        }
        break;
        
      case 'car_rental':
        title = `🚗 Car Rental: ${booking.rental_company || booking.vendor_name}`;
        description = [
          booking.confirmation_number && `Confirmation: ${booking.confirmation_number}`,
          booking.pickup_location && `Pickup: ${booking.pickup_location}`,
          booking.return_location && `Return: ${booking.return_location}`,
          booking.notes,
        ].filter(Boolean).join('\\n');
        
        if (includeReminders) {
          alarms = [
            { minutesBefore: 60, description: 'Car pickup in 1 hour' },
            { minutesBefore: 30, description: 'Car pickup in 30 minutes' },
          ];
        }
        break;
        
      case 'activity':
        title = `🎯 Activity: ${booking.vendor_name}`;
        description = [
          booking.confirmation_number && `Confirmation: ${booking.confirmation_number}`,
          booking.address && `Address: ${booking.address}`,
          booking.notes,
        ].filter(Boolean).join('\\n');
        
        if (includeReminders) {
          alarms = [
            { minutesBefore: 60, description: `${booking.vendor_name} starts in 1 hour` },
            { minutesBefore: 30, description: `${booking.vendor_name} starts in 30 minutes` },
          ];
        }
        break;
        
      default:
        title = booking.vendor_name;
        description = booking.notes || '';
    }

    events.push(createICSEvent({
      uid: generateUID('booking', booking.id),
      title,
      location: booking.address,
      description,
      start: startTime,
      end: endTime,
      alarms,
    }));

    // Add car rental return event if applicable
    if (booking.booking_type === 'car_rental' && endTime) {
      events.push(createICSEvent({
        uid: generateUID('booking', booking.id, 'return'),
        title: `🚗 Return Car: ${booking.rental_company || booking.vendor_name}`,
        location: booking.return_location,
        description: `Return rental car${booking.confirmation_number ? `\\nConfirmation: ${booking.confirmation_number}` : ''}`,
        start: endTime,
        alarms: includeReminders ? [
          { minutesBefore: 60, description: 'Car return in 1 hour' },
          { minutesBefore: 30, description: 'Car return in 30 minutes - Leave now!' },
        ] : [],
      }));
    }

    // Add checkout reminder for stays
    if (booking.booking_type === 'stay' && endTime) {
      events.push(createICSEvent({
        uid: generateUID('booking', booking.id, 'checkout'),
        title: `🏨 Check-out: ${booking.property_name || booking.vendor_name}`,
        location: booking.address,
        description: 'Hotel check-out',
        start: endTime,
        alarms: includeReminders ? [
          { minutesBefore: 60, description: 'Check-out in 1 hour' },
          { minutesBefore: 30, description: 'Check-out in 30 minutes' },
        ] : [],
      }));
    }
  });

  // Process parking
  parkingList.forEach(parking => {
    const startTime = parseISO(parking.start_datetime);
    const endTime = parking.end_datetime ? parseISO(parking.end_datetime) : undefined;

    // Parking start event
    events.push(createICSEvent({
      uid: generateUID('parking', parking.id),
      title: `🅿️ Parking: ${parking.label}`,
      location: parking.address,
      description: [
        `Type: ${parking.parking_type}`,
        parking.level_section_space && `Space: ${parking.level_section_space}`,
        parking.billing_type && `Billing: ${parking.billing_type}`,
      ].filter(Boolean).join('\\n'),
      start: startTime,
      end: endTime,
    }));

    // Parking expiration reminder
    if (endTime) {
      events.push(createICSEvent({
        uid: generateUID('parking', parking.id, 'expiry'),
        title: `⚠️ Parking Expires: ${parking.label}`,
        location: parking.address,
        description: `Your parking at ${parking.label} is expiring${parking.level_section_space ? ` (Space: ${parking.level_section_space})` : ''}`,
        start: endTime,
        alarms: includeReminders ? [
          { minutesBefore: 30, description: 'Parking expires in 30 minutes' },
          { minutesBefore: 15, description: 'Parking expires in 15 minutes - Move car NOW!' },
          { minutesBefore: 5, description: '⚠️ PARKING EXPIRES IN 5 MINUTES!' },
        ] : [],
      }));
    }
  });

  // Build the final ICS file
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Real Travel 2 Real Places//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeICSText(trip.name)}
X-WR-TIMEZONE:America/New_York
${events.join('\n')}
END:VCALENDAR`;

  return icsContent;
}

export function downloadICSFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
