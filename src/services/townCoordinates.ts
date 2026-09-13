/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Geo-Spatial & Town Geofence Intelligence
 * Authoritative town coordinates for Pakistan FMCG/Electrical distribution network,
 * Haversine distance calculator, and 500m geofence validation.
 */

export interface TownCoordinate {
  town: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  radiusMeters: number; // Default geofence radius (500m)
  description?: string;
}

// Canonical town coordinates dictionary across National Lights distribution territories
export const NATIONAL_TOWN_COORDINATES: Record<string, TownCoordinate> = {
  // Lahore & Central Punjab
  'brandreth road': {
    town: 'Brandreth Road',
    city: 'Lahore',
    region: 'Punjab Central',
    lat: 31.5795,
    lng: 74.3168,
    radiusMeters: 500,
    description: 'National Lights HQ & Electrical Wholesale Market, Lahore',
  },
  'shah alam': {
    town: 'Shah Alam',
    city: 'Lahore',
    region: 'Punjab Central',
    lat: 31.5831,
    lng: 74.3204,
    radiusMeters: 500,
    description: 'Shah Alam Market & Electrical Plaza, Lahore',
  },
  'lahore': {
    town: 'Lahore',
    city: 'Lahore',
    region: 'Punjab Central',
    lat: 31.5795,
    lng: 74.3168,
    radiusMeters: 500,
    description: 'Lahore Commercial District Hub',
  },
  'gulberg': {
    town: 'Gulberg',
    city: 'Lahore',
    region: 'Punjab Central',
    lat: 31.5204,
    lng: 74.3587,
    radiusMeters: 500,
    description: 'Main Boulevard Gulberg & Commercial Hub, Lahore',
  },
  'ferozepur road': {
    town: 'Ferozepur Road',
    city: 'Lahore',
    region: 'Punjab Central',
    lat: 31.4812,
    lng: 74.3315,
    radiusMeters: 500,
    description: 'Ferozepur Road Industrial & Commercial Corridor',
  },
  'multan road': {
    town: 'Multan Road',
    city: 'Lahore',
    region: 'Punjab Central',
    lat: 31.5034,
    lng: 74.2691,
    radiusMeters: 500,
    description: 'Multan Road & Thokar Niaz Baig Hub, Lahore',
  },
  'sheikhupura': {
    town: 'Sheikhupura',
    city: 'Sheikhupura',
    region: 'Punjab Central',
    lat: 31.7131,
    lng: 73.9783,
    radiusMeters: 500,
    description: 'Sheikhupura Main City & Commercial Market',
  },
  'kasur': {
    town: 'Kasur',
    city: 'Kasur',
    region: 'Punjab Central',
    lat: 31.1179,
    lng: 74.4461,
    radiusMeters: 500,
    description: 'Kasur Main City Commercial Center',
  },

  // Gujranwala / Sialkot / Gujrat Belt
  'gujranwala': {
    town: 'Gujranwala',
    city: 'Gujranwala',
    region: 'Punjab North',
    lat: 32.1877,
    lng: 74.1945,
    radiusMeters: 500,
    description: 'Gujranwala City & Trust Plaza Electrical Market',
  },
  'sialkot': {
    town: 'Sialkot',
    city: 'Sialkot',
    region: 'Punjab North',
    lat: 32.4945,
    lng: 74.5229,
    radiusMeters: 500,
    description: 'Sialkot Main Market & Paris Road Hub',
  },
  'gujrat': {
    town: 'Gujrat',
    city: 'Gujrat',
    region: 'Punjab North',
    lat: 32.5742,
    lng: 74.0754,
    radiusMeters: 500,
    description: 'Gujrat City & GT Road Commercial Belt',
  },
  'wazirabad': {
    town: 'Wazirabad',
    city: 'Wazirabad',
    region: 'Punjab North',
    lat: 32.4432,
    lng: 74.1197,
    radiusMeters: 500,
    description: 'Wazirabad Cutlery & Hardware Junction',
  },
  'daska': {
    town: 'Daska',
    city: 'Daska',
    region: 'Punjab North',
    lat: 32.3242,
    lng: 74.3506,
    radiusMeters: 500,
    description: 'Daska Main Chowk Commercial Market',
  },

  // Rawalpindi & Islamabad (Federal / North)
  'rawalpindi': {
    town: 'Rawalpindi',
    city: 'Rawalpindi',
    region: 'Federal & North',
    lat: 33.5651,
    lng: 73.0169,
    radiusMeters: 500,
    description: 'Rawalpindi Saddar & College Road Electrical Market',
  },
  'islamabad': {
    town: 'Islamabad',
    city: 'Islamabad',
    region: 'Federal & North',
    lat: 33.6844,
    lng: 73.0479,
    radiusMeters: 500,
    description: 'Islamabad Blue Area & I-9 Commercial Industrial Sector',
  },
  'blue area': {
    town: 'Blue Area',
    city: 'Islamabad',
    region: 'Federal & North',
    lat: 33.7103,
    lng: 73.0641,
    radiusMeters: 500,
    description: 'Blue Area Central Business District, Islamabad',
  },
  'i-9 industrial': {
    town: 'I-9 Industrial',
    city: 'Islamabad',
    region: 'Federal & North',
    lat: 33.6664,
    lng: 73.0568,
    radiusMeters: 500,
    description: 'I-9 / I-10 Industrial & Distribution Hub, Islamabad',
  },
  'jhelum': {
    town: 'Jhelum',
    city: 'Jhelum',
    region: 'Federal & North',
    lat: 32.9405,
    lng: 73.7276,
    radiusMeters: 500,
    description: 'Jhelum Main City & GT Road Market',
  },

  // KPK & Northern Territories
  'peshawar': {
    town: 'Peshawar',
    city: 'Peshawar',
    region: 'KPK',
    lat: 34.0151,
    lng: 71.5249,
    radiusMeters: 500,
    description: 'Peshawar Saddar & Khyber Bazaar Electrical Market',
  },
  'mardan': {
    town: 'Mardan',
    city: 'Mardan',
    region: 'KPK',
    lat: 34.1989,
    lng: 72.0404,
    radiusMeters: 500,
    description: 'Mardan Bank Road & Main Bazaar Hub',
  },
  'abbottabad': {
    town: 'Abbottabad',
    city: 'Abbottabad',
    region: 'KPK',
    lat: 34.1688,
    lng: 73.2215,
    radiusMeters: 500,
    description: 'Abbottabad Mansehra Road Commercial Center',
  },
  'swat': {
    town: 'Swat',
    city: 'Mingora',
    region: 'KPK',
    lat: 34.7717,
    lng: 72.3602,
    radiusMeters: 500,
    description: 'Mingora / Swat Main Bazaar Hub',
  },
  'kohat': {
    town: 'Kohat',
    city: 'Kohat',
    region: 'KPK',
    lat: 33.5869,
    lng: 71.4414,
    radiusMeters: 500,
    description: 'Kohat Main City Commercial Sector',
  },

  // Faisalabad & Sargodha
  'faisalabad': {
    town: 'Faisalabad',
    city: 'Faisalabad',
    region: 'Punjab Central',
    lat: 31.4504,
    lng: 73.135,
    radiusMeters: 500,
    description: 'Faisalabad Clock Tower & Rail Bazaar Electrical Market',
  },
  'sargodha': {
    town: 'Sargodha',
    city: 'Sargodha',
    region: 'Punjab Central',
    lat: 32.0836,
    lng: 72.6711,
    radiusMeters: 500,
    description: 'Sargodha City & Liaquat Market Hub',
  },
  'jhang': {
    town: 'Jhang',
    city: 'Jhang',
    region: 'Punjab Central',
    lat: 31.2781,
    lng: 72.3317,
    radiusMeters: 500,
    description: 'Jhang Main Sadar Commercial Hub',
  },

  // Multan & South Punjab
  'multan': {
    town: 'Multan',
    city: 'Multan',
    region: 'South Punjab',
    lat: 30.1575,
    lng: 71.5249,
    radiusMeters: 500,
    description: 'Multan Hussain Agahi & Bohar Gate Electrical Market',
  },
  'bahawalpur': {
    town: 'Bahawalpur',
    city: 'Bahawalpur',
    region: 'South Punjab',
    lat: 29.3544,
    lng: 71.6911,
    radiusMeters: 500,
    description: 'Bahawalpur Shahi Bazaar & Circular Road Hub',
  },
  'rahim yar khan': {
    town: 'Rahim Yar Khan',
    city: 'Rahim Yar Khan',
    region: 'South Punjab',
    lat: 28.4212,
    lng: 70.2989,
    radiusMeters: 500,
    description: 'Rahim Yar Khan Main Commercial Center',
  },
  'sahiwal': {
    town: 'Sahiwal',
    city: 'Sahiwal',
    region: 'South Punjab',
    lat: 30.6682,
    lng: 73.1114,
    radiusMeters: 500,
    description: 'Sahiwal High Street & Saddar Market',
  },
  'okara': {
    town: 'Okara',
    city: 'Okara',
    region: 'South Punjab',
    lat: 30.8081,
    lng: 73.4458,
    radiusMeters: 500,
    description: 'Okara City Commercial Hub',
  },

  // Sindh & Karachi
  'karachi': {
    town: 'Karachi',
    city: 'Karachi',
    region: 'Sindh South',
    lat: 24.8607,
    lng: 67.0011,
    radiusMeters: 500,
    description: 'Karachi Light House & Denso Hall Electrical Wholesale Market',
  },
  'light house': {
    town: 'Light House',
    city: 'Karachi',
    region: 'Sindh South',
    lat: 24.8582,
    lng: 67.0094,
    radiusMeters: 500,
    description: 'Light House / M.A. Jinnah Road Electrical Wholesale Market, Karachi',
  },
  'hyderabad': {
    town: 'Hyderabad',
    city: 'Hyderabad',
    region: 'Sindh South',
    lat: 25.396,
    lng: 68.3578,
    radiusMeters: 500,
    description: 'Hyderabad Resham Gali & Saddar Electrical Hub',
  },
  'sukkur': {
    town: 'Sukkur',
    city: 'Sukkur',
    region: 'Sindh North',
    lat: 27.7052,
    lng: 68.8574,
    radiusMeters: 500,
    description: 'Sukkur Clock Tower Commercial Market',
  },

  // Balochistan
  'quetta': {
    town: 'Quetta',
    city: 'Quetta',
    region: 'Balochistan',
    lat: 30.1798,
    lng: 66.975,
    radiusMeters: 500,
    description: 'Quetta Liaquat Bazaar & Suraj Ganj Market',
  },
};

/**
 * Normalizes town string for lookup
 */
export function normalizeTownKey(townName: string): string {
  if (!townName) return '';
  return townName.trim().toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Retrieves the coordinate for a given town name with robust matching.
 */
export function getTownCoordinates(townName: string): TownCoordinate {
  const normalized = normalizeTownKey(townName);

  // Exact key match
  if (NATIONAL_TOWN_COORDINATES[normalized]) {
    return NATIONAL_TOWN_COORDINATES[normalized];
  }

  // Substring match
  for (const [key, coord] of Object.entries(NATIONAL_TOWN_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coord;
    }
  }

  // Fallback to Brandreth Road (HQ) if unknown
  return {
    town: townName || 'Brandreth Road',
    city: 'Lahore',
    region: 'Punjab Central',
    lat: 31.5795,
    lng: 74.3168,
    radiusMeters: 500,
    description: `${townName} Territory (Center Reference)`,
  };
}

/**
 * Computes Haversine distance in METERS between two GPS coordinates.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes Haversine distance in KILOMETERS.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) / 1000;
}

export interface GeofenceCheckResult {
  isWithinGeofence: boolean;
  distanceMeters: number;
  distanceKm: number;
  allowedRadiusMeters: number;
  townCenter: {
    lat: number;
    lng: number;
    town: string;
    city: string;
  };
  validationMessage: string;
}

/**
 * Validates whether user GPS coordinates fall within the 500m geofence radius of the assigned town.
 * @param userLat Current latitude from device GPS
 * @param userLng Current longitude from device GPS
 * @param townName Assigned town name (e.g. "Brandreth Road", "Peshawar", "Mardan")
 * @param maxRadiusMeters Geofence perimeter radius (defaults to 500 meters)
 */
export function validateTownGeofence(
  userLat: number,
  userLng: number,
  townName: string,
  maxRadiusMeters: number = 500
): GeofenceCheckResult {
  const townCoord = getTownCoordinates(townName);
  const distanceMeters = calculateHaversineDistanceMeters(userLat, userLng, townCoord.lat, townCoord.lng);
  const distanceKm = distanceMeters / 1000;
  const isWithinGeofence = distanceMeters <= maxRadiusMeters;

  let validationMessage = '';
  if (isWithinGeofence) {
    validationMessage = `✓ Geofence Verified: You are ${Math.round(distanceMeters)}m from ${townCoord.town} center (Within ${maxRadiusMeters}m perimeter).`;
  } else {
    const formattedDist = distanceMeters >= 1000 ? `${distanceKm.toFixed(2)} km` : `${Math.round(distanceMeters)}m`;
    validationMessage = `✗ Outside Assigned Geofence: You are ${formattedDist} away from ${townCoord.town} center. Check-in requires being within ${maxRadiusMeters}m of the town beat.`;
  }

  return {
    isWithinGeofence,
    distanceMeters,
    distanceKm,
    allowedRadiusMeters: maxRadiusMeters,
    townCenter: {
      lat: townCoord.lat,
      lng: townCoord.lng,
      town: townCoord.town,
      city: townCoord.city,
    },
    validationMessage,
  };
}
