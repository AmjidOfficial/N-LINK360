/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Customer Map & Route View Component
 * Provides interactive route visualization, distance calculation, live GPS tracking,
 * and turn-by-turn navigation between field officer position and dealer shop.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import {
  MapPin,
  Navigation,
  Compass,
  ExternalLink,
  LocateFixed,
  RefreshCw,
  Share2,
  CheckCircle2,
  AlertCircle,
  Car,
  Clock,
  Building2,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import {
  GeoLocationPoint,
  computeOfficerToCustomerRoute,
  getCustomerCoordinates,
  PAKISTAN_TOWN_COORDINATES,
} from '../../utils/geoUtils';

export interface CustomerMapViewProps {
  customer: Customer;
  currentUser: NLinkUser;
  onUpdateCustomerCoordinates?: (updatedCustomer: Customer) => void;
}

export const CustomerMapView: React.FC<CustomerMapViewProps> = ({
  customer,
  currentUser,
  onUpdateCustomerCoordinates,
}) => {
  // Default officer initial coordinate (derived from officer's assigned town or default base)
  const defaultOfficerPos = useMemo<GeoLocationPoint>(() => {
    const userTown = (currentUser.assignedTowns?.[0] || 'Abbottabad').toLowerCase().trim();
    const townCoord = PAKISTAN_TOWN_COORDINATES[userTown] || PAKISTAN_TOWN_COORDINATES['abbottabad'];
    return {
      lat: townCoord.lat + 0.012, // slightly offset to show realistic route
      lng: townCoord.lng + 0.015,
      label: `${currentUser.fullName} (Field Base)`,
    };
  }, [currentUser]);

  const [officerPos, setOfficerPos] = useState<GeoLocationPoint>(defaultOfficerPos);
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'LOCATING' | 'ACTIVE' | 'ERROR'>('IDLE');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsMessage, setGpsMessage] = useState<string>('Using Officer Regional Base Location');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [pinSuccessMessage, setPinSuccessMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(14);
  const [mapType, setMapType] = useState<'STREET' | 'SATELLITE'>('STREET');

  // Request real device GPS position
  const requestLiveGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('ERROR');
      setGpsMessage('Geolocation is not supported by your browser.');
      return;
    }

    setGpsStatus('LOCATING');
    setGpsMessage('Acquiring high-accuracy satellite GPS fix...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const livePos: GeoLocationPoint = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracy: position.coords.accuracy,
          label: `${currentUser.fullName} (Live Device GPS)`,
        };
        setOfficerPos(livePos);
        setGpsAccuracy(Math.round(position.coords.accuracy));
        setGpsStatus('ACTIVE');
        setGpsMessage(`Live GPS Fix Active (±${Math.round(position.coords.accuracy)}m accuracy)`);
      },
      (error) => {
        console.warn('GPS location error:', error.message);
        setGpsStatus('ERROR');
        setGpsMessage(
          error.code === 1
            ? 'GPS permission denied. Using registered town base coordinates.'
            : 'GPS signal weak. Using registered town base coordinates.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Attempt live GPS on initial mount
  useEffect(() => {
    requestLiveGPS();
  }, []);

  // Compute full navigation route & distance
  const route = useMemo(() => {
    return computeOfficerToCustomerRoute(officerPos, customer);
  }, [officerPos, customer]);

  // Handle saving customer shop GPS pin to profile
  const handleSaveShopPin = () => {
    setIsUpdatingPin(true);
    // Use current officer position as the exact shop coordinates
    const updatedCustomer: Customer = {
      ...customer,
      latitude: officerPos.lat,
      longitude: officerPos.lng,
      gpsCoordinates: { lat: officerPos.lat, lng: officerPos.lng },
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateCustomerCoordinates) {
      onUpdateCustomerCoordinates(updatedCustomer);
    }

    setTimeout(() => {
      setIsUpdatingPin(false);
      setPinSuccessMessage(
        `✓ Shop GPS location successfully pinned to ${officerPos.lat.toFixed(5)}° N, ${officerPos.lng.toFixed(5)}° E`
      );
      setTimeout(() => setPinSuccessMessage(null), 5000);
    }, 600);
  };

  // WhatsApp share coordinates
  const handleShareWhatsApp = () => {
    const text = `Assalam-o-Alaikum,\n\n*National Lights Dealer Location Pin*\n*Shop:* ${customer.companyName}\n*Proprietor:* ${customer.contactPerson || 'Dealer'}\n*Town:* ${customer.town || customer.city}\n*Address:* ${customer.address}\n\n*Google Maps Location:* ${route.googleMapsNavUrl}\n*Distance:* ${route.formattedDistance} (${route.formattedEta} ETA)`;
    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Calculate SVG bounds for map route canvas
  const svgMapBounds = useMemo(() => {
    const minLat = Math.min(officerPos.lat, route.destination.lat);
    const maxLat = Math.max(officerPos.lat, route.destination.lat);
    const minLng = Math.min(officerPos.lng, route.destination.lng);
    const maxLng = Math.max(officerPos.lng, route.destination.lng);

    const latSpan = Math.max(0.005, maxLat - minLat);
    const lngSpan = Math.max(0.005, maxLng - minLng);

    // Padding
    const padLat = latSpan * 0.25;
    const padLng = lngSpan * 0.25;

    const bounds = {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    };

    // Convert lat/lng to SVG 0-100 coordinates
    const toSvgCoord = (lat: number, lng: number) => {
      const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
      const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
      return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
    };

    const originSvg = toSvgCoord(officerPos.lat, officerPos.lng);
    const destSvg = toSvgCoord(route.destination.lat, route.destination.lng);

    const pathData = route.waypoints
      .map((wp, idx) => {
        const pt = toSvgCoord(wp.lat, wp.lng);
        return `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      })
      .join(' ');

    return {
      originSvg,
      destSvg,
      pathData,
      bounds,
    };
  }, [officerPos, route]);

  // OpenStreetMap tile embed URL for interactive background
  const osmEmbedUrl = useMemo(() => {
    const centerLat = (officerPos.lat + route.destination.lat) / 2;
    const centerLng = (officerPos.lng + route.destination.lng) / 2;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${svgMapBounds.bounds.minLng}%2C${svgMapBounds.bounds.minLat}%2C${svgMapBounds.bounds.maxLng}%2C${svgMapBounds.bounds.maxLat}&layer=mapnik&marker=${route.destination.lat}%2C${route.destination.lng}`;
  }, [officerPos, route, svgMapBounds]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center">
            <Compass className="w-4 h-4 text-teal-700 dark:text-teal-400" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
              Field Geolocation &amp; Route Navigator
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Live distance from your position to {customer.companyName}
            </span>
          </div>
        </div>

        {/* GPS Status Badge */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={requestLiveGPS}
            disabled={gpsStatus === 'LOCATING'}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh Live GPS"
          >
            <RefreshCw className={`w-3 h-3 ${gpsStatus === 'LOCATING' ? 'animate-spin text-teal-600' : ''}`} />
            <span>{gpsStatus === 'LOCATING' ? 'Locating...' : 'Refresh GPS'}</span>
          </button>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
              gpsStatus === 'ACTIVE'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : gpsStatus === 'LOCATING'
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                gpsStatus === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            {gpsStatus === 'ACTIVE' ? 'Live GPS Active' : 'Town Position'}
          </span>
        </div>
      </div>

      {/* Primary Route Distance & ETA Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Road Distance Card */}
        <div className="bg-gradient-to-br from-teal-900 to-slate-900 text-white p-3.5 rounded-2xl border border-teal-800/40 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-teal-300 text-[10px] font-black uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5" />
              Road Distance
            </span>
            <span className="text-teal-200/80 font-mono text-[9px]">Road Network</span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white">
            {route.formattedDistance}
          </div>
          <p className="text-[10px] text-teal-100/80 mt-0.5">
            Straight Line: {route.straightDistanceKm} km
          </p>
        </div>

        {/* Motorbike / Bike Travel Time */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Field Officer ETA
            </span>
            <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.2 rounded">
              Motorbike
            </span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-900 dark:text-emerald-100">
            {route.formattedEta}
          </div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
            Estimated travel time in current traffic
          </p>
        </div>

        {/* Destination Coordinates */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Shop Coordinates
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {customer.town || customer.city}
            </span>
          </div>
          <div className="text-xs font-mono font-black text-slate-800 dark:text-slate-200 tracking-tight mt-1">
            {route.destination.lat.toFixed(5)}° N, {route.destination.lng.toFixed(5)}° E
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {customer.address || `${customer.town || customer.city} Commercial Beat`}
          </p>
        </div>
      </div>

      {/* Interactive Map Visual Stage */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 min-h-[260px] sm:min-h-[320px]">
        {/* Layer 1: Embedded Map Tiles for Geographical Grounding */}
        <iframe
          title="Customer Location Map"
          src={osmEmbedUrl}
          className="w-full h-[260px] sm:h-[320px] border-0 pointer-events-auto opacity-80 dark:opacity-60 dark:invert-[0.85] dark:hue-rotate-180 transition-opacity"
          loading="lazy"
        />

        {/* Layer 2: Vector Overlay HUD (High-contrast route line and interactive markers) */}
        <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
          {/* Top Floating Info Tag */}
          <div className="flex items-center justify-between gap-2">
            <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-[11px] font-bold shadow-md flex items-center gap-2 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Route: {officerPos.label?.split('(')[0].trim() || 'Officer'} &rarr; {customer.companyName}</span>
            </div>

            <div className="bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-emerald-300 font-mono text-[11px] font-black shadow-md pointer-events-auto">
              {route.formattedDistance} &bull; {route.formattedEta}
            </div>
          </div>

          {/* Bottom Interactive Nav CTA Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pointer-events-auto bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-white/10 text-white shadow-lg">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold">
                <Navigation className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-black text-white">{customer.companyName}</p>
                <p className="text-[10px] text-slate-300 font-mono">
                  {route.destination.lat.toFixed(4)}°N, {route.destination.lng.toFixed(4)}°E
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href={route.googleMapsNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Maps Navigation</span>
              </a>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-95 cursor-pointer"
                title="Share Location on WhatsApp"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notice if pin was updated */}
      {pinSuccessMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{pinSuccessMessage}</span>
        </div>
      )}

      {/* Action Bar: Shop GPS Tagging & Accuracy Info */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <LocateFixed className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              Standing at the customer&apos;s shop right now?
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Pin exact GPS coordinates to lock dealer verification on National Lights map.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveShopPin}
          disabled={isUpdatingPin}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
        >
          <MapPin className="w-3.5 h-3.5 text-rose-600" />
          <span>{isUpdatingPin ? 'Pinning GPS...' : 'Update Shop GPS Pin'}</span>
        </button>
      </div>
    </div>
  );
};
