// Airport data with official website URLs for airport info lookup
// Contains major US and international airports

export interface Airport {
  code: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  /** Alternate names for fuzzy matching (e.g., "Heathrow", "Fiumicino") */
  aliases?: string[];
  officialUrl?: string;
  mapUrl?: string;
  transportUrl?: string;
  parkingUrl?: string;
}

export const airports: Airport[] = [
  // Major US Airports
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', state: 'GA', country: 'USA', aliases: ['Hartsfield-Jackson', 'Hartsfield-Jackson Int', 'Hartsfield Jackson', 'Atlanta Airport'], officialUrl: 'https://www.atl.com', mapUrl: 'https://www.atl.com/maps/', parkingUrl: 'https://www.atl.com/parking/' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', state: 'TX', country: 'USA', officialUrl: 'https://www.dfwairport.com', mapUrl: 'https://www.dfwairport.com/maps/', parkingUrl: 'https://www.dfwairport.com/parking/' },
  { code: 'DEN', name: 'Denver International', city: 'Denver', state: 'CO', country: 'USA', officialUrl: 'https://www.flydenver.com', mapUrl: 'https://www.flydenver.com/maps', parkingUrl: 'https://www.flydenver.com/parking' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', state: 'IL', country: 'USA', officialUrl: 'https://www.flychicago.com/ohare', mapUrl: 'https://www.flychicago.com/ohare/map/', parkingUrl: 'https://www.flychicago.com/ohare/parking/' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', state: 'CA', country: 'USA', officialUrl: 'https://www.flylax.com', mapUrl: 'https://www.flylax.com/lax-terminal-maps', parkingUrl: 'https://www.flylax.com/lax-parking' },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', state: 'NY', country: 'USA', officialUrl: 'https://www.jfkairport.com', mapUrl: 'https://www.jfkairport.com/at-airport/airport-maps', parkingUrl: 'https://www.jfkairport.com/to-from-airport/parking' },
  { code: 'LGA', name: 'LaGuardia', city: 'New York', state: 'NY', country: 'USA', officialUrl: 'https://www.laguardiaairport.com', mapUrl: 'https://www.laguardiaairport.com/at-airport/airport-maps', parkingUrl: 'https://www.laguardiaairport.com/to-from-airport/parking' },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', state: 'NJ', country: 'USA', officialUrl: 'https://www.newarkairport.com', mapUrl: 'https://www.newarkairport.com/at-airport/airport-maps', parkingUrl: 'https://www.newarkairport.com/to-from-airport/parking' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', state: 'CA', country: 'USA', officialUrl: 'https://www.flysfo.com', mapUrl: 'https://www.flysfo.com/maps', parkingUrl: 'https://www.flysfo.com/parking' },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', state: 'WA', country: 'USA', officialUrl: 'https://www.portseattle.org/sea-tac', mapUrl: 'https://www.portseattle.org/sea-tac/maps', parkingUrl: 'https://www.portseattle.org/sea-tac/parking' },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', state: 'FL', country: 'USA', officialUrl: 'https://www.orlandoairports.net', mapUrl: 'https://www.orlandoairports.net/maps/', parkingUrl: 'https://www.orlandoairports.net/parking/' },
  { code: 'MIA', name: 'Miami International', city: 'Miami', state: 'FL', country: 'USA', officialUrl: 'https://www.miami-airport.com', mapUrl: 'https://www.miami-airport.com/terminal_maps.asp', parkingUrl: 'https://www.miami-airport.com/parking.asp' },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood International', city: 'Fort Lauderdale', state: 'FL', country: 'USA', officialUrl: 'https://www.broward.org/airport', parkingUrl: 'https://www.broward.org/airport/parking' },
  { code: 'TPA', name: 'Tampa International', city: 'Tampa', state: 'FL', country: 'USA', officialUrl: 'https://www.tampaairport.com', mapUrl: 'https://www.tampaairport.com/airport-map', parkingUrl: 'https://www.tampaairport.com/parking' },
  { code: 'BOS', name: 'Boston Logan International', city: 'Boston', state: 'MA', country: 'USA', officialUrl: 'https://www.massport.com/logan-airport', mapUrl: 'https://www.massport.com/logan-airport/getting-to-logan/airport-maps/', parkingUrl: 'https://www.massport.com/logan-airport/getting-to-logan/parking/' },
  { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', state: 'AZ', country: 'USA', officialUrl: 'https://www.skyharbor.com', mapUrl: 'https://www.skyharbor.com/maps', parkingUrl: 'https://www.skyharbor.com/parking' },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', state: 'TX', country: 'USA', officialUrl: 'https://www.fly2houston.com/iah', mapUrl: 'https://www.fly2houston.com/iah/maps', parkingUrl: 'https://www.fly2houston.com/iah/parking' },
  { code: 'HOU', name: 'William P. Hobby', city: 'Houston', state: 'TX', country: 'USA', officialUrl: 'https://www.fly2houston.com/hou', mapUrl: 'https://www.fly2houston.com/hou/maps', parkingUrl: 'https://www.fly2houston.com/hou/parking' },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', state: 'NV', country: 'USA', officialUrl: 'https://www.harryreidairport.com', mapUrl: 'https://www.harryreidairport.com/Maps', parkingUrl: 'https://www.harryreidairport.com/Parking' },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis', state: 'MN', country: 'USA', officialUrl: 'https://www.mspairport.com', mapUrl: 'https://www.mspairport.com/terminals', parkingUrl: 'https://www.mspairport.com/parking' },
  { code: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', state: 'MI', country: 'USA', officialUrl: 'https://www.metroairport.com', mapUrl: 'https://www.metroairport.com/terminals', parkingUrl: 'https://www.metroairport.com/parking' },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', state: 'PA', country: 'USA', officialUrl: 'https://www.phl.org', mapUrl: 'https://www.phl.org/airport-guide/terminals', parkingUrl: 'https://www.phl.org/parking' },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', state: 'NC', country: 'USA', officialUrl: 'https://www.cltairport.com', mapUrl: 'https://www.cltairport.com/terminal/', parkingUrl: 'https://www.cltairport.com/parking/' },
  { code: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore', state: 'MD', country: 'USA', officialUrl: 'https://www.bwiairport.com', mapUrl: 'https://www.bwiairport.com/terminals', parkingUrl: 'https://www.bwiairport.com/parking' },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington', state: 'DC', country: 'USA', officialUrl: 'https://www.flyreagan.com', mapUrl: 'https://www.flyreagan.com/dca/terminals', parkingUrl: 'https://www.flyreagan.com/dca/parking' },
  { code: 'IAD', name: 'Washington Dulles International', city: 'Washington', state: 'VA', country: 'USA', officialUrl: 'https://www.flydulles.com', mapUrl: 'https://www.flydulles.com/iad/terminals', parkingUrl: 'https://www.flydulles.com/iad/parking' },
  { code: 'SAN', name: 'San Diego International', city: 'San Diego', state: 'CA', country: 'USA', officialUrl: 'https://www.san.org', mapUrl: 'https://www.san.org/Airport-Guide', parkingUrl: 'https://www.san.org/Parking' },
  { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', state: 'UT', country: 'USA', officialUrl: 'https://slcairport.com', mapUrl: 'https://slcairport.com/maps', parkingUrl: 'https://slcairport.com/parking' },
  { code: 'PDX', name: 'Portland International', city: 'Portland', state: 'OR', country: 'USA', officialUrl: 'https://www.flypdx.com', mapUrl: 'https://www.flypdx.com/Maps', parkingUrl: 'https://www.flypdx.com/Parking' },
  { code: 'AUS', name: 'Austin-Bergstrom International', city: 'Austin', state: 'TX', country: 'USA', officialUrl: 'https://www.austintexas.gov/airport', parkingUrl: 'https://www.austintexas.gov/airport/parking' },
  { code: 'BNA', name: 'Nashville International', city: 'Nashville', state: 'TN', country: 'USA', officialUrl: 'https://www.flynashville.com', mapUrl: 'https://www.flynashville.com/at-the-airport/terminal-map', parkingUrl: 'https://www.flynashville.com/parking' },
  { code: 'RDU', name: 'Raleigh-Durham International', city: 'Raleigh', state: 'NC', country: 'USA', officialUrl: 'https://www.rdu.com', mapUrl: 'https://www.rdu.com/terminal-information/', parkingUrl: 'https://www.rdu.com/parking/' },
  { code: 'SMF', name: 'Sacramento International', city: 'Sacramento', state: 'CA', country: 'USA', officialUrl: 'https://www.sacramento.aero', parkingUrl: 'https://www.sacramento.aero/smf/parking' },
  { code: 'STL', name: 'St. Louis Lambert International', city: 'St. Louis', state: 'MO', country: 'USA', officialUrl: 'https://www.flystl.com', mapUrl: 'https://www.flystl.com/at-the-airport/terminal-map', parkingUrl: 'https://www.flystl.com/parking' },
  { code: 'MCI', name: 'Kansas City International', city: 'Kansas City', state: 'MO', country: 'USA', officialUrl: 'https://www.flykci.com', mapUrl: 'https://www.flykci.com/terminal/', parkingUrl: 'https://www.flykci.com/parking/' },
  { code: 'OAK', name: 'Oakland International', city: 'Oakland', state: 'CA', country: 'USA', officialUrl: 'https://www.oaklandairport.com', mapUrl: 'https://www.oaklandairport.com/terminals-airlines/', parkingUrl: 'https://www.oaklandairport.com/parking/' },
  { code: 'SJC', name: 'San Jose International', city: 'San Jose', state: 'CA', country: 'USA', officialUrl: 'https://www.flysanjose.com', mapUrl: 'https://www.flysanjose.com/maps', parkingUrl: 'https://www.flysanjose.com/parking' },
  { code: 'MDW', name: 'Chicago Midway International', city: 'Chicago', state: 'IL', country: 'USA', officialUrl: 'https://www.flychicago.com/midway', mapUrl: 'https://www.flychicago.com/midway/map/', parkingUrl: 'https://www.flychicago.com/midway/parking/' },
  { code: 'HNL', name: 'Daniel K. Inouye International', city: 'Honolulu', state: 'HI', country: 'USA', officialUrl: 'https://airports.hawaii.gov/hnl', mapUrl: 'https://airports.hawaii.gov/hnl/maps/', parkingUrl: 'https://airports.hawaii.gov/hnl/parking/' },
  { code: 'ANC', name: 'Ted Stevens Anchorage International', city: 'Anchorage', state: 'AK', country: 'USA', officialUrl: 'https://www.anchorageairport.com', parkingUrl: 'https://www.anchorageairport.com/parking/' },
  { code: 'SNA', name: 'John Wayne', city: 'Santa Ana', state: 'CA', country: 'USA', officialUrl: 'https://www.ocair.com', mapUrl: 'https://www.ocair.com/traveler-info/airport-map/', parkingUrl: 'https://www.ocair.com/parking/' },
  { code: 'DAL', name: 'Dallas Love Field', city: 'Dallas', state: 'TX', country: 'USA', officialUrl: 'https://www.dallas-lovefield.com', parkingUrl: 'https://www.dallas-lovefield.com/parking' },
  { code: 'IND', name: 'Indianapolis International', city: 'Indianapolis', state: 'IN', country: 'USA', officialUrl: 'https://www.ind.com', mapUrl: 'https://www.ind.com/terminal', parkingUrl: 'https://www.ind.com/parking' },
  { code: 'CMH', name: 'John Glenn Columbus International', city: 'Columbus', state: 'OH', country: 'USA', officialUrl: 'https://flycolumbus.com', mapUrl: 'https://flycolumbus.com/at-the-airport/terminal-map', parkingUrl: 'https://flycolumbus.com/parking' },
  { code: 'CLE', name: 'Cleveland Hopkins International', city: 'Cleveland', state: 'OH', country: 'USA', officialUrl: 'https://www.clevelandairport.com', mapUrl: 'https://www.clevelandairport.com/terminal', parkingUrl: 'https://www.clevelandairport.com/parking' },
  { code: 'PIT', name: 'Pittsburgh International', city: 'Pittsburgh', state: 'PA', country: 'USA', officialUrl: 'https://flypittsburgh.com', mapUrl: 'https://flypittsburgh.com/terminal-map/', parkingUrl: 'https://flypittsburgh.com/parking/' },
  { code: 'CVG', name: 'Cincinnati/Northern Kentucky International', city: 'Cincinnati', state: 'OH', country: 'USA', officialUrl: 'https://www.cvgairport.com', mapUrl: 'https://www.cvgairport.com/at-the-airport/terminal-map', parkingUrl: 'https://www.cvgairport.com/parking' },
  { code: 'MKE', name: 'General Mitchell International', city: 'Milwaukee', state: 'WI', country: 'USA', officialUrl: 'https://www.mitchellairport.com', mapUrl: 'https://www.mitchellairport.com/terminal', parkingUrl: 'https://www.mitchellairport.com/parking' },
  { code: 'JAX', name: 'Jacksonville International', city: 'Jacksonville', state: 'FL', country: 'USA', officialUrl: 'https://www.flyjax.com', mapUrl: 'https://www.flyjax.com/at-the-airport/terminal-map', parkingUrl: 'https://www.flyjax.com/parking' },
  { code: 'RSW', name: 'Southwest Florida International', city: 'Fort Myers', state: 'FL', country: 'USA', officialUrl: 'https://www.flylcpa.com', parkingUrl: 'https://www.flylcpa.com/parking/' },
  { code: 'PBI', name: 'Palm Beach International', city: 'West Palm Beach', state: 'FL', country: 'USA', officialUrl: 'https://www.pbia.org', parkingUrl: 'https://www.pbia.org/parking' },
  { code: 'SAT', name: 'San Antonio International', city: 'San Antonio', state: 'TX', country: 'USA', officialUrl: 'https://www.sanantonio.gov/sat', parkingUrl: 'https://www.sanantonio.gov/sat/parking' },
  { code: 'ABQ', name: 'Albuquerque International Sunport', city: 'Albuquerque', state: 'NM', country: 'USA', officialUrl: 'https://www.abqsunport.com', mapUrl: 'https://www.abqsunport.com/at-the-airport/terminal-map/', parkingUrl: 'https://www.abqsunport.com/parking/' },
  { code: 'OKC', name: 'Will Rogers World', city: 'Oklahoma City', state: 'OK', country: 'USA', officialUrl: 'https://www.flyokc.com', parkingUrl: 'https://www.flyokc.com/parking' },
  { code: 'BUF', name: 'Buffalo Niagara International', city: 'Buffalo', state: 'NY', country: 'USA', officialUrl: 'https://www.buffaloairport.com', parkingUrl: 'https://www.buffaloairport.com/parking/' },
  { code: 'PVD', name: 'T.F. Green International', city: 'Providence', state: 'RI', country: 'USA', officialUrl: 'https://www.pvdairport.com', parkingUrl: 'https://www.pvdairport.com/parking' },
  { code: 'BDL', name: 'Bradley International', city: 'Hartford', state: 'CT', country: 'USA', officialUrl: 'https://www.bradleyairport.com', mapUrl: 'https://www.bradleyairport.com/terminal-map/', parkingUrl: 'https://www.bradleyairport.com/parking/' },
  { code: 'ORF', name: 'Norfolk International', city: 'Norfolk', state: 'VA', country: 'USA', officialUrl: 'https://www.norfolkairport.com', parkingUrl: 'https://www.norfolkairport.com/parking/' },
  { code: 'RIC', name: 'Richmond International', city: 'Richmond', state: 'VA', country: 'USA', officialUrl: 'https://www.flyrichmond.com', parkingUrl: 'https://www.flyrichmond.com/parking/' },
  { code: 'MEM', name: 'Memphis International', city: 'Memphis', state: 'TN', country: 'USA', officialUrl: 'https://www.flymemphis.com', parkingUrl: 'https://www.flymemphis.com/parking' },
  { code: 'MSY', name: 'Louis Armstrong New Orleans International', city: 'New Orleans', state: 'LA', country: 'USA', officialUrl: 'https://www.flymsy.com', mapUrl: 'https://www.flymsy.com/at-the-airport/terminal-map/', parkingUrl: 'https://www.flymsy.com/parking/' },
  { code: 'ONT', name: 'Ontario International', city: 'Ontario', state: 'CA', country: 'USA', officialUrl: 'https://www.flyontario.com', parkingUrl: 'https://www.flyontario.com/parking' },
  { code: 'BUR', name: 'Hollywood Burbank', city: 'Burbank', state: 'CA', country: 'USA', officialUrl: 'https://hollywoodburbankairport.com', parkingUrl: 'https://hollywoodburbankairport.com/parking/' },
  { code: 'LGB', name: 'Long Beach', city: 'Long Beach', state: 'CA', country: 'USA', officialUrl: 'https://www.lgb.org', parkingUrl: 'https://www.lgb.org/parking' },
  { code: 'TUS', name: 'Tucson International', city: 'Tucson', state: 'AZ', country: 'USA', officialUrl: 'https://www.flytucson.com', parkingUrl: 'https://www.flytucson.com/parking/' },
  // Major International Airports
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'UK', aliases: ['London Heathrow', 'Heathrow London', 'Heathrow (London)'], officialUrl: 'https://www.heathrow.com', mapUrl: 'https://www.heathrow.com/at-the-airport/airport-maps', parkingUrl: 'https://www.heathrow.com/transport-and-directions/heathrow-parking' },
  { code: 'LGW', name: 'Gatwick', city: 'London', country: 'UK', aliases: ['London Gatwick', 'Gatwick (London)'], officialUrl: 'https://www.gatwickairport.com', mapUrl: 'https://www.gatwickairport.com/at-the-airport/airport-maps/', parkingUrl: 'https://www.gatwickairport.com/parking/' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', officialUrl: 'https://www.parisaeroport.fr/en/passengers/flights/paris-charles-de-gaulle', mapUrl: 'https://www.parisaeroport.fr/en/passengers/access/paris-charles-de-gaulle/terminal-maps', parkingUrl: 'https://www.parisaeroport.fr/en/passengers/access/paris-charles-de-gaulle/car-parks' },
  { code: 'ORY', name: 'Orly', city: 'Paris', country: 'France', officialUrl: 'https://www.parisaeroport.fr/en/passengers/flights/paris-orly', parkingUrl: 'https://www.parisaeroport.fr/en/passengers/access/paris-orly/car-parks' },
  { code: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', officialUrl: 'https://www.frankfurt-airport.com', mapUrl: 'https://www.frankfurt-airport.com/en/airport-guide/terminal-overview.html', parkingUrl: 'https://www.frankfurt-airport.com/en/directions/parking.html' },
  { code: 'MUC', name: 'Munich', city: 'Munich', country: 'Germany', officialUrl: 'https://www.munich-airport.de/en', mapUrl: 'https://www.munich-airport.de/en/consumer/at-the-airport/terminal-info', parkingUrl: 'https://www.munich-airport.de/en/consumer/to-and-from/parking' },
  { code: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands', officialUrl: 'https://www.schiphol.nl/en', mapUrl: 'https://www.schiphol.nl/en/at-schiphol/map', parkingUrl: 'https://www.schiphol.nl/en/parking' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas', city: 'Madrid', country: 'Spain', officialUrl: 'https://www.aena.es/en/adolfo-suarez-madrid-barajas.html', parkingUrl: 'https://www.aena.es/en/adolfo-suarez-madrid-barajas/parking.html' },
  { code: 'BCN', name: 'Barcelona–El Prat', city: 'Barcelona', country: 'Spain', aliases: ['El Prat', 'Barcelona El Prat'], officialUrl: 'https://www.aena.es/en/josep-tarradellas-barcelona-el-prat.html', parkingUrl: 'https://www.aena.es/en/josep-tarradellas-barcelona-el-prat/parking.html' },
  { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino', city: 'Rome', country: 'Italy', aliases: ['Fiumicino', 'Rome Fiumicino', 'Roma Fiumicino'], officialUrl: 'https://www.adr.it/fiumicino', mapUrl: 'https://www.adr.it/fiumicino-map', parkingUrl: 'https://www.adr.it/fiumicino-parking' },
  { code: 'LIN', name: 'Milan Linate', city: 'Milan', country: 'Italy', aliases: ['Linate', 'Linate (Milan)', 'Milano Linate'], officialUrl: 'https://www.milanolinate-airport.com/en', mapUrl: 'https://www.milanolinate-airport.com/en/the-airport/airport-map', parkingUrl: 'https://www.milanolinate-airport.com/en/parking' },
  { code: 'MXP', name: 'Milan Malpensa', city: 'Milan', country: 'Italy', aliases: ['Malpensa', 'Malpensa (Milan)', 'Milano Malpensa'], officialUrl: 'https://www.milanomalpensa-airport.com/en', parkingUrl: 'https://www.milanomalpensa-airport.com/en/parking' },
  { code: 'ZRH', name: 'Zurich', city: 'Zurich', country: 'Switzerland', officialUrl: 'https://www.zurich-airport.com/en', mapUrl: 'https://www.zurich-airport.com/en/passengers/at-the-airport/airport-maps', parkingUrl: 'https://www.zurich-airport.com/en/passengers/how-to-get-there/parking' },
  { code: 'DUB', name: 'Dublin', city: 'Dublin', country: 'Ireland', officialUrl: 'https://www.dublinairport.com', mapUrl: 'https://www.dublinairport.com/at-the-airport/terminal-maps', parkingUrl: 'https://www.dublinairport.com/to-from-the-airport/car-parking' },
  { code: 'LIS', name: 'Lisbon Portela', city: 'Lisbon', country: 'Portugal', officialUrl: 'https://www.lisbon-airport.com', parkingUrl: 'https://www.lisbon-airport.com/parking' },
  { code: 'VIE', name: 'Vienna International', city: 'Vienna', country: 'Austria', officialUrl: 'https://www.viennaairport.com/en', mapUrl: 'https://www.viennaairport.com/en/passengers/at_the_airport/terminal_overview', parkingUrl: 'https://www.viennaairport.com/en/passengers/arrival__departure/parking' },
  { code: 'CPH', name: 'Copenhagen', city: 'Copenhagen', country: 'Denmark', officialUrl: 'https://www.cph.dk/en', mapUrl: 'https://www.cph.dk/en/practical/map', parkingUrl: 'https://www.cph.dk/en/parking' },
  { code: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'Norway', officialUrl: 'https://avinor.no/en/airport/oslo-airport', mapUrl: 'https://avinor.no/en/airport/oslo-airport/practical-information/terminal', parkingUrl: 'https://avinor.no/en/airport/oslo-airport/parking' },
  { code: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'Sweden', officialUrl: 'https://www.swedavia.com/arlanda', mapUrl: 'https://www.swedavia.com/arlanda/at-the-airport/', parkingUrl: 'https://www.swedavia.com/arlanda/parking/' },
  { code: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'Finland', officialUrl: 'https://www.finavia.fi/en/airports/helsinki-airport', mapUrl: 'https://www.finavia.fi/en/airports/helsinki-airport/map', parkingUrl: 'https://www.finavia.fi/en/airports/helsinki-airport/parking' },
  { code: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'Canada', officialUrl: 'https://www.torontopearson.com', mapUrl: 'https://www.torontopearson.com/en/while-you-are-here/airport-maps', parkingUrl: 'https://www.torontopearson.com/en/transportation-and-parking/parking' },
  { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'Canada', officialUrl: 'https://www.yvr.ca', mapUrl: 'https://www.yvr.ca/en/passengers/navigate-yvr/terminal-maps', parkingUrl: 'https://www.yvr.ca/en/passengers/parking' },
  { code: 'YUL', name: 'Montréal–Trudeau International', city: 'Montreal', country: 'Canada', officialUrl: 'https://www.admtl.com/en', mapUrl: 'https://www.admtl.com/en/passengers/flights/terminals', parkingUrl: 'https://www.admtl.com/en/access/parking' },
  { code: 'YYC', name: 'Calgary International', city: 'Calgary', country: 'Canada', officialUrl: 'https://www.yyc.com', mapUrl: 'https://www.yyc.com/en/our-airport/airport-maps.aspx', parkingUrl: 'https://www.yyc.com/en/parking/index.aspx' },
  { code: 'MEX', name: 'Benito Juárez International', city: 'Mexico City', country: 'Mexico', officialUrl: 'https://www.aicm.com.mx', parkingUrl: 'https://www.aicm.com.mx/en/passengers/ground-transportation/parking' },
  { code: 'CUN', name: 'Cancún International', city: 'Cancún', country: 'Mexico', officialUrl: 'https://www.cancunairport.com', parkingUrl: 'https://www.cancunairport.com/parking.html' },
  { code: 'GDL', name: 'Guadalajara International', city: 'Guadalajara', country: 'Mexico', officialUrl: 'https://www.aeropuertogdl.com.mx/en', parkingUrl: 'https://www.aeropuertogdl.com.mx/en/estacionamiento' },
  { code: 'SJO', name: 'Juan Santamaría International', city: 'San José', country: 'Costa Rica', officialUrl: 'https://sjoairport.com/en' },
  { code: 'PTY', name: 'Tocumen International', city: 'Panama City', country: 'Panama', officialUrl: 'https://www.tocumenpanama.aero/en', parkingUrl: 'https://www.tocumenpanama.aero/en/parking' },
  { code: 'NRT', name: 'Narita International', city: 'Tokyo', country: 'Japan', officialUrl: 'https://www.narita-airport.jp/en', mapUrl: 'https://www.narita-airport.jp/en/map', parkingUrl: 'https://www.narita-airport.jp/en/access/parking' },
  { code: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan', officialUrl: 'https://tokyo-haneda.com/en', mapUrl: 'https://tokyo-haneda.com/en/access/map/index.html', parkingUrl: 'https://tokyo-haneda.com/en/access/parking/index.html' },
  { code: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'South Korea', officialUrl: 'https://www.airport.kr/ap/en/index.do', mapUrl: 'https://www.airport.kr/ap/en/arr/floorMap.do', parkingUrl: 'https://www.airport.kr/ap/en/tpt/prkglotIntroduc.do' },
  { code: 'PEK', name: 'Beijing Capital International', city: 'Beijing', country: 'China', officialUrl: 'https://en.bcia.com.cn', mapUrl: 'https://en.bcia.com.cn/jcjj/jcfb/', parkingUrl: 'https://en.bcia.com.cn/jt/jctc/' },
  { code: 'PVG', name: 'Shanghai Pudong International', city: 'Shanghai', country: 'China', officialUrl: 'https://www.shanghaiairport.com/en', parkingUrl: 'https://www.shanghaiairport.com/en/jtxx/jcjt/jtxlx/' },
  { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'Hong Kong', officialUrl: 'https://www.hongkongairport.com', mapUrl: 'https://www.hongkongairport.com/en/map/', parkingUrl: 'https://www.hongkongairport.com/en/transport/to-from-airport/car-parking.page' },
  { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'Singapore', officialUrl: 'https://www.changiairport.com', mapUrl: 'https://www.changiairport.com/en/at-changi/map.html', parkingUrl: 'https://www.changiairport.com/en/transport/car-parking.html' },
  { code: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand', officialUrl: 'https://www.airportthai.co.th/en/suvarnabhumi', mapUrl: 'https://www.airportthai.co.th/en/suvarnabhumi/flight-passengers/airport-map/', parkingUrl: 'https://www.airportthai.co.th/en/suvarnabhumi/transport/parking/' },
  { code: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', officialUrl: 'https://www.sydneyairport.com.au', mapUrl: 'https://www.sydneyairport.com.au/info-sheet/airport-maps', parkingUrl: 'https://www.sydneyairport.com.au/parking' },
  { code: 'MEL', name: 'Melbourne Tullamarine', city: 'Melbourne', country: 'Australia', officialUrl: 'https://www.melbourneairport.com.au', mapUrl: 'https://www.melbourneairport.com.au/Passengers/Terminals-map', parkingUrl: 'https://www.melbourneairport.com.au/Parking' },
  { code: 'BNE', name: 'Brisbane', city: 'Brisbane', country: 'Australia', officialUrl: 'https://www.bne.com.au', mapUrl: 'https://www.bne.com.au/passenger/at-the-airport/terminal-maps', parkingUrl: 'https://www.bne.com.au/passenger/to-and-from/parking' },
  { code: 'AKL', name: 'Auckland', city: 'Auckland', country: 'New Zealand', officialUrl: 'https://www.aucklandairport.co.nz', mapUrl: 'https://www.aucklandairport.co.nz/plan-your-trip/airport-maps', parkingUrl: 'https://www.aucklandairport.co.nz/parking' },
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE', officialUrl: 'https://www.dubaiairports.ae', mapUrl: 'https://www.dubaiairports.ae/before-you-fly/dubai-airports-map', parkingUrl: 'https://www.dubaiairports.ae/before-you-fly/parking' },
  { code: 'DOH', name: 'Hamad International', city: 'Doha', country: 'Qatar', officialUrl: 'https://www.hamadairport.com', mapUrl: 'https://www.hamadairport.com/airport-guide/maps', parkingUrl: 'https://www.hamadairport.com/airport-guide/parking' },
  { code: 'TLV', name: 'Ben Gurion', city: 'Tel Aviv', country: 'Israel', officialUrl: 'https://www.iaa.gov.il/en/airports/ben-gurion', mapUrl: 'https://www.iaa.gov.il/en/airports/ben-gurion/terminal-map/', parkingUrl: 'https://www.iaa.gov.il/en/airports/ben-gurion/parking/' },
  { code: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', country: 'South Africa', officialUrl: 'https://www.airports.co.za/airports/or-tambo-international-airport', mapUrl: 'https://www.airports.co.za/airports/or-tambo-international-airport/passenger/terminal-maps', parkingUrl: 'https://www.airports.co.za/airports/or-tambo-international-airport/transport/parking' },
  { code: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'South Africa', officialUrl: 'https://www.airports.co.za/airports/cape-town-international-airport', parkingUrl: 'https://www.airports.co.za/airports/cape-town-international-airport/transport/parking' },
  { code: 'GRU', name: 'São Paulo–Guarulhos', city: 'São Paulo', country: 'Brazil', officialUrl: 'https://www.gru.com.br/en', mapUrl: 'https://www.gru.com.br/en/passenger/terminal-map', parkingUrl: 'https://www.gru.com.br/en/passenger/parking' },
  { code: 'GIG', name: 'Rio de Janeiro–Galeão', city: 'Rio de Janeiro', country: 'Brazil', officialUrl: 'https://www.riogaleao.com/en', mapUrl: 'https://www.riogaleao.com/en/passenger/terminals', parkingUrl: 'https://www.riogaleao.com/en/passenger/getting-here/parking' },
  { code: 'EZE', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'Argentina', officialUrl: 'https://www.aa2000.com.ar/ezeiza', parkingUrl: 'https://www.aa2000.com.ar/ezeiza/estacionamiento' },
  { code: 'SCL', name: 'Arturo Merino Benítez International', city: 'Santiago', country: 'Chile', officialUrl: 'https://www.nuevopudahuel.cl/en', mapUrl: 'https://www.nuevopudahuel.cl/en/plano-del-aeropuerto', parkingUrl: 'https://www.nuevopudahuel.cl/en/estacionamiento' },
  { code: 'BOG', name: 'El Dorado International', city: 'Bogotá', country: 'Colombia', officialUrl: 'https://eldorado.aero/en', mapUrl: 'https://eldorado.aero/en/terminal-map', parkingUrl: 'https://eldorado.aero/en/parking' },
  { code: 'LIM', name: 'Jorge Chávez International', city: 'Lima', country: 'Peru', officialUrl: 'https://www.lima-airport.com/en', parkingUrl: 'https://www.lima-airport.com/en/passengers/ground-transportation/parking' },
  { code: 'TFS', name: 'Tenerife South', city: 'Tenerife', country: 'Spain', aliases: ['Reina Sofía', 'Tenerife Sur'], officialUrl: 'https://www.aena.es/en/tenerife-sur.html' },
  { code: 'TFN', name: 'Tenerife North', city: 'Tenerife', country: 'Spain', aliases: ['Los Rodeos'], officialUrl: 'https://www.aena.es/en/tenerife-norte.html' },
  { code: 'STN', name: 'London Stansted', city: 'London', country: 'UK', aliases: ['Stansted'], officialUrl: 'https://www.stanstedairport.com', mapUrl: 'https://www.stanstedairport.com/at-the-airport/airport-maps/', parkingUrl: 'https://www.stanstedairport.com/parking/' },
  { code: 'LTN', name: 'London Luton', city: 'London', country: 'UK', aliases: ['Luton'], officialUrl: 'https://www.london-luton.co.uk', parkingUrl: 'https://www.london-luton.co.uk/parking' },
  { code: 'EDI', name: 'Edinburgh', city: 'Edinburgh', country: 'UK', officialUrl: 'https://www.edinburghairport.com', mapUrl: 'https://www.edinburghairport.com/prepare/airport-maps', parkingUrl: 'https://www.edinburghairport.com/transport-links/car-parking' },
  { code: 'MAN', name: 'Manchester', city: 'Manchester', country: 'UK', officialUrl: 'https://www.manchesterairport.co.uk', mapUrl: 'https://www.manchesterairport.co.uk/at-the-airport/terminal-maps/', parkingUrl: 'https://www.manchesterairport.co.uk/parking/' },
  { code: 'BHX', name: 'Birmingham', city: 'Birmingham', country: 'UK', officialUrl: 'https://www.birminghamairport.co.uk', parkingUrl: 'https://www.birminghamairport.co.uk/parking-and-transport/car-parking/' },
  { code: 'AGP', name: 'Málaga–Costa del Sol', city: 'Málaga', country: 'Spain', aliases: ['Malaga'], officialUrl: 'https://www.aena.es/en/malaga-costa-del-sol.html' },
  { code: 'PMI', name: 'Palma de Mallorca', city: 'Palma', country: 'Spain', aliases: ['Mallorca'], officialUrl: 'https://www.aena.es/en/palma-de-mallorca.html' },
  { code: 'BGY', name: 'Milan Bergamo', city: 'Bergamo', country: 'Italy', aliases: ['Orio al Serio', 'Bergamo'], officialUrl: 'https://www.milanbergamoairport.it/en/', parkingUrl: 'https://www.milanbergamoairport.it/en/parking/' },
  { code: 'NAP', name: 'Naples International', city: 'Naples', country: 'Italy', aliases: ['Napoli', 'Capodichino'], officialUrl: 'https://www.aeroportodinapoli.it/en', parkingUrl: 'https://www.aeroportodinapoli.it/en/parking' },
  { code: 'BUD', name: 'Budapest Ferenc Liszt', city: 'Budapest', country: 'Hungary', officialUrl: 'https://www.bud.hu/en', mapUrl: 'https://www.bud.hu/en/passengers/at-the-airport/airport-map', parkingUrl: 'https://www.bud.hu/en/parking' },
  { code: 'PRG', name: 'Václav Havel Prague', city: 'Prague', country: 'Czech Republic', aliases: ['Prague'], officialUrl: 'https://www.prg.aero/en', mapUrl: 'https://www.prg.aero/en/map-of-airport', parkingUrl: 'https://www.prg.aero/en/parking' },
  { code: 'WAW', name: 'Warsaw Chopin', city: 'Warsaw', country: 'Poland', officialUrl: 'https://www.lotnisko-chopina.pl/en', mapUrl: 'https://www.lotnisko-chopina.pl/en/airport-map.html', parkingUrl: 'https://www.lotnisko-chopina.pl/en/parking.html' },
  { code: 'ATH', name: 'Athens Eleftherios Venizelos', city: 'Athens', country: 'Greece', aliases: ['Athens International'], officialUrl: 'https://www.aia.gr/traveler/', mapUrl: 'https://www.aia.gr/traveler/airport-map/', parkingUrl: 'https://www.aia.gr/traveler/access/parking/' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', officialUrl: 'https://www.istairport.com/en', mapUrl: 'https://www.istairport.com/en/passenger/at-the-airport/airport-maps', parkingUrl: 'https://www.istairport.com/en/passenger/transportation/parking' },
  { code: 'SAW', name: 'Istanbul Sabiha Gökçen', city: 'Istanbul', country: 'Turkey', aliases: ['Sabiha Gokcen'], officialUrl: 'https://www.sabihagokcen.aero/en', parkingUrl: 'https://www.sabihagokcen.aero/en/transport-and-parking/parking' },
];

export function formatAirport(airport: Airport): string {
  if (airport.state) {
    return `${airport.code} – ${airport.city}, ${airport.state}`;
  }
  return `${airport.code} – ${airport.city}, ${airport.country}`;
}

export function formatAirportFull(airport: Airport): string {
  if (airport.state) {
    return `${airport.city}, ${airport.state}, ${airport.country}`;
  }
  return `${airport.city}, ${airport.country}`;
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
  return airports.find(a => a.code.toUpperCase() === code.toUpperCase());
}

/**
 * Extract IATA codes from flight notes/vendor name
 * Common patterns: "DEN-LAX", "DEN → LAX", "Flight from DEN to LAX"
 */
export function extractAirportCodes(text: string): { origin?: string; destination?: string } {
  if (!text) return {};
  
  const upperText = text.toUpperCase();
  
  // Pattern 1: "XXX-YYY" or "XXX→YYY" or "XXX - YYY"
  const dashPattern = upperText.match(/\b([A-Z]{3})\s*[-→]\s*([A-Z]{3})\b/);
  if (dashPattern) {
    return { origin: dashPattern[1], destination: dashPattern[2] };
  }
  
  // Pattern 2: "from XXX to YYY"
  const fromToPattern = upperText.match(/FROM\s+([A-Z]{3})\s+TO\s+([A-Z]{3})/);
  if (fromToPattern) {
    return { origin: fromToPattern[1], destination: fromToPattern[2] };
  }
  
  // Pattern 3: Find any 3-letter codes that match known airports
  const allCodes = upperText.match(/\b[A-Z]{3}\b/g) || [];
  const validCodes = allCodes.filter(code => getAirportByCode(code));
  
  if (validCodes.length >= 2) {
    return { origin: validCodes[0], destination: validCodes[1] };
  } else if (validCodes.length === 1) {
    return { destination: validCodes[0] };
  }
  
  return {};
}
