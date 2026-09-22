/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Manage Towns & Geographic Routes Administrative Interface
 * Comprehensive control panel for defining Town Nodes, Route Nodes (e.g. Peshawar city routes),
 * and Geofence perimeters.
 */

import React, { useState, useMemo } from 'react';
import { TownNode } from '../../types';
import { PAKISTAN_REGIONS } from '../../data/pakistan-geography';
import {
  PAKISTAN_TOWN_COORDINATES,
  addRouteToTownNode,
  saveTownNodes,
} from '../../services/townManagement';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Route,
  Building2,
  RefreshCw,
  Trash2,
  X,
  Filter,
  Check,
  AlertCircle,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
  Sliders,
  Radio,
} from 'lucide-react';

export interface ManageTownsInterfaceProps {
  townNodes: TownNode[];
  onUpdateTownNodes: (updatedNodes: TownNode[]) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const REGION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  KPK: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  PUNJAB: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  SINDH: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  BALOCHISTAN: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  ICT: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  AJK: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
  },
  GB: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
};

export const ManageTownsInterface: React.FC<ManageTownsInterfaceProps> = ({
  townNodes,
  onUpdateTownNodes,
  onClose,
  isModal = false,
}) => {
  const [activeViewMode, setActiveViewMode] = useState<'TOWNS' | 'ROUTES_DIRECTORY'>('TOWNS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'DEACTIVATED'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit / Add Town Modal State
  const [editingNode, setEditingNode] = useState<TownNode | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Add Route Direct Modal State
  const [isAddRouteModalOpen, setIsAddRouteModalOpen] = useState<boolean>(false);
  const [routeTargetTown, setRouteTargetTown] = useState<string>('Peshawar');
  const [routeNameInput, setRouteNameInput] = useState<string>('');
  const [routeType, setRouteType] = useState<string>('COMMERCIAL_MARKET');
  const [routeLandmarkNotes, setRouteLandmarkNotes] = useState<string>('');
  const [routeModalError, setRouteModalError] = useState<string>('');

  // Form fields for Town Edit/Add
  const [formName, setFormName] = useState('');
  const [formRegion, setFormRegion] = useState('KPK');
  const [formCommercialHub, setFormCommercialHub] = useState('');
  const [formRoutes, setFormRoutes] = useState<string[]>([]);
  const [formGeofenceRadius, setFormGeofenceRadius] = useState<number>(1500);
  const [newRouteInput, setNewRouteInput] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPIs
  const stats = useMemo(() => {
    const total = townNodes.length;
    const active = townNodes.filter((n) => n.isActive).length;
    const deactivated = total - active;
    const totalRoutes = townNodes
      .filter((n) => n.isActive)
      .reduce((sum, n) => sum + (n.routes?.length || 0), 0);
    return { total, active, deactivated, totalRoutes };
  }, [townNodes]);

  // Flattened All Routes Directory
  const allRoutesList = useMemo(() => {
    const list: Array<{
      route: string;
      townName: string;
      townId: string;
      region: string;
      isActive: boolean;
      commercialHub?: string;
      geofenceRadius?: number;
    }> = [];

    townNodes.forEach((t) => {
      (t.routes || []).forEach((r) => {
        list.push({
          route: r,
          townName: t.name,
          townId: t.id,
          region: t.region,
          isActive: t.isActive,
          commercialHub: t.commercialHub,
          geofenceRadius: t.geofenceRadiusMeters || 1500,
        });
      });
    });

    return list;
  }, [townNodes]);

  // Filtered Towns
  const filteredTowns = useMemo(() => {
    return townNodes.filter((node) => {
      const matchesSearch =
        !searchQuery ||
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.commercialHub?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.routes?.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRegion =
        selectedRegion === 'ALL' || node.region.toUpperCase() === selectedRegion.toUpperCase();
      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && node.isActive) ||
        (selectedStatus === 'DEACTIVATED' && !node.isActive);

      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [townNodes, searchQuery, selectedRegion, selectedStatus]);

  // Filtered Routes for Directory View
  const filteredRoutes = useMemo(() => {
    return allRoutesList.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        item.route.toLowerCase().includes(q) ||
        item.townName.toLowerCase().includes(q) ||
        item.region.toLowerCase().includes(q);

      const matchesRegion =
        selectedRegion === 'ALL' || item.region.toUpperCase() === selectedRegion.toUpperCase();
      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && item.isActive) ||
        (selectedStatus === 'DEACTIVATED' && !item.isActive);

      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [allRoutesList, searchQuery, selectedRegion, selectedStatus]);

  // Toggle Single Town Status
  const handleToggleStatus = (nodeId: string) => {
    const target = townNodes.find((n) => n.id === nodeId);
    if (!target) return;

    const newStatus = !target.isActive;
    const updated = townNodes.map((n) =>
      n.id === nodeId ? { ...n, isActive: newStatus, updatedAt: new Date().toISOString() } : n
    );

    onUpdateTownNodes(updated);
    showToast(
      `✓ Town "${target.name}" has been ${
        newStatus ? 'Activated' : 'Deactivated'
      }. Route availability updated for field officers.`
    );
  };

  // Open Edit Dialog
  const handleOpenEdit = (node: TownNode) => {
    setEditingNode(node);
    setIsCreatingNew(false);
    setFormName(node.name);
    setFormRegion(node.region);
    setFormCommercialHub(node.commercialHub || '');
    setFormRoutes(node.routes ? [...node.routes] : []);
    setFormGeofenceRadius(node.geofenceRadiusMeters || 1500);
    setFormIsActive(node.isActive);
    setFormError('');
    setNewRouteInput('');
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingNode(null);
    setIsCreatingNew(true);
    setFormName('');
    setFormRegion('KPK');
    setFormCommercialHub('');
    setFormRoutes(['Main Commercial Beat', 'City Circular Market Beat']);
    setFormGeofenceRadius(1500);
    setFormIsActive(true);
    setFormError('');
    setNewRouteInput('');
  };

  // Open Add Town Route Modal
  const handleOpenAddRouteModal = (preselectedTown?: string) => {
    const defaultTown =
      preselectedTown ||
      (townNodes.find((n) => n.name.toLowerCase() === 'peshawar')?.name ||
        townNodes[0]?.name ||
        'Peshawar');
    setRouteTargetTown(defaultTown);
    setRouteNameInput('');
    setRouteType('COMMERCIAL_MARKET');
    setRouteLandmarkNotes('');
    setRouteModalError('');
    setIsAddRouteModalOpen(true);
  };

  // Add Route Tag to Form
  const handleAddRouteToForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newRouteInput.trim();
    if (!clean) return;
    if (formRoutes.some((r) => r.toLowerCase() === clean.toLowerCase())) {
      setFormError('This route/beat already exists in the list.');
      return;
    }
    setFormRoutes([...formRoutes, clean]);
    setNewRouteInput('');
    setFormError('');
  };

  // Remove Route Tag from Form
  const handleRemoveRouteFromForm = (routeToRemove: string) => {
    setFormRoutes(formRoutes.filter((r) => r !== routeToRemove));
  };

  // Quick preset routes adder for town form
  const handleAddDefaultBeats = () => {
    const town = formName.trim() || 'Town';
    const defaults = [
      `${town} Main Commercial Beat`,
      `${town} GT Road / Market Beat`,
      `${town} City Circular Road Beat`,
      `${town} Trade Plaza Beat`,
    ];
    const unique = Array.from(new Set([...formRoutes, ...defaults]));
    setFormRoutes(unique);
  };

  // Save Direct Add Town Route Modal
  const handleSaveAddRouteDirectly = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoute = routeNameInput.trim();
    if (!cleanRoute) {
      setRouteModalError('Please enter a valid Route / Beat Name.');
      return;
    }

    const { updatedNodes, success, message } = addRouteToTownNode(
      routeTargetTown,
      cleanRoute,
      townNodes
    );

    if (!success) {
      setRouteModalError(message);
      return;
    }

    onUpdateTownNodes(updatedNodes);
    showToast(
      `✓ Route "${cleanRoute}" successfully linked to ${routeTargetTown}. Field Mobile dropdowns updated automatically.`
    );
    setIsAddRouteModalOpen(false);
  };

  // Remove route from town directly from directory
  const handleRemoveRouteFromTownDirectly = (townId: string, routeToRemove: string) => {
    const targetTown = townNodes.find((n) => n.id === townId);
    if (!targetTown) return;

    const updatedRoutes = (targetTown.routes || []).filter((r) => r !== routeToRemove);
    const updated = townNodes.map((n) =>
      n.id === townId
        ? {
            ...n,
            routes:
              updatedRoutes.length > 0
                ? updatedRoutes
                : [`${targetTown.name} Main Commercial Beat`],
            updatedAt: new Date().toISOString(),
          }
        : n
    );

    onUpdateTownNodes(updated);
    showToast(`✓ Removed route "${routeToRemove}" from ${targetTown.name}.`);
  };

  // Save Add/Edit Town
  const handleSaveNode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('Please enter a valid Town Name.');
      return;
    }

    const coords =
      PAKISTAN_TOWN_COORDINATES[cleanName] ||
      (editingNode?.centerCoordinates || {
        lat: 34.0151,
        lng: 71.5249,
      });

    if (isCreatingNew) {
      // Check duplicate name
      if (townNodes.some((n) => n.name.toLowerCase() === cleanName.toLowerCase())) {
        setFormError(`A town named "${cleanName}" already exists.`);
        return;
      }

      const newNode: TownNode = {
        id: `town-${Date.now()}`,
        name: cleanName,
        region: formRegion,
        commercialHub: formCommercialHub.trim() || `${cleanName} Commercial Hub`,
        routes: formRoutes.length > 0 ? formRoutes : [`${cleanName} Main Commercial Beat`],
        isActive: formIsActive,
        geofenceRadiusMeters: formGeofenceRadius,
        centerCoordinates: coords,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [newNode, ...townNodes];
      onUpdateTownNodes(updated);
      showToast(
        `✓ Town node "${cleanName}" added successfully with ${newNode.routes.length} active routes.`
      );
    } else if (editingNode) {
      const updated = townNodes.map((n) => {
        if (n.id === editingNode.id) {
          return {
            ...n,
            name: cleanName,
            region: formRegion,
            commercialHub: formCommercialHub.trim() || `${cleanName} Commercial Hub`,
            routes: formRoutes.length > 0 ? formRoutes : [`${cleanName} Main Commercial Beat`],
            isActive: formIsActive,
            geofenceRadiusMeters: formGeofenceRadius,
            centerCoordinates: coords,
            updatedAt: new Date().toISOString(),
          };
        }
        return n;
      });

      onUpdateTownNodes(updated);
      showToast(`✓ Town node "${cleanName}" updated successfully.`);
    }

    setEditingNode(null);
    setIsCreatingNew(false);
  };

  return (
    <div className={`space-y-4 ${isModal ? 'p-6 max-h-[85vh] overflow-y-auto' : ''}`}>
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-3 border border-emerald-500/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-teal-800 text-white flex items-center justify-center shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Manage Towns &amp; Geographic Route Nodes
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Define geographic towns and route nodes (like Peshawar city routes &amp; Duran Pur
                beat). Changes immediately auto-sync to field officer dropdowns.
              </p>
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Add Town Route Button (Prominent Request Feature) */}
          <button
            type="button"
            onClick={() => handleOpenAddRouteModal()}
            className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Route className="w-4 h-4 text-emerald-200" />
            <span>+ Add Town Route</span>
          </button>

          {/* Add Town Node Button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Town Node</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Total Towns
          </span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
            {stats.total}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Active Towns
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {stats.active}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400 block">
            Active Routes / Beats
          </span>
          <span className="text-xl font-black text-teal-600 dark:text-teal-400 mt-0.5 block">
            {stats.totalRoutes}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Field App Auto-Sync
          </span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Real-Time
          </span>
        </div>
      </div>

      {/* View Mode Tabs: Towns Grid vs Routes & Beats Directory */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveViewMode('TOWNS')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeViewMode === 'TOWNS'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Towns Directory ({filteredTowns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewMode('ROUTES_DIRECTORY')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeViewMode === 'ROUTES_DIRECTORY'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Route className="w-3.5 h-3.5" />
          <span>Routes &amp; Beats Index ({filteredRoutes.length})</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between text-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeViewMode === 'TOWNS'
                ? 'Search town name, commercial hub, or beat (e.g. Peshawar, Duran Pur, Hall Road)...'
                : 'Search specific routes or beats (e.g. Duran Pur Route, GT Road, University Road)...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 outline-none text-xs text-slate-900 dark:text-white focus:border-teal-700 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Region & Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Regions</option>
            <option value="KPK">KPK</option>
            <option value="PUNJAB">Punjab</option>
            <option value="SINDH">Sindh</option>
            <option value="BALOCHISTAN">Balochistan</option>
            <option value="ICT">Islamabad (ICT)</option>
            <option value="AJK">Azad Kashmir</option>
            <option value="GB">Gilgit-Baltistan</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DEACTIVATED">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. TOWNS GRID VIEW */}
      {/* ==================================================== */}
      {activeViewMode === 'TOWNS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredTowns.map((node) => {
            const regColor = REGION_COLORS[node.region] || REGION_COLORS.KPK;
            return (
              <div
                key={node.id}
                className={`rounded-2xl p-4 border transition-all shadow-xs flex flex-col justify-between ${
                  node.isActive
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-500/50'
                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/50 opacity-75'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {node.name}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${regColor.bg} ${regColor.text} ${regColor.border}`}
                        >
                          {node.region}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5 line-clamp-1">
                        {node.commercialHub || `${node.name} Commercial Area`}
                      </span>
                    </div>

                    {/* Active / Deactivated Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(node.id)}
                      title={node.isActive ? 'Click to Deactivate' : 'Click to Activate'}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                        node.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {node.isActive ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Geofence & Coordinates summary */}
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 font-mono">
                    <span>Geofence: {node.geofenceRadiusMeters || 1500}m radius</span>
                    <span>
                      {node.centerCoordinates
                        ? `${node.centerCoordinates.lat.toFixed(2)}°N, ${node.centerCoordinates.lng.toFixed(2)}°E`
                        : 'Auto-GPS'}
                    </span>
                  </div>

                  {/* Routes / Commercial Beats */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <Route className="w-3 h-3 text-teal-600" />
                        Routes &amp; Beats ({node.routes?.length || 0})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenAddRouteModal(node.name)}
                        className="text-[10px] font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>+ Add Route</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                      {(node.routes && node.routes.length > 0 ? node.routes : ['Main Beat']).map(
                        (route, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200/70 dark:border-slate-700/60"
                          >
                            {route}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {node.isActive ? 'Live in field apps' : 'Hidden from field apps'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(node)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Town</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. ROUTES & BEATS DIRECTORY VIEW */}
      {/* ==================================================== */}
      {activeViewMode === 'ROUTES_DIRECTORY' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                All Configured Geographic Routes &amp; Beats ({filteredRoutes.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Click "+ Add Town Route" to add a new route node linked to any Pakistani town.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddRouteModal()}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Town Route</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
            {filteredRoutes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Route className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-bold">No routes match your search filters.</p>
              </div>
            ) : (
              filteredRoutes.map((rItem, idx) => (
                <div
                  key={`${rItem.townId}-${rItem.route}-${idx}`}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center text-xs">
                      <Route className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-slate-900 dark:text-white block">
                        {rItem.route}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Linked Town: <strong className="text-teal-700 dark:text-teal-300">{rItem.townName}</strong> ({rItem.region}) &bull; Hub: {rItem.commercialHub || 'Trade Center'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-500">
                      Geofence: {rItem.geofenceRadius}m
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveRouteFromTownDirectly(rItem.townId, rItem.route)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer transition-colors"
                      title="Remove this route"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. ADD TOWN ROUTE MODAL (DEDICATED INTERFACE) */}
      {/* ==================================================== */}
      {isAddRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <Route className="w-4 h-4 text-emerald-100" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Add Geographic Town Route Node
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Define a specific route/beat and link it to an active commercial town.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRouteModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddRouteDirectly} className="space-y-3.5">
              {routeModalError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{routeModalError}</span>
                </div>
              )}

              {/* Target Town Selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Link to Geographical Town *
                </label>
                <select
                  value={routeTargetTown}
                  onChange={(e) => setRouteTargetTown(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  {townNodes
                    .filter((t) => t.isActive)
                    .map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.region}) - {t.commercialHub || 'Trade Center'}
                      </option>
                    ))}
                </select>
              </div>

              {/* Route Node Name Input */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Route / Commercial Beat Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Duran Pur Route / GT Road Beat, University Road Sector"
                  value={routeNameInput}
                  onChange={(e) => {
                    setRouteNameInput(e.target.value);
                    setRouteModalError('');
                  }}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white focus:border-teal-700"
                />
              </div>

              {/* Preset Route Suggestions for Selected Town */}
              {routeTargetTown.toLowerCase() === 'peshawar' && (
                <div className="space-y-1.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 block">
                    Quick Peshawar Route Presets:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Duran Pur Route / GT Road Beat',
                      'University Road / Saddar Corridor',
                      'Ring Road Wholesale Hub',
                      'Warsak Road / Industrial Beat',
                      'Karkhano Electrical Bazar',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRouteNameInput(preset)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 cursor-pointer font-medium"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Route Focus Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Route Commercial Focus
                  </label>
                  <select
                    value={routeType}
                    onChange={(e) => setRouteType(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-800 dark:text-slate-200"
                  >
                    <option value="COMMERCIAL_MARKET">Main Commercial Market</option>
                    <option value="WHOLESALE_HUB">Wholesale Electrical Hub</option>
                    <option value="RETAIL_CORRIDOR">Retail Trade Corridor</option>
                    <option value="INDUSTRIAL_ZONE">Industrial &amp; Project Sector</option>
                    <option value="RURAL_SUBURB">Sub-Tehsil / Rural Beat</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Landmark / Coverage Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. From Chamkani to Hashtnagri"
                    value={routeLandmarkNotes}
                    onChange={(e) => setRouteLandmarkNotes(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddRouteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save &amp; Link Route</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. ADD / EDIT TOWN NODE MODAL */}
      {/* ==================================================== */}
      {(isCreatingNew || editingNode) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-2xl bg-teal-800 text-white flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {isCreatingNew ? 'Create New Town Node' : `Edit Town: ${editingNode?.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingNode(null);
                  setIsCreatingNew(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveNode} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Town Name & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Town / City Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nowshera, Abbottabad, Duran Pur"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      setFormError('');
                    }}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-900 dark:text-white focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Province / Region *
                  </label>
                  <select
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="KPK">Khyber Pakhtunkhwa (KPK)</option>
                    <option value="PUNJAB">Punjab</option>
                    <option value="SINDH">Sindh</option>
                    <option value="BALOCHISTAN">Balochistan</option>
                    <option value="ICT">Islamabad (ICT)</option>
                    <option value="AJK">Azad Jammu &amp; Kashmir</option>
                    <option value="GB">Gilgit-Baltistan</option>
                  </select>
                </div>
              </div>

              {/* Commercial Hub */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Primary Commercial Hub / Main Market
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sheikh Yaseen Tower / Karkhano / Saddar Road"
                  value={formCommercialHub}
                  onChange={(e) => setFormCommercialHub(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-900 dark:text-white focus:border-teal-700"
                />
              </div>

              {/* Geofence Precision Radius */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                    Town Geofence Perimeter Radius:
                  </span>
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                    {formGeofenceRadius} meters
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[500, 1000, 1500, 3000].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormGeofenceRadius(r)}
                      className={`py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer ${
                        formGeofenceRadius === r
                          ? 'bg-teal-800 text-white'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {r >= 1000 ? `${r / 1000} km` : `${r}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Active Status</span>
                  <span className="text-[10px] text-slate-500">
                    When active, field officers can select this town and its routes.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    formIsActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {formIsActive ? 'Active' : 'Deactivated'}
                </button>
              </div>

              {/* Geographic Routes & Beats Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Geographic Routes &amp; Commercial Beats ({formRoutes.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDefaultBeats}
                    className="text-[10px] font-bold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    + Suggest Standard Beats
                  </button>
                </div>

                {/* Route Input Field */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter route name (e.g. Duran Pur Route, Bank Road Beat)..."
                    value={newRouteInput}
                    onChange={(e) => {
                      setNewRouteInput(e.target.value);
                      setFormError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRouteToForm();
                      }
                    }}
                    className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-900 dark:text-white focus:border-teal-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddRouteToForm()}
                    className="px-3 py-2.5 rounded-xl bg-teal-800 text-white font-bold text-xs cursor-pointer active:scale-95"
                  >
                    Add Route
                  </button>
                </div>

                {/* Route Chips List */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 min-h-[90px] max-h-44 overflow-y-auto flex flex-wrap gap-1.5 content-start">
                  {formRoutes.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">
                      No routes added yet. Type a route name above or click "Suggest Standard Beats".
                    </span>
                  ) : (
                    formRoutes.map((route, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] shadow-2xs"
                      >
                        <span>{route}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRouteFromForm(route)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingNode(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-black shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {isCreatingNew ? 'Create Town Node' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
