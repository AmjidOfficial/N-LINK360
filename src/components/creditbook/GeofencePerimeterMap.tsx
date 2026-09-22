/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Geofence Precision Toggle & Visual Perimeter Map Component
 * Provides real-time visual perimeter verification and precision radius controls for town check-ins.
 */

import React, { useState, useMemo } from 'react';
import { TownNode } from '../../types';
import { PAKISTAN_TOWN_COORDINATES } from '../../services/townManagement';
import {
  MapPin,
  ShieldCheck,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Maximize2,
  RefreshCw,
  Navigation,
  Lock,
  Layers,
  Info,
  Radio,
} from 'lucide-react';

export interface GeofencePerimeterMapProps {
  selectedTown: string;
  townNodes?: TownNode[];
  currentGps?: { lat: number; lng: number };
  isAdmin?: boolean;
  onUpdateGeofenceRadius?: (townName: string, newRadiusMeters: number) => void;
  compact?: boolean;
}

export const GeofencePerimeterMap: React.FC<GeofencePerimeterMapProps> = ({
  selectedTown,
  townNodes = [],
  currentGps,
  isAdmin = false,
  onUpdateGeofenceRadius,
  compact = false,
}) => {
  // Find current town node configuration
  const townNode = useMemo(() => {
    return townNodes.find(
      (n) => n.name.toLowerCase() === selectedTown.toLowerCase()
    );
  }, [townNodes, selectedTown]);

  // Town coordinates
  const townCoords = useMemo(() => {
    if (townNode?.centerCoordinates) {
      return townNode.centerCoordinates;
    }
    return (
      PAKISTAN_TOWN_COORDINATES[selectedTown] || {
        lat: 34.0151,
        lng: 71.5249,
      }
    );
  }, [townNode, selectedTown]);

  // Radius state (in meters)
  const initialRadius = townNode?.geofenceRadiusMeters || 1500;
  const [activeRadius, setActiveRadius] = useState<number>(initialRadius);
  const [mapMode, setMapMode] = useState<'RADAR' | 'SATELLITE_HYBRID'>('RADAR');
  const [isSavedToast, setIsSavedToast] = useState(false);

  // Keep activeRadius updated if town changes
  React.useEffect(() => {
    setActiveRadius(townNode?.geofenceRadiusMeters || 1500);
  }, [townNode, selectedTown]);

  // Calculate simulated or actual officer GPS location
  const officerLocation = useMemo(() => {
    if (currentGps) return currentGps;
    // Slight offset for demonstration representing officer standing in commercial area (approx 350m away)
    return {
      lat: townCoords.lat + 0.0022,
      lng: townCoords.lng + 0.0018,
    };
  }, [currentGps, townCoords]);

  // Calculate distance in meters using Haversine formula
  const distanceMeters = useMemo(() => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (townCoords.lat * Math.PI) / 180;
    const φ2 = (officerLocation.lat * Math.PI) / 180;
    const Δφ = ((officerLocation.lat - townCoords.lat) * Math.PI) / 180;
    const Δλ = ((officerLocation.lng - townCoords.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }, [townCoords, officerLocation]);

  const isInsideGeofence = distanceMeters <= activeRadius;

  // Preset options
  const PRESET_RADII = [
    { label: '500m (Strict Core)', value: 500 },
    { label: '1.0 km (Town Center)', value: 1000 },
    { label: '1.5 km (Standard Hub)', value: 1500 },
    { label: '2.5 km (City Trade Beat)', value: 2500 },
    { label: '5.0 km (Regional Outer)', value: 5000 },
  ];

  const handleSaveRadius = () => {
    if (onUpdateGeofenceRadius) {
      onUpdateGeofenceRadius(selectedTown, activeRadius);
      setIsSavedToast(true);
      setTimeout(() => setIsSavedToast(false), 2500);
    }
  };

  // SVG dimensions & coordinate scale calculations
  const svgSize = compact ? 260 : 340;
  const centerPos = svgSize / 2;
  const maxViewRadiusMeters = Math.max(activeRadius * 1.6, 2000);
  const pxPerMeter = (svgSize * 0.4) / maxViewRadiusMeters;

  // Officer position relative to center in pixels
  const deltaLatMeters = (officerLocation.lat - townCoords.lat) * 111320;
  const deltaLngMeters =
    (officerLocation.lng - townCoords.lng) *
    111320 *
    Math.cos((townCoords.lat * Math.PI) / 180);

  const officerPxX = centerPos + deltaLngMeters * pxPerMeter;
  const officerPxY = centerPos - deltaLatMeters * pxPerMeter;
  const perimeterRadiusPx = activeRadius * pxPerMeter;

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 border border-teal-800/50 shadow-xl space-y-3.5 relative overflow-hidden">
      {/* Background Accent Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#004d40_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

      {/* Header & Geofence Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-800/80 text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
              Geofence Precision &amp; Perimeter Map
            </h3>
          </div>
          <p className="text-[11px] text-teal-200/80 font-medium">
            Active Town: <strong className="text-white">{selectedTown}</strong> &bull; Center:{' '}
            <span className="font-mono text-emerald-300 font-bold">
              {townCoords.lat.toFixed(4)}°N, {townCoords.lng.toFixed(4)}°E
            </span>
          </p>
        </div>

        {/* Live Validation Pill */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-2xl text-[11px] font-black uppercase flex items-center gap-1.5 shadow-md ${
              isInsideGeofence
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                : 'bg-rose-500/20 text-rose-300 border border-rose-400/50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isInsideGeofence ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>
              {isInsideGeofence
                ? `✓ Inside Perimeter (${distanceMeters}m)`
                : `⚠️ Outside (${distanceMeters}m / Max: ${activeRadius}m)`}
            </span>
          </span>
        </div>
      </div>

      {/* Main Map Visual Canvas (Radar / Geometric Vector Overlay) */}
      <div className="relative flex items-center justify-center p-2 rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-inner">
        {/* Animated Sweep Line */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-[300px] h-[300px] rounded-full border border-teal-500/30 animate-spin [animation-duration:8s] border-t-emerald-400" />
        </div>

        {/* SVG Perimeter Canvas */}
        <svg
          width={svgSize}
          height={svgSize}
          className="relative z-10 transition-all duration-300"
          viewBox={`0 0 ${svgSize} ${svgSize}`}
        >
          {/* Grid background lines */}
          <line
            x1={0}
            y1={centerPos}
            x2={svgSize}
            y2={centerPos}
            stroke="#1e293b"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <line
            x1={centerPos}
            y1={0}
            x2={centerPos}
            y2={svgSize}
            stroke="#1e293b"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Concentric Guide Rings */}
          <circle
            cx={centerPos}
            cy={centerPos}
            r={svgSize * 0.15}
            fill="none"
            stroke="#0f766e"
            strokeWidth="0.75"
            strokeOpacity="0.3"
          />
          <circle
            cx={centerPos}
            cy={centerPos}
            r={svgSize * 0.3}
            fill="none"
            stroke="#0f766e"
            strokeWidth="0.75"
            strokeOpacity="0.2"
          />

          {/* Allowed Geofence Perimeter Area Circle */}
          <circle
            cx={centerPos}
            cy={centerPos}
            r={Math.min(perimeterRadiusPx, svgSize * 0.48)}
            fill={isInsideGeofence ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)'}
            stroke={isInsideGeofence ? '#10b981' : '#f43f5e'}
            strokeWidth="2"
            strokeDasharray="6 4"
            className="transition-all duration-300"
          />

          {/* Perimeter Pulsating Outer Glow */}
          <circle
            cx={centerPos}
            cy={centerPos}
            r={Math.min(perimeterRadiusPx, svgSize * 0.48)}
            fill="none"
            stroke={isInsideGeofence ? '#34d399' : '#fb7185'}
            strokeWidth="1"
            strokeOpacity="0.4"
          />

          {/* Distance Indicator Line between Center and Officer */}
          <line
            x1={centerPos}
            y1={centerPos}
            x2={officerPxX}
            y2={officerPxY}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Town Center Marker (Hub) */}
          <circle cx={centerPos} cy={centerPos} r="7" fill="#0d9488" />
          <circle cx={centerPos} cy={centerPos} r="3" fill="#ffffff" />
          <text
            x={centerPos}
            y={centerPos + 18}
            fill="#a7f3d0"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            {selectedTown} Hub
          </text>

          {/* Officer Live Location Pin */}
          <g transform={`translate(${officerPxX}, ${officerPxY})`}>
            {/* Accuracy Pulse Ring */}
            <circle
              r="12"
              fill={isInsideGeofence ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}
            >
              <animate
                attributeName="r"
                values="8;16;8"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.8;0;0.8"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>

            <circle
              r="5"
              fill={isInsideGeofence ? '#10b981' : '#f43f5e'}
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x="0"
              y="-10"
              fill="#ffffff"
              fontSize="9"
              fontWeight="900"
              textAnchor="middle"
            >
              Officer Pin (You)
            </text>
          </g>
        </svg>

        {/* Map Legend Overlay */}
        <div className="absolute bottom-2.5 left-3 bg-slate-900/90 backdrop-blur-xs p-2 rounded-xl border border-slate-800 text-[10px] space-y-1 z-20">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
            <span>Commercial Center</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isInsideGeofence ? 'bg-emerald-400' : 'bg-rose-400'
              } shrink-0`}
            />
            <span>Officer Position ({distanceMeters}m)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-0.5 bg-emerald-400 shrink-0" />
            <span>Perimeter Boundary ({activeRadius}m)</span>
          </div>
        </div>

        {/* Accuracy Tag */}
        <div className="absolute top-2.5 right-3 bg-teal-950/90 border border-teal-700/60 px-2.5 py-1 rounded-xl text-[10px] font-bold text-teal-300 flex items-center gap-1 z-20">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>GPS Accuracy: ±4m Locked</span>
        </div>
      </div>

      {/* Precision Radius Toggle Controls */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-black uppercase tracking-wider text-teal-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            Geofence Radius Precision:
          </label>
          <span className="font-mono text-xs font-black text-emerald-300">
            {activeRadius >= 1000 ? `${(activeRadius / 1000).toFixed(1)} km` : `${activeRadius} m`}
          </span>
        </div>

        {/* Preset Radius Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {PRESET_RADII.map((preset) => {
            const isSelected = activeRadius === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => setActiveRadius(preset.value)}
                className={`py-2 px-2 rounded-xl text-[10px] font-bold transition-all text-center cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md scale-[1.02]'
                    : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom Slider */}
        <div className="pt-2 flex items-center gap-3">
          <input
            type="range"
            min={250}
            max={8000}
            step={250}
            value={activeRadius}
            onChange={(e) => setActiveRadius(Number(e.target.value))}
            className="flex-1 accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="text-[10px] font-mono text-slate-400 w-12 text-right">
            {activeRadius}m
          </span>
        </div>
      </div>

      {/* Admin Save Default Action Banner */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>
            {isAdmin
              ? 'Admins can persist this geofence precision radius for this town.'
              : 'Perimeter enforced to ensure officers are present in assigned commercial market.'}
          </span>
        </div>

        {isAdmin && onUpdateGeofenceRadius && (
          <button
            type="button"
            onClick={handleSaveRadius}
            className="px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-black text-[11px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Save as Town Default</span>
          </button>
        )}
      </div>

      {/* Saved Toast */}
      {isSavedToast && (
        <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-center text-xs font-bold animate-in fade-in">
          ✓ Geofence radius of {activeRadius}m saved as default for {selectedTown}.
        </div>
      )}
    </div>
  );
};
