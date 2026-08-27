import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Eye, User, Clock, Route } from 'lucide-react';

interface Visit {
  id: string;
  customerId: string;
  customerName: string;
  salesUserId: string;
  salesUserName: string;
  checkinTime: string;
  latitude: number;
  longitude: number;
  notes: string;
  photoUrl?: string;
  orderPlaced: boolean;
  recoveryCollected: boolean;
}

interface VisitsMapViewProps {
  visits: Visit[];
}

export const VisitsMapView: React.FC<VisitsMapViewProps> = ({ visits }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isLeafletReady, setIsLeafletReady] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  // Dynamic Leaflet asset injection to bypass dependency bundle constraints
  useEffect(() => {
    if ((window as any).L) {
      setIsLeafletReady(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    cssLink.crossOrigin = 'anonymous';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      setIsLeafletReady(true);
    };
    script.onerror = () => {
      setMapError('Failed to load standard mapping SDK from Leaflet CDN.');
    };
    document.head.appendChild(script);

    return () => {
      // Keep style & script in head to prevent flickering on tab switch
    };
  }, []);

  // Initialize and update the map layer
  useEffect(() => {
    const safeVisits = visits || [];
    if (!isLeafletReady || !mapContainerRef.current || safeVisits.length === 0) return;

    const L = (window as any).L;
    if (!L) return;

    // Filter valid coordinates
    const validVisits = safeVisits.filter(v => typeof v.latitude === 'number' && typeof v.longitude === 'number' && v.latitude !== 0 && v.longitude !== 0);
    if (validVisits.length === 0) {
      setMapError('No valid GPS coordinate points found for the logged visits.');
      return;
    }

    // 1. Initialize Map Instance if not created
    if (!mapInstanceRef.current) {
      try {
        const initialCenter = [validVisits[0].latitude, validVisits[0].longitude];
        const map = L.map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 12,
          scrollWheelZoom: false,
          zoomControl: true,
        });

        // Use custom premium elegant light basemap tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);

        mapInstanceRef.current = map;
        markersGroupRef.current = L.featureGroup().addTo(map);
      } catch (err) {
        console.error('Error initializing Leaflet map:', err);
        setMapError('Could not initialize maps engine context.');
        return;
      }
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;

    // Clear old layers
    markersGroup.clearLayers();
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
    }

    // 2. Plot Markers with customized popups
    const sortedVisits = [...validVisits].sort((a, b) => new Date(a.checkinTime).getTime() - new Date(b.checkinTime).getTime());
    const latLngs: [number, number][] = [];

    sortedVisits.forEach((vis, idx) => {
      const latlng: [number, number] = [vis.latitude, vis.longitude];
      latLngs.push(latlng);

      // Create a beautiful circular index icon
      const customIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-7 h-7 bg-secondary rounded-full animate-ping opacity-25"></div>
            <div class="w-6 h-6 bg-surface-card border-2 border-amber-400 text-[10px] text-deep-teal font-bold font-mono rounded-full flex items-center justify-center shadow-lg">
              ${idx + 1}
            </div>
          </div>
        `,
        className: 'custom-map-marker-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const popupContent = `
        <div class="p-2 font-sans space-y-1 w-52 text-slate-800">
          <div class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Stop #${idx + 1} &bull; Store Visit</div>
          <h4 class="font-bold text-deep-green text-xs border-b pb-1">${vis.customerName}</h4>
          <div class="text-[10px] text-slate-500 flex items-center gap-1">
            <span>By: <strong>${vis.salesUserName}</strong></span>
          </div>
          <div class="text-[10px] text-slate-500">Time: ${new Date(vis.checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div class="text-[10px] italic bg-bg-secondary p-1 border rounded text-slate-600 mt-1">"${vis.notes || 'Routine check-in'}"</div>
          ${vis.photoUrl ? `
            <div class="mt-1.5 h-16 rounded overflow-hidden border">
              <img src="${vis.photoUrl}" class="w-full h-full object-cover" />
            </div>
          ` : ''}
        </div>
      `;

      const marker = L.marker(latlng, { icon: customIcon })
        .bindPopup(popupContent)
        .addTo(markersGroup);

      marker.on('click', () => {
        setSelectedVisitId(vis.id);
      });
    });

    // 3. Draw dashed route connections
    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: '#f59e0b', // Amber-500
        weight: 3,
        opacity: 0.75,
        dashArray: '6, 6',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      routeLineRef.current = polyline;
    }

    // 4. Center map to fit all bounds
    try {
      const bounds = markersGroup.getBounds();
      map.fitBounds(bounds, { padding: [40, 40] });
    } catch (e) {
      // Fallback
    }

  }, [isLeafletReady, visits]);

  const selectAndFocusVisit = (vis: Visit, idx: number) => {
    setSelectedVisitId(vis.id);
    if (!mapInstanceRef.current) return;

    const L = (window as any).L;
    if (L) {
      mapInstanceRef.current.setView([vis.latitude, vis.longitude], 15);
      
      // Find matching marker and open its popup
      markersGroupRef.current.eachLayer((layer: any) => {
        const latlng = layer.getLatLng();
        if (latlng && latlng.lat === vis.latitude && latlng.lng === vis.longitude) {
          layer.openPopup();
        }
      });
    }
  };

  const sortedVisits = [...(visits || [])].filter(v => typeof v.latitude === 'number' && typeof v.longitude === 'number' && v.latitude !== 0 && v.longitude !== 0)
    .sort((a, b) => new Date(a.checkinTime).getTime() - new Date(b.checkinTime).getTime());

  return (
    <div className="bg-bg-secondary rounded-xl border border-slate-200 overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-3">
      
      {/* MAP CANVAS */}
      <div className="lg:col-span-2 relative h-80 lg:h-[400px] bg-slate-100 flex flex-col justify-end">
        {mapError && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center p-6 bg-surface-card/10 backdrop-blur-xs text-center">
            <div className="bg-white p-4 rounded-xl border shadow-md space-y-2 max-w-sm">
              <MapPin className="w-6 h-6 mx-auto text-rose-500" />
              <p className="text-xs font-bold text-slate-800">{mapError}</p>
              <button 
                onClick={() => setMapError(null)} 
                className="px-3 py-1 bg-primary text-deep-green hover:bg-primary/90 rounded text-[10px] font-bold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '100%' }} />

        <div className="absolute bottom-3 left-3 z-[1000] bg-surface-card/90 text-deep-teal font-mono text-[10px] font-bold px-2 py-1 rounded-md shadow-lg border border-slate-800/80">
          <span>OSM Voyager Interactive Map Layer</span>
        </div>
      </div>

      {/* CHRONOLOGICAL VISIT ROUTE STOP PANEL */}
      <div className="bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-4 flex flex-col justify-between h-[400px]">
        <div className="space-y-3 overflow-hidden flex flex-col h-full">
          <div className="border-b pb-2 shrink-0">
            <h4 className="font-bold text-text-primary text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <Route className="w-4 h-4 text-deep-teal" />
              Route Stop Tracker
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Chronological tracking list of verified storefront check-ins.</p>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {sortedVisits.map((vis, idx) => {
              const isSelected = selectedVisitId === vis.id;
              return (
                <button
                  key={vis.id}
                  type="button"
                  onClick={() => selectAndFocusVisit(vis, idx)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-start gap-2 ${
                    isSelected 
                      ? 'bg-surface-card border-slate-950 text-white shadow-md' 
                      : 'bg-bg-secondary hover:bg-slate-100 border-slate-200/60 text-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full text-[10px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'bg-secondary/80 text-deep-green' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <strong className={`truncate block text-xs ${isSelected ? 'text-white' : 'text-text-primary'}`}>{vis.customerName}</strong>
                      <span className={`text-[9px] font-mono shrink-0 font-medium ${isSelected ? 'text-deep-teal' : 'text-slate-500'}`}>
                        {new Date(vis.checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-[10px] truncate flex items-center gap-1 mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      <User className="w-3 h-3 text-slate-400" /> By: {vis.salesUserName}
                    </p>
                    <div className={`mt-1.5 flex items-center gap-2 text-[9px] font-mono ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                      <span className="flex items-center gap-0.5">
                        Order: {vis.orderPlaced ? '✅' : '❌'}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-0.5">
                        Recov: {vis.recoveryCollected ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t shrink-0 flex items-center justify-between text-[10px] text-slate-400 font-sans font-medium">
          <span className="flex items-center gap-1">
            <Navigation className="w-3 h-3 text-deep-teal animate-pulse" />
            GPS Route Enabled
          </span>
          <span>{sortedVisits.length} Stores Visited</span>
        </div>
      </div>

    </div>
  );
};
