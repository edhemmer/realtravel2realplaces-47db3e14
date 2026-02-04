// Minimal airport data for home airport lookup
// Contains major US and international airports

export interface Airport {
  code: string;
  name: string;
  city: string;
  state?: string;
  country: string;
}

export const airports: Airport[] = [
  // Major US Airports
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', state: 'GA', country: 'USA' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', state: 'TX', country: 'USA' },
  { code: 'DEN', name: 'Denver International', city: 'Denver', state: 'CO', country: 'USA' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', state: 'IL', country: 'USA' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', state: 'CA', country: 'USA' },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', state: 'NY', country: 'USA' },
  { code: 'LGA', name: 'LaGuardia', city: 'New York', state: 'NY', country: 'USA' },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', state: 'NJ', country: 'USA' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', state: 'CA', country: 'USA' },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', state: 'WA', country: 'USA' },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', state: 'FL', country: 'USA' },
  { code: 'MIA', name: 'Miami International', city: 'Miami', state: 'FL', country: 'USA' },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood International', city: 'Fort Lauderdale', state: 'FL', country: 'USA' },
  { code: 'TPA', name: 'Tampa International', city: 'Tampa', state: 'FL', country: 'USA' },
  { code: 'BOS', name: 'Boston Logan International', city: 'Boston', state: 'MA', country: 'USA' },
  { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', state: 'AZ', country: 'USA' },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', state: 'TX', country: 'USA' },
  { code: 'HOU', name: 'William P. Hobby', city: 'Houston', state: 'TX', country: 'USA' },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', state: 'NV', country: 'USA' },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis', state: 'MN', country: 'USA' },
  { code: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', state: 'MI', country: 'USA' },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', state: 'PA', country: 'USA' },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', state: 'NC', country: 'USA' },
  { code: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore', state: 'MD', country: 'USA' },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington', state: 'DC', country: 'USA' },
  { code: 'IAD', name: 'Washington Dulles International', city: 'Washington', state: 'VA', country: 'USA' },
  { code: 'SAN', name: 'San Diego International', city: 'San Diego', state: 'CA', country: 'USA' },
  { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', state: 'UT', country: 'USA' },
  { code: 'PDX', name: 'Portland International', city: 'Portland', state: 'OR', country: 'USA' },
  { code: 'AUS', name: 'Austin-Bergstrom International', city: 'Austin', state: 'TX', country: 'USA' },
  { code: 'BNA', name: 'Nashville International', city: 'Nashville', state: 'TN', country: 'USA' },
  { code: 'RDU', name: 'Raleigh-Durham International', city: 'Raleigh', state: 'NC', country: 'USA' },
  { code: 'SMF', name: 'Sacramento International', city: 'Sacramento', state: 'CA', country: 'USA' },
  { code: 'STL', name: 'St. Louis Lambert International', city: 'St. Louis', state: 'MO', country: 'USA' },
  { code: 'MCI', name: 'Kansas City International', city: 'Kansas City', state: 'MO', country: 'USA' },
  { code: 'OAK', name: 'Oakland International', city: 'Oakland', state: 'CA', country: 'USA' },
  { code: 'SJC', name: 'San Jose International', city: 'San Jose', state: 'CA', country: 'USA' },
  { code: 'MDW', name: 'Chicago Midway International', city: 'Chicago', state: 'IL', country: 'USA' },
  { code: 'HNL', name: 'Daniel K. Inouye International', city: 'Honolulu', state: 'HI', country: 'USA' },
  { code: 'ANC', name: 'Ted Stevens Anchorage International', city: 'Anchorage', state: 'AK', country: 'USA' },
  { code: 'SNA', name: 'John Wayne', city: 'Santa Ana', state: 'CA', country: 'USA' },
  { code: 'DAL', name: 'Dallas Love Field', city: 'Dallas', state: 'TX', country: 'USA' },
  { code: 'IND', name: 'Indianapolis International', city: 'Indianapolis', state: 'IN', country: 'USA' },
  { code: 'CMH', name: 'John Glenn Columbus International', city: 'Columbus', state: 'OH', country: 'USA' },
  { code: 'CLE', name: 'Cleveland Hopkins International', city: 'Cleveland', state: 'OH', country: 'USA' },
  { code: 'PIT', name: 'Pittsburgh International', city: 'Pittsburgh', state: 'PA', country: 'USA' },
  { code: 'CVG', name: 'Cincinnati/Northern Kentucky International', city: 'Cincinnati', state: 'OH', country: 'USA' },
  { code: 'MKE', name: 'General Mitchell International', city: 'Milwaukee', state: 'WI', country: 'USA' },
  { code: 'JAX', name: 'Jacksonville International', city: 'Jacksonville', state: 'FL', country: 'USA' },
  { code: 'RSW', name: 'Southwest Florida International', city: 'Fort Myers', state: 'FL', country: 'USA' },
  { code: 'PBI', name: 'Palm Beach International', city: 'West Palm Beach', state: 'FL', country: 'USA' },
  { code: 'SAT', name: 'San Antonio International', city: 'San Antonio', state: 'TX', country: 'USA' },
  { code: 'ABQ', name: 'Albuquerque International Sunport', city: 'Albuquerque', state: 'NM', country: 'USA' },
  { code: 'OKC', name: 'Will Rogers World', city: 'Oklahoma City', state: 'OK', country: 'USA' },
  { code: 'BUF', name: 'Buffalo Niagara International', city: 'Buffalo', state: 'NY', country: 'USA' },
  { code: 'PVD', name: 'T.F. Green International', city: 'Providence', state: 'RI', country: 'USA' },
  { code: 'BDL', name: 'Bradley International', city: 'Hartford', state: 'CT', country: 'USA' },
  { code: 'ORF', name: 'Norfolk International', city: 'Norfolk', state: 'VA', country: 'USA' },
  { code: 'RIC', name: 'Richmond International', city: 'Richmond', state: 'VA', country: 'USA' },
  { code: 'MEM', name: 'Memphis International', city: 'Memphis', state: 'TN', country: 'USA' },
  { code: 'MSY', name: 'Louis Armstrong New Orleans International', city: 'New Orleans', state: 'LA', country: 'USA' },
  { code: 'ONT', name: 'Ontario International', city: 'Ontario', state: 'CA', country: 'USA' },
  { code: 'BUR', name: 'Hollywood Burbank', city: 'Burbank', state: 'CA', country: 'USA' },
  { code: 'LGB', name: 'Long Beach', city: 'Long Beach', state: 'CA', country: 'USA' },
  { code: 'TUS', name: 'Tucson International', city: 'Tucson', state: 'AZ', country: 'USA' },
  // Major International Airports
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'UK' },
  { code: 'LGW', name: 'Gatwick', city: 'London', country: 'UK' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France' },
  { code: 'ORY', name: 'Orly', city: 'Paris', country: 'France' },
  { code: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany' },
  { code: 'MUC', name: 'Munich', city: 'Munich', country: 'Germany' },
  { code: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas', city: 'Madrid', country: 'Spain' },
  { code: 'BCN', name: 'Barcelona–El Prat', city: 'Barcelona', country: 'Spain' },
  { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino', city: 'Rome', country: 'Italy' },
  { code: 'MXP', name: 'Milan Malpensa', city: 'Milan', country: 'Italy' },
  { code: 'ZRH', name: 'Zurich', city: 'Zurich', country: 'Switzerland' },
  { code: 'DUB', name: 'Dublin', city: 'Dublin', country: 'Ireland' },
  { code: 'LIS', name: 'Lisbon Portela', city: 'Lisbon', country: 'Portugal' },
  { code: 'VIE', name: 'Vienna International', city: 'Vienna', country: 'Austria' },
  { code: 'CPH', name: 'Copenhagen', city: 'Copenhagen', country: 'Denmark' },
  { code: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'Norway' },
  { code: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'Sweden' },
  { code: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'Finland' },
  { code: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'Canada' },
  { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'Canada' },
  { code: 'YUL', name: 'Montréal–Trudeau International', city: 'Montreal', country: 'Canada' },
  { code: 'YYC', name: 'Calgary International', city: 'Calgary', country: 'Canada' },
  { code: 'MEX', name: 'Benito Juárez International', city: 'Mexico City', country: 'Mexico' },
  { code: 'CUN', name: 'Cancún International', city: 'Cancún', country: 'Mexico' },
  { code: 'GDL', name: 'Guadalajara International', city: 'Guadalajara', country: 'Mexico' },
  { code: 'SJO', name: 'Juan Santamaría International', city: 'San José', country: 'Costa Rica' },
  { code: 'PTY', name: 'Tocumen International', city: 'Panama City', country: 'Panama' },
  { code: 'NRT', name: 'Narita International', city: 'Tokyo', country: 'Japan' },
  { code: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan' },
  { code: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'South Korea' },
  { code: 'PEK', name: 'Beijing Capital International', city: 'Beijing', country: 'China' },
  { code: 'PVG', name: 'Shanghai Pudong International', city: 'Shanghai', country: 'China' },
  { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'Hong Kong' },
  { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'Singapore' },
  { code: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand' },
  { code: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia' },
  { code: 'MEL', name: 'Melbourne Tullamarine', city: 'Melbourne', country: 'Australia' },
  { code: 'BNE', name: 'Brisbane', city: 'Brisbane', country: 'Australia' },
  { code: 'AKL', name: 'Auckland', city: 'Auckland', country: 'New Zealand' },
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE' },
  { code: 'DOH', name: 'Hamad International', city: 'Doha', country: 'Qatar' },
  { code: 'TLV', name: 'Ben Gurion', city: 'Tel Aviv', country: 'Israel' },
  { code: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', country: 'South Africa' },
  { code: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'South Africa' },
  { code: 'GRU', name: 'São Paulo–Guarulhos', city: 'São Paulo', country: 'Brazil' },
  { code: 'GIG', name: 'Rio de Janeiro–Galeão', city: 'Rio de Janeiro', country: 'Brazil' },
  { code: 'EZE', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'Argentina' },
  { code: 'SCL', name: 'Arturo Merino Benítez International', city: 'Santiago', country: 'Chile' },
  { code: 'BOG', name: 'El Dorado International', city: 'Bogotá', country: 'Colombia' },
  { code: 'LIM', name: 'Jorge Chávez International', city: 'Lima', country: 'Peru' },
];

export function formatAirport(airport: Airport): string {
  if (airport.state) {
    return `${airport.code} – ${airport.city}, ${airport.state}`;
  }
  return `${airport.code} – ${airport.city}, ${airport.country}`;
}

export function searchAirports(query: string): Airport[] {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  
  return airports
    .filter(airport => 
      airport.code.toLowerCase().includes(lowerQuery) ||
      airport.city.toLowerCase().includes(lowerQuery) ||
      airport.name.toLowerCase().includes(lowerQuery) ||
      (airport.state && airport.state.toLowerCase().includes(lowerQuery))
    )
    .slice(0, 8); // Limit to 8 suggestions
}

export function getAirportByCode(code: string): Airport | undefined {
  return airports.find(a => a.code === code);
}
