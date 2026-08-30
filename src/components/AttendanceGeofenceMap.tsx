import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import * as d3 from 'd3';
import { Target, Navigation, ShieldCheck, ShieldAlert, LocateFixed } from 'lucide-react';

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

    // Clear previous markers
    layerGroup.clearLayers();

    const townCenterLatLng: [number, number] = [townCenter.lat, townCenter.lng];
    const userLatLng: [number, number] = [userLat, userLng];

    // 1. Leaflet Base Town Center Marker
    const townIcon = L.divIcon({
      className: 'custom-town-marker',
      html: `
        <div style="
          width: 34px;
          height: 34px;
          background: #0f766e;
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 15px;
        ">
          🏛️
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const townMarker = L.marker(townCenterLatLng, { icon: townIcon });
    townMarker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; font-size: 11px; color: #1e293b; padding: 2px;">
        <strong style="color: #0f766e; font-size: 12px;">Beat Town Center: ${attendanceTown}</strong><br/>
        GPS: ${townCenter.lat.toFixed(4)}° N, ${townCenter.lng.toFixed(4)}° E<br/>
        Geofence Radius: <strong>${maxRadiusKM} KM</strong>
      </div>
    `);
    townMarker.addTo(layerGroup);

    // =========================================================================
    // D3 INTERACTIVE OVERLAY SYSTEM FOR #map-container GEOFENCE PERIMETER & GPS
    // =========================================================================
    const overlayPane = map.getPanes().overlayPane;
    let svgSelection = d3.select(overlayPane).select<SVGSVGElement>('svg.d3-geofence-overlay');

    if (svgSelection.empty()) {
      svgSelection = d3.select(overlayPane)
        .append('svg')
        .attr('class', 'd3-geofence-overlay leaflet-zoom-hide')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('z-index', '500');
    }

    const updateD3Overlay = () => {
      const bounds = map.getBounds();
      const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
      const bottomRight = map.latLngToLayerPoint(bounds.getSouthEast());

      const svgWidth = Math.max(bottomRight.x - topLeft.x, 300);
      const svgHeight = Math.max(bottomRight.y - topLeft.y, 300);

      svgSelection
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .style('left', `${topLeft.x}px`)
        .style('top', `${topLeft.y}px`);

      let g = svgSelection.select<SVGGElement>('g.d3-main-group');
      if (g.empty()) {
        g = svgSelection.append('g').attr('class', 'd3-main-group');
      }
      g.attr('transform', `translate(${-topLeft.x}, ${-topLeft.y})`);

      // 1. Generate 64-vertex circular polygon for defined town geofence perimeter
      const numVertices = 64;
      const polygonPoints: [number, number][] = [];
      const latRad = (townCenter.lat * Math.PI) / 180;

      for (let i = 0; i < numVertices; i++) {
        const angle = (i / numVertices) * 2 * Math.PI;
        const deltaLat = (maxRadiusKM / 111.32) * Math.cos(angle);
        const deltaLng = (maxRadiusKM / (111.32 * Math.cos(latRad))) * Math.sin(angle);
        const vertexPt = map.latLngToLayerPoint([townCenter.lat + deltaLat, townCenter.lng + deltaLng]);
        polygonPoints.push([vertexPt.x, vertexPt.y]);
      }

      const lineGenerator = d3.line<[number, number]>()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveLinearClosed);

      const d3PolygonPath = lineGenerator(polygonPoints) || '';

      // Render or Update D3 Geofence Circular Polygon
      const fenceColor = isWithinGeofence ? '#10b981' : '#f43f5e';
      
      let fencePath = g.select<SVGPathElement>('path.d3-geofence-polygon');
      if (fencePath.empty()) {
        fencePath = g.append('path').attr('class', 'd3-geofence-polygon');
      }

      fencePath
        .attr('d', d3PolygonPath)
        .attr('fill', fenceColor)
        .attr('fill-opacity', 0.14)
        .attr('stroke', fenceColor)
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '7, 4')
        .style('pointer-events', 'auto')
        .style('cursor', 'pointer');

      // 2. Dynamic Color-Changing D3 GPS Marker for User Position
      const userPt = map.latLngToLayerPoint(userLatLng);
      const townPt = map.latLngToLayerPoint(townCenterLatLng);

      let userGroup = g.select<SVGGElement>('g.d3-user-gps-marker');
      if (userGroup.empty()) {
        userGroup = g.append('g').attr('class', 'd3-user-gps-marker');
        userGroup.append('circle').attr('class', 'd3-pulse-outer');
        userGroup.append('circle').attr('class', 'd3-user-core');
        userGroup.append('circle').attr('class', 'd3-user-inner-dot');
      }

      userGroup.attr('transform', `translate(${userPt.x}, ${userPt.y})`);

      userGroup.select('circle.d3-pulse-outer')
        .attr('r', 20)
        .attr('fill', fenceColor)
        .attr('fill-opacity', 0.25)
        .attr('stroke', fenceColor)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.6);

      userGroup.select('circle.d3-user-core')
        .attr('r', 11)
        .attr('fill', fenceColor)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2.5)
        .style('filter', 'drop-shadow(0px 3px 6px rgba(0,0,0,0.3))');

      userGroup.select('circle.d3-user-inner-dot')
        .attr('r', 3.5)
        .attr('fill', '#ffffff');

      // 3. Proximity Connector Line & Distance Badge
      let connectorLine = g.select<SVGLineElement>('line.d3-connector-line');
      if (connectorLine.empty()) {
        connectorLine = g.append('line').attr('class', 'd3-connector-line');
      }

      connectorLine
        .attr('x1', userPt.x)
        .attr('y1', userPt.y)
        .attr('x2', townPt.x)
        .attr('y2', townPt.y)
        .attr('stroke', isWithinGeofence ? '#0d9488' : '#e11d48')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5, 5');

      // Midpoint Distance Label Badge
      const midX = (userPt.x + townPt.x) / 2;
      const midY = (userPt.y + townPt.y) / 2;

      let badgeGroup = g.select<SVGGElement>('g.d3-distance-badge');
      if (badgeGroup.empty()) {
        badgeGroup = g.append('g').attr('class', 'd3-distance-badge');
        badgeGroup.append('rect').attr('rx', 6).attr('ry', 6);
        badgeGroup.append('text');
      }

      badgeGroup.attr('transform', `translate(${midX}, ${midY})`);

      const labelText = `${distanceToCenter.toFixed(2)} km`;
      badgeGroup.select('text')
        .text(labelText)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
        .attr('font-family', 'sans-serif');

      badgeGroup.select('rect')
        .attr('x', -24)
        .attr('y', -10)
        .attr('width', 48)
        .attr('height', 20)
        .attr('fill', isWithinGeofence ? '#0f766e' : '#be123c')
        .attr('rx', 5)
        .attr('ry', 5)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');
    };

    updateD3Overlay();

    map.on('zoomend moveend viewreset', updateD3Overlay);

    // Auto fit bounds
    const bounds = L.latLngBounds([userLatLng, townCenterLatLng]);
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });

    setTimeout(() => {
      map.invalidateSize();
      updateD3Overlay();
    }, 250);

    return () => {
      map.off('zoomend moveend viewreset', updateD3Overlay);
    };

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
              D3 Geofence Interactive Overlay
            </span>
            <span className={`block text-[11px] font-extrabold ${isWithinGeofence ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isWithinGeofence ? '✓ Inside Town Perimeter' : '✗ Outside Boundary'}
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
            Geofence Polygon: <strong className="text-slate-800">{maxRadiusKM} km</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
