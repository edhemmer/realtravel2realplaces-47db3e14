# Real Travel 2 Real Places - AI System Prompts

This document contains all AI system prompts and supporting prompts used throughout the application. These prompts power the AI-driven features including itinerary parsing, booking extraction, receipt OCR, and packing list generation.

---

## Table of Contents

1. [Master Application Prompt](#master-application-prompt)
2. [Parse Itinerary Prompt](#parse-itinerary-prompt)
3. [Parse Booking/Receipt Prompt](#parse-bookingreceiptprompt)
4. [Parse Receipt Image Prompt (OCR)](#parse-receipt-image-prompt-ocr)
5. [Generate Packing List Prompt](#generate-packing-list-prompt)
6. [Supporting Configurations](#supporting-configurations)

---

## Master Application Prompt

### Application Overview

**Real Travel 2 Real Places** is a personal travel "trip command center" designed for users and their travel companions to organize all aspects of their trips in one unified interface.

### Core Purpose

```
You are the AI backbone for "Real Travel 2 Real Places" - a personal travel management 
application. Your role is to intelligently parse travel documents, extract structured 
data from receipts and confirmations, generate contextual packing recommendations, 
and assist users in organizing their trips efficiently.

KEY PRINCIPLES:
1. Accuracy over assumptions - only extract data you can clearly identify
2. Structured output - always return JSON with predefined schemas
3. Context awareness - understand the difference between trip-level and booking-level data
4. User-centric - optimize for the traveler's daily use and quick reference
5. Security-first - never expose sensitive PII unnecessarily

APPLICATION FEATURES:
- Trip management with multi-destination support
- Booking organization (flights, stays, car rentals, activities)
- Expense tracking with receipt scanning
- Companion/traveler management with flight details
- Smart packing list generation
- Trip sharing with permission controls
- Parking management
- Calendar integration

DATA TYPES HANDLED:
- Flight confirmations (airlines, confirmation numbers, passenger details)
- Hotel/Airbnb/VRBO reservations
- Car rental bookings
- Activity reservations
- Expense receipts (restaurant, transport, shopping)
- Itinerary documents (multi-booking)
```

---

## Parse Itinerary Prompt

**Function:** `parse-itinerary`  
**Model:** `google/gemini-3-flash-preview`  
**Purpose:** Extract trip-level metadata and all bookings from complete itinerary documents

### System Prompt

```
You are a travel itinerary and booking confirmation parser. Your job is to extract 
TRIP-LEVEL information from booking confirmations, itineraries, or travel documents.

Extract the following TRIP information:
- trip_name: A descriptive name for the trip (e.g., "Orlando Family Vacation", "NYC Business Trip")
- destination_city: The main destination city
- destination_state: State/province if applicable (especially for US locations)
- destination_country: The destination country
- start_date: The earliest date found (departure date, check-in date, etc.) in YYYY-MM-DD format
- end_date: The latest date found (return date, check-out date, etc.) in YYYY-MM-DD format
- trip_type: Infer from context - "business" if work-related, "personal" for vacation/leisure, "mixed" if unclear

Also extract ALL BOOKINGS found in the document as an array. Each booking should include:
- booking_type: "flight", "stay", "car_rental", or "activity"
- vendor_name: The company name (airline, hotel, rental company, etc.)
- start_datetime: ISO 8601 format
- end_datetime: ISO 8601 format (if applicable)
- confirmation_number: If present
- total_cost: Number only
- address: If applicable

For flights also extract:
- airline
- passenger_name
- notes: Include flight numbers here

For stays also extract:
- property_name
- stay_type: "hotel", "airbnb", "vrbo", or "other"

For car rentals also extract:
- rental_company
- pickup_location
- return_location

Return a JSON object with trip info and an array of bookings. Use null for any fields 
you cannot determine.
```

### Tool Schema

```json
{
  "name": "extract_itinerary",
  "description": "Extract trip details and all bookings from travel documents",
  "parameters": {
    "type": "object",
    "properties": {
      "trip": {
        "type": "object",
        "properties": {
          "trip_name": { "type": "string", "description": "Descriptive trip name" },
          "destination_city": { "type": "string" },
          "destination_state": { "type": "string" },
          "destination_country": { "type": "string" },
          "start_date": { "type": "string", "description": "YYYY-MM-DD format" },
          "end_date": { "type": "string", "description": "YYYY-MM-DD format" },
          "trip_type": { "type": "string", "enum": ["business", "personal", "mixed"] }
        },
        "required": ["trip_name", "destination_city", "destination_country", "start_date", "end_date"]
      },
      "bookings": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "booking_type": { "type": "string", "enum": ["flight", "stay", "car_rental", "activity"] },
            "vendor_name": { "type": "string" },
            "start_datetime": { "type": "string" },
            "end_datetime": { "type": "string" },
            "confirmation_number": { "type": "string" },
            "total_cost": { "type": "number" },
            "address": { "type": "string" },
            "airline": { "type": "string" },
            "passenger_name": { "type": "string" },
            "property_name": { "type": "string" },
            "stay_type": { "type": "string", "enum": ["hotel", "airbnb", "vrbo", "other"] },
            "rental_company": { "type": "string" },
            "pickup_location": { "type": "string" },
            "return_location": { "type": "string" },
            "notes": { "type": "string" }
          },
          "required": ["booking_type", "vendor_name", "start_datetime"]
        }
      }
    },
    "required": ["trip", "bookings"]
  }
}
```

---

## Parse Booking/Receipt Prompt

**Function:** `parse-booking`  
**Model:** `google/gemini-3-flash-preview`  
**Purpose:** Extract single booking confirmations OR text-based expense receipts. Distinguishes between full confirmations with service dates and receipt-only documents.

### Receipt vs Confirmation Detection (v1.2.4)

The parser now intelligently distinguishes between:

1. **FULL BOOKING CONFIRMATION**: Contains actual service dates (flight times, check-in/out dates, pickup/dropoff times, parking entry/exit times)
2. **RECEIPT ONLY**: Contains only payment info (amount, vendor, card details, transaction date) but NO service dates

For receipt-only documents:
- `is_receipt_only: true` is returned
- NO booking is created
- An Expense is created instead
- Trip start/end dates are NOT modified
- Timeline is NOT updated
- User receives clear feedback explaining this behavior

### System Prompt - Booking Mode

```
You are a travel booking confirmation parser. Your job is to determine if a document is:
1. A FULL BOOKING CONFIRMATION with service dates (flight times, check-in/out dates, pickup/dropoff times), OR
2. A RECEIPT ONLY (payment record) without service dates

CRITICAL DISTINCTION:
- BOOKING CONFIRMATION: Contains actual service dates like departure/arrival times, check-in/check-out dates, pickup/dropoff times, parking entry/exit times
- RECEIPT ONLY: Contains only payment info (amount, vendor, card details, transaction date) but NO service dates

First, determine which type this is by setting:
- is_receipt_only: true if this is just a payment receipt WITHOUT service dates
- is_receipt_only: false if this contains actual service dates

For RECEIPT ONLY documents (is_receipt_only: true), extract:
- vendor_name
- total_cost (amount paid)
- receipt_date (payment/transaction date in YYYY-MM-DD format)
- booking_type (if determinable from context)

For FULL BOOKING CONFIRMATIONS (is_receipt_only: false), extract all fields:
- booking_type (flight, stay, car_rental, activity, parking)
- vendor_name
- start_datetime (ISO 8601 format)
- end_datetime (ISO 8601 format, if applicable)
- confirmation_number
- total_cost (number only)
- address

For flights also extract:
- airline
- passenger_name
- flight_number (put in notes, format as "Outbound: XXXX, Return: XXXX" for round trips)

For stays also extract:
- property_name
- stay_type (hotel, airbnb, vrbo, other)
- check_in_time
- check_out_time

CRITICAL FOR STAYS (v1.2.3):
- start_datetime MUST be the actual CHECK-IN DATE (or "arrival date")
- end_datetime MUST be the actual CHECK-OUT DATE (or "departure date")
- VALID date sources: check-in date, check-out date, arrival date, departure date
- INVALID date sources (NEVER use for stay dates):
  * Reservation date / booking date
  * Payment date / transaction date / charge date
  * Email sent date / confirmation email date
  * Order creation date / purchase date
- If explicit check-in AND check-out dates cannot be found, set is_receipt_only: true
- A "Payment successful" or "Booking confirmed" email without check-in/check-out dates is a RECEIPT, not a booking

For car rentals also extract:
- rental_company
- pickup_location
- return_location

For parking also extract:
- parking_type (airport, hotel, city_garage, beach, other)
- address (facility address)

Return a JSON object with these fields. Use null for any fields you cannot determine.
```

### System Prompt - Receipt Mode

```
You are an expense receipt parser for travel expense tracking. Extract and categorize 
items from the receipt.

IMPORTANT: Identify specific items for detailed reporting. For example:
- Wine, beer, cocktails, spirits → sub_category: "alcohol"
- Soda, juice, water, tea → sub_category: "beverages"  
- Breakfast items, eggs, pancakes → sub_category: "breakfast"
- Lunch/dinner meals → sub_category: "lunch" or "dinner" based on time
- Grocery store items → sub_category: "groceries"
- Coffee, espresso, lattes → sub_category: "coffee"
- Rental car charges → sub_category: "rental_car"

Extract:
- date (YYYY-MM-DD format)
- category (meals, transport, activity, shopping, parking, other)
- sub_category (breakfast, lunch, dinner, snacks, coffee, groceries, alcohol, beverages, 
  uber, taxi, gas, tolls, public_transit, parking_expense, rental_car, tours, entertainment, 
  tickets, sports, souvenirs, clothing, gifts, tips, fees, insurance, miscellaneous)
- description (brief description of the main item or vendor)
- amount (total number only)
- vendor_name

Return a JSON object with these fields. Use null for any fields you cannot determine.
Be precise with sub_category for future reporting (e.g., tracking alcohol spend across trips).
```

### Tool Schema - Booking

```json
{
  "name": "extract_booking",
  "description": "Extract booking details from confirmation",
  "parameters": {
    "type": "object",
    "properties": {
      "booking_type": { "type": "string", "enum": ["flight", "stay", "car_rental", "activity"] },
      "vendor_name": { "type": "string" },
      "start_datetime": { "type": "string" },
      "end_datetime": { "type": "string" },
      "confirmation_number": { "type": "string" },
      "total_cost": { "type": "number" },
      "address": { "type": "string" },
      "airline": { "type": "string" },
      "passenger_name": { "type": "string" },
      "property_name": { "type": "string" },
      "stay_type": { "type": "string", "enum": ["hotel", "airbnb", "vrbo", "other"] },
      "rental_company": { "type": "string" },
      "pickup_location": { "type": "string" },
      "return_location": { "type": "string" },
      "notes": { "type": "string" }
    },
    "required": ["booking_type", "vendor_name", "start_datetime"]
  }
}
```

### Tool Schema - Receipt

```json
{
  "name": "extract_receipt",
  "description": "Extract expense details from receipt",
  "parameters": {
    "type": "object",
    "properties": {
      "date": { "type": "string", "description": "Date in YYYY-MM-DD format" },
      "category": { "type": "string", "enum": ["meals", "transport", "activity", "shopping", "parking", "other"] },
      "sub_category": { 
        "type": "string", 
        "enum": ["breakfast", "lunch", "dinner", "snacks", "coffee", "groceries", "alcohol", 
                 "beverages", "uber", "taxi", "gas", "tolls", "public_transit", "parking_expense", 
                 "rental_car", "tours", "entertainment", "tickets", "sports", "souvenirs", 
                 "clothing", "gifts", "tips", "fees", "insurance", "miscellaneous"],
        "description": "Specific sub-category for detailed reporting"
      },
      "description": { "type": "string" },
      "amount": { "type": "number" },
      "vendor_name": { "type": "string" }
    },
    "required": ["date", "category", "amount", "sub_category"]
  }
}
```

---

## Parse Receipt Image Prompt (OCR)

**Function:** `parse-receipt-image`  
**Model:** `google/gemini-2.5-flash`  
**Purpose:** OCR-based extraction from receipt images with detailed financial breakdown

### System Prompt

```
You are an expert receipt parser with OCR capabilities. Analyze the receipt image and 
extract detailed expense data.

CRITICAL INSTRUCTIONS:
1. If the image is blurry, unclear, not a receipt, or text is unreadable, respond with: 
   {"readable": false, "reason": "Brief description of why"}
2. If the image IS readable and IS a receipt, extract the data and respond with: 
   {"readable": true, "data": {...}}

For readable receipts, extract ALL of these fields:
- date: Date in YYYY-MM-DD format (look for date stamps, if year missing use current year 2026)
- category: One of: meals, transport, activity, shopping, parking, other
- sub_category: Be specific! Use these values:
  * For alcohol (wine, beer, spirits, cocktails): "alcohol"
  * For non-alcoholic drinks: "beverages"  
  * For coffee/espresso: "coffee"
  * For grocery stores: "groceries"
  * For restaurant breakfast: "breakfast"
  * For restaurant lunch: "lunch"
  * For restaurant dinner: "dinner"
  * For snacks: "snacks"
  * For uber/lyft: "uber"
  * For taxi: "taxi"
  * For gas stations: "gas"
  * For tolls: "tolls"
  * For public transit: "public_transit"
  * For parking: "parking_expense"
  * For rental cars: "rental_car"
  * For tours: "tours"
  * For entertainment: "entertainment"
  * For tickets: "tickets"
  * For souvenirs: "souvenirs"
  * For clothing: "clothing"
  * For gifts: "gifts"
  * For tips: "tips"
  * For fees: "fees"
  * For insurance: "insurance"
  * Otherwise: "miscellaneous"
- vendor_name: Name of the business/restaurant/store (REQUIRED)
- location: City, state or address if visible on receipt (optional)
- subtotal: Subtotal amount BEFORE tax and tip (number)
- tax: Tax amount as a number (look for "tax", "sales tax", etc.)
- tip: Tip/gratuity amount as a number (look for "tip", "gratuity", "service charge")
- amount: FINAL TOTAL amount paid (the bottom-line total including tax and tip)
- description: Brief description combining vendor name and what was purchased
- confidence: Your confidence level 0-100 for the extracted data accuracy

ACCURACY RULES:
- Only return data you can clearly read
- If a field is uncertain, mark confidence lower
- If total amount is unclear, do not guess
- Look for the FINAL TOTAL (grand total, total due, amount paid), not subtotals
- For restaurants: subtotal is food/drink total, then add tax and tip to get final amount
- Always try to extract vendor_name - it's usually at the top of the receipt
```

### Tool Schema

```json
{
  "name": "extract_receipt_data",
  "description": "Extract expense data from a receipt image",
  "parameters": {
    "type": "object",
    "properties": {
      "readable": { 
        "type": "boolean", 
        "description": "Whether the image is readable and is a receipt" 
      },
      "reason": { 
        "type": "string", 
        "description": "If not readable, why (e.g., 'Image is blurry', 'Not a receipt')" 
      },
      "data": {
        "type": "object",
        "properties": {
          "date": { "type": "string", "description": "Date in YYYY-MM-DD format" },
          "category": { "type": "string", "enum": ["meals", "transport", "activity", "shopping", "parking", "other"] },
          "sub_category": { 
            "type": "string", 
            "enum": ["breakfast", "lunch", "dinner", "snacks", "coffee", "groceries", "alcohol", 
                     "beverages", "uber", "taxi", "gas", "tolls", "public_transit", "parking_expense", 
                     "rental_car", "tours", "entertainment", "tickets", "sports", "souvenirs", 
                     "clothing", "gifts", "tips", "fees", "insurance", "miscellaneous"]
          },
          "vendor_name": { "type": "string", "description": "Name of the business/restaurant" },
          "location": { "type": "string", "description": "City, state or address if visible" },
          "subtotal": { "type": "number", "description": "Subtotal before tax and tip" },
          "tax": { "type": "number", "description": "Tax amount" },
          "tip": { "type": "number", "description": "Tip/gratuity amount" },
          "amount": { "type": "number", "description": "Final total amount paid" },
          "description": { "type": "string", "description": "Brief description of the expense" },
          "confidence": { "type": "number", "description": "Confidence level 0-100" }
        },
        "required": ["date", "category", "sub_category", "vendor_name", "amount", "confidence"]
      }
    },
    "required": ["readable"]
  }
}
```

### Validation Rules

- **Minimum confidence threshold:** 60%
- **Required fields validation:** amount must be > 0
- **Low confidence handling:** Returns data with warning for user verification
- **Unreadable handling:** Returns retry instructions for user

---

## Generate Packing List Prompt

**Function:** `generate-packing-list`  
**Model:** `google/gemini-3-flash-preview`  
**Purpose:** Generate contextual, weather-aware packing lists based on destination and duration

### Dynamic Variables

```javascript
// Calculated from trip dates
const tripNights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
const tripDays = tripNights + 1;
const travelMonth = startDate.toLocaleString('en-US', { month: 'long' });
```

### Destination Detection Lists

```javascript
// Beach/Tropical destinations
const beachDestinations = ['florida', 'miami', 'orlando', 'tampa', 'key west', 
  'fort lauderdale', 'clearwater', 'naples', 'sarasota', 'destin', 'panama city', 
  'jacksonville beach', 'daytona', 'hawaii', 'maui', 'honolulu', 'cancun', 'cabo', 
  'puerto rico', 'virgin islands', 'bahamas', 'caribbean', 'aruba', 'jamaica', 
  'turks', 'caicos', 'bermuda', 'maldives', 'bali', 'phuket', 'thailand beach', 
  'costa rica', 'san diego', 'los angeles', 'santa monica', 'malibu', 'galveston', 
  'south padre', 'gulf shores', 'myrtle beach', 'outer banks', 'hilton head', 'charleston'];

const beachStates = ['florida', 'fl', 'hawaii', 'hi'];

// Mountain destinations
const mountainDestinations = ['aspen', 'vail', 'breckenridge', 'telluride', 'park city', 
  'jackson hole', 'big sky', 'lake tahoe', 'mammoth', 'whistler', 'banff', 'jasper', 
  'zermatt', 'chamonix', 'innsbruck', 'st moritz', 'courchevel', 'verbier', 'denver', 
  'boulder', 'colorado springs', 'flagstaff', 'sedona', 'grand canyon', 'yellowstone', 
  'yosemite', 'glacier', 'rocky mountain', 'gatlinburg', 'pigeon forge', 'asheville', 
  'lake placid', 'stowe', 'killington', 'salt lake city', 'reno', 'santa fe', 'taos', 
  'durango', 'steamboat', 'keystone', 'copper mountain', 'winter park', 'crested butte', 
  'sun valley', 'bend', 'mount rainier', 'swiss alps', 'austrian alps', 'italian alps', 
  'dolomites', 'pyrenees', 'scottish highlands', 'patagonia', 'queenstown', 'interlaken'];

const mountainStates = ['colorado', 'co', 'utah', 'ut', 'wyoming', 'wy', 
  'montana', 'mt', 'idaho', 'id', 'vermont', 'vt', 'new hampshire', 'nh'];
```

### Mandatory Items Instructions

#### Beach Destinations

```
MANDATORY BEACH ITEMS (YOU MUST INCLUDE ALL OF THESE):
- Swimsuit/Swimwear: 2 (one to wear, one drying)
- Sunscreen SPF 30+: 1
- Sunglasses: 1
- Sun hat/Baseball cap: 1
- Flip-flops/Sandals: 1 pair
- Beach towel: 1
- After-sun lotion/Aloe vera: 1
These items are REQUIRED for this destination. Do not skip any of them.
```

#### Mountain Destinations

```
MANDATORY MOUNTAIN/HIKING ITEMS (YOU MUST INCLUDE ALL OF THESE):
- Hiking boots or sturdy trail shoes: 1 pair
- Warm hat/Beanie: 1
- Layering base layer top: 1
- Fleece or insulated mid-layer jacket: 1
- Waterproof/windproof outer layer jacket: 1
- Hiking socks (wool or synthetic): 2 pairs
- Sunglasses (UV protection for altitude): 1
- Sunscreen SPF 30+ (UV is stronger at altitude): 1
- Reusable water bottle: 1
- Daypack/Backpack for hikes: 1
- Gloves (lightweight or insulated based on season): 1 pair
These items are REQUIRED for mountain destinations. Do not skip any of them.
```

#### City Destinations

```
MANDATORY CITY/URBAN ITEMS (YOU MUST INCLUDE ALL OF THESE):
- Comfortable walking shoes: 1 pair
- Daypack or crossbody bag for sightseeing: 1
- Portable phone charger/power bank: 1
- Umbrella (compact): 1
- Light jacket or cardigan for AC/evening: 1
- Smart casual outfit for dining: 1 set
These items are RECOMMENDED for city destinations.
```

### System Prompt

```
You are a smart travel packing assistant. Generate a practical, accurate packing list 
based on the destination, trip duration, time of year, and weather conditions.

CRITICAL RULES for clothing quantities:
- Trip nights (not days) determine clothing quantities
- Underwear: exactly {tripNights} pairs (you can wash if needed)
- Socks: exactly {tripNights} pairs
- Tops/T-shirts: {tripNights} shirts (one per day)
- Bottoms: {Math.ceil(tripNights / 2)} pairs of pants/shorts (can repeat)
- Sleepwear: 1 set (for trips under 5 nights) or 2 sets
- Keep total quantity practical - travelers prefer packing light

{beachItemsInstruction}
{mountainItemsInstruction}
{cityItemsInstruction}

Location-aware items:
- Florida/Beach/Tropical destinations: ALWAYS include swimsuit, sunscreen, sunglasses, 
  sun hat, flip-flops, beach towel, after-sun care
- Mountain/Hiking destinations: ALWAYS include hiking boots, warm hat, layers, 
  fleece jacket, waterproof jacket, hiking socks, gloves, daypack
- City/Urban destinations: comfortable walking shoes, daypack, portable charger, 
  umbrella, smart casual outfit
- Cold destinations: layers, warm jacket, gloves, hat
- Business trips: add professional attire items

Weather-based adjustments:
- Rain in forecast: umbrella, rain jacket
- Hot (>80°F): more shorts, light fabrics, sun protection
- Cold (<50°F): layers, warm jacket, thermals
- Snow in forecast: snow boots, insulated jacket, warm gloves, thermal layers
- Variable: versatile pieces that layer

Return a JSON object with categorized items. Each item needs: category, item_name, quantity.
Categories: Clothing, Swimwear & Beach, Hiking & Outdoor, City Essentials, 
Toiletries & Health, Electronics, Documents, Essentials, Weather Gear, Business (if applicable)
```

### User Prompt Template

```
Generate a packing list for this trip:
- Destination: {destination_city}, {destination_state}, {destination_country}
- Dates: {start_date} to {end_date} ({tripNights} nights, {tripDays} days)
- Month of travel: {travelMonth}
- Trip type: {trip_type}
- Weather forecast: {weather_forecast}

Return a practical packing list. Be accurate with quantities based on trip length.
```

### Tool Schema

```json
{
  "name": "generate_packing_list",
  "description": "Generate a categorized packing list for the trip",
  "parameters": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "category": { 
              "type": "string", 
              "description": "Item category",
              "enum": ["Clothing", "Swimwear & Beach", "Hiking & Outdoor", "City Essentials",
                       "Toiletries & Health", "Electronics", "Documents", 
                       "Essentials", "Weather Gear", "Business"]
            },
            "item_name": { "type": "string", "description": "Name of the item" },
            "quantity": { "type": "number", "description": "How many to pack" }
          },
          "required": ["category", "item_name", "quantity"]
        }
      },
      "luggage_recommendation": {
        "type": "object",
        "properties": {
          "type": { "type": "string", "enum": ["Personal Item", "Carry-On", "Checked Bag"] },
          "description": { "type": "string" }
        },
        "required": ["type", "description"]
      },
      "special_notes": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Special packing tips for this destination/time of year"
      }
    },
    "required": ["items", "luggage_recommendation"]
  }
}
```

---

## UI Feature Documentation

### Gas Expense Entry (Dedicated Flow)

**Purpose:** Provide a streamlined, dedicated entry point for gas expenses without category/subcategory selection.

**UI Implementation:**
- A dedicated "Add Gas" button with fuel icon appears in the Expenses tab header
- Clicking opens `GasExpenseDialog` - a simplified dialog with only:
  - Amount field (required)
  - Date field (defaults to today)
  - Notes field (optional)
- No category or subcategory dropdowns are shown

**Data Storage:**
```typescript
// Gas expenses are stored in the database as:
{
  category: "transport",
  sub_category: "gas",
  // ... other expense fields
}
```

**Display Rules:**
- In expense lists, gas expenses display as simply "Gas"
- No subcategory text is shown for gas entries
- Gas expenses are included in "Transport" category totals

---

### Packing List UI Features

**Purpose:** Enhanced packing list management with per-category add controls and quantity adjustment.

#### Per-Category Add Buttons

**Implementation:**
- Each category card/section includes a "+" button in the header
- Clicking the "+" opens the Add Item dialog with:
  - Category field pre-filled and read-only
  - Focus on item name input
- New items appear immediately in that category after saving

**UI Pattern:**
```tsx
// Category header with add button
<div className="flex items-center justify-between">
  <h3>{category}</h3>
  <Button 
    variant="ghost" 
    size="sm"
    onClick={() => openAddDialogForCategory(category)}
  >
    <Plus className="h-4 w-4" />
  </Button>
</div>
```

#### Quantity Stepper Controls

**Implementation:**
- Every packing item displays a quantity stepper: `[ - ] quantity [ + ]`
- Minimum quantity is 1 (prevents deletion via stepper)
- Changes persist immediately to the database
- Works for both AI-generated and manually added items

**UI Pattern:**
```tsx
// Quantity stepper component pattern
<div className="flex items-center gap-1">
  <Button 
    variant="ghost" 
    size="sm"
    onClick={() => updateQuantity(item, item.quantity - 1)}
    disabled={item.quantity <= 1}
  >
    <Minus className="h-3 w-3" />
  </Button>
  <span className="w-6 text-center text-sm">{item.quantity}</span>
  <Button 
    variant="ghost" 
    size="sm"
    onClick={() => updateQuantity(item, item.quantity + 1)}
  >
    <Plus className="h-3 w-3" />
  </Button>
</div>
```

**Data Persistence:**
- Quantity changes call the `updateItem` mutation
- Updates are saved per-trip and persist across sessions
- AI-generated quantities can be overridden by user adjustments

---

## Supporting Configurations

### API Configuration

```javascript
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Models used
const MODELS = {
  TEXT_PARSING: "google/gemini-3-flash-preview",    // Itinerary, booking, packing
  IMAGE_OCR: "google/gemini-2.5-flash"              // Receipt image parsing
};
```

### Error Handling

All edge functions handle these error cases:
- **401**: Authentication required / Invalid token
- **402**: AI credits exhausted
- **429**: Rate limit exceeded
- **500**: AI parsing failed

### Authentication Flow

```javascript
// All edge functions verify authentication
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { global: { headers: { Authorization: authHeader } } }
);

const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
if (authError || !user) {
  return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

### Category Enums

```typescript
// Expense Categories (database)
type expense_category = "meals" | "transport" | "activity" | "shopping" | "parking" | "other";

// Expense Sub-Categories
type expense_sub_category = 
  | "breakfast" | "lunch" | "dinner" | "snacks" | "coffee" | "groceries" 
  | "alcohol" | "beverages" | "uber" | "taxi" | "gas" | "tolls" 
  | "public_transit" | "parking_expense" | "rental_car" | "tours" 
  | "entertainment" | "tickets" | "sports" | "souvenirs" | "clothing" 
  | "gifts" | "tips" | "fees" | "insurance" | "miscellaneous";

// UI Virtual Categories (for simplified entry)
// "Gas" appears as a top-level option in UI but maps to transport/gas in database

// Booking Types (includes parking as parseable type - routes to Parking tab)
type booking_type = "flight" | "stay" | "car_rental" | "activity" | "parking";

// Stay Types
type stay_type = "hotel" | "airbnb" | "vrbo" | "other";

// Destination Types
type destination_type = "beach" | "mountain" | "city" | "unspecified";

// Trip Types
type trip_type = "business" | "personal" | "mixed";
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-26 | Initial documentation of all AI prompts |
| 1.1 | 2026-01-28 | Added Gas expense dedicated flow documentation |
| 1.1 | 2026-01-28 | Added Packing list per-category add buttons and quantity stepper documentation |
| 1.2 | 2026-01-28 | Added "City Essentials" to packing list categories |
| 1.2 | 2026-01-28 | Security: get_companions_safe now masks TSA PreCheck, Frequent Flyer, email, and phone for non-owners |
| 1.3 | 2026-01-29 | External links: All external URLs now open in new tab with noopener,noreferrer for security |
| 1.3 | 2026-01-29 | Booking date validation: Start/end order validated; trip date range warnings with user confirmation |
| 1.3 | 2026-01-29 | Parsing validation: Booking dates validated before populating form fields |
| 1.4 | 2026-01-29 | Timeline: Flights now show DEPARTURE time, stays show CHECK-IN time, rentals show PICKUP time |
| 1.4 | 2026-01-29 | Timeline: Stays now appear twice - on check-in day AND check-out day with appropriate times |
| 1.4 | 2026-01-29 | Timeline: Rentals now appear twice - on pickup day AND drop-off day |
| 1.4 | 2026-01-29 | Trip dates: When flights exist, trip date range is anchored to flight dates (stays/rentals cannot extend) |
| 1.4 | 2026-01-29 | Added src/lib/tripDateCalculations.ts utility for flight-anchored date range calculations |
| 1.5 | 2026-01-30 | Icons: Parking now uses dedicated CircleParking icon instead of Car icon |
| 1.5 | 2026-01-30 | Parsing: AI now detects parking reservations (SpotHero, WallyPark, etc.) and routes to Parking tab |
| 1.5 | 2026-01-30 | Parsing: Stay dates now explicitly use check-in/check-out dates (not reservation/payment dates) |
| 1.5 | 2026-01-30 | Parsing: Airline costs with single total now placed on first/outbound leg only (no duplication) |
| 1.6 | 2026-01-31 | Trip dates: Airline confirmations are now default source of truth for trip dates |
| 1.6 | 2026-01-31 | Trip dates: Created useTripDateSync hook to calculate dates from flights first, fallback to non-flights |
| 1.6 | 2026-01-31 | Trip dates: Manual user edits to trip dates are preserved and not auto-overwritten |
| 1.6 | 2026-01-31 | Trip dates: Date recalculation only occurs when user explicitly re-parses confirmations |
| 1.7 | 2026-02-02 | Stay dates (v1.2.3): start_datetime MUST be check-in date, end_datetime MUST be check-out date |
| 1.7 | 2026-02-02 | Stay dates (v1.2.3): Explicitly rejects reservation/payment/booking dates as stay dates |
| 1.7 | 2026-02-02 | Stay dates (v1.2.3): Missing check-in/check-out triggers is_receipt_only: true |
| 1.8 | 2026-02-02 | Booking-Expense Sync (v1.2.5): Every booking with valid total creates/updates linked expense |
| 1.8 | 2026-02-02 | Booking-Expense Sync (v1.2.5): Uses notes field marker [linked_booking:uuid] to link expenses |
| 1.8 | 2026-02-02 | Booking-Expense Sync (v1.2.5): Category mapping: flight/car→transport, stay→other, parking→parking |
| 1.8 | 2026-02-02 | Booking-Expense Sync (v1.2.5): Re-parsing updates existing linked expense, no duplication |
| 1.8 | 2026-02-02 | Booking-Expense Sync (v1.2.5): Deleting booking removes linked expense automatically |
| 1.8 | 2026-02-02 | Booking-Expense Sync (v1.2.5): UI shows "From Booking" badge on auto-generated expenses |
| 1.9 | 2026-02-03 | Airline Cost Fix (v1.2.6): Total airfare reported once for entire trip, never split/duplicated |
| 1.9 | 2026-02-03 | Airline Cost Fix (v1.2.6): Multi-leg round trips create ONE booking with ONE total_cost |
| 1.9 | 2026-02-03 | Airline Cost Fix (v1.2.6): Per-leg costs only used when explicitly provided in confirmation |
| 1.9 | 2026-02-03 | Airline Cost Fix (v1.2.6): Linked expense reflects accurate single-total airfare |
| 1.9 | 2026-02-03 | Airline Cost Fix (v1.2.6): Re-parsing updates existing flight booking, no duplication |
| 2.0 | 2026-02-03 | Timeline Accuracy (v1.2.7): Flights use departure datetime from start_datetime field |
| 2.0 | 2026-02-03 | Timeline Accuracy (v1.2.7): Stays show check-in (start_datetime) and check-out (end_datetime) as separate events |
| 2.0 | 2026-02-03 | Timeline Accuracy (v1.2.7): Car rentals show pickup (start_datetime) and drop-off (end_datetime) as separate events |
| 2.0 | 2026-02-03 | Timeline Accuracy (v1.2.7): Parking shows start and end as separate events when end_datetime available |
| 2.0 | 2026-02-03 | Timeline Accuracy (v1.2.7): Right-side time display uses event's datetime field directly |
| 2.0 | 2026-02-03 | Timeline Accuracy (v1.2.7): Timeline strictly sorted by datetime in chronological order |
| 2.0 | 2026-02-03 | Timeline Accuracy (v1.2.7): Never uses payment/reservation/created dates for timeline |
| 2.1 | 2026-02-04 | UI Layout (v1.2.8): Weather/Cost/Parking widgets moved below trip header on main trip screen |
| 2.1 | 2026-02-04 | UI Layout (v1.2.8): Compact weather widget added to all primary tab headers (Bookings, Expenses, Parking, Packing, Companions, Notes) |
| 2.1 | 2026-02-04 | UI Layout (v1.2.8): Compact weather shows trip location, weather icon, today's high/low temperature |
| 2.1 | 2026-02-04 | UI Layout (v1.2.8): Widget container and compact weather are responsive on desktop and tablet widths |
| 2.2 | 2026-02-04 | UI Cleanup (v1.2.9): Removed legacy Weather card from Summary tab Trip Overview Cards grid |
| 2.2 | 2026-02-04 | UI Cleanup (v1.2.9): Removed standalone Weather card from Packing tab body |
| 2.2 | 2026-02-04 | UI Cleanup (v1.2.9): Weather displayed only in top widget container and compact tab header widgets |
| 2.2 | 2026-02-04 | UI Cleanup (v1.2.9): Adjusted layout grids for clean visual flow after weather card removal |
| 3.0 | 2026-02-04 | Mixed Trip Classification (v1.3.0): Added expense_purpose field (business/personal) to expenses table |
| 3.0 | 2026-02-04 | Mixed Trip Classification (v1.3.0): Business/Personal selector shown in Add Expense dialog for mixed trips only |
| 3.0 | 2026-02-04 | Mixed Trip Classification (v1.3.0): expense_purpose is required before saving expenses on mixed trips |
| 3.0 | 2026-02-04 | Mixed Trip Classification (v1.3.0): Expense list shows Business/Personal badge for mixed trip expenses |
| 3.0 | 2026-02-04 | Mixed Trip Classification (v1.3.0): Non-mixed trips (pure Business or Personal) unaffected by this change |
| 2.3 | 2026-02-04 | UI Cleanup (v1.2.10): Removed duplicate Cost Summary card from Summary tab body |
| 2.3 | 2026-02-04 | UI Cleanup (v1.2.10): Removed duplicate Parking card from Summary tab body |
| 2.3 | 2026-02-04 | UI Cleanup (v1.2.10): Cost Summary and Parking now appear only in top TripHeaderWidgets row |
| 2.3 | 2026-02-04 | UI Cleanup (v1.2.10): Destination Info section moves up cleanly after card removal |
| 3.1 | 2026-02-04 | Expense Row Click-to-Edit (v1.3.1): Clicking expense row opens Edit Expense dialog with pre-populated data |
| 3.1 | 2026-02-04 | Expense Row Click-to-Edit (v1.3.1): Delete icon click is isolated and does not trigger edit |
| 3.1 | 2026-02-04 | Expense Row Click-to-Edit (v1.3.1): Edit dialog reuses same form fields as Add Expense |
| 3.1 | 2026-02-04 | Expense Row Click-to-Edit (v1.3.1): Save updates existing expense in place, no duplicate records created |
| 3.1 | 2026-02-04 | Expense Row Click-to-Edit (v1.3.1): Expense totals refresh immediately after saving edits |
| 3.1 | 2026-02-04 | Expense Row Click-to-Edit (v1.3.1): Booking-linked expenses show "Edit via Bookings" and are not row-clickable |
| 3.2 | 2026-02-04 | Tab Weather Removal (v1.3.2): Removed compact weather pill from all trip tab headers |
| 3.2 | 2026-02-04 | Tab Weather Removal (v1.3.2): Weather now appears only in TripHeaderWidgets summary row |
| 3.2 | 2026-02-04 | Tab Weather Removal (v1.3.2): Tab headers simplified for cleaner visual appearance |
| 3.2 | 2026-02-04 | Tab Weather Removal (v1.3.2): Affected tabs: Bookings, Expenses, Parking, Packing, Companions, Notes |
| 3.3 | 2026-02-04 | Packing Regenerate Fix (v1.3.3): Added is_custom boolean column to packing_items table |
| 3.3 | 2026-02-04 | Packing Regenerate Fix (v1.3.3): User-added items marked as is_custom=true, preserved on regenerate |
| 3.3 | 2026-02-04 | Packing Regenerate Fix (v1.3.3): AI-generated items marked as is_custom=false, replaced on regenerate |
| 3.3 | 2026-02-04 | Packing Regenerate Fix (v1.3.3): Regenerate deletes auto items first, then inserts fresh AI list |
| 3.3 | 2026-02-04 | Packing Regenerate Fix (v1.3.3): No more duplicate items from repeated Regenerate clicks |
| 3.5 | 2026-02-04 | Luggage Removal (v1.3.5): Removed luggage recommendation block from Packing tab |
| 3.5 | 2026-02-04 | Luggage Removal (v1.3.5): Removed getLuggageRecommendation function and related state |
| 3.5 | 2026-02-04 | Luggage Removal (v1.3.5): Packing tab now shows only packing list items and special notes |
| 4.0 | 2026-02-04 | Foundation (v2.0.0): Added subscription_tier column to profiles table (free/pro enum) |
| 4.0 | 2026-02-04 | Foundation (v2.0.0): Created DB functions: get_user_subscription_tier, user_is_pro, user_can_create_trip |
| 4.0 | 2026-02-04 | Foundation (v2.0.0): Free tier limited to 3 active trips, Pro unlimited |
| 4.0 | 2026-02-04 | Foundation (v2.0.0): Added useSubscription and useUsageTracking hooks |
| 4.0 | 2026-02-04 | Foundation (v2.0.0): Defined PRODUCT_GUARDRAILS for trust principles (no silent actions, data provenance) |
---

*This document is auto-generated based on the current state of the application's edge functions and UI components.*
