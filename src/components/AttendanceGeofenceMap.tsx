import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Target, Navigation, ShieldCheck, ShieldAlert, LocateFixed, ZoomIn } from 'lucide-react';

interface AttendanceGeofenceMapProps {
  userLat: number;
  userLng: number;
  townCenter: { lat: number; lng: number };
  attendanceTown: string;
  maxRadiusKM: number;
  isWithinGeofence: boolean;
  distanceToCenter: number;
  onRefreshGps?: () => void;
}

export const AttendanceGeofenceMap: React.FC<AttendanceGeofenceMapProps> = ({
  userLat,
  userLng,
  townCenter,
  attendanceTown,
  maxRadiusKM,
  isWithinGeofence,
  distanceToCenter,
  onRefreshGps,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container = document.getElementById('map-container');
    if (!container) return;

    // Initialize Leaflet map instance if not already initialized
    if (!mapRef.current) {
      const map = L.map('map-container', {
        center: [townCenter.lat, townCenter.lng],
        zoom: 11,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // Add custom compact zoom control
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;

    if (!map || !layerGroup) return;

    // Clear previous markers & overlays
    layerGroup.clearLayers();

    const townCenterLatLng: [number, number] = [townCenter.lat, townCenter.lng];
    const userLatLng: [number, number] = [userLat, userLng];

    // 1. Geofence Circle Perimeter
    const fenceColor = isWithinGeofence ? '#10b981' : '#f43f5e';
    const circle = L.circle(townCenterLatLng, {
      radius: maxRadiusKM * 1000, // convert km to meters
      color: fenceColor,
      fillColor: fenceColor,
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '6, 6',
    });
    circle.addTo(layerGroup);

    // 2. Custom Icon for Town Center
    const townIcon = L.divIcon({
      className: 'custom-town-marker',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #0f766e;
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">
          🏛️
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const townMarker = L.marker(townCenterLatLng, { icon: townIcon });
    townMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 11px; color: #1e293b;">
        <strong style="color: #0f766e; font-size: 12px;">Beat Town Center: ${attendanceTown}</strong><br/>
        GPS: ${townCenter.lat.toFixed(4)}° N, ${townCenter.lng.toFixed(4)}° E<br/>
        Geofence Perimeter: <strong>${maxRadiusKM} KM</strong>
      </div>
    `);
    townMarker.addTo(layerGroup);

    // 3. Custom Icon for User GPS Position
    const userMarkerIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${isWithinGeofence ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'};
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            width: 20px;
            height: 20px;
            background: ${isWithinGeofence ? '#10b981' : '#f43f5e'};
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            z-index: 2;
          "></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const userMarker = L.marker(userLatLng, { icon: userMarkerIcon });
    userMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 11px; color: #1e293b;">
        <strong style="color: ${isWithinGeofence ? '#059669' : '#e11d48'}; font-size: 12px;">
          ${isWithinGeofence ? '✓ INSIDE GEOFENCE' : '✗ OUTSIDE BOUNDS'}
        </strong><br/>
        Current GPS: ${userLat.toFixed(4)}° N, ${userLng.toFixed(4)}° E<br/>
        Proximity to Center: <strong>${distanceToCenter.toFixed(2)} KM</strong>
      </div>
    `);
    userMarker.addTo(layerGroup);

    // 4. Distance Polyline Line
    const polyline = L.polyline([userLatLng, townCenterLatLng], {
      color: isWithinGeofence ? '#0d9488' : '#e11d48',
      weight: 2,
      dashArray: '5, 5',
    });
    polyline.addTo(layerGroup);

    // 5. Auto fit bounds
    const bounds = L.latLngBounds([userLatLng, townCenterLatLng]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });

    // Invalidate map size to ensure full rendering inside flex/grid containers
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [userLat, userLng, townCenter, attendanceTown, maxRadiusKM, isWithinGeofence, distanceToCenter]);

  const handleCenterUser = () => {
    if (mapRef.current) {
      mapRef.current.setView([userLat, userLng], 14, { animate: true });
    }
  };

  const handleCenterTown = () => {
    if (mapRef.current) {
      mapRef.current.setView([townCenter.lat, townCenter.lng], 12, { animate: true });
    }
  };

  return (
    <div className="space-y-2">
      {/* Map Container */}
      <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
        <div id="map-container" className="w-full h-full" />

        {/* Floating Top Status Badge */}
        <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white shadow-md flex items-center gap-2">
          {isWithinGeofence ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 animate-bounce" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
          )}
          <div>
            <span className="block text-[9px] font-black uppercase text-slate-400">
              {attendanceTown} Geofence Map
            </span>
            <span className={`block text-[11px] font-extrabold ${isWithinGeofence ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isWithinGeofence ? 'Inside Town Perimeter' : 'Outside Boundary'}
            </span>
          </div>
        </div>

        {/* Floating Map Action Controls */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
          <button
            onClick={handleCenterUser}
            className="p-2 bg-white/90 backdrop-blur-md rounded-xl text-slate-700 hover:text-teal-700 shadow-md border border-white hover:bg-white active:scale-95 transition-all"
            title="Focus Current GPS Location"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
          <button
            onClick={handleCenterTown}
            className="p-2 bg-white/90 backdrop-blur-md rounded-xl text-slate-700 hover:text-teal-700 shadow-md border border-white hover:bg-white active:scale-95 transition-all"
            title="Focus Town Center"
          >
            <Target className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Distance & Proximity Overlay */}
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-white shadow-lg flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-slate-500 font-sans text-[10px] font-bold">Proximity:</span>
            <span className="font-black text-slate-800">{distanceToCenter.toFixed(2)} km</span>
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Max Radius: <strong className="text-slate-800">{maxRadiusKM} km</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
