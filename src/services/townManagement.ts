/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Town & Geographic Route Management Service
 */

import { TownNode } from '../types';
import { PAKISTAN_REGIONS, CITY_ROUTES_AND_BEATS } from '../data/pakistan-geography';

const LOCAL_STORAGE_KEY = 'nlink_managed_town_nodes';

// Master Pakistan City / Commercial Hub Geographic Coordinates
export const PAKISTAN_TOWN_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Peshawar: { lat: 34.0151, lng: 71.5249 },
  'Duran Pur': { lat: 34.0082, lng: 71.612 },
  Mardan: { lat: 34.1989, lng: 72.0404 },
  'Swat (Mingora)': { lat: 34.7717, lng: 72.3602 },
  Abbottabad: { lat: 34.1688, lng: 73.2215 },
  Nowshera: { lat: 34.0153, lng: 71.9747 },
  Kohat: { lat: 33.5869, lng: 71.4414 },
  Charsadda: { lat: 34.1482, lng: 71.7406 },
  Swabi: { lat: 34.1202, lng: 72.4704 },
  Haripur: { lat: 33.9999, lng: 72.9341 },
  Mansehra: { lat: 34.3302, lng: 73.1968 },
  Bannu: { lat: 32.9889, lng: 70.6056 },
  'Dera Ismail Khan': { lat: 31.8327, lng: 70.9024 },
  Islamabad: { lat: 33.6844, lng: 73.0479 },
  Rawalpindi: { lat: 33.5973, lng: 73.0479 },
  Lahore: { lat: 31.5204, lng: 74.3587 },
  Gujranwala: { lat: 32.1877, lng: 74.1945 },
  Faisalabad: { lat: 31.4504, lng: 73.135 },
  Multan: { lat: 30.1575, lng: 71.5249 },
  Sialkot: { lat: 32.4945, lng: 74.5229 },
  Gujrat: { lat: 32.5742, lng: 74.0754 },
  Sargodha: { lat: 32.0836, lng: 72.6711 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
  Hyderabad: { lat: 25.396, lng: 68.3578 },
  Sukkur: { lat: 27.7052, lng: 68.8574 },
  Quetta: { lat: 30.1798, lng: 66.975 },
  Muzaffarabad: { lat: 34.3597, lng: 73.4707 },
  Gilgit: { lat: 35.9208, lng: 74.3144 },
};

/**
 * Generate initial default Town Nodes from master Pakistan geography and route maps.
 */
export const getDefaultTownNodes = (): TownNode[] => {
  const nodes: TownNode[] = [];

  PAKISTAN_REGIONS.forEach((region) => {
    region.cities.forEach((city) => {
      // Find associated beats/routes
      const specificRoutes = CITY_ROUTES_AND_BEATS[city.name] || city.majorBeats || [
        `${city.name} Main Commercial Beat`,
        `${city.name} Circular Market Beat`,
      ];

      const coords = PAKISTAN_TOWN_COORDINATES[city.name] || {
        lat: 34.0151 + (Math.random() - 0.5) * 0.5,
        lng: 71.5249 + (Math.random() - 0.5) * 0.5,
      };

      nodes.push({
        id: `town-${city.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: city.name,
        region: region.id,
        isActive: true,
        commercialHub: city.commercialHub || `${city.name} Central Trade Market`,
        routes: specificRoutes,
        district: city.name,
        geofenceRadiusMeters: 1500, // Default 1.5 km radius perimeter
        centerCoordinates: coords,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });
  });

  return nodes;
};

/**
 * Retrieve current Town Nodes from LocalStorage or seed defaults.
 */
export const getStoredTownNodes = (): TownNode[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed: TownNode[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure every node has default geofence & coordinates if missing
        let hasMigrated = false;
        const migrated = parsed.map((n) => {
          if (!n.geofenceRadiusMeters || !n.centerCoordinates) {
            hasMigrated = true;
            return {
              ...n,
              geofenceRadiusMeters: n.geofenceRadiusMeters || 1500,
              centerCoordinates:
                n.centerCoordinates ||
                PAKISTAN_TOWN_COORDINATES[n.name] || {
                  lat: 34.0151,
                  lng: 71.5249,
                },
            };
          }
          return n;
        });

        if (hasMigrated) {
          saveTownNodes(migrated);
        }
        return migrated;
      }
    }
  } catch (err) {
    console.warn('Error reading stored town nodes:', err);
  }

  const defaults = getDefaultTownNodes();
  saveTownNodes(defaults);
  return defaults;
};

/**
 * Save Town Nodes to LocalStorage and broadcast an update event.
 */
export const saveTownNodes = (nodes: TownNode[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nodes));
    window.dispatchEvent(new CustomEvent('nlink_town_nodes_updated', { detail: nodes }));
  } catch (err) {
    console.error('Failed to save town nodes:', err);
  }
};

/**
 * Helper to get list of active town names.
 */
export const getActiveTownNames = (nodes: TownNode[]): string[] => {
  return nodes.filter((n) => n.isActive).map((n) => n.name);
};

/**
 * Helper to get active routes map: Record<townName, routes[]>.
 */
export const getActiveCityRoutesMap = (nodes: TownNode[]): Record<string, string[]> => {
  const map: Record<string, string[]> = {};
  nodes
    .filter((n) => n.isActive)
    .forEach((n) => {
      map[n.name] = n.routes && n.routes.length > 0
        ? n.routes
        : [`${n.name} Main Commercial Beat`, `${n.name} Circular Market Beat`];
    });
  return map;
};

/**
 * Helper to get routes for a single active town.
 */
export const getRoutesForTown = (townName: string, nodes: TownNode[]): string[] => {
  const node = nodes.find((n) => n.name.toLowerCase() === townName.toLowerCase());
  if (node && node.isActive && node.routes && node.routes.length > 0) {
    return node.routes;
  }
  return [
    `${townName} Main Commercial Beat`,
    `${townName} City Circular Market Beat`,
    `${townName} Sub-Tehsil Trade Corridor`,
  ];
};

/**
 * Helper to add a new route to an existing town node and persist.
 */
export const addRouteToTownNode = (
  townNameOrId: string,
  routeName: string,
  nodes: TownNode[]
): { updatedNodes: TownNode[]; success: boolean; message: string } => {
  const cleanRoute = routeName.trim();
  if (!cleanRoute) {
    return { updatedNodes: nodes, success: false, message: 'Route name cannot be empty.' };
  }

  const targetNode = nodes.find(
    (n) => n.id === townNameOrId || n.name.toLowerCase() === townNameOrId.toLowerCase()
  );

  if (!targetNode) {
    return { updatedNodes: nodes, success: false, message: `Town "${townNameOrId}" not found.` };
  }

  if (targetNode.routes?.some((r) => r.toLowerCase() === cleanRoute.toLowerCase())) {
    return {
      updatedNodes: nodes,
      success: false,
      message: `Route "${cleanRoute}" already exists in ${targetNode.name}.`,
    };
  }

  const updatedRoutes = [...(targetNode.routes || []), cleanRoute];
  const updatedNodes = nodes.map((n) =>
    n.id === targetNode.id
      ? { ...n, routes: updatedRoutes, updatedAt: new Date().toISOString() }
      : n
  );

  saveTownNodes(updatedNodes);
  return {
    updatedNodes,
    success: true,
    message: `✓ Route "${cleanRoute}" successfully linked to ${targetNode.name}.`,
  };
};

/**
 * Helper to update geofence precision radius for a town node.
 */
export const updateTownGeofenceRadius = (
  townNameOrId: string,
  radiusMeters: number,
  nodes: TownNode[]
): TownNode[] => {
  const updated = nodes.map((n) => {
    if (n.id === townNameOrId || n.name.toLowerCase() === townNameOrId.toLowerCase()) {
      return {
        ...n,
        geofenceRadiusMeters: radiusMeters,
        updatedAt: new Date().toISOString(),
      };
    }
    return n;
  });
  saveTownNodes(updated);
  return updated;
};

