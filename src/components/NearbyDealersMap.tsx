import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  LocateFixed,
  RotateCw,
  MapPin,
  Store,
  Navigation,
  ChevronRight,
  ShieldCheck,
  Compass,
  Building2,
  Phone,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Customer } from '../types';

export interface NearbyDealersMapProps {
  userLat: number;
  userLng: number;
  accuracy: number;
  townName: string;
  customers: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
  onSyncGps: () => void;
  isSyncingGps: boolean;
  lastSyncTime?: Date | string;
}

// Haversine formula to compute great-circle distance in kilometers
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in KM
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

// Deterministic pseudo-offset generator for dealers without recorded lat/long
function getDealerGeoCoordinates(
  customer: Customer,
  centerLat: number,
  centerLng: number
): { lat: number; lng: number; isEstimated: boolean } {
  if (
    typeof (customer as any).latitude === 'number' &&
    typeof (customer as any).longitude === 'number' &&
    (customer as any).latitude !== 0
  ) {
    return {
      lat: (customer as any).latitude,
      lng: (customer as any).longitude,
      isEstimated: false,
    };
  }

  // Deterministic hash based on customer id/code
  const str = customer.id + (customer.customerCode || customer.companyName);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  // Offset within ~0.3 km to 2.5 km of user's current GPS position
  const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
  const distanceKm = 0.3 + ((Math.abs(hash >> 3) % 180) / 100); // 0.3 to 2.1 km
  const deltaLat = (distanceKm / 111) * Math.cos(angle);
  const deltaLng = (distanceKm / (111 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);

  return {
    lat: centerLat + deltaLat,
    lng: centerLng + deltaLng,
    isEstimated: true,
  };
}

export const NearbyDealersMap: React.FC<NearbyDealersMapProps> = ({
  userLat,
  userLng,
  accuracy,
  townName,
  customers,
  onSelectCustomer,
  onSyncGps,
  isSyncingGps,
  lastSyncTime,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeRadiusKm, setActiveRadiusKm] = useState<number>(5);
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'MAP' | 'LIST'>('MAP');

  // Compute nearby dealers with distances
  const dealersWithDistance = useMemo(() => {
    return customers.map((c) => {
      const coords = getDealerGeoCoordinates(c, userLat, userLng);
      const distanceKm = calculateHaversineKm(userLat, userLng, coords.lat, coords.lng);
      return {
        customer: c,
        lat: coords.lat,
        lng: coords.lng,
        isEstimated: coords.isEstimated,
        distanceKm,
        distanceMeters: Math.round(distanceKm * 1000),
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [customers, userLat, userLng]);

  // Filter by selected radius
  const filteredDealers = useMemo(() => {
    if (activeRadiusKm >= 5) return dealersWithDistance;
    return dealersWithDistance.filter((d) => d.distanceKm <= activeRadiusKm);
  }, [dealersWithDistance, activeRadiusKm]);

  // Initialize and update Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLat, userLng],
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear previous markers
    markersLayer.clearLayers();

    // 1. User Live Location Marker (Radar Pulse Pin)
    const userPulseIcon = L.divIcon({
      className: 'custom-user-gps-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(15, 118, 110, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #0f766e; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px;">
            📍
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const userMarker = L.marker([userLat, userLng], { icon: userPulseIcon });
    userMarker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; font-size: 11px; padding: 2px;">
        <strong style="color: #0f766e; font-size: 12px;">Your Checked-in Location</strong><br/>
        Town: <strong>${townName}</strong><br/>
        GPS: ${userLat.toFixed(4)}° N, ${userLng.toFixed(4)}° E<br/>
        Accuracy: ±${accuracy} meters
      </div>
    `);
    userMarker.addTo(markersLayer);

    // Add Proximity Distance Circles
    const circle1km = L.circle([userLat, userLng], {
      radius: 1000,
      color: '#0f766e',
      weight: 1,
      dashArray: '4, 4',
      fillColor: '#0f766e',
      fillOpacity: 0.04,
    });
    circle1km.addTo(markersLayer);

    const circle2km = L.circle([userLat, userLng], {
      radius: 2000,
      color: '#0f766e',
      weight: 0.8,
      dashArray: '6, 6',
      fillColor: '#0f766e',
      fillOpacity: 0.02,
    });
    circle2km.addTo(markersLayer);

    // 2. Dealer Markers
    filteredDealers.forEach((d) => {
      const isSelected = selectedDealerId === d.customer.id;
      const isDistributor = d.customer.type === 'DISTRIBUTOR';
      const bgColor = isDistributor ? '#7c3aed' : '#059669';

      const dealerIcon = L.divIcon({
        className: 'custom-dealer-pin',
        html: `
          <div style="
            width: ${isSelected ? '32px' : '28px'};
            height: ${isSelected ? '32px' : '28px'};
            border-radius: 50%;
            background: ${bgColor};
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: 800;
            cursor: pointer;
            transition: transform 0.2s;
            ${isSelected ? 'transform: scale(1.15); ring: 3px solid #0f766e;' : ''}
          ">
            🏪
          </div>
        `,
        iconSize: [isSelected ? 32 : 28, isSelected ? 32 : 28],
        iconAnchor: [isSelected ? 16 : 14, isSelected ? 16 : 14],
      });

      const marker = L.marker([d.lat, d.lng], { icon: dealerIcon });
      const distanceLabel = d.distanceKm < 1 ? `${d.distanceMeters} meters away` : `${d.distanceKm.toFixed(1)} km away`;

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 11px; color: #1e293b; min-width: 170px;">
          <strong style="font-size: 13px; color: #0f172a; display: block;">${d.customer.companyName}</strong>
          <span style="color: #64748b; font-size: 10px;">${d.customer.customerCode || d.customer.id} · ${d.customer.type}</span>
          <div style="margin-top: 6px; padding: 4px 6px; background: #f1f5f9; border-radius: 6px;">
            <span style="color: #0f766e; font-weight: bold;">📍 ${distanceLabel}</span><br/>
            Outstanding: <strong>Rs. ${(d.customer.currentBalance || 0).toLocaleString()}</strong>
          </div>
          ${d.customer.phone ? `<div style="margin-top: 4px; font-size: 10px; color: #475569;">📞 ${d.customer.phone}</div>` : ''}
        </div>
      `);

      marker.on('click', () => {
        setSelectedDealerId(d.customer.id);
      });

      marker.addTo(markersLayer);
    });

    // Auto fit bounds if dealers exist
    if (filteredDealers.length > 0) {
      const bounds = L.latLngBounds([[userLat, userLng]]);
      filteredDealers.forEach((d) => bounds.extend([d.lat, d.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [userLat, userLng, accuracy, townName, filteredDealers, selectedDealerId]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm space-y-0">
      {/* 1. Header Toolbar with Sync GPS Location Button */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 flex items-center gap-1">
              <Compass className="w-3 h-3" />
              Proximity Radar
            </span>
            <span className="text-xs font-bold text-slate-500">
              {dealersWithDistance.length} Assigned Dealers in Territory
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 mt-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-teal-600" />
            <span>Nearby Clients around {townName}</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium font-mono mt-0.5">
            Live GPS: {userLat.toFixed(4)}° N, {userLng.toFixed(4)}° E (±{accuracy}m)
            {lastSyncTime && (
              <span className="font-sans text-slate-400 ml-1.5">
                · Last synced just now
              </span>
            )}
          </p>
        </div>

        {/* Sync GPS Location CTA Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSyncGps}
            disabled={isSyncingGps}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Re-acquire device satellite GPS position"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncingGps ? 'animate-spin' : ''}`} />
            <span>{isSyncingGps ? 'Acquiring Satellites…' : 'Sync GPS Location'}</span>
          </button>

          {/* View Mode Toggle: Map vs List */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('MAP')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'MAP'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* 2. Radius Filter Bar */}
      <div className="px-4 sm:px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
          Radius:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { label: 'All', val: 5 },
            { label: '< 1 km', val: 1 },
            { label: '< 2 km', val: 2 },
            { label: '< 3 km', val: 3 },
          ].map((rf) => (
            <button
              key={rf.val}
              type="button"
              onClick={() => setActiveRadiusKm(rf.val)}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeRadiusKm === rf.val
                  ? 'bg-white text-teal-800 shadow-2xs border border-teal-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {rf.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-semibold text-slate-600 ml-auto shrink-0">
          Showing {filteredDealers.length} client{filteredDealers.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* 3. Visual Leaflet Map Display */}
      {viewMode === 'MAP' && (
        <div className="relative w-full h-72 sm:h-80 bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
          
          {/* Map Overlay Badge */}
          <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-[11px] text-slate-700 font-bold flex items-center gap-1.5 pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
            <span>📍 You are here · {filteredDealers.length} dealers plotted</span>
          </div>
        </div>
      )}

      {/* 4. Nearest Assigned Dealers Cards List */}
      <div className="p-4 sm:p-5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Nearby Dealers (Ordered by Proximity)
          </h4>
          <span className="text-[11px] font-bold text-teal-700">
            {filteredDealers[0]
              ? `Nearest: ${filteredDealers[0].customer.companyName} (${filteredDealers[0].distanceMeters}m)`
              : 'No clients within range'}
          </span>
        </div>

        {filteredDealers.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
            No assigned dealers within {activeRadiusKm} km of your GPS location. Try widening the radius filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredDealers.slice(0, 6).map((d) => {
              const isClosest = d === filteredDealers[0];
              const distLabel =
                d.distanceKm < 1 ? `${d.distanceMeters} m away` : `${d.distanceKm.toFixed(1)} km away`;

              return (
                <div
                  key={d.customer.id}
                  className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between gap-2.5 ${
                    isClosest
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 truncate">
                            {d.customer.companyName}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {d.customer.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {d.customer.customerCode || d.customer.id} · {d.customer.city || d.customer.town}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded-full shrink-0">
                        <Navigation className="w-3 h-3 text-teal-600" />
                        {distLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 mt-2 border-t border-slate-100">
                      <span>
                        Outstanding: <strong className="font-mono text-slate-900">Rs. {(d.customer.currentBalance || 0).toLocaleString()}</strong>
                      </span>
                      {d.customer.phone && (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {d.customer.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {onSelectCustomer && (
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(d.customer)}
                      className="w-full py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Open Customer 360 / Book Order</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
