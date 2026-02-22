/**
 * v3.5.2: Deep mock attraction data engine for Explore feature
 *
 * Multi-category coverage across intent types:
 * tourist_attraction, museum, art_gallery, park, landmark,
 * hiking/trailhead, viewpoint, visitor_center
 *
 * Each region returns 60+ attractions across all categories.
 * Progressive radius expansion handled by useAttractions hook.
 */

import { AttractionSuggestion } from '@/types/attraction';

// ============================================================================
// CATEGORY DEFINITIONS (intent types for multi-query coverage)
// ============================================================================

const INTENT_CATEGORIES = [
  'Tourist Attraction',
  'Museum',
  'Art Gallery',
  'Park',
  'Landmark',
  'Hike',
  'Viewpoint',
  'Visitor Center',
  'Tour',
  'Entertainment',
  'Theme Park',
  'Historic Site',
  'Nature Reserve',
  'Monument',
] as const;

// ============================================================================
// THUMBNAIL POOL (reusable across generated attractions)
// ============================================================================

const THUMBNAIL_POOL = [
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400',
  'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=400',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400',
  'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400',
  'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=400',
  'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=400',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400',
  'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=400',
  'https://images.unsplash.com/photo-1555109307-f7d9da25c244?w=400',
  'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400',
  'https://images.unsplash.com/photo-1565060169194-19fabf63012c?w=400',
  'https://images.unsplash.com/photo-1524850011238-e3d235c7d4c9?w=400',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
  'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=400',
  'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=400',
];

const PRICE_LEVELS: AttractionSuggestion['priceLevel'][] = ['free', '$', '$$', '$$$'];
const BOOKING_PATTERNS: AttractionSuggestion['bookingInfo']['bookingPattern'][] = [
  'first-come', 'time-slot', 'lottery', 'unknown',
];

// ============================================================================
// REGION-SPECIFIC CURATED DATA
// ============================================================================

interface RegionData {
  key: string;
  matchCities: string[];
  matchStates: string[];
  centerLabel: string;
  curated: AttractionSuggestion[];
  /** Additional names to generate generic attractions from */
  generatedNames: { name: string; category: string; location: string; desc: string }[];
}

const REGIONS: RegionData[] = [
  {
    key: 'kanab',
    matchCities: ['kanab', 'page', 'marble canyon', 'fredonia'],
    matchStates: ['utah', 'arizona'],
    centerLabel: 'Kanab, UT Area',
    curated: [
      { id: 'the-wave-az', name: 'The Wave', shortDescription: 'Iconic sandstone rock formation with swirling patterns. Limited daily permits.', category: 'Hike', thumbnailUrl: THUMBNAIL_POOL[0], priceLevel: '$', bookingInfo: { ticketRequired: true, advanceRecommended: true, bookingPattern: 'lottery', officialBookingUrl: 'https://www.recreation.gov/permits/233393', notes: 'Enter lottery 4 months in advance. Only 64 permits per day.' }, locationSummary: 'Vermilion Cliffs, AZ', distanceMiles: 8, rating: 4.9, reviewCount: 12400 },
      { id: 'antelope-canyon', name: 'Antelope Canyon', shortDescription: 'Famous slot canyon with light beams. Guided tours only.', category: 'Tour', thumbnailUrl: THUMBNAIL_POOL[1], priceLevel: '$$', bookingInfo: { ticketRequired: true, advanceRecommended: true, bookingPattern: 'time-slot', officialBookingUrl: 'https://navajonationparks.org/guided-tours/', notes: 'Book 2-3 weeks ahead for peak season.' }, locationSummary: 'Page, AZ', distanceMiles: 12, rating: 4.8, reviewCount: 18200 },
      { id: 'horseshoe-bend', name: 'Horseshoe Bend', shortDescription: 'Dramatic overlook of the Colorado River. Easy 1.5mi round trip walk.', category: 'Viewpoint', thumbnailUrl: THUMBNAIL_POOL[2], priceLevel: '$', bookingInfo: { ticketRequired: false, advanceRecommended: false, bookingPattern: 'first-come', notes: '$10 parking fee. No reservation needed.' }, locationSummary: 'Page, AZ', distanceMiles: 14, rating: 4.7, reviewCount: 24500 },
      { id: 'buckskin-gulch', name: 'Buckskin Gulch', shortDescription: 'Longest slot canyon in the Southwest. Multi-day hike option.', category: 'Hike', thumbnailUrl: THUMBNAIL_POOL[3], priceLevel: '$', bookingInfo: { ticketRequired: true, advanceRecommended: true, bookingPattern: 'first-come', notes: 'Day use permit required. Check flash flood conditions.' }, locationSummary: 'Utah/Arizona Border', distanceMiles: 18, rating: 4.6, reviewCount: 3400 },
    ],
    generatedNames: [
      { name: 'Coral Pink Sand Dunes State Park', category: 'Park', location: 'Kanab, UT', desc: 'Vibrant pink sand dunes perfect for photography and sandboarding.' },
      { name: 'Best Friends Animal Sanctuary', category: 'Visitor Center', location: 'Kanab, UT', desc: 'The nation\'s largest no-kill animal sanctuary with guided tours.' },
      { name: 'Kanab Heritage Museum', category: 'Museum', location: 'Kanab, UT', desc: 'Local history museum featuring Native American and pioneer artifacts.' },
      { name: 'Moqui Cave', category: 'Tourist Attraction', location: 'Kanab, UT', desc: 'Natural sandstone cave turned into a quirky museum and gift shop.' },
      { name: 'White Pocket', category: 'Hike', location: 'Vermilion Cliffs, AZ', desc: 'Surreal rock formations with swirling patterns. 4WD required.' },
      { name: 'Toadstool Hoodoos Trail', category: 'Hike', location: 'Grand Staircase, UT', desc: 'Easy 1.5-mile hike to mushroom-shaped hoodoo formations.' },
      { name: 'Wire Pass Trailhead', category: 'Hike', location: 'Vermilion Cliffs, AZ', desc: 'Popular slot canyon hike leading to Buckskin Gulch.' },
      { name: 'Paria Rimrocks', category: 'Viewpoint', location: 'Grand Staircase, UT', desc: 'Stunning rimrock formations with panoramic desert views.' },
      { name: 'Grand Staircase-Escalante Visitor Center', category: 'Visitor Center', location: 'Kanab, UT', desc: 'Information center for exploring the vast national monument.' },
      { name: 'Peek-A-Boo Slot Canyon', category: 'Hike', location: 'Kanab, UT', desc: 'Short but stunning slot canyon requiring a scramble to enter.' },
      { name: 'Johnson Canyon Movie Set', category: 'Historic Site', location: 'Kanab, UT', desc: 'Remnants of old Western movie sets in scenic canyon.' },
      { name: 'Squaw Trail', category: 'Hike', location: 'Kanab, UT', desc: 'Moderate trail with sweeping views of Kanab and surrounding cliffs.' },
      { name: 'Glen Canyon Dam Overlook', category: 'Viewpoint', location: 'Page, AZ', desc: 'Dramatic views of Glen Canyon Dam and Lake Powell.' },
      { name: 'Glen Canyon NRA Visitor Center', category: 'Visitor Center', location: 'Page, AZ', desc: 'Learn about the dam, lake, and surrounding geology.' },
      { name: 'Lake Powell Boat Tour', category: 'Tour', location: 'Page, AZ', desc: 'Scenic boat tours through stunning red-rock canyons on Lake Powell.' },
      { name: 'Wahweap Overlook', category: 'Viewpoint', location: 'Page, AZ', desc: 'Panoramic views of Lake Powell from the Wahweap area.' },
      { name: 'Chains Area – Grand Staircase', category: 'Hike', location: 'Grand Staircase, UT', desc: 'Remote area with petrified wood and colorful badlands.' },
      { name: 'Kanab Canyon Trail', category: 'Hike', location: 'Kanab, UT', desc: 'Scenic canyon hike with red rock walls and desert flora.' },
      { name: 'Paria Canyon Wilderness', category: 'Nature Reserve', location: 'Utah/Arizona Border', desc: 'Pristine wilderness area with narrow canyon backpacking routes.' },
      { name: 'Jacob Hamblin Park', category: 'Park', location: 'Kanab, UT', desc: 'Local park with picnic areas and views of the surrounding cliffs.' },
      { name: 'Three Lakes Trail', category: 'Hike', location: 'Kanab, UT', desc: 'Moderate hike passing three seasonal desert lakes.' },
      { name: 'Red Canyon Trail', category: 'Hike', location: 'Dixie NF, UT', desc: 'Red-rock trail through arches and tunnels. Family-friendly.' },
      { name: 'Pipe Spring National Monument', category: 'Monument', location: 'Fredonia, AZ', desc: 'Historic ranch and Native American heritage site.' },
      { name: 'North Rim Grand Canyon', category: 'Viewpoint', location: 'Grand Canyon, AZ', desc: 'Less-crowded rim of the Grand Canyon with stunning vistas.' },
      { name: 'Marble Canyon Bridge Overlook', category: 'Viewpoint', location: 'Marble Canyon, AZ', desc: 'Overlook of Navajo Bridge spanning the Colorado River gorge.' },
      { name: 'Lee\'s Ferry', category: 'Landmark', location: 'Marble Canyon, AZ', desc: 'Historic river crossing and put-in point for Grand Canyon rafting.' },
      { name: 'Vermilion Cliffs Condor Viewing', category: 'Nature Reserve', location: 'Vermilion Cliffs, AZ', desc: 'Watch endangered California condors soar above the cliffs.' },
      { name: 'Old Paria Film Set', category: 'Historic Site', location: 'Grand Staircase, UT', desc: 'Abandoned Western movie set in a scenic desert valley.' },
      { name: 'Coyote Buttes South', category: 'Hike', location: 'Vermilion Cliffs, AZ', desc: 'Colorful sandstone formations. Permit required but less competitive than The Wave.' },
      { name: 'Toroweap Overlook', category: 'Viewpoint', location: 'Grand Canyon, AZ', desc: 'Remote Grand Canyon overlook with a 3,000-foot sheer drop.' },
      { name: 'Cedar Breaks National Monument', category: 'Landmark', location: 'Cedar City, UT', desc: 'Amphitheater of colorful rock formations at 10,000 feet elevation.' },
      { name: 'Bryce Canyon Sunset Point', category: 'Viewpoint', location: 'Bryce Canyon, UT', desc: 'Iconic viewpoint over thousands of red and orange hoodoos.' },
      { name: 'Zion Canyon Scenic Drive', category: 'Tourist Attraction', location: 'Zion NP, UT', desc: 'Shuttle-only scenic drive through towering canyon walls.' },
      { name: 'Angels Landing', category: 'Hike', location: 'Zion NP, UT', desc: 'Thrilling chain-assisted hike with dramatic canyon views. Permit required.' },
      { name: 'The Narrows', category: 'Hike', location: 'Zion NP, UT', desc: 'Iconic river hike through the narrowest section of Zion Canyon.' },
      { name: 'Observation Point Trail', category: 'Hike', location: 'Zion NP, UT', desc: 'Strenuous hike to one of the best views in Zion.' },
      { name: 'Kanab Art Gallery Walk', category: 'Art Gallery', location: 'Kanab, UT', desc: 'Collection of galleries featuring Southwestern and landscape art.' },
      { name: 'Frontier Homestead State Park Museum', category: 'Museum', location: 'Cedar City, UT', desc: 'Pioneer history museum with horse-drawn vehicle collection.' },
    ],
  },
  {
    key: 'orlando',
    matchCities: ['orlando', 'kissimmee', 'lake buena vista', 'winter park'],
    matchStates: ['florida'],
    centerLabel: 'Orlando, FL Area',
    curated: [
      { id: 'magic-kingdom', name: 'Magic Kingdom', shortDescription: 'Classic Disney theme park with Cinderella Castle and iconic rides.', category: 'Theme Park', thumbnailUrl: THUMBNAIL_POOL[4], priceLevel: '$$$', bookingInfo: { ticketRequired: true, advanceRecommended: true, bookingPattern: 'time-slot', notes: 'Park reservations required in addition to tickets.' }, locationSummary: 'Walt Disney World, FL', distanceMiles: 5, rating: 4.8, reviewCount: 89000 },
      { id: 'universal-studios', name: 'Universal Studios Florida', shortDescription: 'Movie-themed attractions including Harry Potter and more.', category: 'Theme Park', thumbnailUrl: THUMBNAIL_POOL[5], priceLevel: '$$$', bookingInfo: { ticketRequired: true, advanceRecommended: true, bookingPattern: 'time-slot', notes: 'Express Pass available for shorter wait times.' }, locationSummary: 'Orlando, FL', distanceMiles: 3, rating: 4.7, reviewCount: 65000 },
      { id: 'kennedy-space-center', name: 'Kennedy Space Center', shortDescription: 'NASA visitor complex with real spacecraft and astronaut encounters.', category: 'Museum', thumbnailUrl: THUMBNAIL_POOL[6], priceLevel: '$$', bookingInfo: { ticketRequired: true, advanceRecommended: true, bookingPattern: 'time-slot', notes: 'Book special tours early. Check for launch viewing opportunities.' }, locationSummary: 'Merritt Island, FL', distanceMiles: 45, rating: 4.8, reviewCount: 42000 },
    ],
    generatedNames: [
      { name: 'EPCOT', category: 'Theme Park', location: 'Walt Disney World, FL', desc: 'Disney park featuring world cultures, technology, and seasonal festivals.' },
      { name: 'Hollywood Studios', category: 'Theme Park', location: 'Walt Disney World, FL', desc: 'Disney park with Star Wars: Galaxy\'s Edge and Toy Story Land.' },
      { name: 'Animal Kingdom', category: 'Theme Park', location: 'Walt Disney World, FL', desc: 'Disney theme park with Pandora and Kilimanjaro Safaris.' },
      { name: 'Islands of Adventure', category: 'Theme Park', location: 'Orlando, FL', desc: 'Universal park with Hogwarts and Jurassic World attractions.' },
      { name: 'SeaWorld Orlando', category: 'Theme Park', location: 'Orlando, FL', desc: 'Marine-themed park with roller coasters and animal exhibits.' },
      { name: 'Discovery Cove', category: 'Tourist Attraction', location: 'Orlando, FL', desc: 'All-inclusive day resort with dolphin swim experiences.' },
      { name: 'ICON Park', category: 'Entertainment', location: 'Orlando, FL', desc: 'Entertainment complex with The Wheel observation wheel.' },
      { name: 'Gatorland', category: 'Tourist Attraction', location: 'Orlando, FL', desc: 'Alligator theme park and wildlife preserve since 1949.' },
      { name: 'Blue Spring State Park', category: 'Park', location: 'Orange City, FL', desc: 'Natural spring park with manatee viewing in winter months.' },
      { name: 'Wekiwa Springs State Park', category: 'Park', location: 'Apopka, FL', desc: 'Natural springs with swimming, kayaking, and hiking trails.' },
      { name: 'Charles Hosmer Morse Museum', category: 'Museum', location: 'Winter Park, FL', desc: 'World\'s largest collection of Louis Comfort Tiffany works.' },
      { name: 'Orlando Museum of Art', category: 'Art Gallery', location: 'Orlando, FL', desc: 'Fine art museum with American and African collections.' },
      { name: 'Harry P. Leu Gardens', category: 'Park', location: 'Orlando, FL', desc: '50-acre botanical garden with tropical and subtropical plants.' },
      { name: 'Tibet-Butler Nature Preserve', category: 'Nature Reserve', location: 'Orlando, FL', desc: 'Peaceful trails through cypress swamps and pine flatwoods.' },
      { name: 'Lake Eola Park', category: 'Park', location: 'Downtown Orlando, FL', desc: 'Iconic downtown park with swan boats and fountain show.' },
      { name: 'Bok Tower Gardens', category: 'Park', location: 'Lake Wales, FL', desc: 'Historic gardens with a 205-foot singing tower carillon.' },
      { name: 'Fun Spot America', category: 'Theme Park', location: 'Orlando, FL', desc: 'Family-friendly park with go-karts and roller coasters.' },
      { name: 'LEGOLAND Florida', category: 'Theme Park', location: 'Winter Haven, FL', desc: 'Theme park designed for families with children ages 2-12.' },
      { name: 'Winter Park Scenic Boat Tour', category: 'Tour', location: 'Winter Park, FL', desc: 'Narrated boat tour through chain of lakes and canals.' },
      { name: 'Orlando Science Center', category: 'Museum', location: 'Orlando, FL', desc: 'Interactive science museum with planetarium and exhibits.' },
      { name: 'Mennello Museum of American Art', category: 'Art Gallery', location: 'Orlando, FL', desc: 'Intimate museum showcasing American folk and fine art.' },
      { name: 'Central Florida Zoo', category: 'Tourist Attraction', location: 'Sanford, FL', desc: 'Zoo with over 400 animals and zip line adventures.' },
      { name: 'Old Town Kissimmee', category: 'Entertainment', location: 'Kissimmee, FL', desc: 'Retro entertainment district with shops, rides, and car shows.' },
      { name: 'Boggy Creek Airboat Adventures', category: 'Tour', location: 'Kissimmee, FL', desc: 'Airboat tours through Florida\'s headwaters viewing wildlife.' },
      { name: 'Madame Tussauds Orlando', category: 'Tourist Attraction', location: 'Orlando, FL', desc: 'Celebrity wax figure museum with interactive experiences.' },
      { name: 'SEA LIFE Orlando Aquarium', category: 'Tourist Attraction', location: 'Orlando, FL', desc: 'Aquarium with underwater tunnel and touch pools.' },
      { name: 'Ripley\'s Believe It or Not!', category: 'Museum', location: 'Orlando, FL', desc: 'Quirky museum of oddities in a tilted building.' },
      { name: 'Chocolate Kingdom', category: 'Tour', location: 'Kissimmee, FL', desc: 'Interactive tour showing how chocolate is made from bean to bar.' },
      { name: 'Forever Florida Zipline Safari', category: 'Tourist Attraction', location: 'St. Cloud, FL', desc: 'Eco-adventure with ziplines, horseback, and coach tours.' },
      { name: 'Lake Apopka Wildlife Drive', category: 'Nature Reserve', location: 'Apopka, FL', desc: 'Free 11-mile driving loop through restored wetlands.' },
      { name: 'DeLand Artisan Alley', category: 'Art Gallery', location: 'DeLand, FL', desc: 'Charming downtown with murals, galleries, and local artisans.' },
      { name: 'Mount Dora Historic District', category: 'Historic Site', location: 'Mount Dora, FL', desc: 'Quaint lakeside town with antique shops and festivals.' },
      { name: 'Cassadaga Spiritualist Camp', category: 'Historic Site', location: 'Cassadaga, FL', desc: 'Historic spiritualist community with mediums and bookstores.' },
      { name: 'Kraft Azalea Garden', category: 'Park', location: 'Winter Park, FL', desc: 'Serene lakeside garden with giant cypress trees.' },
      { name: 'Orlando Wetlands Park', category: 'Nature Reserve', location: 'Christmas, FL', desc: '1,650-acre constructed wetland with birding and trails.' },
    ],
  },
  {
    key: 'new-york',
    matchCities: ['new york', 'nyc', 'manhattan', 'brooklyn', 'queens'],
    matchStates: [],
    centerLabel: 'New York City',
    curated: [
      { id: 'statue-of-liberty', name: 'Statue of Liberty', shortDescription: 'Iconic monument with ferry access and crown access (limited).', category: 'Monument', thumbnailUrl: THUMBNAIL_POOL[7], priceLevel: '$$', bookingInfo: { ticketRequired: true, advanceRecommended: true, bookingPattern: 'time-slot', notes: 'Crown access sells out months ahead.' }, locationSummary: 'Liberty Island, NY', distanceMiles: 3, rating: 4.7, reviewCount: 78000 },
      { id: 'empire-state-building', name: 'Empire State Building', shortDescription: 'Art Deco skyscraper with 86th and 102nd floor observatories.', category: 'Viewpoint', thumbnailUrl: THUMBNAIL_POOL[8], priceLevel: '$$', bookingInfo: { ticketRequired: true, advanceRecommended: false, bookingPattern: 'time-slot', notes: 'Sunrise and sunset times are most popular.' }, locationSummary: 'Midtown Manhattan, NY', distanceMiles: 1, rating: 4.7, reviewCount: 95000 },
      { id: 'broadway-show', name: 'Broadway Show', shortDescription: 'World-famous theater district with Tony Award-winning productions.', category: 'Entertainment', thumbnailUrl: THUMBNAIL_POOL[9], priceLevel: '$$$', bookingInfo: { ticketRequired: true, advanceRecommended: true, bookingPattern: 'time-slot', notes: 'Popular shows sell out weeks ahead.' }, locationSummary: 'Times Square, NY', distanceMiles: 1, rating: 4.8, reviewCount: 120000 },
    ],
    generatedNames: [
      { name: 'Central Park', category: 'Park', location: 'Manhattan, NY', desc: '843-acre urban park with lakes, gardens, and iconic landmarks.' },
      { name: 'Metropolitan Museum of Art', category: 'Museum', location: 'Manhattan, NY', desc: 'World-class art museum spanning 5,000 years of culture.' },
      { name: 'Museum of Modern Art (MoMA)', category: 'Art Gallery', location: 'Midtown, NY', desc: 'Iconic modern art museum with Van Gogh, Warhol, and more.' },
      { name: 'Top of the Rock', category: 'Viewpoint', location: 'Rockefeller Center, NY', desc: 'Observation deck with unobstructed views of the skyline.' },
      { name: 'One World Observatory', category: 'Viewpoint', location: 'Lower Manhattan, NY', desc: '360-degree views from the tallest building in the Western Hemisphere.' },
      { name: '9/11 Memorial & Museum', category: 'Monument', location: 'Lower Manhattan, NY', desc: 'Tribute to the victims with reflecting pools and museum.' },
      { name: 'Brooklyn Bridge Walk', category: 'Landmark', location: 'Brooklyn/Manhattan, NY', desc: 'Iconic 1.1-mile walk with stunning skyline views.' },
      { name: 'High Line', category: 'Park', location: 'Chelsea, NY', desc: 'Elevated linear park built on a historic freight rail line.' },
      { name: 'American Museum of Natural History', category: 'Museum', location: 'Upper West Side, NY', desc: 'Massive museum with dinosaur fossils and planetarium.' },
      { name: 'Guggenheim Museum', category: 'Art Gallery', location: 'Upper East Side, NY', desc: 'Frank Lloyd Wright-designed spiral museum of modern art.' },
      { name: 'Whitney Museum of American Art', category: 'Art Gallery', location: 'Meatpacking District, NY', desc: 'Contemporary American art in Renzo Piano-designed building.' },
      { name: 'Times Square', category: 'Landmark', location: 'Midtown, NY', desc: 'Dazzling intersection with neon signs and street performers.' },
      { name: 'Grand Central Terminal', category: 'Landmark', location: 'Midtown, NY', desc: 'Beaux-Arts landmark with celestial ceiling and dining.' },
      { name: 'Chelsea Market', category: 'Tourist Attraction', location: 'Chelsea, NY', desc: 'Indoor food hall and market in a former factory.' },
      { name: 'Ellis Island Immigration Museum', category: 'Museum', location: 'New York Harbor, NY', desc: 'Historic gateway for millions of immigrants to America.' },
      { name: 'Intrepid Sea, Air & Space Museum', category: 'Museum', location: 'Hell\'s Kitchen, NY', desc: 'Military and maritime history on a WWII aircraft carrier.' },
      { name: 'DUMBO', category: 'Landmark', location: 'Brooklyn, NY', desc: 'Trendy neighborhood with cobblestones and Manhattan Bridge views.' },
      { name: 'Prospect Park', category: 'Park', location: 'Brooklyn, NY', desc: 'Brooklyn\'s flagship 526-acre park by the designers of Central Park.' },
      { name: 'Brooklyn Botanic Garden', category: 'Park', location: 'Brooklyn, NY', desc: '52-acre garden with Japanese garden and cherry blossom walk.' },
      { name: 'The Cloisters', category: 'Museum', location: 'Fort Tryon Park, NY', desc: 'Medieval European art museum in a stunning hilltop setting.' },
      { name: 'St. Patrick\'s Cathedral', category: 'Landmark', location: 'Midtown, NY', desc: 'Neo-Gothic landmark cathedral on Fifth Avenue.' },
      { name: 'Edge Observation Deck', category: 'Viewpoint', location: 'Hudson Yards, NY', desc: 'Sky deck with glass floor extending over the city.' },
      { name: 'Little Island', category: 'Park', location: 'Hudson River, NY', desc: 'Floating park on the Hudson with gardens and performance space.' },
      { name: 'Governors Island', category: 'Park', location: 'New York Harbor, NY', desc: 'Car-free island with hills, hammocks, and harbor views.' },
      { name: 'New York Public Library', category: 'Historic Site', location: 'Midtown, NY', desc: 'Beaux-Arts masterpiece with free exhibitions and reading rooms.' },
      { name: 'Roosevelt Island Tramway', category: 'Tourist Attraction', location: 'Manhattan/Roosevelt Island, NY', desc: 'Aerial tramway with skyline views over the East River.' },
      { name: 'Coney Island', category: 'Entertainment', location: 'Brooklyn, NY', desc: 'Classic boardwalk with amusement rides and Nathan\'s hot dogs.' },
      { name: 'Flushing Meadows Corona Park', category: 'Park', location: 'Queens, NY', desc: 'Historic park with the Unisphere from the 1964 World\'s Fair.' },
      { name: 'New York Botanical Garden', category: 'Park', location: 'Bronx, NY', desc: '250-acre garden with old-growth forest and glass conservatory.' },
      { name: 'Bronx Zoo', category: 'Tourist Attraction', location: 'Bronx, NY', desc: 'One of the world\'s largest urban zoos with 6,000+ animals.' },
      { name: 'Museum of the Moving Image', category: 'Museum', location: 'Astoria, Queens, NY', desc: 'Film, television, and digital media museum with interactive exhibits.' },
      { name: 'The Vessel', category: 'Landmark', location: 'Hudson Yards, NY', desc: 'Honeycomb-like structure with interconnected staircases.' },
      { name: 'Wave Hill', category: 'Park', location: 'Bronx, NY', desc: 'Public garden and cultural center with Hudson River views.' },
      { name: 'Snug Harbor Cultural Center', category: 'Historic Site', location: 'Staten Island, NY', desc: 'Historic campus with gardens, museums, and performance venues.' },
      { name: 'South Street Seaport Museum', category: 'Museum', location: 'Lower Manhattan, NY', desc: 'Maritime museum with historic ships at a waterfront pier.' },
    ],
  },
];

// ============================================================================
// GENERIC FALLBACK GENERATOR
// ============================================================================

function generateGenericAttractions(): { name: string; category: string; location: string; desc: string }[] {
  return [
    { name: 'Local History Museum', category: 'Museum', location: 'Nearby', desc: 'Explore the rich history and culture of the region.' },
    { name: 'City Walking Tour', category: 'Tour', location: 'Downtown', desc: 'Guided walking tour of historic downtown area.' },
    { name: 'Nature Preserve Hike', category: 'Hike', location: 'Nearby', desc: 'Scenic trails through protected natural areas.' },
    { name: 'Art & Culture Center', category: 'Art Gallery', location: 'Downtown', desc: 'Rotating exhibitions of local and regional artists.' },
    { name: 'Botanical Gardens', category: 'Park', location: 'Nearby', desc: 'Beautiful gardens with native and exotic plant collections.' },
    { name: 'Historical Society', category: 'Historic Site', location: 'Downtown', desc: 'Preserved buildings and archives documenting local heritage.' },
    { name: 'Scenic Overlook', category: 'Viewpoint', location: 'Nearby', desc: 'Panoramic views of the surrounding landscape.' },
    { name: 'Visitor Information Center', category: 'Visitor Center', location: 'Downtown', desc: 'Maps, guides, and local expertise for visitors.' },
    { name: 'Public Art Walk', category: 'Art Gallery', location: 'Downtown', desc: 'Self-guided tour of murals and public sculptures.' },
    { name: 'Community Park', category: 'Park', location: 'Nearby', desc: 'Green space with playgrounds, trails, and picnic areas.' },
    { name: 'Regional Nature Center', category: 'Nature Reserve', location: 'Nearby', desc: 'Educational center with wildlife exhibits and nature trails.' },
    { name: 'Heritage Trail', category: 'Hike', location: 'Nearby', desc: 'Walking trail connecting historic landmarks and sites.' },
    { name: 'Local Artisan Market', category: 'Tourist Attraction', location: 'Downtown', desc: 'Weekend market featuring local crafts, food, and art.' },
    { name: 'Waterfront Promenade', category: 'Landmark', location: 'Nearby', desc: 'Scenic waterfront path with dining and views.' },
    { name: 'Science Discovery Center', category: 'Museum', location: 'Nearby', desc: 'Interactive science exhibits for all ages.' },
    { name: 'Sunset Point', category: 'Viewpoint', location: 'Nearby', desc: 'Popular spot for watching dramatic sunsets over the landscape.' },
    { name: 'Wildlife Sanctuary', category: 'Nature Reserve', location: 'Nearby', desc: 'Protected habitat for native birds and wildlife.' },
    { name: 'Pioneer Village', category: 'Historic Site', location: 'Nearby', desc: 'Reconstructed village showing life in earlier centuries.' },
    { name: 'Sculpture Garden', category: 'Art Gallery', location: 'Nearby', desc: 'Outdoor gallery with contemporary sculptures in natural setting.' },
    { name: 'Adventure Zipline Park', category: 'Entertainment', location: 'Nearby', desc: 'Treetop zipline course with aerial obstacles and views.' },
    { name: 'Regional Arboretum', category: 'Park', location: 'Nearby', desc: 'Tree collection and gardens for education and recreation.' },
    { name: 'Kayak & Canoe Launch', category: 'Tourist Attraction', location: 'Nearby', desc: 'Launch point for paddling scenic waterways.' },
    { name: 'Train Depot Museum', category: 'Museum', location: 'Downtown', desc: 'Restored railroad station with vintage trains and exhibits.' },
    { name: 'Farmers\' Market', category: 'Tourist Attraction', location: 'Downtown', desc: 'Fresh local produce, baked goods, and handmade crafts.' },
    { name: 'Evening Ghost Tour', category: 'Tour', location: 'Downtown', desc: 'Guided walking tour of haunted sites and local legends.' },
    // v3.9.41: Dining lane — restaurants, cafes, bars (expanded for pagination depth)
    { name: 'Local Seafood Restaurant', category: 'Restaurant', location: 'Downtown', desc: 'Fresh catch of the day with waterfront or city views.' },
    { name: 'Farm-to-Table Bistro', category: 'Restaurant', location: 'Nearby', desc: 'Seasonal menu featuring locally sourced ingredients.' },
    { name: 'Traditional Regional Kitchen', category: 'Restaurant', location: 'Downtown', desc: 'Authentic local cuisine in a cozy, welcoming atmosphere.' },
    { name: 'Rooftop Bar & Lounge', category: 'Bar', location: 'Downtown', desc: 'Craft cocktails with panoramic views of the city skyline.' },
    { name: 'Artisan Coffee House', category: 'Cafe', location: 'Downtown', desc: 'Specialty coffee, pastries, and a relaxed atmosphere.' },
    { name: 'Wine & Tapas Bar', category: 'Bar', location: 'Nearby', desc: 'Curated wine list with small plates and charcuterie.' },
    { name: 'Brunch Spot', category: 'Cafe', location: 'Downtown', desc: 'Popular weekend brunch destination with creative dishes.' },
    { name: 'Pizzeria & Trattoria', category: 'Restaurant', location: 'Nearby', desc: 'Wood-fired pizza and classic pasta in a family-friendly setting.' },
    { name: 'Street Food Market', category: 'Restaurant', location: 'Downtown', desc: 'Open-air market with diverse food stalls and live music.' },
    { name: 'Craft Brewery & Kitchen', category: 'Bar', location: 'Nearby', desc: 'Locally brewed beers paired with pub-style food.' },
    { name: 'Sushi & Ramen House', category: 'Restaurant', location: 'Downtown', desc: 'Authentic Japanese cuisine with fresh sushi and rich ramen bowls.' },
    { name: 'Taco & Tequila Cantina', category: 'Restaurant', location: 'Nearby', desc: 'Vibrant Mexican eatery with street-style tacos and margaritas.' },
    { name: 'Speakeasy Cocktail Lounge', category: 'Bar', location: 'Downtown', desc: 'Hidden entrance, vintage décor, and inventive craft cocktails.' },
    { name: 'Waterfront Grill', category: 'Restaurant', location: 'Nearby', desc: 'Grilled steaks and seafood with sunset waterfront dining.' },
    { name: 'Artisan Bakery & Café', category: 'Cafe', location: 'Downtown', desc: 'Fresh-baked breads, croissants, and gourmet sandwiches.' },
    { name: 'Pho & Noodle Bar', category: 'Restaurant', location: 'Downtown', desc: 'Steaming Vietnamese pho and hand-pulled noodle dishes.' },
    { name: 'Gastropub & Ale House', category: 'Bar', location: 'Nearby', desc: 'Upscale pub fare with rotating craft beer selections.' },
    { name: 'Mediterranean Kitchen', category: 'Restaurant', location: 'Downtown', desc: 'Fresh hummus, kebabs, and wood-fired flatbreads.' },
    { name: 'Dessert & Gelato Bar', category: 'Cafe', location: 'Nearby', desc: 'Artisan gelato, crêpes, and decadent pastries.' },
    { name: 'BBQ Smokehouse', category: 'Restaurant', location: 'Nearby', desc: 'Slow-smoked ribs, brisket, and house-made sides.' },
  ];
}

// ============================================================================
// HELPER: Convert generated name to AttractionSuggestion
// ============================================================================

function buildAttraction(
  gen: { name: string; category: string; location: string; desc: string },
  index: number,
  regionKey: string,
  baseDistance: number
): AttractionSuggestion {
  const id = `${regionKey}-gen-${index}`;
  // Deterministic pseudo-random distance spread from baseDistance
  const distSpread = ((index * 7 + 3) % 40) + baseDistance;
  const rating = 4.0 + ((index * 3) % 10) / 10;
  const reviewCount = 200 + ((index * 137) % 5000);
  const priceIdx = index % PRICE_LEVELS.length;
  const patternIdx = index % BOOKING_PATTERNS.length;
  const thumbIdx = index % THUMBNAIL_POOL.length;

  return {
    id,
    name: gen.name,
    shortDescription: gen.desc,
    category: gen.category,
    thumbnailUrl: THUMBNAIL_POOL[thumbIdx],
    priceLevel: PRICE_LEVELS[priceIdx],
    bookingInfo: {
      ticketRequired: priceIdx > 0,
      advanceRecommended: patternIdx === 1 || patternIdx === 2,
      bookingPattern: BOOKING_PATTERNS[patternIdx],
    },
    locationSummary: gen.location,
    distanceMiles: Math.round(distSpread * 10) / 10,
    rating: Math.round(rating * 10) / 10,
    reviewCount,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get all attractions for a region, combining curated + generated data.
 * Returns 60+ results for known regions, 25+ for unknown.
 */
export function getMockAttractions(city: string, state?: string): AttractionSuggestion[] {
  const normalizedCity = city.toLowerCase().trim();
  const normalizedState = state?.toLowerCase().trim() || '';

  // Find matching region
  const region = REGIONS.find((r) => {
    if (r.matchCities.some((c) => normalizedCity.includes(c))) return true;
    if (normalizedState && r.matchStates.some((s) => normalizedState.includes(s))) return true;
    return false;
  });

  if (region) {
    // Combine curated + generated
    const generated = region.generatedNames.map((gen, i) =>
      buildAttraction(gen, i, region.key, 5)
    );
    return [...region.curated, ...generated];
  }

  // Default / unknown region
  const genericNames = generateGenericAttractions();
  return genericNames.map((gen, i) => buildAttraction(gen, i, 'default', 2));
}

/**
 * Filter attractions by radius using distanceMiles field.
 * If distanceMiles is not set, attraction is included (benefit of the doubt).
 */
export function filterByRadius(
  attractions: AttractionSuggestion[],
  radiusMiles: number
): AttractionSuggestion[] {
  return attractions.filter(
    (a) => a.distanceMiles === undefined || a.distanceMiles <= radiusMiles
  );
}

/**
 * Deduplicate attractions by id, then by normalized name+location.
 */
export function dedupeAttractions(attractions: AttractionSuggestion[]): AttractionSuggestion[] {
  const seenIds = new Set<string>();
  const seenNameLoc = new Set<string>();
  const result: AttractionSuggestion[] = [];

  for (const a of attractions) {
    if (seenIds.has(a.id)) continue;
    const nameLocKey = `${a.name.toLowerCase().trim()}|${a.locationSummary.toLowerCase().trim()}`;
    if (seenNameLoc.has(nameLocKey)) continue;
    seenIds.add(a.id);
    seenNameLoc.add(nameLocKey);
    result.push(a);
  }

  return result;
}

/**
 * Rank attractions: distance asc, rating desc, reviewCount desc.
 */
export function rankAttractions(attractions: AttractionSuggestion[]): AttractionSuggestion[] {
  return [...attractions].sort((a, b) => {
    // Distance ascending (undefined = last)
    const distA = a.distanceMiles ?? 9999;
    const distB = b.distanceMiles ?? 9999;
    if (distA !== distB) return distA - distB;

    // Rating descending
    const ratingA = a.rating ?? 0;
    const ratingB = b.rating ?? 0;
    if (ratingA !== ratingB) return ratingB - ratingA;

    // Review count descending
    const rcA = a.reviewCount ?? 0;
    const rcB = b.reviewCount ?? 0;
    return rcB - rcA;
  });
}

/**
 * Filter attractions by keyword query.
 * Matches against name, shortDescription, category, and locationSummary.
 * Case-insensitive, supports multiple space-separated terms (AND logic).
 */
export function filterByQuery(
  attractions: AttractionSuggestion[],
  query: string
): AttractionSuggestion[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return attractions;

  const terms = trimmed.split(/\s+/).filter(t => t.length > 0);

  return attractions.filter(a => {
    const searchable = [
      a.name,
      a.shortDescription,
      a.category,
      a.locationSummary,
    ].join(' ').toLowerCase();

    return terms.every(term => searchable.includes(term));
  });
}
