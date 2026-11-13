/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pakistan GeoJSON Territory Boundaries and Strategic Commercial Corridors
 * Optimized for D3.js GeoMercator projections in N-LINK 360 Enterprise
 */

import { FeatureCollection, Feature, Geometry } from 'geojson';

export interface PakistanMapData {
  provinces: FeatureCollection;
  corridors: FeatureCollection;
  majorHubs: { name: string; lat: number; lng: number; province: string }[];
}

// Simplified high-fidelity boundaries for Pakistan provinces
export const PAKISTAN_PROVINCES_GEOJSON: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // Khyber Pakhtunkhwa (KPK) - Northern commercial hub (Swat, Peshawar, Mardan, Abbottabad)
    {
      type: 'Feature',
      properties: {
        id: 'KPK',
        name: 'Khyber Pakhtunkhwa',
        shortCode: 'KPK',
        capital: 'Peshawar',
        fillColor: '#004d40',
        strokeColor: '#00897b',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [71.18, 36.95],
            [72.50, 36.85],
            [73.50, 36.20],
            [73.80, 35.50],
            [73.55, 34.60],
            [73.40, 34.15],
            [72.95, 33.75],
            [72.10, 33.70],
            [71.60, 33.30],
            [71.15, 32.80],
            [70.25, 31.85],
            [69.60, 31.40],
            [69.30, 31.80],
            [69.85, 32.70],
            [70.15, 33.40],
            [71.05, 34.20],
            [71.30, 35.00],
            [71.40, 35.80],
            [71.18, 36.95],
          ],
        ],
      },
    },
    // Punjab - Central industrial & wholesale trade belt (Lahore, Rawalpindi, Faisalabad, Multan)
    {
      type: 'Feature',
      properties: {
        id: 'PUNJAB',
        name: 'Punjab',
        shortCode: 'PB',
        capital: 'Lahore',
        fillColor: '#064e3b',
        strokeColor: '#059669',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.95, 33.75],
            [73.40, 34.15],
            [73.80, 33.60],
            [74.50, 32.90],
            [74.90, 32.20],
            [74.60, 31.60],
            [74.35, 31.10],
            [74.00, 30.70],
            [73.40, 30.20],
            [73.00, 29.50],
            [71.80, 28.30],
            [70.30, 28.50],
            [69.75, 29.20],
            [70.10, 30.10],
            [70.35, 31.10],
            [70.25, 31.85],
            [71.15, 32.80],
            [71.60, 33.30],
            [72.10, 33.70],
            [72.95, 33.75],
          ],
        ],
      },
    },
    // Sindh - Southern port & trade artery (Karachi, Hyderabad, Sukkur)
    {
      type: 'Feature',
      properties: {
        id: 'SINDH',
        name: 'Sindh',
        shortCode: 'SN',
        capital: 'Karachi',
        fillColor: '#0f766e',
        strokeColor: '#14b8a6',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [70.30, 28.50],
            [71.80, 28.30],
            [71.10, 27.20],
            [70.80, 26.00],
            [71.20, 24.50],
            [69.20, 23.70],
            [68.10, 23.75],
            [67.40, 24.10],
            [66.90, 24.80],
            [67.10, 25.40],
            [67.80, 26.20],
            [68.10, 27.20],
            [68.60, 28.10],
            [69.75, 29.20],
            [70.30, 28.50],
          ],
        ],
      },
    },
    // Balochistan - Western trade corridor & minerals (Quetta, Gwadar)
    {
      type: 'Feature',
      properties: {
        id: 'BALOCHISTAN',
        name: 'Balochistan',
        shortCode: 'BA',
        capital: 'Quetta',
        fillColor: '#134e4a',
        strokeColor: '#0d9488',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [69.60, 31.40],
            [70.25, 31.85],
            [70.35, 31.10],
            [70.10, 30.10],
            [69.75, 29.20],
            [68.60, 28.10],
            [68.10, 27.20],
            [67.80, 26.20],
            [67.10, 25.40],
            [66.90, 24.80],
            [65.50, 25.20],
            [63.80, 25.10],
            [61.80, 25.20],
            [61.50, 26.20],
            [62.20, 27.20],
            [63.20, 28.30],
            [63.90, 29.40],
            [66.20, 30.10],
            [67.00, 30.90],
            [68.50, 31.30],
            [69.60, 31.40],
          ],
        ],
      },
    },
    // Islamabad Capital Territory (ICT)
    {
      type: 'Feature',
      properties: {
        id: 'ICT',
        name: 'Islamabad Capital Territory',
        shortCode: 'ICT',
        capital: 'Islamabad',
        fillColor: '#047857',
        strokeColor: '#34d399',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.85, 33.75],
            [73.20, 33.78],
            [73.25, 33.60],
            [72.90, 33.58],
            [72.85, 33.75],
          ],
        ],
      },
    },
    // Gilgit-Baltistan (Northern Frontier)
    {
      type: 'Feature',
      properties: {
        id: 'GB',
        name: 'Gilgit-Baltistan',
        shortCode: 'GB',
        capital: 'Gilgit',
        fillColor: '#065f46',
        strokeColor: '#10b981',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [73.80, 35.50],
            [74.50, 36.60],
            [75.50, 36.90],
            [77.10, 35.80],
            [76.30, 35.10],
            [75.20, 34.80],
            [74.50, 34.90],
            [73.80, 35.50],
          ],
        ],
      },
    },
    // Azad Jammu & Kashmir (AJK)
    {
      type: 'Feature',
      properties: {
        id: 'AJK',
        name: 'Azad Jammu & Kashmir',
        shortCode: 'AJK',
        capital: 'Muzaffarabad',
        fillColor: '#047857',
        strokeColor: '#34d399',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [73.40, 34.15],
            [73.80, 34.60],
            [74.50, 34.90],
            [74.40, 33.80],
            [73.80, 33.60],
            [73.40, 34.15],
          ],
        ],
      },
    },
  ],
};

// Strategic National Commercial Highway Corridors
export const PAKISTAN_CORRIDORS_GEOJSON: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // GT Road / N-5 National Highway (Karachi -> Sukkur -> Multan -> Lahore -> Rawalpindi -> Peshawar)
    {
      type: 'Feature',
      properties: {
        id: 'N5',
        name: 'N-5 Grand Trunk National Corridor',
        code: 'N-5',
        type: 'HIGHWAY',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [67.00, 24.86], // Karachi
          [68.37, 25.39], // Hyderabad
          [68.85, 27.70], // Sukkur
          [70.30, 28.42], // Rahim Yar Khan
          [71.52, 30.15], // Multan
          [73.10, 30.67], // Sahiwal
          [74.35, 31.52], // Lahore
          [74.19, 32.18], // Gujranwala
          [73.04, 33.60], // Rawalpindi/Islamabad
          [71.97, 34.01], // Nowshera
          [71.52, 34.01], // Peshawar
        ],
      },
    },
    // M-1 Motorway (Islamabad -> Peshawar)
    {
      type: 'Feature',
      properties: {
        id: 'M1',
        name: 'M-1 Motorway (Islamabad-Peshawar)',
        code: 'M-1',
        type: 'MOTORWAY',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [73.04, 33.68], // Islamabad
          [72.47, 34.00], // Swabi interchange
          [72.04, 34.08], // Mardan interchange
          [71.52, 34.01], // Peshawar
        ],
      },
    },
    // M-2 Motorway (Lahore -> Islamabad)
    {
      type: 'Feature',
      properties: {
        id: 'M2',
        name: 'M-2 Motorway (Lahore-Islamabad)',
        code: 'M-2',
        type: 'MOTORWAY',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [74.35, 31.52], // Lahore
          [73.80, 31.90], // Sheikhupura
          [72.90, 32.60], // Bhalwal / Kallar Kahar
          [73.04, 33.68], // Islamabad
        ],
      },
    },
    // Swat Expressway (Nowshera -> Mardan -> Batkhela -> Mingora/Swat)
    {
      type: 'Feature',
      properties: {
        id: 'M16',
        name: 'Swat Expressway / N-95',
        code: 'M-16',
        type: 'EXPRESSWAY',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [71.97, 34.01], // Nowshera
          [72.04, 34.19], // Mardan
          [71.96, 34.61], // Batkhela
          [72.36, 34.77], // Mingora / Swat
        ],
      },
    },
    // Karakoram Highway / Hazara Motorway (Hassan Abdal -> Haripur -> Abbottabad -> Mansehra)
    {
      type: 'Feature',
      properties: {
        id: 'KKH',
        name: 'Hazara Motorway / Karakoram Highway',
        code: 'N-35',
        type: 'HIGHWAY',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [72.68, 33.82], // Hassan Abdal
          [72.93, 33.99], // Haripur
          [73.22, 34.16], // Abbottabad
          [73.19, 34.33], // Mansehra
        ],
      },
    },
  ],
};

// Strategic Trade Hub Cities
export const PAKISTAN_MAJOR_HUBS = [
  { name: 'Peshawar', lat: 34.0151, lng: 71.5249, province: 'KPK', code: 'PSH' },
  { name: 'Mingora (Swat)', lat: 34.7717, lng: 72.3602, province: 'KPK', code: 'SWT' },
  { name: 'Abbottabad', lat: 34.1688, lng: 73.2215, province: 'KPK', code: 'ABT' },
  { name: 'Mardan', lat: 34.1986, lng: 72.0404, province: 'KPK', code: 'MDN' },
  { name: 'Islamabad / RWP', lat: 33.6844, lng: 73.0479, province: 'ICT', code: 'ISB' },
  { name: 'Lahore', lat: 31.5204, lng: 74.3587, province: 'Punjab', code: 'LHR' },
  { name: 'Faisalabad', lat: 31.4504, lng: 73.1350, province: 'Punjab', code: 'FSD' },
  { name: 'Multan', lat: 30.1575, lng: 71.5249, province: 'Punjab', code: 'MUX' },
  { name: 'Sukkur', lat: 27.7052, lng: 68.8574, province: 'Sindh', code: 'SKR' },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011, province: 'Sindh', code: 'KHI' },
  { name: 'Quetta', lat: 30.1798, lng: 66.9750, province: 'Balochistan', code: 'UET' },
];
