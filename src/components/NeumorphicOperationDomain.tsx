import React, { useState, useMemo } from 'react';
import {
  Building2,
  Package,
  Store,
  Target,
  Users,
  GitFork,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  CheckCircle2,
  MapPin,
  Shield,
  Phone,
  Mail,
  Sliders,
  DollarSign,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  Layers,
  Lock
} from 'lucide-react';
import { OperationSubTab } from './NeumorphicHeader';
import { User } from '../types';
import { isAdminUser, isFieldForceUser, getAssignedDealerIds } from '../services/production-users';

interface OperationDomainProps {
  activeSubTab: OperationSubTab;
  setActiveSubTab: (tab: OperationSubTab) => void;
  currentUser: User;
  searchQuery: string;
}

export const NeumorphicOperationDomain: React.FC<OperationDomainProps> = ({
  activeSubTab,
  setActiveSubTab,
  currentUser,
  searchQuery,
}) => {
  const isAdmin = isAdminUser(currentUser);
  const isField = isFieldForceUser(currentUser);

  // State Collections
  const [branches, setBranches] = useState<any[]>([]);

  const [products, setProducts] = useState<any[]>([]);

  const [dealers, setDealers] = useState<any[]>([]);

  const [targets, setTargets] = useState<any[]>([]);

  const [salesTeam, setSalesTeam] = useState<any[]>([]);

  const [hierarchyNodes, setHierarchyNodes] = useState<any[]>([]);

  // Modal States
  const [modalType, setModalType] = useState<
    | null
    | 'ADD_BRANCH'
    | 'EDIT_BRANCH'
    | 'ADD_SKU'
    | 'EDIT_SKU'
    | 'ADD_DEALER'
    | 'EDIT_DEALER'
    | 'DEALER_DOSSIER'
    | 'ASSIGN_TARGET'
    | 'VIEW_BEAT'
    | 'ADD_HIERARCHY_NODE'
  >(null);

  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<any>(null);
  const [selectedHierarchyLevel, setSelectedHierarchyLevel] = useState<any>(null);

  // Form Fields
  const [branchForm, setBranchForm] = useState({ name: '', city: '', code: '', phone: '', address: '', status: 'ACTIVE' });
  const [productForm, setProductForm] = useState({ brand: 'National Lights Auto', name: '', category: 'Automotive Bulbs', tradePrice: 0, retailPrice: 0, cartonQty: 100, stock: 1000 });
  const [dealerForm, setDealerForm] = useState({ name: '', town: '', region: 'Punjab Central', creditLimit: 1000000, currentBalance: 0, status: 'NORMAL', phone: '', contactPerson: '', creditDays: 30 });
  const [targetForm, setTargetForm] = useState({ officer: 'Ali Raza (OB)', territory: 'Lahore Metro', targetSales: 2000000, targetRecovery: 1800000, month: 'August 2026' });
  const [hierarchyNodeName, setHierarchyNodeName] = useState('');

  // -------------------------------------------------------------
  // Data Filtering (Strict Scoping for Field Force)
  // -------------------------------------------------------------
  const visibleDealers = useMemo(() => {
    let list = dealers;
    if (isField && !isAdmin) {
      list = list.filter((d) => d.assignedOfficerId === currentUser.id || d.assignedOfficerName.toLowerCase().includes(currentUser.fullName.split(' ')[0].toLowerCase()));
    }
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.town.toLowerCase().includes(q) ||
        d.contactPerson.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
    );
  }, [dealers, isField, isAdmin, currentUser, searchQuery]);

  const visibleTargets = useMemo(() => {
    let list = targets;
    if (isField && !isAdmin) {
      list = list.filter((t) => t.officerId === currentUser.id || t.officer.toLowerCase().includes(currentUser.fullName.split(' ')[0].toLowerCase()));
    }
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((t) => t.officer.toLowerCase().includes(q) || t.territory.toLowerCase().includes(q));
  }, [targets, isField, isAdmin, currentUser, searchQuery]);

  const visibleSalesTeam = useMemo(() => {
    let list = salesTeam;
    if (isField && !isAdmin) {
      list = list.filter((s) => s.userId === currentUser.id || s.name.toLowerCase().includes(currentUser.fullName.split(' ')[0].toLowerCase()));
    }
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((s) => s.name.toLowerCase().includes(q) || s.region.toLowerCase().includes(q));
  }, [salesTeam, isField, isAdmin, currentUser, searchQuery]);

  const visibleProducts = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const visibleBranches = useMemo(() => {
    if (!searchQuery) return branches;
    const q = searchQuery.toLowerCase();
    return branches.filter((b) => b.name.toLowerCase().includes(q) || b.city.toLowerCase().includes(q) || b.code.toLowerCase().includes(q));
  }, [branches, searchQuery]);

  // Handlers
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'ADD_BRANCH') {
      const newBr = { id: `BR-0${branches.length + 1}`, ...branchForm };
      setBranches((prev) => [...prev, newBr]);
    } else if (modalType === 'EDIT_BRANCH' && selectedBranch) {
      setBranches((prev) => prev.map((b) => (b.id === selectedBranch.id ? { ...b, ...branchForm } : b)));
    }
    setModalType(null);
  };

  const handleDeleteBranch = (id: string) => {
    if (!isAdmin) return;
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'ADD_SKU') {
      const newSku = { id: `SKU-00${products.length + 1}`, ...productForm };
      setProducts((prev) => [...prev, newSku]);
    } else if (modalType === 'EDIT_SKU' && selectedProduct) {
      setProducts((prev) => prev.map((p) => (p.id === selectedProduct.id ? { ...p, ...productForm } : p)));
    }
    setModalType(null);
  };

  const handleDeleteProduct = (id: string) => {
    if (!isAdmin) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveDealer = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'ADD_DEALER') {
      const newDlr = {
        id: `DLR-${100 + dealers.length + 1}`,
        ...dealerForm,
        assignedOfficerId: currentUser.id,
        assignedOfficerName: currentUser.fullName,
      };
      setDealers((prev) => [...prev, newDlr]);
    } else if (modalType === 'EDIT_DEALER' && selectedDealer) {
      setDealers((prev) => prev.map((d) => (d.id === selectedDealer.id ? { ...d, ...dealerForm } : d)));
    }
    setModalType(null);
  };

  const handleDeleteDealer = (id: string) => {
    if (!isAdmin) return;
    setDealers((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const newTgt = {
      id: `TGT-0${targets.length + 1}`,
      officerId: currentUser.id,
      officer: targetForm.officer,
      territory: targetForm.territory,
      targetSales: Number(targetForm.targetSales),
      achievedSales: 0,
      targetRecovery: Number(targetForm.targetRecovery),
      achievedRecovery: 0,
      month: targetForm.month,
    };
    setTargets((prev) => [...prev, newTgt]);
    setModalType(null);
  };

  const handleAddHierarchyNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hierarchyNodeName || !selectedHierarchyLevel) return;
    setHierarchyNodes((prev) =>
      prev.map((h) =>
        h.id === selectedHierarchyLevel.id
          ? { ...h, nodes: h.nodes + 1, subNodes: [...h.subNodes, hierarchyNodeName] }
          : h
      )
    );
    setHierarchyNodeName('');
    setModalType(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Sub Tab Navigation Ribbon */}
      <div className="nm-flat p-2 rounded-3xl border border-white">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'COMPANY', label: 'Company / Branch', icon: Building2, adminOnly: true },
            { id: 'BRANDS_PRODUCTS', label: 'Brands & Products', icon: Package, adminOnly: false },
            { id: 'DEALERS_DISTRIBUTORS', label: isField ? 'My Assigned Dealers' : 'Dealers / Distributors', icon: Store, adminOnly: false },
            { id: 'TARGET', label: isField ? 'My Sales Targets' : 'Target Allocation', icon: Target, adminOnly: false },
            { id: 'SALES_TEAM', label: isField ? 'My Route & Beats' : 'Sales Team & Beats', icon: Users, adminOnly: false },
            { id: 'HIERARCHY', label: '5-Tier Hierarchy Tree', icon: GitFork, adminOnly: false },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as OperationSubTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive ? 'nm-btn-primary shadow-sm' : 'nm-btn text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.adminOnly && isAdmin && (
                  <span className="text-[9px] bg-teal-800 text-teal-100 px-1.5 py-0.2 rounded-full ml-1">Admin</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: COMPANY & BRANCH */}
      {activeSubTab === 'COMPANY' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">Branch & Operational Nodes</h2>
                {isAdmin ? (
                  <span className="nm-badge-teal text-[10px] px-2.5 py-0.5 rounded-full font-bold">👑 Admin Master Setup</span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Read-Only</span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? 'Manage provincial hubs, dispatch depots, warehouses and operational locations.'
                  : 'Company branch structures are managed at Head Office. Viewing home branch assignments.'}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setBranchForm({ name: '', city: '', code: '', phone: '', address: '', status: 'ACTIVE' });
                  setModalType('ADD_BRANCH');
                }}
                className="nm-btn-primary px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Branch Node</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleBranches.map((br) => (
              <div key={br.id} className="nm-flat p-5 rounded-3xl border border-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                    {br.code}
                  </span>
                  <span className="nm-badge-teal text-[9px] px-2 py-0.5 rounded-full font-bold">{br.status}</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">{br.name}</h3>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {br.city}, Pakistan
                  </p>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{br.phone}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{br.address}</div>
                </div>
                {isAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setSelectedBranch(br);
                        setBranchForm({ ...br });
                        setModalType('EDIT_BRANCH');
                      }}
                      className="nm-btn p-2 rounded-xl text-slate-600 hover:text-teal-700"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBranch(br.id)}
                      className="nm-btn p-2 rounded-xl text-slate-600 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BRANDS & PRODUCTS */}
      {activeSubTab === 'BRANDS_PRODUCTS' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">Automotive & Industrial SKU Catalog</h2>
              <p className="text-xs text-slate-500">
                Official National Lights halogen, xenon, LED, and commercial vehicle bulb catalogue.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setProductForm({ brand: 'National Lights Auto', name: '', category: 'Automotive Bulbs', tradePrice: 400, retailPrice: 500, cartonQty: 100, stock: 1000 });
                  setModalType('ADD_SKU');
                }}
                className="nm-btn-primary px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Register SKU</span>
              </button>
            )}
          </div>

          <div className="nm-flat rounded-3xl border border-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">SKU Code</th>
                    <th className="py-3.5 px-4">Brand & Description</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Trade Price (PKR)</th>
                    <th className="py-3.5 px-4 text-right">Retail MRP (PKR)</th>
                    <th className="py-3.5 px-4 text-center">Carton Pack</th>
                    <th className="py-3.5 px-4 text-right">Warehouse Stock</th>
                    {isAdmin && <th className="py-3.5 px-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 font-medium text-slate-700">
                  {visibleProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">{p.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.brand}</div>
                      </td>
                      <td className="py-3 px-4">{p.category}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">PKR {p.tradePrice.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-600">PKR {p.retailPrice.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono">{p.cartonQty} pcs</td>
                      <td className="py-3 px-4 text-right font-bold text-teal-700">{p.stock.toLocaleString()} pcs</td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setProductForm({ ...p });
                                setModalType('EDIT_SKU');
                              }}
                              className="nm-btn p-1.5 rounded-xl text-slate-600 hover:text-teal-700"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="nm-btn p-1.5 rounded-xl text-slate-600 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEALERS & DISTRIBUTORS (STRICT SCOPING) */}
      {activeSubTab === 'DEALERS_DISTRIBUTORS' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">
                  {isField ? 'My Assigned Dealers & Distributors' : 'National Dealer & Distributor Network'}
                </h2>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                  isAdmin ? 'nm-badge-teal text-teal-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {isAdmin ? '👑 All Territories' : `Scoped: ${visibleDealers.length} Assigned Accounts`}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isField
                  ? `Showing only accounts assigned to your beat (${currentUser.fullName}). All records synchronized.`
                  : 'Complete commercial partner accounts, credit exposure, and authorized officer assignments.'}
              </p>
            </div>
            <button
              onClick={() => {
                setDealerForm({ name: '', town: '', region: 'Punjab Central', creditLimit: 1500000, currentBalance: 0, status: 'NORMAL', phone: '', contactPerson: '', creditDays: 30 });
                setModalType('ADD_DEALER');
              }}
              className="nm-btn-primary px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Dealer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleDealers.map((d) => {
              const utilPct = Math.round((d.currentBalance / d.creditLimit) * 100);
              return (
                <div key={d.id} className="nm-flat p-5 rounded-3xl border border-white space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                        {d.id}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                          d.status === 'NORMAL'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.status === 'HIGH_RISK'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {d.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-800">{d.name}</h3>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {d.town}
                      </p>
                    </div>

                    <div className="nm-inset p-2.5 rounded-2xl space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Current Exposure:</span>
                        <span className="font-black text-slate-800">PKR {d.currentBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Credit Limit:</span>
                        <span>PKR {d.creditLimit.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            utilPct > 90 ? 'bg-rose-500' : utilPct > 70 ? 'bg-amber-500' : 'bg-teal-500'
                          }`}
                          style={{ width: `${Math.min(utilPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Contact:</span>
                        <span className="font-bold text-slate-700">{d.contactPerson} ({d.phone})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Assigned Officer:</span>
                        <span className="font-bold text-teal-700">{d.assignedOfficerName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-2">
                    <button
                      onClick={() => {
                        setSelectedDealer(d);
                        setModalType('DEALER_DOSSIER');
                      }}
                      className="nm-btn px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Dossier</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedDealer(d);
                          setDealerForm({ ...d });
                          setModalType('EDIT_DEALER');
                        }}
                        className="nm-btn p-1.5 rounded-xl text-slate-600 hover:text-teal-700"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteDealer(d.id)}
                          className="nm-btn p-1.5 rounded-xl text-slate-600 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TARGET ALLOCATION (SCOPED) */}
      {activeSubTab === 'TARGET' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">
                  {isField ? 'My Monthly Sales & Recovery Quota' : 'Field Force Target & Realization Allocations'}
                </h2>
                <span className="nm-badge-teal text-[10px] px-2.5 py-0.5 rounded-full font-bold">August 2026 Cycle</span>
              </div>
              <p className="text-xs text-slate-500">
                {isField
                  ? `Showing personal targets for ${currentUser.fullName}. Evaluated in real time.`
                  : 'Company sales and recovery quotas across all territory sales managers and order bookers.'}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setTargetForm({ officer: 'Ali Raza (OB)', territory: 'Badami Bagh Market', targetSales: 2500000, targetRecovery: 2200000, month: 'August 2026' });
                  setModalType('ASSIGN_TARGET');
                }}
                className="nm-btn-primary px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Assign Monthly Quota</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleTargets.map((t) => {
              const salesPct = Math.round((t.achievedSales / t.targetSales) * 100);
              const recPct = Math.round((t.achievedRecovery / t.targetRecovery) * 100);
              return (
                <div key={t.id} className="nm-flat p-5 rounded-3xl border border-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">{t.officer}</h3>
                      <p className="text-xs text-slate-500 font-medium">{t.territory}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200">
                      {t.month}
                    </span>
                  </div>

                  {/* Sales Target Gauge */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-600">Sales Realization ({salesPct}%)</span>
                      <span className="text-teal-700">PKR {t.achievedSales.toLocaleString()} / {t.targetSales.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-teal-600 h-full rounded-full transition-all" style={{ width: `${Math.min(salesPct, 100)}%` }} />
                    </div>
                  </div>

                  {/* Recovery Target Gauge */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-600">Recovery Realization ({recPct}%)</span>
                      <span className="text-indigo-700">PKR {t.achievedRecovery.toLocaleString()} / {t.targetRecovery.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${Math.min(recPct, 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: SALES TEAM & BEATS */}
      {activeSubTab === 'SALES_TEAM' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">
                {isField ? 'My Assigned Market Route & Beats' : 'Field Sales Force Directory & Route Beats'}
              </h2>
              <p className="text-xs text-slate-500">
                {isField ? 'Weekly market route schedule and active dealer touchpoints.' : 'Field personnel roster, territory regions, and assigned commercial market beats.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleSalesTeam.map((st) => (
              <div key={st.id} className="nm-flat p-5 rounded-3xl border border-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="nm-badge-teal text-[9px] px-2 py-0.5 rounded-full font-bold">{st.role}</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ● {st.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">{st.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{st.region} • {st.phone}</p>
                </div>
                <div className="nm-inset p-3 rounded-2xl space-y-1.5 text-xs text-slate-600">
                  <div className="font-bold text-slate-700">Assigned Weekly Beats:</div>
                  <ul className="space-y-1 text-[11px]">
                    {st.beats.map((b, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-teal-800 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-teal-600" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: 5-TIER HIERARCHY TREE */}
      {activeSubTab === 'HIERARCHY' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">5-Tier Commercial Territory Hierarchy</h2>
              <p className="text-xs text-slate-500">
                National Distribution $\rightarrow$ Regions $\rightarrow$ Zones & Areas $\rightarrow$ Towns & Commercial Markets $\rightarrow$ Daily Beats.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {hierarchyNodes.map((hn) => (
              <div key={hn.id} className="nm-flat p-5 rounded-3xl border border-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl nm-inset flex items-center justify-center text-teal-700 font-black text-xs">
                      {hn.level[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">{hn.level}</h3>
                      <p className="text-xs text-slate-500">{hn.title}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200">
                    {hn.nodes} Nodes Active
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {hn.subNodes.map((sn, idx) => (
                    <span key={idx} className="nm-inset px-3 py-1 rounded-xl text-[11px] font-bold text-slate-700">
                      {sn}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Add / Edit Branch */}
      {(modalType === 'ADD_BRANCH' || modalType === 'EDIT_BRANCH') && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="nm-flat bg-[#E8ECF2] p-6 rounded-3xl border border-white max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-800">
              {modalType === 'ADD_BRANCH' ? 'Register New Branch Node' : 'Edit Branch Configuration'}
            </h3>
            <form onSubmit={handleSaveBranch} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="e.g. Faisalabad Regional Hub"
                  className="w-full p-2.5 rounded-xl nm-inset text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Branch Code</label>
                  <input
                    type="text"
                    required
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl nm-inset text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Complete Physical Address</label>
                <textarea
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="nm-btn px-4 py-2 rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="nm-btn-primary px-5 py-2 rounded-xl font-bold shadow-md">
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add / Edit SKU */}
      {(modalType === 'ADD_SKU' || modalType === 'EDIT_SKU') && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="nm-flat bg-[#E8ECF2] p-6 rounded-3xl border border-white max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-800">
              {modalType === 'ADD_SKU' ? 'Register Automotive SKU' : 'Edit SKU Specifications'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Item Description / Bulb Spec</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. H4 Halogen Headlight 12V 100/90W"
                  className="w-full p-2.5 rounded-xl nm-inset text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trade Price (PKR)</label>
                  <input
                    type="number"
                    required
                    value={productForm.tradePrice}
                    onChange={(e) => setProductForm({ ...productForm, tradePrice: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Retail MRP (PKR)</label>
                  <input
                    type="number"
                    required
                    value={productForm.retailPrice}
                    onChange={(e) => setProductForm({ ...productForm, retailPrice: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Carton Pack Qty</label>
                  <input
                    type="number"
                    value={productForm.cartonQty}
                    onChange={(e) => setProductForm({ ...productForm, cartonQty: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Warehouse Stock (Pcs)</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="nm-btn px-4 py-2 rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="nm-btn-primary px-5 py-2 rounded-xl font-bold shadow-md">
                  Save SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add / Edit Dealer */}
      {(modalType === 'ADD_DEALER' || modalType === 'EDIT_DEALER') && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="nm-flat bg-[#E8ECF2] p-6 rounded-3xl border border-white max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-800">
              {modalType === 'ADD_DEALER' ? 'Register Commercial Dealer' : 'Edit Dealer Account'}
            </h3>
            <form onSubmit={handleSaveDealer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Business / Shop Name</label>
                <input
                  type="text"
                  required
                  value={dealerForm.name}
                  onChange={(e) => setDealerForm({ ...dealerForm, name: e.target.value })}
                  placeholder="e.g. Al-Madina Auto Spares"
                  className="w-full p-2.5 rounded-xl nm-inset text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Town / Market Beat</label>
                  <input
                    type="text"
                    required
                    value={dealerForm.town}
                    onChange={(e) => setDealerForm({ ...dealerForm, town: e.target.value })}
                    placeholder="e.g. Montgomery Road, Lahore"
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Region</label>
                  <input
                    type="text"
                    value={dealerForm.region}
                    onChange={(e) => setDealerForm({ ...dealerForm, region: e.target.value })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Credit Limit (PKR)</label>
                  <input
                    type="number"
                    required
                    value={dealerForm.creditLimit}
                    onChange={(e) => setDealerForm({ ...dealerForm, creditLimit: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Credit Days Term</label>
                  <input
                    type="number"
                    value={dealerForm.creditDays}
                    onChange={(e) => setDealerForm({ ...dealerForm, creditDays: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={dealerForm.contactPerson}
                    onChange={(e) => setDealerForm({ ...dealerForm, contactPerson: e.target.value })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={dealerForm.phone}
                    onChange={(e) => setDealerForm({ ...dealerForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="nm-btn px-4 py-2 rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="nm-btn-primary px-5 py-2 rounded-xl font-bold shadow-md">
                  Save Dealer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Dealer Dossier Modal */}
      {modalType === 'DEALER_DOSSIER' && selectedDealer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="nm-flat bg-[#E8ECF2] p-6 rounded-3xl border border-white max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                  {selectedDealer.id}
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1">{selectedDealer.name}</h3>
                <p className="text-xs text-slate-500">{selectedDealer.town} • {selectedDealer.region}</p>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="nm-btn w-8 h-8 rounded-full text-slate-600 font-bold hover:text-slate-900 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="nm-inset p-3 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Current Outstanding</span>
                <div className="text-base font-black text-slate-800">
                  PKR {selectedDealer.currentBalance.toLocaleString()}
                </div>
              </div>
              <div className="nm-inset p-3 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Credit Approved Limit</span>
                <div className="text-base font-black text-teal-700">
                  PKR {selectedDealer.creditLimit.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="nm-inset p-4 rounded-2xl space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-500">Contact Proprietor:</span>
                <span className="font-bold text-slate-800">{selectedDealer.contactPerson}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-bold text-slate-800">{selectedDealer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Term:</span>
                <span className="font-bold text-slate-800">{selectedDealer.creditDays} Days Credit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Field Force:</span>
                <span className="font-bold text-teal-700">{selectedDealer.assignedOfficerName}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalType(null)}
                className="nm-btn px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Assign Target Modal (Admin Only) */}
      {modalType === 'ASSIGN_TARGET' && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="nm-flat bg-[#E8ECF2] p-6 rounded-3xl border border-white max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-800">Assign Monthly Target Quota</h3>
            <form onSubmit={handleSaveTarget} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Sales Officer / TSM</label>
                <select
                  value={targetForm.officer}
                  onChange={(e) => setTargetForm({ ...targetForm, officer: e.target.value })}
                  className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                >
                  <option value="Ali Raza (OB)">Ali Raza (OB) - Lahore Metro</option>
                  <option value="Muhammad Usman (TSM)">Muhammad Usman (TSM) - Punjab Central</option>
                  <option value="Farhan Siddiqui (TSM)">Farhan Siddiqui (TSM) - Sindh South</option>
                  <option value="Zahid Mehmood (ASM)">Zahid Mehmood (ASM) - North & South Punjab</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Territory Label</label>
                <input
                  type="text"
                  required
                  value={targetForm.territory}
                  onChange={(e) => setTargetForm({ ...targetForm, territory: e.target.value })}
                  className="w-full p-2.5 rounded-xl nm-inset text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sales Target (PKR)</label>
                  <input
                    type="number"
                    required
                    value={targetForm.targetSales}
                    onChange={(e) => setTargetForm({ ...targetForm, targetSales: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-teal-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Recovery Target (PKR)</label>
                  <input
                    type="number"
                    required
                    value={targetForm.targetRecovery}
                    onChange={(e) => setTargetForm({ ...targetForm, targetRecovery: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-indigo-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="nm-btn px-4 py-2 rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="nm-btn-primary px-5 py-2 rounded-xl font-bold shadow-md">
                  Assign Quota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
