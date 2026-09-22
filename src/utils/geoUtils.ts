/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pakistan Geolocation & Navigation Utilities for N-LINK 360
 * Provides coordinates, Haversine distance, ETA, and turn-by-turn route calculations.
 */

import { Customer } from '../types';

export interface GeoLocationPoint {
  lat: number;
  lng: number;
  label?: string;
  accuracy?: number;
}

export interface RouteInfo {
  origin: GeoLocationPoint;
  destination: GeoLocationPoint;
  straightDistanceKm: number;
  roadDistanceKm: number;
  formattedDistance: string;
  estimatedDrivingMins: number;
  estimatedMotorbikeMins: number;
  formattedEta: string;
  waypoints: GeoLocationPoint[];
  googleMapsNavUrl: string;
}

// Major Town/City base coordinates in Pakistan (focused on National Lights sales beats & regions)
export const PAKISTAN_TOWN_COORDINATES: Record<string, { lat: number; lng: number; province: string }> = {
  // KPK Region
  'peshawar': { lat: 34.0151, lng: 71.5249, province: 'KPK' },
  'mingora': { lat: 34.7717, lng: 72.3602, province: 'KPK' },
  'swat': { lat: 34.7717, lng: 72.3602, province: 'KPK' },
  'mardan': { lat: 34.1986, lng: 72.0404, province: 'KPK' },
  'abbottabad': { lat: 34.1688, lng: 73.2215, province: 'KPK' },
  'haripur': { lat: 33.9946, lng: 72.9341, province: 'KPK' },
  'mansehra': { lat: 34.3302, lng: 73.1968, province: 'KPK' },
  'duran pur': { lat: 34.0089, lng: 71.5832, province: 'KPK' },
  'duranpur': { lat: 34.0089, lng: 71.5832, province: 'KPK' },
  'charsadda': { lat: 34.1482, lng: 71.7406, province: 'KPK' },
  'swabi': { lat: 34.1202, lng: 72.4705, province: 'KPK' },
  'nowshera': { lat: 34.0158, lng: 71.9747, province: 'KPK' },
  'kohat': { lat: 33.5869, lng: 71.4414, province: 'KPK' },
  'bannu': { lat: 32.9861, lng: 70.6042, province: 'KPK' },
  'dera ismail khan': { lat: 31.8327, lng: 70.9024, province: 'KPK' },
  'd.i. khan': { lat: 31.8327, lng: 70.9024, province: 'KPK' },
  'd.i.khan': { lat: 31.8327, lng: 70.9024, province: 'KPK' },
  'batkhela': { lat: 34.6167, lng: 71.9667, province: 'KPK' },
  'timergara': { lat: 34.8281, lng: 71.8411, province: 'KPK' },
  'dir': { lat: 35.2074, lng: 71.8747, province: 'KPK' },
  'hangu': { lat: 33.5317, lng: 71.0594, province: 'KPK' },
  'karak': { lat: 33.1167, lng: 71.0833, province: 'KPK' },
  'chitral': { lat: 35.8510, lng: 71.7864, province: 'KPK' },

  // Punjab Region
  'rawalpindi': { lat: 33.5651, lng: 73.0169, province: 'Punjab' },
  'islamabad': { lat: 33.6844, lng: 73.0479, province: 'Federal' },
  'lahore': { lat: 31.5204, lng: 74.3587, province: 'Punjab' },
  'faisalabad': { lat: 31.4504, lng: 73.1350, province: 'Punjab' },
  'gujranwala': { lat: 32.1877, lng: 74.1945, province: 'Punjab' },
  'multan': { lat: 30.1575, lng: 71.5249, province: 'Punjab' },
  'sialkot': { lat: 32.4945, lng: 74.5229, province: 'Punjab' },
  'bahawalpur': { lat: 29.3544, lng: 71.6911, province: 'Punjab' },
  'sargodha': { lat: 32.0836, lng: 72.6711, province: 'Punjab' },
  'gujrat': { lat: 32.5742, lng: 74.0754, province: 'Punjab' },
  'sheikhupura': { lat: 31.7131, lng: 73.9783, province: 'Punjab' },
  'jhang': { lat: 31.2781, lng: 72.3317, province: 'Punjab' },
  'rahim yar khan': { lat: 28.4212, lng: 70.2989, province: 'Punjab' },
  'sahiwal': { lat: 30.6682, lng: 73.1114, province: 'Punjab' },
  'kasur': { lat: 31.1179, lng: 74.4460, province: 'Punjab' },
  'okara': { lat: 30.8081, lng: 73.4458, province: 'Punjab' },
  'wah cantt': { lat: 33.7715, lng: 72.7511, province: 'Punjab' },
  'taxila': { lat: 33.7463, lng: 72.8397, province: 'Punjab' },
  'dera ghazi khan': { lat: 30.0561, lng: 70.6348, province: 'Punjab' },
  'chakwal': { lat: 32.9328, lng: 72.8630, province: 'Punjab' },
  'mianwali': { lat: 32.5853, lng: 71.5436, province: 'Punjab' },
  'attock': { lat: 33.7667, lng: 72.3667, province: 'Punjab' },
  'jhelum': { lat: 32.9405, lng: 73.7276, province: 'Punjab' },

  // Sindh Region
  'karachi': { lat: 24.8607, lng: 67.0011, province: 'Sindh' },
  'hyderabad': { lat: 25.3960, lng: 68.3578, province: 'Sindh' },
  'sukkur': { lat: 27.7052, lng: 68.8574, province: 'Sindh' },
  'larkana': { lat: 27.5590, lng: 68.2120, province: 'Sindh' },

  // Balochistan
  'quetta': { lat: 30.1798, lng: 66.9750, province: 'Balochistan' },
  'hub': { lat: 25.0253, lng: 66.8833, province: 'Balochistan' },
};

/**
 * Calculate Haversine direct straight line distance between two coordinates in kilometers.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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
 * Resolve customer shop coordinates from customer record or town name
 */
export function getCustomerCoordinates(customer: Customer): GeoLocationPoint {
  // 1. Explicit direct coordinates on customer object
  if (
    typeof customer.latitude === 'number' &&
    typeof customer.longitude === 'number' &&
    !isNaN(customer.latitude) &&
    !isNaN(customer.longitude) &&
    customer.latitude !== 0
  ) {
    return {
      lat: customer.latitude,
      lng: customer.longitude,
      label: `${customer.companyName} (${customer.town || customer.city || 'Shop'})`,
    };
  }

  if (
    customer.gpsCoordinates &&
    typeof customer.gpsCoordinates.lat === 'number' &&
    typeof customer.gpsCoordinates.lng === 'number' &&
    !isNaN(customer.gpsCoordinates.lat)
  ) {
    return {
      lat: customer.gpsCoordinates.lat,
      lng: customer.gpsCoordinates.lng,
      label: `${customer.companyName} (${customer.town || customer.city || 'Shop'})`,
    };
  }

  // 2. Resolve from Town / City name matching
  const searchKeys = [
    (customer.town || '').toLowerCase().trim(),
    (customer.city || '').toLowerCase().trim(),
    (customer.region || '').toLowerCase().trim(),
    (customer.address || '').toLowerCase().trim(),
  ];

  for (const key of searchKeys) {
    if (!key) continue;
    for (const [townName, coords] of Object.entries(PAKISTAN_TOWN_COORDINATES)) {
      if (key.includes(townName) || townName.includes(key)) {
        // Add small deterministic jitter based on customer ID/code so multiple shops in the same town don't stack on exact same spot
        const hash = (customer.id || customer.customerCode || customer.companyName)
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const latOffset = ((hash % 100) - 50) * 0.00015; // ~150-200 meters spread
        const lngOffset = (((hash * 7) % 100) - 50) * 0.00015;

        return {
          lat: Number((coords.lat + latOffset).toFixed(6)),
          lng: Number((coords.lng + lngOffset).toFixed(6)),
          label: `${customer.companyName} - ${coords.province}`,
        };
      }
    }
  }

  // Fallback default: Abbottabad Commercial Hub (National Lights Northern Hub)
  return {
    lat: 34.1688,
    lng: 73.2215,
    label: `${customer.companyName} - Abbottabad`,
  };
}

/**
 * Computes full navigation and route details between officer's position and customer shop.
 */
export function computeOfficerToCustomerRoute(
  officerPos: GeoLocationPoint,
  customer: Customer
): RouteInfo {
  const destination = getCustomerCoordinates(customer);

  const straightDistanceKm = calculateHaversineDistance(
    officerPos.lat,
    officerPos.lng,
    destination.lat,
    destination.lng
  );

  // In Pakistan urban & mountainous routes (KPK/Punjab), road distance is typically 1.25x - 1.35x straight line
  const roadFactor = straightDistanceKm > 20 ? 1.28 : 1.35;
  const roadDistanceKm = Number((straightDistanceKm * roadFactor).toFixed(1));

  // Speeds: Motorbike ~ 35-45 km/h in city; Car/Van ~ 30-40 km/h in traffic
  const estimatedMotorbikeMins = Math.max(2, Math.round((roadDistanceKm / 35) * 60));
  const estimatedDrivingMins = Math.max(3, Math.round((roadDistanceKm / 28) * 60));

  // Format distance
  let formattedDistance = '';
  if (roadDistanceKm < 1) {
    formattedDistance = `${Math.round(roadDistanceKm * 1000)} m`;
  } else {
    formattedDistance = `${roadDistanceKm.toFixed(1)} km`;
  }

  // Format ETA
  let formattedEta = '';
  if (estimatedMotorbikeMins < 60) {
    formattedEta = `${estimatedMotorbikeMins} min`;
  } else {
    const hrs = Math.floor(estimatedMotorbikeMins / 60);
    const mins = estimatedMotorbikeMins % 60;
    formattedEta = `${hrs}h ${mins > 0 ? `${mins}m` : ''}`;
  }

  // Generate realistic route waypoints along the bearing
  const waypoints: GeoLocationPoint[] = [];
  const numSteps = 6;
  for (let i = 0; i <= numSteps; i++) {
    const fraction = i / numSteps;
    // Add small curve deviation for natural road path
    const curvature = Math.sin(fraction * Math.PI) * 0.002 * (i % 2 === 0 ? 1 : -0.6);
    waypoints.push({
      lat: Number((officerPos.lat + (destination.lat - officerPos.lat) * fraction + curvature).toFixed(6)),
      lng: Number((officerPos.lng + (destination.lng - officerPos.lng) * fraction - curvature).toFixed(6)),
    });
  }

  // Google Maps Universal Directions URL
  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${officerPos.lat},${officerPos.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;

  return {
    origin: officerPos,
    destination,
    straightDistanceKm: Number(straightDistanceKm.toFixed(2)),
    roadDistanceKm,
    formattedDistance,
    estimatedDrivingMins,
    estimatedMotorbikeMins,
    formattedEta,
    waypoints,
    googleMapsNavUrl,
  };
}
