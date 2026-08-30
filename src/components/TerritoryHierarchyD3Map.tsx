import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RefreshCw, Layers, ShieldCheck, GitFork, MapPin, Users, Award } from 'lucide-react';

interface HierarchyNodeData {
  name: string;
  tier: number; // 1 to 5
  code?: string;
  assignedOfficer?: string;
  role?: string;
  targetSales?: string;
  activeOutlets?: number;
  children?: HierarchyNodeData[];
  _children?: HierarchyNodeData[]; // For collapsed nodes state
}

const INITIAL_HIERARCHY_DATA: HierarchyNodeData = {
  name: 'National Lights Corporate HQ',
  tier: 1,
  code: 'HQ-LHR',
  assignedOfficer: 'Managing Director & Governance Panel',
  role: 'Executive Governance',
  targetSales: 'PKR 450M / Mo',
  children: [
    {
      name: 'Punjab Central Region',
      tier: 2,
      code: 'REG-PBC',
      assignedOfficer: 'Muhammad Amjid (RSM)',
      role: 'Regional Sales Manager',
      targetSales: 'PKR 120M / Mo',
      children: [
        {
          name: 'Lahore Division',
          tier: 3,
          code: 'AREA-LHR',
          assignedOfficer: 'Usman Ali (ASM)',
          role: 'Area Sales Manager',
          targetSales: 'PKR 65M / Mo',
          children: [
            {
              name: 'Brandreth Road Market',
              tier: 4,
              code: 'BEAT-BRD',
              assignedOfficer: 'Ali Raza (TSM)',
              role: 'Territory Sales Manager',
              targetSales: 'PKR 35M / Mo',
              children: [
                { name: 'Al-Madina Auto Spares', tier: 5, code: 'DLR-101', role: 'Key Dealer', activeOutlets: 1 },
                { name: 'Royal Lighting & Bulb House', tier: 5, code: 'DLR-104', role: 'Dealer', activeOutlets: 1 },
                { name: 'Lahore Auto Electric Depot', tier: 5, code: 'DLR-108', role: 'Stockist', activeOutlets: 1 }
              ]
            },
            {
              name: 'Montgomery Road Beat',
              tier: 4,
              code: 'BEAT-MGM',
              assignedOfficer: 'Hassan Mahmood (TSM)',
              role: 'Territory Sales Manager',
              targetSales: 'PKR 30M / Mo',
              children: [
                { name: 'National Auto Traders', tier: 5, code: 'DLR-109', role: 'Dealer', activeOutlets: 1 },
                { name: 'Punjab Auto Spares', tier: 5, code: 'DLR-110', role: 'Stockist', activeOutlets: 1 }
              ]
            }
          ]
        },
        {
          name: 'Gujranwala & Sialkot Zone',
          tier: 3,
          code: 'AREA-GRW',
          assignedOfficer: 'Bilal Chaudhry (ASM)',
          role: 'Area Sales Manager',
          targetSales: 'PKR 55M / Mo',
          children: [
            {
              name: 'G.T. Road Auto Market',
              tier: 4,
              code: 'BEAT-GTR',
              assignedOfficer: 'Zeeshan Ahmad (TSM)',
              role: 'Territory Sales Manager',
              targetSales: 'PKR 28M / Mo',
              children: [
                { name: 'Crescent Auto Traders', tier: 5, code: 'DLR-111', role: 'Distributor', activeOutlets: 1 }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Punjab North Region',
      tier: 2,
      code: 'REG-PBN',
      assignedOfficer: 'Kamran Shah (RSM)',
      role: 'Regional Sales Manager',
      targetSales: 'PKR 95M / Mo',
      children: [
        {
          name: 'Rawalpindi / Islamabad Hub',
          tier: 3,
          code: 'AREA-RWP',
          assignedOfficer: 'Shahid Mehmood (ASM)',
          role: 'Area Sales Manager',
          targetSales: 'PKR 50M / Mo',
          children: [
            {
              name: 'Gawalmandi Auto Market',
              tier: 4,
              code: 'BEAT-GWL',
              assignedOfficer: 'Waqas Malik (TSM)',
              role: 'Territory Sales Manager',
              targetSales: 'PKR 25M / Mo',
              children: [
                { name: 'Capital Auto Spares RWP', tier: 5, code: 'DLR-112', role: 'Dealer', activeOutlets: 1 }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Sindh South Region',
      tier: 2,
      code: 'REG-SND',
      assignedOfficer: 'Farhan Siddiqui (RSM)',
      role: 'Regional Sales Manager',
      targetSales: 'PKR 110M / Mo',
      children: [
        {
          name: 'Karachi South & Saddar Zone',
          tier: 3,
          code: 'AREA-KHI',
          assignedOfficer: 'Rashid Khan (ASM)',
          role: 'Area Sales Manager',
          targetSales: 'PKR 70M / Mo',
          children: [
            {
              name: 'Plaza Market Saddar',
              tier: 4,
              code: 'BEAT-PLZ',
              assignedOfficer: 'Zubair Ahmed (TSM)',
              role: 'Territory Sales Manager',
              targetSales: 'PKR 40M / Mo',
              children: [
                { name: 'Super Karachi Auto Traders', tier: 5, code: 'DLR-103', role: 'Distributor', activeOutlets: 1 }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'KPK West Region',
      tier: 2,
      code: 'REG-KPK',
      assignedOfficer: 'Tariq Mansoor (RSM)',
      role: 'Regional Sales Manager',
      targetSales: 'PKR 75M / Mo',
      children: [
        {
          name: 'Peshawar & Mardan Zone',
          tier: 3,
          code: 'AREA-PEW',
          assignedOfficer: 'Sardar Gul (ASM)',
          role: 'Area Sales Manager',
          targetSales: 'PKR 45M / Mo',
          children: [
            {
              name: 'Karkhano Wholesale Market',
              tier: 4,
              code: 'BEAT-KKH',
              assignedOfficer: 'Jahangir Khan (TSM)',
              role: 'Territory Sales Manager',
              targetSales: 'PKR 25M / Mo',
              children: [
                { name: 'Khyber Auto Electric Store', tier: 5, code: 'DLR-102', role: 'Distributor', activeOutlets: 1 }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Balochistan Region',
      tier: 2,
      code: 'REG-BAL',
      assignedOfficer: 'Niaz Baloch (RSM)',
      role: 'Regional Sales Manager',
      targetSales: 'PKR 50M / Mo',
      children: [
        {
          name: 'Quetta Zonal Hub',
          tier: 3,
          code: 'AREA-QTA',
          assignedOfficer: 'Babar Kasi (ASM)',
          role: 'Area Sales Manager',
          targetSales: 'PKR 30M / Mo',
          children: [
            {
              name: 'Bacha Khan Chowk Market',
              tier: 4,
              code: 'BEAT-BKC',
              assignedOfficer: 'Abdul Samad (TSM)',
              role: 'Territory Sales Manager',
              targetSales: 'PKR 18M / Mo',
              children: [
                { name: 'Bolan Lighting Store', tier: 5, code: 'DLR-115', role: 'Dealer', activeOutlets: 1 }
              ]
            }
          ]
        }
      ]
    }
  ]
};

const TIER_COLORS = {
  1: { bg: '#0F766E', border: '#134E4A', text: '#FFFFFF', pill: 'Tier 1: Corporate HQ' },
  2: { bg: '#0D9488', border: '#115E59', text: '#FFFFFF', pill: 'Tier 2: Regional Hub (RSM)' },
  3: { bg: '#4338CA', border: '#312E81', text: '#FFFFFF', pill: 'Tier 3: Area Division (ASM)' },
  4: { bg: '#059669', border: '#064E3B', text: '#FFFFFF', pill: 'Tier 4: Territory Beat (TSM)' },
  5: { bg: '#D97706', border: '#78350F', text: '#FFFFFF', pill: 'Tier 5: Commercial Outlet' },
};

export const TerritoryHierarchyD3Map: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedNode, setSelectedNode] = useState<HierarchyNodeData | null>(INITIAL_HIERARCHY_DATA);
  const [filterRegion, setFilterRegion] = useState<string>('ALL');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [dataRoot, setDataRoot] = useState<HierarchyNodeData>(INITIAL_HIERARCHY_DATA);

  // Render D3 Hierarchy Tree
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = Math.max(containerRef.current.clientWidth || 900, 800);
    const height = 580;

    // Clear previous SVG contents
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Set viewBox
    svg.attr('width', '100%')
       .attr('height', height)
       .attr('viewBox', `0 0 ${width} ${height}`);

    // Create main zoom container
    const gMain = svg.append('g').attr('class', 'main-group');

    // Enable D3 Zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 2.5])
      .on('zoom', (event) => {
        gMain.attr('transform', event.transform);
        setZoomLevel(Math.round(event.transform.k * 100) / 100);
      });

    svg.call(zoomBehavior as any);

    // Prepare data filtered if applicable
    let renderData = dataRoot;
    if (filterRegion !== 'ALL' && dataRoot.children) {
      renderData = {
        ...dataRoot,
        children: dataRoot.children.filter(c => c.name.includes(filterRegion))
      };
    }

    // Convert data to d3 hierarchy
    const root = d3.hierarchy<HierarchyNodeData>(renderData);

    // Tree layout settings
    const treeLayout = d3.tree<HierarchyNodeData>()
      .size([height - 100, width - 280]);

    treeLayout(root);

    // Draw Bezier Links between nodes
    const linkGenerator = d3.linkHorizontal<any, d3.HierarchyPointNode<HierarchyNodeData>>()
      .x((d) => d.y + 120)
      .y((d) => d.x + 50);

    gMain.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(root.links())
      .enter()
      .append('path')
      .attr('d', linkGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', (d) => TIER_COLORS[(d.target.data.tier as 1|2|3|4|5) || 5].bg)
      .attr('stroke-width', (d) => Math.max(1.5, 4 - d.target.data.tier * 0.5))
      .attr('stroke-opacity', 0.5)
      .attr('stroke-dasharray', (d) => d.target.data.tier === 5 ? '3,3' : 'none');

    // Create Node Groups
    const nodes = gMain.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.y + 120},${d.x + 50})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.data);

        // Toggle children collapse/expand if present
        if (d.data.children) {
          d.data._children = d.data.children;
          d.data.children = undefined;
        } else if (d.data._children) {
          d.data.children = d.data._children;
          d.data._children = undefined;
        }
        setDataRoot({ ...dataRoot });
      });

    // Draw Node Rectangles (Neumorphic Card Style)
    nodes.append('rect')
      .attr('x', -85)
      .attr('y', -22)
      .attr('width', 170)
      .attr('height', 44)
      .attr('rx', 12)
      .attr('fill', (d) => (selectedNode?.name === d.data.name ? '#0F766E' : '#FFFFFF'))
      .attr('stroke', (d) => TIER_COLORS[(d.data.tier as 1|2|3|4|5) || 5].bg)
      .attr('stroke-width', (d) => (selectedNode?.name === d.data.name ? 3 : 1.5))
      .style('filter', 'drop-shadow(0px 3px 6px rgba(0,0,0,0.08))');

    // Draw Tier Indicator Dot
    nodes.append('circle')
      .attr('cx', -70)
      .attr('cy', 0)
      .attr('r', 7)
      .attr('fill', (d) => TIER_COLORS[(d.data.tier as 1|2|3|4|5) || 5].bg);

    // Node Name Text
    nodes.append('text')
      .attr('x', -56)
      .attr('y', -3)
      .attr('fill', (d) => (selectedNode?.name === d.data.name ? '#FFFFFF' : '#1E293B'))
      .attr('font-size', '10px')
      .attr('font-weight', '800')
      .text((d) => {
        const name = d.data.name;
        return name.length > 21 ? name.substring(0, 19) + '…' : name;
      });

    // Node Subtitle / Officer
    nodes.append('text')
      .attr('x', -56)
      .attr('y', 11)
      .attr('fill', (d) => (selectedNode?.name === d.data.name ? '#CCFBF1' : '#64748B'))
      .attr('font-size', '8px')
      .attr('font-weight', '600')
      .text((d) => d.data.assignedOfficer || d.data.code || `Tier ${d.data.tier} Node`);

    // Badge indicator if children exist
    nodes.filter((d) => !!d.data.children || !!d.data._children)
      .append('circle')
      .attr('cx', 75)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', (d) => (d.data._children ? '#EF4444' : '#10B981'));

  }, [dataRoot, selectedNode, filterRegion]);

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call((d3.zoom() as any).transform, d3.zoomIdentity);
  };

  return (
    <div className="space-y-4">
      {/* Control Header Ribbon */}
      <div className="nm-flat p-4 rounded-3xl border border-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl nm-inset flex items-center justify-center text-teal-700">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800">5-Tier Territory Breakdown Map</h3>
              <span className="nm-badge-teal text-[10px] px-2.5 py-0.5 rounded-full font-bold">D3 Interactive Graph</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Click nodes to expand/collapse sub-territories. Pan & zoom to explore provincial boundaries.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="p-2 rounded-xl nm-inset text-xs font-bold text-slate-700 outline-none"
          >
            <option value="ALL">All Regions (Provincial Map)</option>
            <option value="Punjab Central">Punjab Central Region</option>
            <option value="Punjab North">Punjab North Region</option>
            <option value="Sindh South">Sindh South Region</option>
            <option value="KPK West">KPK West Region</option>
            <option value="Balochistan">Balochistan Region</option>
          </select>

          <button
            onClick={handleResetZoom}
            className="nm-btn p-2 rounded-xl text-xs font-bold text-slate-700 hover:text-teal-800 flex items-center gap-1"
            title="Reset Map View"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* D3 Map Canvas Container */}
        <div ref={containerRef} className="lg:col-span-3 nm-inset rounded-3xl p-3 border border-slate-300 relative bg-[#E2E8F0]/50 overflow-hidden min-h-[520px]">
          <svg ref={svgRef} className="w-full h-[520px] cursor-grab active:cursor-grabbing" />

          {/* Map Overlay Badge Legend */}
          <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-white shadow-sm space-y-1.5 text-[10px] font-bold text-slate-700 pointer-events-none">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Hierarchy Color Code</span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
              <span>Tier 1: Corporate HQ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
              <span>Tier 2: Region (RSM)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4338CA]" />
              <span>Tier 3: Area (ASM)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
              <span>Tier 4: Territory Beat (TSM)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
              <span>Tier 5: Commercial Outlets</span>
            </div>
          </div>
        </div>

        {/* Selected Node Inspector Panel */}
        <div className="lg:col-span-1 nm-flat p-5 rounded-3xl border border-white space-y-4 shadow-md flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Node Dossier</span>
              {selectedNode && (
                <span className="nm-badge-teal text-[9px] px-2 py-0.5 rounded-full font-bold">
                  Tier {selectedNode.tier}
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-black text-slate-800">{selectedNode.name}</h4>
                  <p className="text-xs font-mono font-bold text-teal-700">{selectedNode.code || 'N/A'}</p>
                </div>

                <div className="nm-inset p-3 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Assigned Leader:</span>
                    <span className="font-bold text-slate-800">{selectedNode.assignedOfficer || 'Management Panel'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Role Title:</span>
                    <span className="font-semibold text-slate-700">{selectedNode.role || 'Territory Manager'}</span>
                  </div>
                  {selectedNode.targetSales && (
                    <div className="flex justify-between border-t border-slate-200 pt-1.5">
                      <span className="text-slate-500 font-bold">Monthly Target:</span>
                      <span className="font-black text-emerald-700">{selectedNode.targetSales}</span>
                    </div>
                  )}
                  {selectedNode.activeOutlets !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Outlets / Stockists:</span>
                      <span className="font-bold text-indigo-700">{selectedNode.activeOutlets} Outlets</span>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 bg-slate-100/80 p-3 rounded-2xl border border-slate-200/60 leading-relaxed">
                  <strong className="text-slate-800 block mb-1">Operational Boundary:</strong>
                  Node provides territorial governance, route beat schedules, and credit monitoring for assigned dealers.
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                Tap or click any node on the hierarchy map to inspect node details.
              </div>
            )}
          </div>

          <div className="text-[10px] font-medium text-slate-500 text-center pt-2 border-t border-slate-200">
            N-LINK 360 • D3 Territory Graph
          </div>
        </div>
      </div>
    </div>
  );
};
