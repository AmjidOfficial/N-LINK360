import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Flame,
  Layers,
  MapPin,
  Store,
  ShoppingBag,
  Coins,
  TrendingUp,
  Maximize2,
  Minimize2,
  ChevronRight,
  Info,
  Building2,
} from 'lucide-react';
import { Customer, SalesOrder } from '../types';

export interface DealerHeatmapProps {
  customers: Customer[];
  salesOrders: SalesOrder[];
  onSelectCustomer?: (customer: Customer) => void;
  onFilterTown?: (town: string) => void;
}

// Known coordinates for key commercial distribution towns & market hubs
const TOWN_COORDINATES: Record<string, [number, number]> = {
  'Badami Bagh': [31.5932, 74.3211],
  'Shah Alam': [31.5815, 74.3168],
  'Brandreth Road': [31.5742, 74.3235],
  'Circular Road': [31.5847, 74.3142],
  'Kot Lakhpat': [31.4582, 74.3325],
  'Hall Road': [31.5621, 74.3204],
  'Ferozepur Road': [31.4826, 74.3298],
  'Gulberg': [31.5168, 74.3512],
  'Multan Road': [31.4921, 74.2589],
  'Model Town': [31.4912, 74.3245],
  'Ravi Road': [31.5975, 74.3082],
  'Mughalpura': [31.5724, 74.3721],
  'Township': [31.4485, 74.2982],
  'DHA': [31.4721, 74.3982],
  'Baghbanpura': [31.5821, 74.3852],
  'Gujranwala': [32.1877, 74.1945],
  'Faisalabad': [31.4504, 73.1350],
  'Multan': [30.1575, 71.5249],
  'Sialkot': [32.4945, 74.5229],
  'Rawalpindi': [33.5651, 73.0169],
  'Islamabad': [33.6844, 73.0479],
};

// Deterministic fallback coordinates for unmapped towns
function getDeterministicTownCoords(townName: string): [number, number] {
  if (TOWN_COORDINATES[townName]) {
    return TOWN_COORDINATES[townName];
  }

  // Generate a realistic offset around central Lahore industrial belt
  let hash = 0;
  for (let i = 0; i < townName.length; i++) {
    hash = (hash << 5) - hash + townName.charCodeAt(i);
    hash |= 0;
  }
  const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
  const distanceKm = 1.5 + ((Math.abs(hash >> 3) % 150) / 10); // 1.5 to 16.5 km
  const centerLat = 31.5497;
  const centerLng = 74.3436;
  const deltaLat = (distanceKm / 111) * Math.cos(angle);
  const deltaLng = (distanceKm / (111 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);

  return [centerLat + deltaLat, centerLng + deltaLng];
}

export type HeatMetric = 'CONCENTRATION' | 'ORDER_DENSITY' | 'VALUE';

export interface TownHeatStats {
  town: string;
  coords: [number, number];
  dealerCount: number;
  dealers: Customer[];
  orderCount: number;
  totalOrderValue: number;
  avgOrderValue: number;
  heatScore: number; // 0 to 1 normalized based on selected metric
}

export const DealerHeatmap: React.FC<DealerHeatmapProps> = ({
  customers,
  salesOrders,
  onSelectCustomer,
  onFilterTown,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeMetric, setActiveMetric] = useState<HeatMetric>('ORDER_DENSITY');
  const [selectedTown, setSelectedTown] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Group customers and orders by town
  const townStats = useMemo<TownHeatStats[]>(() => {
    const map = new Map<string, { dealers: Customer[]; orders: SalesOrder[] }>();

    customers.forEach((c) => {
      const town = (c.town || 'Central Hub').trim();
      if (!map.has(town)) {
        map.set(town, { dealers: [], orders: [] });
      }
      map.get(town)!.dealers.push(c);
    });

    const customerTownMap = new Map<string, string>();
    customers.forEach((c) => customerTownMap.set(c.id, (c.town || 'Central Hub').trim()));

    salesOrders.forEach((o) => {
      const town = customerTownMap.get(o.customerId) || 'Central Hub';
      if (!map.has(town)) {
        map.set(town, { dealers: [], orders: [] });
      }
      map.get(town)!.orders.push(o);
    });

    const list: TownHeatStats[] = [];
    map.forEach((data, town) => {
      const dealerCount = data.dealers.length;
      const orderCount = data.orders.length;
      const totalOrderValue = data.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const avgOrderValue = orderCount > 0 ? Math.round(totalOrderValue / orderCount) : 0;
      const coords = getDeterministicTownCoords(town);

      list.push({
        town,
        coords,
        dealerCount,
        dealers: data.dealers,
        orderCount,
        totalOrderValue,
        avgOrderValue,
        heatScore: 0,
      });
    });

    // Compute normalized heatScore based on activeMetric
    let maxVal = 1;
    if (activeMetric === 'CONCENTRATION') {
      maxVal = Math.max(1, ...list.map((t) => t.dealerCount));
    } else if (activeMetric === 'ORDER_DENSITY') {
      maxVal = Math.max(1, ...list.map((t) => t.orderCount));
    } else {
      maxVal = Math.max(1, ...list.map((t) => t.totalOrderValue));
    }

    list.forEach((t) => {
      const raw =
        activeMetric === 'CONCENTRATION'
          ? t.dealerCount
          : activeMetric === 'ORDER_DENSITY'
          ? t.orderCount
          : t.totalOrderValue;
      t.heatScore = Math.max(0.1, Math.min(1, raw / maxVal));
    });

    // Sort by metric descending
    return list.sort((a, b) => b.heatScore - a.heatScore);
  }, [customers, salesOrders, activeMetric]);

  // Totals
  const totals = useMemo(() => {
    const totalDealers = customers.length;
    const totalOrders = salesOrders.length;
    const totalRevenue = salesOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const activeTownsCount = townStats.length;
    return { totalDealers, totalOrders, totalRevenue, activeTownsCount };
  }, [customers, salesOrders, townStats]);

  // Leaflet initialization & heat layer rendering
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const centerCoords = townStats[0]?.coords || [31.5497, 74.3436];
      const map = L.map(mapContainerRef.current, {
        center: centerCoords,
        zoom: 12,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      heatLayerRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const heatLayer = heatLayerRef.current;
    if (!map || !heatLayer) return;

    heatLayer.clearLayers();

    // Render multi-ring heat gradient overlays for each town
    townStats.forEach((t) => {
      const [lat, lng] = t.coords;
      const score = t.heatScore;

      // Color scheme based on intensity score
      let coreColor = '#0d9488'; // Teal (Low)
      let midColor = '#06b6d4';
      let haloColor = 'rgba(13, 148, 136, 0.15)';

      if (score >= 0.75) {
        coreColor = '#e11d48'; // Crimson / Rose (Extreme Heat)
        midColor = '#f43f5e';
        haloColor = 'rgba(225, 29, 72, 0.18)';
      } else if (score >= 0.45) {
        coreColor = '#ea580c'; // Amber / Orange (High Heat)
        midColor = '#f59e0b';
        haloColor = 'rgba(234, 88, 12, 0.18)';
      } else if (score >= 0.2) {
        coreColor = '#10b981'; // Emerald (Moderate Heat)
        midColor = '#34d399';
        haloColor = 'rgba(16, 185, 129, 0.18)';
      }

      // Radius scales with score: 600m to 2400m
      const outerRadius = 600 + score * 1800;
      const midRadius = outerRadius * 0.6;
      const coreRadius = outerRadius * 0.28;

      // 1. Radiant Outer Halo (Heat Blur aura)
      L.circle([lat, lng], {
        radius: outerRadius,
        color: 'transparent',
        fillColor: midColor,
        fillOpacity: 0.12 + score * 0.12,
        interactive: false,
      }).addTo(heatLayer);

      // 2. Mid Heat Ring
      L.circle([lat, lng], {
        radius: midRadius,
        color: 'transparent',
        fillColor: coreColor,
        fillOpacity: 0.22 + score * 0.18,
        interactive: false,
      }).addTo(heatLayer);

      // 3. Core Hotspot Circle
      const coreCircle = L.circle([lat, lng], {
        radius: coreRadius,
        color: coreColor,
        weight: 1.5,
        fillColor: coreColor,
        fillOpacity: 0.45 + score * 0.35,
      }).addTo(heatLayer);

      // 4. Interactive Town Center Marker Pin with Metric Label
      const metricLabel =
        activeMetric === 'CONCENTRATION'
          ? `${t.dealerCount} Dealers`
          : activeMetric === 'ORDER_DENSITY'
          ? `${t.orderCount} Orders`
          : `Rs. ${(t.totalOrderValue / 1000).toFixed(0)}k`;

      const markerHtml = `
        <div style="
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        ">
          <div style="
            background: ${coreColor};
            color: white;
            padding: 3px 7px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            border: 1.5px solid white;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${t.town}</span>
            <span style="background: rgba(255,255,255,0.25); padding: 1px 4px; border-radius: 4px; font-family: monospace;">${metricLabel}</span>
          </div>
          <div style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: white;
            border: 2px solid ${coreColor};
            margin-top: -2px;
          "></div>
        </div>
      `;

      const townPinIcon = L.divIcon({
        className: 'custom-town-heat-pin',
        html: markerHtml,
        iconSize: [0, 0],
      });

      const marker = L.marker([lat, lng], { icon: townPinIcon }).addTo(heatLayer);

      // Interactive Popup with breakdown & top dealers in this town
      const topDealersHtml = t.dealers
        .slice(0, 3)
        .map(
          (d) =>
            `<div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="font-weight: 700; color: #1e293b;">${d.name}</span>
              <span style="color: #64748b; font-size: 10px;">${d.code || ''}</span>
            </div>`
        )
        .join('');

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 200px; padding: 4px 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
            <div style="font-weight: 900; font-size: 13px; color: #0f172a;">${t.town}</div>
            <span style="background: ${haloColor}; color: ${coreColor}; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 9999px; text-transform: uppercase;">
              ${score >= 0.75 ? 'Peak Heat' : score >= 0.45 ? 'High Density' : 'Active Hub'}
            </span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; font-size: 11px;">
            <div style="background: #f8fafc; padding: 5px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 9px; display: block; font-weight: 700; text-transform: uppercase;">Dealers</span>
              <strong style="color: #0f172a; font-size: 13px;">${t.dealerCount}</strong>
            </div>
            <div style="background: #f8fafc; padding: 5px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 9px; display: block; font-weight: 700; text-transform: uppercase;">Orders</span>
              <strong style="color: #0f172a; font-size: 13px;">${t.orderCount}</strong>
            </div>
            <div style="grid-column: span 2; background: #f0fdfa; padding: 6px; border-radius: 6px; border: 1px solid #ccfbf1;">
              <span style="color: #0f766e; font-size: 9px; display: block; font-weight: 700; text-transform: uppercase;">Gross Booked Value</span>
              <strong style="color: #042f2e; font-size: 13px; font-family: monospace;">Rs. ${t.totalOrderValue.toLocaleString()}</strong>
            </div>
          </div>
          ${
            t.dealers.length > 0
              ? `<div style="margin-top: 6px;">
                  <div style="font-size: 10px; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">Dealers in ${t.town}:</div>
                  ${topDealersHtml}
                </div>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupContent);
      coreCircle.bindPopup(popupContent);

      marker.on('click', () => setSelectedTown(t.town));
      coreCircle.on('click', () => setSelectedTown(t.town));
    });

    // Invalidate size in case container rendered while hidden
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [townStats, activeMetric]);

  // Focus map on specific town
  const handleFocusTown = (town: TownHeatStats) => {
    setSelectedTown(town.town);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(town.coords, 14, { duration: 1.2 });
    }
  };

  return (
    <div
      id="dealer-heatmap-card"
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${
        isExpanded ? 'fixed inset-3 z-50 flex flex-col shadow-2xl' : 'space-y-4 p-5'
      }`}
    >
      {/* Header with Title & Metrics Selector */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isExpanded ? 'p-4 border-b border-slate-200 bg-white' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Dealer &amp; Order Heatmap
              </h2>
              <span className="text-[10px] font-extrabold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                Live Overlay
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Geographic distribution across {totals.activeTownsCount} towns &amp; trade clusters
            </p>
          </div>
        </div>

        {/* Heat Metric Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-extrabold text-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => setActiveMetric('ORDER_DENSITY')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMetric === 'ORDER_DENSITY'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Order Density</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('CONCENTRATION')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMetric === 'CONCENTRATION'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Concentration</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('VALUE')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMetric === 'VALUE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Value</span>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg ml-1 transition-colors cursor-pointer"
            title={isExpanded ? 'Exit Fullscreen' : 'Expand Map'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 ${isExpanded ? 'px-4 py-2 bg-slate-50 border-b border-slate-200' : ''}`}>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Active Towns</span>
          <span className="font-mono font-black text-slate-900 text-base">{totals.activeTownsCount}</span>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Total Dealers</span>
          <span className="font-mono font-black text-slate-900 text-base">{totals.totalDealers}</span>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Booked Orders</span>
          <span className="font-mono font-black text-rose-600 text-base">{totals.totalOrders}</span>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Gross Value</span>
          <span className="font-mono font-black text-emerald-700 text-base">Rs. {(totals.totalRevenue / 1000).toFixed(0)}k</span>
        </div>
      </div>

      {/* Map Display Container */}
      <div className={`relative rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 ${isExpanded ? 'flex-1 m-4' : 'h-[320px] sm:h-[380px]'}`}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Heat Spectrum Legend */}
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-md flex flex-col gap-1.5 text-[10px]">
          <span className="font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-500" />
            Heat Intensity
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-2xs" />
            <span className="font-bold text-slate-700">Peak (Top 25%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
            <span className="font-bold text-slate-700">Moderate Hub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shadow-2xs" />
            <span className="font-bold text-slate-700">Emerging</span>
          </div>
        </div>

        {/* Town Quick-Switcher Filter Button */}
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-bold text-slate-700 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-teal-600" />
          <span>{townStats.length} Trade Hubs</span>
        </div>
      </div>

      {/* Top Towns Density Cards */}
      <div className={`space-y-2 ${isExpanded ? 'p-4 bg-slate-50 border-t border-slate-200 max-h-48 overflow-y-auto' : ''}`}>
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
            High-Velocity Towns Ranking
          </span>
          <span className="text-slate-400 font-medium text-[10px]">Click a town to focus</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {townStats.slice(0, 6).map((t, idx) => (
            <button
              key={t.town}
              type="button"
              onClick={() => handleFocusTown(t)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                selectedTown === t.town
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    idx === 0
                      ? 'bg-rose-600 text-white'
                      : idx === 1
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-xs truncate">{t.town}</div>
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2">
                    <span>{t.dealerCount} dealers</span>
                    <span>•</span>
                    <span className="font-mono text-rose-600 font-bold">{t.orderCount} orders</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono font-black text-xs text-slate-900 block">
                  Rs. {(t.totalOrderValue / 1000).toFixed(0)}k
                </span>
                {onFilterTown && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilterTown(t.town);
                    }}
                    className="text-[9px] font-bold text-teal-700 hover:underline flex items-center gap-0.5 justify-end"
                  >
                    <span>View</span>
                    <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
