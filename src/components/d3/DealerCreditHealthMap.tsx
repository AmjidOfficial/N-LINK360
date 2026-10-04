/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - D3 Geospatial Dealer Credit Health & Risk Intelligence Map
 * Interactive D3.js visualization mapping dealer credit risk levels across Pakistan.
 * Pins are color-coded by credit health (Low Risk: Green, Moderate: Amber, High: Red).
 * Clicking any pin navigates directly to that dealer's official dossier.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Customer, Invoice, Recovery } from '../../types';
import { getCustomerCoordinates } from '../../utils/geoUtils';
import { calculateCustomerCreditHealth, CustomerCreditHealth } from '../../lib/business-rules';
import {
  PAKISTAN_PROVINCES_GEOJSON,
  PAKISTAN_CORRIDORS_GEOJSON,
  PAKISTAN_MAJOR_HUBS,
} from '../../data/pakistan-map-geojson';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Store,
  ChevronRight,
  TrendingUp,
  MapPin,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';

export interface DealerWithRisk {
  customer: Customer;
  coords: { lat: number; lng: number; label?: string };
  creditHealth: CustomerCreditHealth;
  riskTier: 'LOW' | 'MODERATE' | 'HIGH';
  riskColor: string;
  riskLabel: string;
  utilizationPercentage: number;
  balance: number;
  limit: number;
}

export interface DealerCreditHealthMapProps {
  customers: Customer[];
  invoices?: Invoice[];
  recoveries?: Recovery[];
  onSelectDealer: (dealer: Customer) => void;
  selectedDealerId?: string | null;
  className?: string;
  height?: number | string;
}

export const DealerCreditHealthMap: React.FC<DealerCreditHealthMapProps> = ({
  customers = [],
  invoices = [],
  recoveries = [],
  onSelectDealer,
  selectedDealerId,
  className = '',
  height = 540,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(880);

  // Resize observer to ensure dynamic responsiveness of D3 projection
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth || 880);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter & UI States
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'LOW' | 'MODERATE' | 'HIGH'>('ALL');
  const [selectedTerritory, setSelectedTerritory] = useState<string>('ALL');
  const [hoveredDealer, setHoveredDealer] = useState<DealerWithRisk | null>(null);
  const [showHighways, setShowHighways] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Zoom behavior reference for programmatic buttons
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // 1. Process all dealers with their geo-coordinates and credit health assessment
  const processedDealers: DealerWithRisk[] = useMemo(() => {
    return customers.map((c) => {
      const coords = getCustomerCoordinates(c);
      const custInvoices = (invoices || []).filter(
        (inv) => inv.customerId === c.id || inv.customerCode === c.customerCode
      );
      const custRecoveries = (recoveries || []).filter(
        (rec) => rec.customerId === c.id || rec.customerCode === c.customerCode
      );

      const health = calculateCustomerCreditHealth(c, custInvoices, custRecoveries);
      const limit = Number(c.creditLimit) || 500000;
      const balance = Number(c.currentBalance ?? c.openingBalance ?? 0);
      const utilization = limit > 0 ? (balance / limit) * 100 : 0;

      // Classify Risk Tier
      let riskTier: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
      let riskColor = '#10b981'; // Emerald Green
      let riskLabel = 'Low Risk (Healthy)';

      if (balance > limit || utilization > 100 || health.averagePaymentDelayDays > 25) {
        riskTier = 'HIGH';
        riskColor = '#ef4444'; // Red
        riskLabel = 'High Risk (Over Limit / Delinquent)';
      } else if (utilization >= 75 || health.averagePaymentDelayDays > 7) {
        riskTier = 'MODERATE';
        riskColor = '#f59e0b'; // Amber Gold
        riskLabel = 'Moderate Risk (Watchlist)';
      } else {
        riskTier = 'LOW';
        riskColor = '#10b981'; // Green
        riskLabel = 'Low Risk (Prompt Pay)';
      }

      return {
        customer: c,
        coords,
        creditHealth: health,
        riskTier,
        riskColor,
        riskLabel,
        utilizationPercentage: Math.round(utilization),
        balance,
        limit,
      };
    });
  }, [customers, invoices, recoveries]);

  // Filtered dealers by selected risk tab & territory
  const filteredDealers = useMemo(() => {
    return processedDealers.filter((d) => {
      const matchRisk = riskFilter === 'ALL' || d.riskTier === riskFilter;
      const town = (d.customer.town || d.customer.city || '').toLowerCase();
      const matchTerritory =
        selectedTerritory === 'ALL' ||
        (selectedTerritory === 'KPK' && (town.includes('swat') || town.includes('mingora') || town.includes('peshawar') || town.includes('abbottabad') || town.includes('mardan') || town.includes('duran'))) ||
        (selectedTerritory === 'PUNJAB' && (town.includes('lahore') || town.includes('rawalpindi') || town.includes('faisalabad') || town.includes('multan'))) ||
        (selectedTerritory === 'MINGORA' && (town.includes('swat') || town.includes('mingora'))) ||
        (selectedTerritory === 'PESHAWAR' && (town.includes('peshawar') || town.includes('duran')));

      return matchRisk && matchTerritory;
    });
  }, [processedDealers, riskFilter, selectedTerritory]);

  // Exposure & Health aggregates
  const portfolioStats = useMemo(() => {
    const totalExposure = processedDealers.reduce((sum, d) => sum + d.balance, 0);
    const totalLimit = processedDealers.reduce((sum, d) => sum + d.limit, 0);
    const lowCount = processedDealers.filter((d) => d.riskTier === 'LOW').length;
    const modCount = processedDealers.filter((d) => d.riskTier === 'MODERATE').length;
    const highCount = processedDealers.filter((d) => d.riskTier === 'HIGH').length;
    const avgScore =
      processedDealers.length > 0
        ? Math.round(processedDealers.reduce((sum, d) => sum + d.creditHealth.score, 0) / processedDealers.length)
        : 100;

    return { totalExposure, totalLimit, lowCount, modCount, highCount, avgScore };
  }, [processedDealers]);

  // 2. Initialize and render the D3 Geospatial Visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerWidth || containerRef.current.clientWidth || 880;
    const mapHeight = typeof height === 'number' ? height : 540;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('viewBox', `0 0 ${width} ${mapHeight}`)
      .attr('width', '100%')
      .attr('height', mapHeight);

    // Setup GeoMercator projection centered tightly on Pakistan
    // Coordinates bounds: lng 60.5 -> 77.5, lat 23.5 -> 37.0
    const projection = d3
      .geoMercator()
      .center([70.8, 30.6]) // Geographic Center of Pakistan
      .scale(Math.min(width * 2.8, mapHeight * 4.6))
      .translate([width * 0.52, mapHeight * 0.54]);

    const pathGenerator = d3.geoPath().projection(projection);

    // SVG Defs for gradients, glowing filters, and pin patterns
    const defs = svg.append('defs');

    // Subtle drop shadow filter for territory card
    const filter = defs.append('filter').attr('id', 'map-glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    // Risk Pin Glowing Filters
    const createGlowFilter = (id: string, color: string) => {
      const f = defs.append('filter').attr('id', id).attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
      f.append('feDropShadow').attr('dx', '0').attr('dy', '2').attr('stdDeviation', '3').attr('flood-color', color).attr('flood-opacity', '0.6');
    };
    createGlowFilter('glow-low', '#10b981');
    createGlowFilter('glow-moderate', '#f59e0b');
    createGlowFilter('glow-high', '#ef4444');

    // Background Container Group with Zoom & Pan Support
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');

    // D3 Zoom Behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.75, 7])
      .translateExtent([
        [-width * 0.5, -mapHeight * 0.5],
        [width * 1.5, mapHeight * 1.5],
      ])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
        setZoomLevel(Math.round(event.transform.k * 10) / 10);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // 1. Graticule Grid Lines (Lat/Long Lines for Military/Enterprise Command Aesthetic)
    const graticule = d3.geoGraticule().step([3, 3]);
    zoomGroup
      .append('path')
      .datum(graticule)
      .attr('d', pathGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.15)
      .attr('stroke-dasharray', '2,4');

    // 2. Render Pakistan Provinces Polygons
    const provinceGroup = zoomGroup.append('g').attr('class', 'provinces-layer');

    provinceGroup
      .selectAll('path.province')
      .data(PAKISTAN_PROVINCES_GEOJSON.features)
      .enter()
      .append('path')
      .attr('class', 'province')
      .attr('d', (d: any) => pathGenerator(d))
      .attr('fill', (d: any) => {
        // Highlighting KPK & Northern hubs where major dealers are active
        if (d.properties?.id === 'KPK') return '#004d40';
        if (d.properties?.id === 'PUNJAB') return '#064e3b';
        if (d.properties?.id === 'ICT') return '#047857';
        return '#0f172a';
      })
      .attr('fill-opacity', 0.85)
      .attr('stroke', (d: any) => d.properties?.strokeColor || '#14b8a6')
      .attr('stroke-width', 1.5)
      .attr('stroke-linejoin', 'round')
      .style('cursor', 'grab')
      .on('mouseenter', function (_event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill-opacity', 1)
          .attr('stroke-width', 2.5);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill-opacity', 0.85)
          .attr('stroke-width', 1.5);
      });

    // Province Label Texts
    provinceGroup
      .selectAll('text.province-label')
      .data(PAKISTAN_PROVINCES_GEOJSON.features)
      .enter()
      .append('text')
      .attr('class', 'province-label')
      .attr('transform', (d: any) => {
        const centroid = pathGenerator.centroid(d);
        return `translate(${centroid[0]}, ${centroid[1]})`;
      })
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-weight', '800')
      .attr('letter-spacing', '0.1em')
      .attr('opacity', 0.75)
      .attr('pointer-events', 'none')
      .text((d: any) => d.properties?.name?.toUpperCase() || '');

    // 3. Render National Commercial Highway Corridors
    if (showHighways) {
      const highwayGroup = zoomGroup.append('g').attr('class', 'highways-layer');

      highwayGroup
        .selectAll('path.highway')
        .data(PAKISTAN_CORRIDORS_GEOJSON.features)
        .enter()
        .append('path')
        .attr('class', 'highway')
        .attr('d', (d: any) => pathGenerator(d))
        .attr('fill', 'none')
        .attr('stroke', (d: any) => (d.properties?.type === 'MOTORWAY' ? '#38bdf8' : '#2dd4bf'))
        .attr('stroke-width', 1.8)
        .attr('stroke-opacity', 0.5)
        .attr('stroke-dasharray', '4,4');
    }

    // 4. Major Commercial Trade Hub Cities
    const hubGroup = zoomGroup.append('g').attr('class', 'trade-hubs-layer');

    PAKISTAN_MAJOR_HUBS.forEach((hub) => {
      const coords = projection([hub.lng, hub.lat]);
      if (!coords) return;

      const g = hubGroup.append('g').attr('transform', `translate(${coords[0]}, ${coords[1]})`);

      g.append('circle')
        .attr('r', 2.5)
        .attr('fill', '#64748b')
        .attr('opacity', 0.8);

      g.append('text')
        .attr('x', 6)
        .attr('y', 3)
        .attr('fill', '#94a3b8')
        .attr('font-size', '8px')
        .attr('font-weight', '700')
        .attr('opacity', 0.6)
        .text(hub.name);
    });

    // 5. RENDER DEALER CREDIT HEALTH PINS
    const pinsLayer = zoomGroup.append('g').attr('class', 'dealer-pins-layer');

    filteredDealers.forEach((dealerItem) => {
      const pt = projection([dealerItem.coords.lng, dealerItem.coords.lat]);
      if (!pt) return;

      const isSelected = selectedDealerId === dealerItem.customer.id;
      const isHighRisk = dealerItem.riskTier === 'HIGH';
      const isModerate = dealerItem.riskTier === 'MODERATE';

      const pinGroup = pinsLayer
        .append('g')
        .attr('class', `dealer-pin dealer-${dealerItem.customer.id}`)
        .attr('transform', `translate(${pt[0]}, ${pt[1]})`)
        .style('cursor', 'pointer');

      // Concentric Radar Pulse Ring for Critical & Moderate Risk
      if (isHighRisk || isModerate) {
        pinGroup
          .append('circle')
          .attr('r', 10)
          .attr('fill', dealerItem.riskColor)
          .attr('fill-opacity', 0.25)
          .attr('stroke', dealerItem.riskColor)
          .attr('stroke-width', 1)
          .attr('class', 'radar-pulse')
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '10; 24; 10')
          .attr('dur', isHighRisk ? '1.8s' : '2.8s')
          .attr('repeatCount', 'indefinite');

        pinGroup
          .select('.radar-pulse')
          .append('animate')
          .attr('attributeName', 'opacity')
          .attr('values', '0.6; 0; 0.6')
          .attr('dur', isHighRisk ? '1.8s' : '2.8s')
          .attr('repeatCount', 'indefinite');
      }

      // Outer Selection Ring
      if (isSelected) {
        pinGroup
          .append('circle')
          .attr('r', 16)
          .attr('fill', 'none')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '3,3');
      }

      // Main Pin Base Anchor
      const pinAnchor = pinGroup
        .append('g')
        .attr('filter', `url(#glow-${dealerItem.riskTier.toLowerCase()})`);

      // Teardrop Pin Shape (Classic High-Fidelity Location Pin)
      pinAnchor
        .append('path')
        .attr(
          'd',
          'M 0,0 C -6,-10 -9,-15 -9,-20 C -9,-26 -5,-30 0,-30 C 5,-30 9,-26 9,-20 C 9,-15 6,-10 0,0 Z'
        )
        .attr('fill', dealerItem.riskColor)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5);

      // Pin Inner Symbol (Store icon / Score text)
      pinAnchor
        .append('circle')
        .attr('cx', 0)
        .attr('cy', -20)
        .attr('r', 4.5)
        .attr('fill', '#ffffff');

      // Health Score / Acronym inside Pin
      pinAnchor
        .append('text')
        .attr('x', 0)
        .attr('y', -17.5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#0f172a')
        .attr('font-size', '6.5px')
        .attr('font-weight', '900')
        .text(dealerItem.creditHealth.score);

      // Floating Dealer Label Tag
      const labelGroup = pinGroup
        .append('g')
        .attr('transform', 'translate(0, 8)')
        .attr('class', 'dealer-name-tag');

      const nameText = dealerItem.customer.companyName;
      const textWidth = Math.min(nameText.length * 5.8 + 16, 120);

      labelGroup
        .append('rect')
        .attr('x', -textWidth / 2)
        .attr('y', 0)
        .attr('width', textWidth)
        .attr('height', 16)
        .attr('rx', 8)
        .attr('fill', '#0f172a')
        .attr('fill-opacity', 0.9)
        .attr('stroke', dealerItem.riskColor)
        .attr('stroke-width', 1);

      labelGroup
        .append('text')
        .attr('x', 0)
        .attr('y', 11)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '8px')
        .attr('font-weight', '800')
        .text(nameText.length > 15 ? nameText.slice(0, 13) + '..' : nameText);

      // Balance Pill
      labelGroup
        .append('text')
        .attr('x', 0)
        .attr('y', 23)
        .attr('text-anchor', 'middle')
        .attr('fill', dealerItem.riskColor)
        .attr('font-size', '7.5px')
        .attr('font-weight', '900')
        .text(`Rs. ${(dealerItem.balance / 1000).toFixed(0)}k (${dealerItem.utilizationPercentage}%)`);

      // Hover and Click Interactivity
      pinGroup
        .on('mouseenter', function () {
          d3.select(this).raise();
          d3.select(this)
            .transition()
            .duration(200)
            .attr('transform', `translate(${pt[0]}, ${pt[1]}) scale(1.2)`);

          setHoveredDealer(dealerItem);
        })
        .on('mouseleave', function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('transform', `translate(${pt[0]}, ${pt[1]}) scale(1)`);
        })
        .on('click', (event) => {
          event.stopPropagation();

          // Smoothly zoom in to focus on this dealer pin
          svg
            .transition()
            .duration(500)
            .call(
              zoom.transform,
              d3.zoomIdentity.translate(width / 2 - pt[0] * 1.8, mapHeight / 2 - pt[1] * 1.8).scale(1.8)
            );

          // NAVIGATE TO DEALER'S DOSSIER
          onSelectDealer(dealerItem.customer);
        });
    });
  }, [filteredDealers, selectedDealerId, showHighways, height, onSelectDealer, containerWidth]);

  // Programmatic Zoom Helpers
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(400)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Header Toolbar with Credit Health Metrics & Filters */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-teal-500/20 text-teal-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Dealer Credit Health &amp; Risk Map
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-900/60 text-teal-300 border border-teal-700/60">
                  D3 Geospatial
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time exposure risk across Pakistan territories. Click any color-coded pin to open that dealer&apos;s dossier.
            </p>
          </div>

          {/* Quick Portfolio Health KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Mapped Dealers</span>
              <span className="font-mono font-black text-sm sm:text-base text-white">
                {filteredDealers.length} / {customers.length}
              </span>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Receivables</span>
              <span className="font-mono font-black text-sm sm:text-base text-teal-300">
                Rs. {(portfolioStats.totalExposure / 1000).toLocaleString()}k
              </span>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Avg Credit Score</span>
              <span className="font-mono font-black text-sm sm:text-base text-emerald-400">
                {portfolioStats.avgScore}/100
              </span>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Over-Limit Risk</span>
              <span className={`font-mono font-black text-sm sm:text-base ${portfolioStats.highCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
                {portfolioStats.highCount} {portfolioStats.highCount === 1 ? 'Shop' : 'Shops'}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          {/* Risk Level Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              Risk Level:
            </span>

            <button
              type="button"
              onClick={() => setRiskFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                riskFilter === 'ALL'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Pins ({processedDealers.length})
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('LOW')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                riskFilter === 'LOW'
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40'
                  : 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Low Risk ({portfolioStats.lowCount})
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('MODERATE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                riskFilter === 'MODERATE'
                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/40'
                  : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Moderate Risk ({portfolioStats.modCount})
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('HIGH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                riskFilter === 'HIGH'
                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400/40'
                  : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              High / Over-Limit ({portfolioStats.highCount})
            </button>
          </div>

          {/* Territory Jump & Highway Toggles */}
          <div className="flex items-center gap-2">
            <select
              value={selectedTerritory}
              onChange={(e) => setSelectedTerritory(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 outline-none font-bold cursor-pointer"
            >
              <option value="ALL">All Territories</option>
              <option value="KPK">Khyber Pakhtunkhwa (KPK)</option>
              <option value="MINGORA">Swat (Mingora)</option>
              <option value="PESHAWAR">Peshawar Region</option>
              <option value="PUNJAB">Punjab Province</option>
            </select>

            <button
              type="button"
              onClick={() => setShowHighways(!showHighways)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                showHighways
                  ? 'bg-teal-950/60 border-teal-500/50 text-teal-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Toggle GT Road & Motorway Trade Corridors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Corridors</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. D3 Interactive Map Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl"
        style={{ minHeight: typeof height === 'number' ? `${height}px` : height }}
      >
        {/* Floating Map Zoom Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fit to Pakistan Map"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top-Left Geographic Legend Badge */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none hidden sm:block bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 text-[11px] text-slate-300">
          <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
            Pakistan Electrical Trade Grid
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Scale: {zoomLevel}x &bull; Drag to pan, scroll to zoom</p>
        </div>

        {/* SVG Element where D3 renders */}
        <svg ref={svgRef} className="w-full h-full block select-none"></svg>

        {/* Floating Dossier Preview Overlay upon Pin Hover */}
        {hoveredDealer && (
          <div
            className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-3xl shadow-2xl text-white animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm"
                  style={{ backgroundColor: hoveredDealer.riskColor }}
                >
                  {hoveredDealer.customer.companyName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    {hoveredDealer.customer.companyName}
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                      style={{
                        backgroundColor: `${hoveredDealer.riskColor}25`,
                        color: hoveredDealer.riskColor,
                        border: `1px solid ${hoveredDealer.riskColor}60`,
                      }}
                    >
                      {hoveredDealer.riskTier} RISK
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {hoveredDealer.customer.customerCode} &bull; {hoveredDealer.customer.town || hoveredDealer.customer.city}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectDealer(hoveredDealer.customer)}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                <span>Open Dossier</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Financial Progress Bar */}
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Credit Limit Utilization:</span>
                <span className="font-mono font-bold" style={{ color: hoveredDealer.riskColor }}>
                  Rs. {hoveredDealer.balance.toLocaleString()} / {hoveredDealer.limit.toLocaleString()} ({hoveredDealer.utilizationPercentage}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, hoveredDealer.utilizationPercentage)}%`,
                    backgroundColor: hoveredDealer.riskColor,
                  }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                <span>Credit Days: {hoveredDealer.customer.creditDays || 30} Days</span>
                <span>Avg Delay: {hoveredDealer.creditHealth.averagePaymentDelayDays} Days</span>
                <span className="font-bold text-teal-400">Score: {hoveredDealer.creditHealth.score}/100</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Dealer Dossier Quick-Navigate Strip Below Map */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Dealer Network Dossier Direct Access ({filteredDealers.length} Mapped)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Click any card to inspect dossier</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
          {filteredDealers.map((d) => (
            <div
              key={d.customer.id}
              onClick={() => onSelectDealer(d.customer)}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: d.riskColor }}
                    title={d.riskLabel}
                  ></span>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase font-mono"
                    style={{
                      backgroundColor: `${d.riskColor}15`,
                      color: d.riskColor,
                      border: `1px solid ${d.riskColor}40`,
                    }}
                  >
                    {d.riskTier} RISK
                  </span>
                </div>

                <h4 className="font-black text-xs text-slate-900 dark:text-white truncate group-hover:text-teal-700 dark:group-hover:text-teal-300">
                  {d.customer.companyName}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {d.customer.town || d.customer.city} &bull; {d.customer.customerCode}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Balance</span>
                  <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                    Rs. {(d.balance / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="text-right flex items-center gap-1 text-teal-700 dark:text-teal-400 font-bold text-[10px]">
                  <span>Dossier</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
