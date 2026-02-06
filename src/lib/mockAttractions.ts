/**
 * Patch 2.1.17: Mock attraction data for Explore feature
 * This will be replaced with real API calls in a future patch
 */

import { AttractionSuggestion } from '@/types/attraction';

// Mock attractions by region/city
const mockAttractionsByRegion: Record<string, AttractionSuggestion[]> = {
  // Utah/Arizona (Kanab area)
  'kanab': [
    {
      id: 'the-wave-az',
      name: 'The Wave',
      shortDescription: 'Iconic sandstone rock formation with swirling patterns. Limited daily permits.',
      category: 'Hike',
      thumbnailUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400',
      priceLevel: '$',
      bookingInfo: {
        ticketRequired: true,
        advanceRecommended: true,
        bookingPattern: 'lottery',
        officialBookingUrl: 'https://www.recreation.gov/permits/233393',
        notes: 'Enter lottery 4 months in advance. Only 64 permits per day.',
      },
      locationSummary: 'Vermilion Cliffs, AZ',
    },
    {
      id: 'antelope-canyon',
      name: 'Antelope Canyon',
      shortDescription: 'Famous slot canyon with light beams. Guided tours only.',
      category: 'Tour',
      thumbnailUrl: 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=400',
      priceLevel: '$$',
      bookingInfo: {
        ticketRequired: true,
        advanceRecommended: true,
        bookingPattern: 'time-slot',
        officialBookingUrl: 'https://navajonationparks.org/guided-tours/',
        notes: 'Book 2-3 weeks ahead for peak season.',
      },
      locationSummary: 'Page, AZ',
    },
    {
      id: 'horseshoe-bend',
      name: 'Horseshoe Bend',
      shortDescription: 'Dramatic overlook of the Colorado River. Easy 1.5mi round trip walk.',
      category: 'Viewpoint',
      thumbnailUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400',
      priceLevel: '$',
      bookingInfo: {
        ticketRequired: false,
        advanceRecommended: false,
        bookingPattern: 'first-come',
        officialBookingUrl: 'https://www.nps.gov/glca/planyourvisit/horseshoe-bend.htm',
        notes: '$10 parking fee. No reservation needed.',
      },
      locationSummary: 'Page, AZ',
    },
    {
      id: 'buckskin-gulch',
      name: 'Buckskin Gulch',
      shortDescription: 'Longest slot canyon in the Southwest. Multi-day hike option.',
      category: 'Hike',
      thumbnailUrl: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400',
      priceLevel: '$',
      bookingInfo: {
        ticketRequired: true,
        advanceRecommended: true,
        bookingPattern: 'first-come',
        officialBookingUrl: 'https://www.blm.gov/visit/paria-canyon-vermilion-cliffs-wilderness',
        notes: 'Day use permit required. Check flash flood conditions.',
      },
      locationSummary: 'Utah/Arizona Border',
    },
  ],
  // Orlando
  'orlando': [
    {
      id: 'magic-kingdom',
      name: 'Magic Kingdom',
      shortDescription: 'Classic Disney theme park with Cinderella Castle and iconic rides.',
      category: 'Theme Park',
      thumbnailUrl: 'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=400',
      priceLevel: '$$$',
      bookingInfo: {
        ticketRequired: true,
        advanceRecommended: true,
        bookingPattern: 'time-slot',
        officialBookingUrl: 'https://disneyworld.disney.go.com/tickets/',
        notes: 'Park reservations required in addition to tickets.',
      },
      locationSummary: 'Walt Disney World, FL',
    },
    {
      id: 'universal-studios',
      name: 'Universal Studios Florida',
      shortDescription: 'Movie-themed attractions including Harry Potter and more.',
      category: 'Theme Park',
      thumbnailUrl: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=400',
      priceLevel: '$$$',
      bookingInfo: {
        ticketRequired: true,
        advanceRecommended: true,
        bookingPattern: 'time-slot',
        officialBookingUrl: 'https://www.universalorlando.com/web/en/us/tickets-packages',
        notes: 'Express Pass available for shorter wait times.',
      },
      locationSummary: 'Orlando, FL',
    },
    {
      id: 'kennedy-space-center',
      name: 'Kennedy Space Center',
      shortDescription: 'NASA visitor complex with real spacecraft and astronaut encounters.',
      category: 'Museum',
      thumbnailUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400',
      priceLevel: '$$',
      bookingInfo: {
        ticketRequired: true,
        advanceRecommended: true,
        bookingPattern: 'time-slot',
        officialBookingUrl: 'https://www.kennedyspacecenter.com/',
        notes: 'Book special tours early. Check for launch viewing opportunities.',
      },
      locationSummary: 'Merritt Island, FL',
    },
  ],
  // New York City
  'new york': [
    {
      id: 'statue-of-liberty',
      name: 'Statue of Liberty',
      shortDescription: 'Iconic monument with ferry access and crown access (limited).',
      category: 'Monument',
      thumbnailUrl: 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=400',
      priceLevel: '$$',
      bookingInfo: {
        ticketRequired: true,
        advanceRecommended: true,
        bookingPattern: 'time-slot',
        officialBookingUrl: 'https://www.statueofliberty.org/',
        notes: 'Crown access sells out months ahead. Pedestal access easier to get.',
      },
      locationSummary: 'Liberty Island, NY',
    },
    {
      id: 'empire-state-building',
      name: 'Empire State Building',
      shortDescription: 'Art Deco skyscraper with 86th and 102nd floor observatories.',
      category: 'Viewpoint',
      thumbnailUrl: 'https://images.unsplash.com/photo-1555109307-f7d9da25c244?w=400',
      priceLevel: '$$',
      bookingInfo: {
        ticketRequired: true,
        advanceRecommended: false,
        bookingPattern: 'time-slot',
        officialBookingUrl: 'https://www.esbnyc.com/',
        notes: 'Sunrise and sunset times are most popular.',
      },
      locationSummary: 'Midtown Manhattan, NY',
    },
    {
      id: 'broadway-show',
      name: 'Broadway Show',
      shortDescription: 'World-famous theater district with Tony Award-winning productions.',
      category: 'Entertainment',
      thumbnailUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400',
      priceLevel: '$$$',
      bookingInfo: {
        ticketRequired: true,
        advanceRecommended: true,
        bookingPattern: 'time-slot',
        officialBookingUrl: 'https://www.broadway.com/',
        notes: 'Popular shows sell out weeks ahead. Check TKTS for same-day discounts.',
      },
      locationSummary: 'Times Square, NY',
    },
  ],
  // Default/generic attractions
  'default': [
    {
      id: 'local-museum',
      name: 'Local History Museum',
      shortDescription: 'Explore the rich history and culture of the region.',
      category: 'Museum',
      thumbnailUrl: 'https://images.unsplash.com/photo-1565060169194-19fabf63012c?w=400',
      priceLevel: '$',
      bookingInfo: {
        ticketRequired: false,
        advanceRecommended: false,
        bookingPattern: 'first-come',
        notes: 'Walk-ins welcome. Check for special exhibitions.',
      },
      locationSummary: 'Nearby',
    },
    {
      id: 'city-walking-tour',
      name: 'City Walking Tour',
      shortDescription: 'Guided walking tour of historic downtown area.',
      category: 'Tour',
      thumbnailUrl: 'https://images.unsplash.com/photo-1524850011238-e3d235c7d4c9?w=400',
      priceLevel: '$',
      bookingInfo: {
        ticketRequired: true,
        advanceRecommended: true,
        bookingPattern: 'time-slot',
        notes: 'Small groups. Book online for best rates.',
      },
      locationSummary: 'Downtown',
    },
    {
      id: 'nature-preserve',
      name: 'Nature Preserve Hike',
      shortDescription: 'Scenic trails through protected natural areas.',
      category: 'Hike',
      thumbnailUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
      priceLevel: 'free',
      bookingInfo: {
        ticketRequired: false,
        advanceRecommended: false,
        bookingPattern: 'first-come',
        notes: 'Open sunrise to sunset. Bring water and sun protection.',
      },
      locationSummary: 'Nearby',
    },
  ],
};

/**
 * Get mock attractions based on location
 */
export function getMockAttractions(city: string, state?: string): AttractionSuggestion[] {
  const normalizedCity = city.toLowerCase().trim();
  const normalizedState = state?.toLowerCase().trim() || '';
  
  // Check for specific regions
  if (normalizedCity.includes('kanab') || normalizedState.includes('utah') || normalizedState.includes('arizona')) {
    return mockAttractionsByRegion['kanab'] || [];
  }
  
  if (normalizedCity.includes('orlando') || normalizedState.includes('florida')) {
    return mockAttractionsByRegion['orlando'] || [];
  }
  
  if (normalizedCity.includes('new york') || normalizedCity.includes('nyc') || normalizedCity.includes('manhattan')) {
    return mockAttractionsByRegion['new york'] || [];
  }
  
  // Return default attractions for unknown locations
  return mockAttractionsByRegion['default'] || [];
}

/**
 * Filter attractions by radius (mock implementation - returns all for now)
 */
export function filterByRadius(
  attractions: AttractionSuggestion[],
  _radiusMiles: number
): AttractionSuggestion[] {
  // In a real implementation, this would filter by actual distance
  // For now, just return all (max 10)
  return attractions.slice(0, 10);
}
