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
  Lock,
  ShieldAlert
} from 'lucide-react';
import { TerritoryHierarchyD3Map } from './TerritoryHierarchyD3Map';
import { OperationSubTab } from './NeumorphicHeader';
import { User, UserRole } from '../types';
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
  const [branches, setBranches] = useState<any[]>([
    {
      id: 'BR-01',
      name: 'National Lights Head Office, Lahore',
      city: 'Lahore',
      code: 'HO-LHR',
      phone: '+92 42 37350001',
      address: 'Brandreth Road, Lahore, Punjab',
      status: 'ACTIVE',
    },
    {
      id: 'BR-02',
      name: 'Karachi Regional Distribution Depot',
      city: 'Karachi',
      code: 'DEP-KHI',
      phone: '+92 21 32410002',
      address: 'Plaza Quarter, M.A. Jinnah Road, Karachi, Sindh',
      status: 'ACTIVE',
    },
    {
      id: 'BR-03',
      name: 'Rawalpindi / Islamabad Hub',
      city: 'Rawalpindi',
      code: 'DEP-RWP',
      phone: '+92 51 55310003',
      address: 'Gawalmandi Auto Market, Rawalpindi, Punjab',
      status: 'ACTIVE',
    },
    {
      id: 'BR-04',
      name: 'Peshawar North Depot',
      city: 'Peshawar',
      code: 'DEP-PEW',
      phone: '+92 91 52710004',
      address: 'Industrial Estate, Jamrud Road, Peshawar, KPK',
      status: 'ACTIVE',
    },
  ]);

  const [products, setProducts] = useState<any[]>([
    {
      id: 'SKU-NL-01',
      brand: 'National Lights Auto',
      name: 'H4 Heavy Duty Halogen Bulb 12V 60/55W (Gold Box)',
      category: 'Automotive Bulbs',
      tradePrice: 380,
      retailPrice: 550,
      cartonQty: 100,
      stock: 4500,
    },
    {
      id: 'SKU-NL-02',
      brand: 'National Lights Auto',
      name: 'LED Headlight Conversion Kit H7 Super Bright 6500K',
      category: 'LED Lighting',
      tradePrice: 2850,
      retailPrice: 4200,
      cartonQty: 20,
      stock: 1200,
    },
    {
      id: 'SKU-NL-03',
      brand: 'National Lights Industrial',
      name: 'Heavy Duty Fog Light Assembly Sealed Beam (Universal Fit)',
      category: 'Auxiliary Lighting',
      tradePrice: 1450,
      retailPrice: 2100,
      cartonQty: 30,
      stock: 850,
    },
    {
      id: 'SKU-NL-04',
      brand: 'National Lights Auto',
      name: 'T10 Wedge Bulb 12V 5W Amber Signal (Pack of 10)',
      category: 'Miniature Bulbs',
      tradePrice: 180,
      retailPrice: 280,
      cartonQty: 200,
      stock: 8900,
    },
  ]);

  const [dealers, setDealers] = useState<any[]>([
    {
      id: 'DLR-101',
      name: 'Al-Madina Auto Spares & Lighting',
      customerType: 'DEALER',
      region: 'Punjab Central',
      area: 'Lahore Division',
      territory: 'Brandreth Road Market',
      assignedTsm: 'Ali Raza (TSM)',
      assignedOfficerId: 'USR-ADMIN-01',
      assignedOfficerName: 'Ali Raza (TSM)',
      town: 'Lahore',
      cnic: '35202-1234567-1',
      contactPerson: 'Haji Muhammad Younas',
      phone: '+92 300 4123456',
      secondaryPhone: '+92 321 9876543',
      email: 'almadina.auto@gmail.com',
      address: 'Shop #42, Main Brandreth Road Market, Lahore',
      ntn: '1234567-8',
      strn: '32-77-8765-432-1',
      creditLimit: 2500000,
      creditDays: 30,
      currentBalance: 1420000,
      status: 'NORMAL',
      bankName: 'Meezan Bank Ltd, Brandreth Branch',
      bankIban: 'PK36MEZN0001020304050607',
    },
    {
      id: 'DLR-102',
      name: 'Khyber Auto Electric Store',
      customerType: 'DISTRIBUTOR',
      region: 'KPK West',
      area: 'Peshawar Division',
      territory: 'Karkhano Market',
      assignedTsm: 'Tariq Mansoor (RSM)',
      assignedOfficerId: 'USR-ADMIN-02',
      assignedOfficerName: 'Tariq Mansoor (RSM)',
      town: 'Peshawar',
      cnic: '17301-9876543-3',
      contactPerson: 'Gul Khan Afridi',
      phone: '+92 345 9012345',
      secondaryPhone: '+92 333 8877665',
      email: 'khyberauto.pew@gmail.com',
      address: 'Plaza #12, Karkhano Wholesale Market, Peshawar',
      ntn: '9876543-2',
      strn: '17-00-9876-543-2',
      creditLimit: 5000000,
      creditDays: 45,
      currentBalance: 3850000,
      status: 'NORMAL',
      bankName: 'Bank of Khyber, Jamrud Road',
      bankIban: 'PK12BOKH0009876543210000',
    },
    {
      id: 'DLR-103',
      name: 'Super Karachi Auto Traders',
      customerType: 'DISTRIBUTOR',
      region: 'Sindh South',
      area: 'Karachi South Zone',
      territory: 'Plaza Market Saddar',
      assignedTsm: 'Farhan Siddiqui (TSM)',
      assignedOfficerId: 'USR-ADMIN-03',
      assignedOfficerName: 'Farhan Siddiqui (TSM)',
      town: 'Karachi',
      cnic: '42101-5544332-1',
      contactPerson: 'Syed Tariq Ali',
      phone: '+92 333 2145678',
      secondaryPhone: '+92 300 5544332',
      email: 'superkarachiauto@yahoo.com',
      address: 'Shop #108, Plaza Auto Market, Saddar, Karachi',
      ntn: '5544332-9',
      strn: '42-10-5544-332-1',
      creditLimit: 4000000,
      creditDays: 30,
      currentBalance: 2900000,
      status: 'HIGH_RISK',
      bankName: 'Habib Bank Ltd, Plaza Branch',
      bankIban: 'PK99HABB0001122334455667',
    },
  ]);

  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([
    {
      id: 'REG-REQ-301',
      businessName: 'Farhan Light House, Multan',
      ownerName: 'Muhammad Farhan',
      contactNumber: '+92 315 7654321',
      cnic: '36302-8877665-1',
      address: 'Main Chowk Ghanta Ghar, Multan',
      city: 'Multan',
      region: 'Punjab South',
      type: 'DEALER',
      proposedCreditLimit: 500000,
      proposedCreditDays: 15,
      proposedOpeningBalance: 0,
      additionalNotes: 'Highly active lighting dealer in southern Punjab auto sector. Recommending credit approval.',
      salesUserId: 'USR-TSM-01',
      salesUserName: 'Tariq Mansoor (TSM)',
      submittedAt: '2026-08-29'
    }
  ]);

  const [targets, setTargets] = useState<any[]>([
    {
      id: 'TGT-01',
      officerId: 'EMP-001',
      officer: 'Ali Raza (TSM)',
      territory: 'Brandreth Road Market, Lahore',
      targetSales: 2500000,
      achievedSales: 1850000,
      targetRecovery: 2000000,
      achievedRecovery: 1620000,
      month: 'August 2026',
    },
    {
      id: 'TGT-02',
      officerId: 'EMP-002',
      officer: 'Muhammad Usman (TSM)',
      territory: 'Gujranwala Industrial Beat',
      targetSales: 2200000,
      achievedSales: 1780000,
      targetRecovery: 1900000,
      achievedRecovery: 1450000,
      month: 'August 2026',
    },
    {
      id: 'TGT-03',
      officerId: 'EMP-003',
      officer: 'Farhan Siddiqui (TSM)',
      territory: 'Plaza Auto Market, Karachi',
      targetSales: 3500000,
      achievedSales: 2900000,
      targetRecovery: 3000000,
      achievedRecovery: 2400000,
      month: 'August 2026',
    },
  ]);

  const [salesTeam, setSalesTeam] = useState<any[]>([
    {
      id: 'EMP-001',
      name: 'Ali Raza',
      role: 'TSM',
      employeeCode: 'NL-TSM-101',
      cnic: '35202-9876543-1',
      phone: '+92 300 8456101',
      emergencyPhone: '+92 321 4455667',
      email: 'aliraza@nationallights.com',
      region: 'Punjab Central',
      area: 'Lahore Division',
      territory: 'Brandreth Road & Montgomery Road',
      baseBranch: 'National Lights Head Office, Lahore',
      targetMonthlySales: 2500000,
      targetMonthlyRecovery: 2000000,
      dateOfJoining: '2023-01-15',
      designation: 'Territory Sales & Recovery Officer',
      salaryGrade: 'Grade B2 + 1.5% Sales Commission',
      address: 'Plot 45, Sector B, Bahria Town, Lahore',
      status: 'ACTIVE',
      beats: ['Monday: Brandreth Road', 'Tuesday: Montgomery Road', 'Wednesday: Badami Bagh', 'Thursday: Hall Road', 'Friday: Township Market'],
    },
    {
      id: 'EMP-002',
      name: 'Muhammad Usman',
      role: 'TSM',
      employeeCode: 'NL-TSM-102',
      cnic: '34101-5544332-1',
      phone: '+92 301 9876543',
      emergencyPhone: '+92 300 1122334',
      email: 'usman@nationallights.com',
      region: 'Punjab Central',
      area: 'Gujranwala Zone',
      territory: 'Gondlanwala Road & Small Industrial Estate',
      baseBranch: 'Gujranwala Regional Hub',
      targetMonthlySales: 2200000,
      targetMonthlyRecovery: 1900000,
      dateOfJoining: '2023-05-10',
      designation: 'Territory Sales Manager',
      salaryGrade: 'Grade B2 + 1.5% Commission',
      address: 'House #12, Model Town, Gujranwala',
      status: 'ACTIVE',
      beats: ['Monday: Gondlanwala Road', 'Tuesday: GT Road Market', 'Wednesday: Small Industrial Estate', 'Thursday: Sialkot Road'],
    },
    {
      id: 'EMP-003',
      name: 'Farhan Siddiqui',
      role: 'TSM',
      employeeCode: 'NL-TSM-103',
      cnic: '42101-8877665-3',
      phone: '+92 333 4567890',
      emergencyPhone: '+92 334 9988776',
      email: 'farhan@nationallights.com',
      region: 'Sindh South',
      area: 'Karachi South Zone',
      territory: 'Plaza Auto Market & Saddar',
      baseBranch: 'Karachi Central Branch',
      targetMonthlySales: 3500000,
      targetMonthlyRecovery: 3000000,
      dateOfJoining: '2022-09-01',
      designation: 'Senior Territory Manager',
      salaryGrade: 'Grade B1 + 2.0% Commission',
      address: 'Flat 4B, Clifton Block 5, Karachi',
      status: 'ACTIVE',
      beats: ['Monday: Plaza Market', 'Tuesday: Saddar Auto Market', 'Wednesday: Shershah Colony', 'Thursday: Tariq Road Market'],
    },
    {
      id: 'EMP-004',
      name: 'Zahid Mehmood',
      role: 'ASM',
      employeeCode: 'NL-ASM-201',
      cnic: '37405-1122334-5',
      phone: '+92 300 5566778',
      emergencyPhone: '+92 301 8899001',
      email: 'zahid@nationallights.com',
      region: 'Punjab North',
      area: 'Rawalpindi & Islamabad',
      territory: 'Gawalmandi & I-9 Industrial Area',
      baseBranch: 'Rawalpindi Depot',
      targetMonthlySales: 4500000,
      targetMonthlyRecovery: 4000000,
      dateOfJoining: '2021-03-20',
      designation: 'Area Sales Manager',
      salaryGrade: 'Grade A2 Executive',
      address: 'Street 9, F-11/2, Islamabad',
      status: 'ACTIVE',
      beats: ['Monday: Gawalmandi Rawalpindi', 'Tuesday: I-9 Industrial Area', 'Wednesday: Abpara Market', 'Thursday: Saddar Rawalpindi'],
    },
    {
      id: 'EMP-005',
      name: 'Tariq Mansoor',
      role: 'RSM',
      employeeCode: 'NL-RSM-301',
      cnic: '17301-6655443-7',
      phone: '+92 345 9876543',
      emergencyPhone: '+92 346 1122334',
      email: 'tariq@nationallights.com',
      region: 'KPK West',
      area: 'Peshawar & Mardan Region',
      territory: 'Karkhano Market & Khyber Bazaar',
      baseBranch: 'Peshawar Depot',
      targetMonthlySales: 6000000,
      targetMonthlyRecovery: 5500000,
      dateOfJoining: '2020-06-15',
      designation: 'Regional Sales Manager',
      salaryGrade: 'Grade A1 Executive',
      address: 'University Town, Peshawar',
      status: 'ACTIVE',
      beats: ['Monday: Karkhano Market', 'Tuesday: Khyber Bazaar', 'Wednesday: Mardan City Market', 'Thursday: Swabi Center'],
    },
  ]);

  const [hierarchyNodes, setHierarchyNodes] = useState<any[]>([
    {
      id: 'HN-01',
      level: 'Tier 1: Executive Governance',
      title: 'Head Office Board & Managing Administrator',
      nodes: 3,
      subNodes: ['National Lights Head Office, Lahore', 'Executive Board', 'IT & Operations Governance Panel'],
    },
    {
      id: 'HN-02',
      level: 'Tier 2: Regional Operations (RSM)',
      title: 'Provincial Sales & Recovery Hubs',
      nodes: 5,
      subNodes: ['Punjab Central Region', 'Punjab North Region', 'Sindh South Region', 'KPK West Region', 'Balochistan Region'],
    },
    {
      id: 'HN-03',
      level: 'Tier 3: Area Divisions (ASM)',
      title: 'Zonal & Divisional Field Boundaries',
      nodes: 8,
      subNodes: ['Lahore Division', 'Gujranwala Zone', 'Rawalpindi/Islamabad Zone', 'Karachi South Zone', 'Peshawar Division'],
    },
    {
      id: 'HN-04',
      level: 'Tier 4: Territory Beats (TSM)',
      title: 'Territory Sales Managers & Recovery Officers',
      nodes: 14,
      subNodes: ['Brandreth Road Market', 'Montgomery Road Beat', 'Gawalmandi Rawalpindi', 'Plaza Market Karachi', 'Karkhano Market Peshawar'],
    },
    {
      id: 'HN-05',
      level: 'Tier 5: Commercial Outlets & Distributors',
      title: 'Authorized Dealers, Distributors & Stockists',
      nodes: 180,
      subNodes: ['Active Outlets (180 Commercial Accounts)', 'Monitored Credit Portfolios', 'Weekly Geo-Tagged Beats'],
    },
  ]);

  const [towns, setTowns] = useState<any[]>([
    { id: 'TWN-01', name: 'Lahore', area: 'Lahore Division', region: 'Punjab Central', assignedTsm: 'Ali Raza (TSM)', status: 'ACTIVE' },
    { id: 'TWN-02', name: 'Gujranwala', area: 'Gujranwala Zone', region: 'Punjab Central', assignedTsm: 'Muhammad Usman (TSM)', status: 'ACTIVE' },
    { id: 'TWN-03', name: 'Karachi', area: 'Karachi South Zone', region: 'Sindh South', assignedTsm: 'Farhan Siddiqui (TSM)', status: 'ACTIVE' },
    { id: 'TWN-04', name: 'Peshawar', area: 'Peshawar Division', region: 'KPK West', assignedTsm: 'Tariq Mansoor (RSM)', status: 'ACTIVE' },
    { id: 'TWN-05', name: 'Multan', area: 'Multan Zone', region: 'Punjab South', assignedTsm: 'Unassigned', status: 'INACTIVE' },
  ]);

  const [newTownName, setNewTownName] = useState('');
  const [newTownArea, setNewTownArea] = useState('Lahore Division');
  const [newTownRegion, setNewTownRegion] = useState('Punjab Central');
  const [newTownTsm, setNewTownTsm] = useState('Ali Raza (TSM)');
  const [editingTownId, setEditingTownId] = useState<string | null>(null);

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
    | 'ADD_SALES_MEMBER'
    | 'EDIT_SALES_MEMBER'
    | 'EMPLOYEE_DOSSIER'
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
  const [dealerForm, setDealerForm] = useState({
    name: '',
    customerType: 'DEALER',
    region: 'Punjab Central',
    area: 'Lahore Division',
    territory: 'Brandreth Road Market',
    assignedTsm: 'Ali Raza (TSM)',
    town: 'Lahore',
    cnic: '35202-1234567-1',
    contactPerson: '',
    phone: '',
    secondaryPhone: '',
    email: '',
    address: '',
    ntn: '',
    strn: '',
    creditLimit: 1500000,
    creditDays: 30,
    currentBalance: 0,
    status: 'NORMAL',
    bankName: 'Meezan Bank Ltd',
    bankIban: '',
  });
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    employeeCode: '',
    cnic: '',
    phone: '',
    emergencyPhone: '',
    email: '',
    role: 'TSM' as UserRole,
    designation: 'Territory Sales Manager',
    region: 'Punjab Central',
    area: 'Lahore Division',
    territory: 'Brandreth Road Market',
    baseBranch: 'National Lights Head Office, Lahore',
    targetMonthlySales: 2500000,
    targetMonthlyRecovery: 2000000,
    dateOfJoining: '2024-01-01',
    salaryGrade: 'Grade B2 + 1.5% Commission',
    address: '',
    status: 'ACTIVE',
    beatsStr: 'Monday: Main Market, Tuesday: Auto Beat 1, Wednesday: Commercial Zone',
  });
  const [targetForm, setTargetForm] = useState({ officer: 'Ali Raza (TSM)', territory: 'Lahore Metro', targetSales: 2000000, targetRecovery: 1800000, month: 'August 2026' });
  const [hierarchyForm, setHierarchyForm] = useState({
    tierLevel: 'Tier 2: Regional Operations (RSM)',
    nodeName: '',
    assignedOfficer: 'Ali Raza (TSM)',
    notes: '',
  });

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

  // Permission Middleware & Mobile Grid Expansion States
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCardIds((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const enforceAdminWritePermission = (actionLabel: string): boolean => {
    if (!isAdmin) {
      setPermissionError(
        `Access Denied: Administrative authority required to ${actionLabel}. Only Super Admin & Executive Management accounts hold write access.`
      );
      setTimeout(() => setPermissionError(null), 8000);
      return false;
    }
    setPermissionError(null);
    return true;
  };

  // Handlers
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enforceAdminWritePermission('register or modify branch nodes')) return;
    if (modalType === 'ADD_BRANCH') {
      const newBr = { id: `BR-0${branches.length + 1}`, ...branchForm };
      setBranches((prev) => [...prev, newBr]);
    } else if (modalType === 'EDIT_BRANCH' && selectedBranch) {
      setBranches((prev) => prev.map((b) => (b.id === selectedBranch.id ? { ...b, ...branchForm } : b)));
    }
    setModalType(null);
  };

  const handleDeleteBranch = (id: string) => {
    if (!enforceAdminWritePermission('delete branch nodes')) return;
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enforceAdminWritePermission('register or modify SKU catalog items')) return;
    if (modalType === 'ADD_SKU') {
      const newSku = { id: `SKU-00${products.length + 1}`, ...productForm };
      setProducts((prev) => [...prev, newSku]);
    } else if (modalType === 'EDIT_SKU' && selectedProduct) {
      setProducts((prev) => prev.map((p) => (p.id === selectedProduct.id ? { ...p, ...productForm } : p)));
    }
    setModalType(null);
  };

  const handleDeleteProduct = (id: string) => {
    if (!enforceAdminWritePermission('delete SKU catalog items')) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveDealer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enforceAdminWritePermission('register or update dealer accounts')) return;
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
    if (!enforceAdminWritePermission('delete dealer accounts')) return;
    setDealers((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enforceAdminWritePermission('reassign or allocate monthly target quotas')) return;
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

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enforceAdminWritePermission('register or edit employee dossiers')) return;
    const beatsList = employeeForm.beatsStr
      ? employeeForm.beatsStr.split(',').map((b) => b.trim()).filter(Boolean)
      : ['Monday: Main Market', 'Tuesday: Commercial Beat'];

    if (modalType === 'ADD_SALES_MEMBER') {
      const newEmp = {
        id: `EMP-00${salesTeam.length + 1}`,
        ...employeeForm,
        beats: beatsList,
      };
      setSalesTeam((prev) => [...prev, newEmp]);
    } else if (modalType === 'EDIT_SALES_MEMBER' && selectedSalesPerson) {
      setSalesTeam((prev) =>
        prev.map((s) => (s.id === selectedSalesPerson.id ? { ...s, ...employeeForm, beats: beatsList } : s))
      );
    }
    setModalType(null);
  };

  const handleDeleteEmployee = (id: string) => {
    if (!enforceAdminWritePermission('delete employee dossiers')) return;
    setSalesTeam((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSaveHierarchyNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enforceAdminWritePermission('alter or add 5-tier regional hierarchy nodes')) return;
    if (!hierarchyForm.nodeName) return;
    const targetLevel = hierarchyNodes.find((h) => h.level === hierarchyForm.tierLevel) || hierarchyNodes[1];
    
    setHierarchyNodes((prev) =>
      prev.map((h) =>
        h.id === targetLevel.id
          ? { ...h, nodes: h.nodes + 1, subNodes: [...h.subNodes, `${hierarchyForm.nodeName} (${hierarchyForm.assignedOfficer})`] }
          : h
      )
    );
    setHierarchyForm({
      tierLevel: 'Tier 2: Regional Operations (RSM)',
      nodeName: '',
      assignedOfficer: 'Ali Raza (TSM)',
      notes: '',
    });
    setModalType(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Permission Alert Banner */}
      {permissionError && (
        <div className="nm-flat p-4 rounded-3xl border border-rose-300 bg-rose-50/90 text-rose-900 flex items-center justify-between gap-3 text-xs font-bold shadow-md animate-pulse">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{permissionError}</span>
          </div>
          <button onClick={() => setPermissionError(null)} className="nm-btn p-1.5 rounded-xl text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
            {visibleBranches.map((br) => {
              const isExpanded = !!expandedCardIds[br.id];
              return (
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

                  {/* Mobile Touch Collapsible Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleCardExpansion(br.id)}
                    className="sm:hidden w-full pt-1.5 text-[11px] font-bold text-teal-700 flex items-center justify-between border-t border-slate-200/60"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'Tap for Contact & Address'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  <div className={`text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-200 ${isExpanded ? 'block' : 'hidden sm:block'}`}>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{br.phone}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{br.address}</div>
                  </div>

                  {isAdmin && (
                    <div className={`items-center justify-end gap-2 pt-2 border-t border-slate-200 ${isExpanded ? 'flex' : 'hidden sm:flex'}`}>
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
              );
            })}
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

          {/* Mobile Collapsible SKU Cards (Small Screens) */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {visibleProducts.map((p) => {
              const isExpanded = !!expandedCardIds[p.id];
              return (
                <div key={p.id} className="nm-flat p-4 rounded-3xl border border-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                      {p.id}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold border border-slate-200">
                      {p.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-800">{p.name}</h3>
                    <p className="text-[11px] text-slate-500 font-medium">{p.brand}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 font-semibold">Trade Price:</span>
                    <span className="font-black text-slate-800">PKR {p.tradePrice.toLocaleString()}</span>
                  </div>

                  {/* Touch Collapsible Expander Button */}
                  <button
                    type="button"
                    onClick={() => toggleCardExpansion(p.id)}
                    className="w-full pt-1.5 text-[11px] font-bold text-teal-700 flex items-center justify-between border-t border-slate-200/60"
                  >
                    <span>{isExpanded ? 'Hide Specs & Stock' : 'Tap for MRP, Carton & Stock'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Collapsible Inner Specs */}
                  {isExpanded && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 text-xs text-slate-600 nm-inset p-3 rounded-2xl">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Retail MRP:</span>
                        <span className="font-bold text-slate-800">PKR {p.retailPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Carton Packing:</span>
                        <span className="font-mono font-bold text-slate-800">{p.cartonQty} pcs / box</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                        <span className="text-slate-500">Warehouse Stock:</span>
                        <span className="font-bold text-teal-700">{p.stock.toLocaleString()} pcs</span>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setProductForm({ ...p });
                              setModalType('EDIT_SKU');
                            }}
                            className="nm-btn p-1.5 rounded-xl text-slate-600 hover:text-teal-700 flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit SKU</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="nm-btn p-1.5 rounded-xl text-slate-600 hover:text-rose-600 flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (Medium & Larger Screens) */}
          <div className="hidden md:block nm-flat rounded-3xl border border-white overflow-hidden">
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
          {/* Pending Approvals Panel (HO/Admin view only) */}
          {!isField && pendingRegistrations.length > 0 && (
            <div className="nm-flat p-6 rounded-3xl border border-white space-y-4 bg-amber-50/25">
              <div className="border-b border-slate-300 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                    Pending Field Registrations waiting for Approval ({pendingRegistrations.length})
                  </h3>
                  <p className="text-xs text-slate-500">Submitted by field representatives. Review proposed commercial terms and authorize.</p>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full uppercase">
                  Action Required
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRegistrations.map((reg) => (
                  <div key={reg.id} className="nm-inset p-4 rounded-2xl bg-white space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800 text-sm">{reg.businessName}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                        {reg.type} REQUEST
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>Owner: <span className="font-bold text-slate-800">{reg.ownerName}</span></div>
                      <div>Mobile: <span className="font-bold text-slate-800">{reg.contactNumber}</span></div>
                      <div>CNIC: <span className="font-mono">{reg.cnic}</span></div>
                      <div>City: <span className="font-bold text-slate-800">{reg.city} ({reg.region})</span></div>
                      <div>Proposed Limit: <span className="font-mono font-bold text-teal-700">PKR {reg.proposedCreditLimit.toLocaleString()}</span></div>
                      <div>Proposed Days: <span className="font-bold text-slate-700">{reg.proposedCreditDays} Days</span></div>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                      " {reg.additionalNotes || 'No notes added' } "
                    </p>
                    
                    <div className="text-[10px] text-slate-400">
                      Submitted by <span className="font-bold text-slate-600">{reg.salesUserName || 'Field Rep'}</span> on {reg.submittedAt}
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingRegistrations(prev => prev.filter(p => p.id !== reg.id));
                          alert('Dealer registration request declined.');
                        }}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-center text-xs"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newDealer = {
                            id: `DLR-${Math.floor(104 + Math.random() * 900)}`,
                            name: reg.businessName,
                            customerType: reg.type,
                            region: reg.region,
                            area: `${reg.city} Division`,
                            territory: reg.address,
                            assignedTsm: reg.salesUserName || 'Ali Raza (TSM)',
                            assignedOfficerId: reg.salesUserId || 'USR-ADMIN-01',
                            assignedOfficerName: reg.salesUserName || 'Ali Raza (TSM)',
                            town: reg.city,
                            cnic: reg.cnic,
                            contactPerson: reg.ownerName,
                            phone: reg.contactNumber,
                            address: reg.address,
                            creditLimit: reg.proposedCreditLimit,
                            creditDays: reg.proposedCreditDays,
                            currentBalance: reg.proposedOpeningBalance,
                            status: 'NORMAL',
                          };
                          setDealers(prev => [newDealer, ...prev]);
                          setPendingRegistrations(prev => prev.filter(p => p.id !== reg.id));
                          alert(`Authorization Complete! "${reg.businessName}" has been successfully activated.`);
                        }}
                        className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-center text-xs shadow-sm"
                      >
                        Approve & Activate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              const isExpanded = !!expandedCardIds[d.id];
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
                      <p className="text-[11px] text-slate-500 font-medium flex items-center justify-between mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {d.town}
                        </span>
                        <span className="font-mono font-bold text-slate-700 sm:hidden">
                          PKR {(d.currentBalance / 100000).toFixed(1)}L Exposure
                        </span>
                      </p>
                    </div>

                    {/* Touch Collapsible Expander Button */}
                    <button
                      type="button"
                      onClick={() => toggleCardExpansion(d.id)}
                      className="sm:hidden w-full pt-1.5 text-[11px] font-bold text-teal-700 flex items-center justify-between border-t border-slate-200/60"
                    >
                      <span>{isExpanded ? 'Hide Credit & Contact' : 'Tap for Exposure & Contact'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    <div className={`space-y-2 ${isExpanded ? 'block' : 'hidden sm:block'}`}>
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
                  </div>

                  <div className={`items-center justify-between pt-3 border-t border-slate-200 mt-2 ${isExpanded ? 'flex' : 'hidden sm:flex'}`}>
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
              const isExpanded = !!expandedCardIds[t.id];
              return (
                <div key={t.id} className="nm-flat p-5 rounded-3xl border border-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">{t.officer}</h3>
                      <p className="text-xs text-slate-500 font-medium">{t.territory}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200">
                        {t.month}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 sm:hidden">
                        Sales: {salesPct}% | Rec: {recPct}%
                      </span>
                    </div>
                  </div>

                  {/* Touch Collapsible Expander Button */}
                  <button
                    type="button"
                    onClick={() => toggleCardExpansion(t.id)}
                    className="sm:hidden w-full pt-1.5 text-[11px] font-bold text-teal-700 flex items-center justify-between border-t border-slate-200/60"
                  >
                    <span>{isExpanded ? 'Hide Realization Progress' : 'Tap for Sales & Recovery Gauges'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  <div className={`space-y-3 ${isExpanded ? 'block' : 'hidden sm:block'}`}>
                    {/* Sales Target Gauge */}
                    <div className="space-y-1.5 pt-1">
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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">
                  {isField ? 'My Field Personnel Profile & Route Beats' : 'Field Personnel Directory & Operations Roster'}
                </h2>
                <span className="nm-badge-teal text-[10px] px-2.5 py-0.5 rounded-full font-bold">A-to-Z Registered Force</span>
              </div>
              <p className="text-xs text-slate-500">
                {isField
                  ? 'Weekly market route schedule and active territory beats.'
                  : 'Complete employee credentials, CNIC records, contact numbers, assigned territories, target quotas, and salary grades.'}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setEmployeeForm({
                    name: '',
                    employeeCode: `NL-TSM-${100 + salesTeam.length + 1}`,
                    cnic: '',
                    phone: '',
                    emergencyPhone: '',
                    email: '',
                    role: 'TSM',
                    designation: 'Territory Sales Manager',
                    region: 'Punjab Central',
                    area: 'Lahore Division',
                    territory: 'Brandreth Road Market',
                    baseBranch: 'National Lights Head Office, Lahore',
                    targetMonthlySales: 2500000,
                    targetMonthlyRecovery: 2000000,
                    dateOfJoining: new Date().toISOString().split('T')[0],
                    salaryGrade: 'Grade B2 + 1.5% Sales Commission',
                    address: '',
                    status: 'ACTIVE',
                    beatsStr: 'Monday: Main Market, Tuesday: Auto Market, Wednesday: Commercial Zone',
                  });
                  setModalType('ADD_SALES_MEMBER');
                }}
                className="nm-btn-primary px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Employee</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleSalesTeam.map((st) => {
              const isExpanded = !!expandedCardIds[st.id];
              return (
                <div key={st.id} className="nm-flat p-5 rounded-3xl border border-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="nm-badge-teal text-[9px] px-2.5 py-0.5 rounded-full font-extrabold">{st.role}</span>
                      <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-200 px-2 py-0.5 rounded-md">
                        {st.employeeCode || st.id}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ● {st.status ? st.status.replace('_', ' ') : 'ACTIVE'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-800">{st.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold">{st.designation || 'Territory Officer'}</p>
                  </div>

                  {/* Touch Collapsible Expander Button */}
                  <button
                    type="button"
                    onClick={() => toggleCardExpansion(st.id)}
                    className="sm:hidden w-full pt-1.5 text-[11px] font-bold text-teal-700 flex items-center justify-between border-t border-slate-200/60"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'Tap for CNIC, Quotas & Beats'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  <div className={`space-y-3 ${isExpanded ? 'block' : 'hidden sm:block'}`}>
                    <div className="space-y-1 text-xs text-slate-600 bg-slate-100/60 p-3 rounded-2xl nm-inset">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold text-[10px] uppercase">CNIC:</span>
                        <span className="font-mono font-bold text-slate-800 text-[11px]">{st.cnic || '35202-1234567-1'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold text-[10px] uppercase">Phone:</span>
                        <span className="font-bold text-slate-800 text-[11px]">{st.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold text-[10px] uppercase">Region / Area:</span>
                        <span className="font-bold text-teal-800 text-[11px]">{st.region} ({st.area || 'Central'})</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                        <span className="text-emerald-700 font-bold block">Monthly Sales Target</span>
                        <span className="font-mono font-black text-emerald-900 text-xs">
                          PKR {((st.targetMonthlySales || 2500000) / 100000).toFixed(1)} Lakh
                        </span>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                        <span className="text-indigo-700 font-bold block">Recovery Target</span>
                        <span className="font-mono font-black text-indigo-900 text-xs">
                          PKR {((st.targetMonthlyRecovery || 2000000) / 100000).toFixed(1)} Lakh
                        </span>
                      </div>
                    </div>

                    <div className="nm-inset p-3 rounded-2xl space-y-1 text-xs text-slate-600">
                      <div className="font-bold text-slate-700 text-[11px]">Assigned Weekly Beats:</div>
                      <ul className="space-y-1 text-[11px]">
                        {(st.beats || []).map((b: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-1.5 text-teal-800 font-medium">
                            <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" />
                            <span className="truncate">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className={`items-center justify-between pt-2 border-t border-slate-200 ${isExpanded ? 'flex' : 'hidden sm:flex'}`}>
                    <button
                      onClick={() => {
                        setSelectedSalesPerson(st);
                        setModalType('EMPLOYEE_DOSSIER');
                      }}
                      className="nm-btn px-3 py-1.5 rounded-xl text-[11px] font-bold text-teal-800"
                    >
                      View Personnel Dossier
                    </button>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedSalesPerson(st);
                            setEmployeeForm({
                              name: st.name || '',
                              employeeCode: st.employeeCode || st.id,
                              cnic: st.cnic || '35202-1234567-1',
                              phone: st.phone || '',
                              emergencyPhone: st.emergencyPhone || '',
                              email: st.email || '',
                              role: st.role || 'TSM',
                              designation: st.designation || 'Territory Sales Manager',
                              region: st.region || 'Punjab Central',
                              area: st.area || 'Lahore Division',
                              territory: st.territory || 'Brandreth Road Market',
                              baseBranch: st.baseBranch || 'National Lights Head Office, Lahore',
                              targetMonthlySales: st.targetMonthlySales || 2500000,
                              targetMonthlyRecovery: st.targetMonthlyRecovery || 2000000,
                              dateOfJoining: st.dateOfJoining || '2023-01-15',
                              salaryGrade: st.salaryGrade || 'Grade B2 + 1.5% Commission',
                              address: st.address || '',
                              status: st.status || 'ACTIVE',
                              beatsStr: (st.beats || []).join(', '),
                            });
                            setModalType('EDIT_SALES_MEMBER');
                          }}
                          className="nm-btn p-1.5 rounded-lg text-slate-600 hover:text-teal-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(st.id)}
                          className="nm-btn p-1.5 rounded-lg text-slate-600 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: 5-TIER HIERARCHY TREE & D3 INTERACTIVE MAP */}
      {activeSubTab === 'HIERARCHY' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">5-Tier Commercial Territory Hierarchy</h2>
                <span className="nm-badge-teal text-[10px] px-2.5 py-0.5 rounded-full font-bold">Admin Governance Tree</span>
              </div>
              <p className="text-xs text-slate-500">
                National Executive Board &rarr; Regional Hubs (RSM) &rarr; Area Zones (ASM) &rarr; Territory Beats (TSM) &rarr; Commercial Outlets.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setHierarchyForm({
                    tierLevel: 'Tier 2: Regional Operations (RSM)',
                    nodeName: '',
                    assignedOfficer: 'Ali Raza (TSM)',
                    notes: '',
                  });
                  setModalType('ADD_HIERARCHY_NODE');
                }}
                className="nm-btn-primary px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Hierarchy Node</span>
              </button>
            )}
          </div>

          {/* D3 Interactive Map Component */}
          <TerritoryHierarchyD3Map />

          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 px-1">Hierarchy Tier Roster Summary</h3>
            {hierarchyNodes.map((hn) => {
              const isExpanded = !!expandedCardIds[hn.id];
              return (
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

                  {/* Mobile Collapsible Toggle */}
                  <button
                    onClick={() => toggleCardExpansion(hn.id)}
                    className="sm:hidden w-full pt-1 text-[11px] font-bold text-teal-700 flex items-center justify-between"
                  >
                    <span>{isExpanded ? 'Hide Sub-Nodes' : `Tap to Expand (${hn.subNodes.length} Nodes)`}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  <div className={`flex flex-wrap gap-1.5 pt-2 transition-all ${isExpanded ? 'flex' : 'hidden sm:flex'}`}>
                    {hn.subNodes.map((sn: string, idx: number) => (
                      <span key={idx} className="nm-inset px-3 py-1 rounded-xl text-[11px] font-bold text-slate-700">
                        {sn}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dedicated Towns & Route Management console */}
          <div className="nm-flat p-6 rounded-3xl border border-white space-y-4">
            <div className="border-b border-slate-300 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-base font-black text-slate-800">🏡 Town & Route Management console</h3>
                <p className="text-xs text-slate-500 font-medium">Add, assign, and activate/deactivate corporate market routes and town nodes.</p>
              </div>
              <span className="text-[10px] bg-indigo-100 border border-indigo-200 text-indigo-800 font-bold px-2.5 py-1 rounded-full uppercase">
                Route Connections Active
              </span>
            </div>

            {/* Quick Town Registration/Edit Form (Inline for simplicity) */}
            <div className="nm-inset p-5 rounded-2xl bg-[#EAF0F6] space-y-3">
              <h4 className="font-extrabold text-xs text-slate-700">
                {editingTownId ? '✏️ Edit Town Configuration' : '➕ Register New Town Node'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-sans">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Town Name*</label>
                  <input
                    type="text"
                    required
                    value={newTownName}
                    placeholder="e.g. Faisalabad"
                    onChange={(e) => setNewTownName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Area Zone*</label>
                  <select
                    value={newTownArea}
                    onChange={(e) => setNewTownArea(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 focus:outline-none"
                  >
                    <option value="Lahore Division">Lahore Division</option>
                    <option value="Gujranwala Zone">Gujranwala Zone</option>
                    <option value="Karachi South Zone">Karachi South Zone</option>
                    <option value="Peshawar Division">Peshawar Division</option>
                    <option value="Multan Zone">Multan Zone</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Region*</label>
                  <select
                    value={newTownRegion}
                    onChange={(e) => setNewTownRegion(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 focus:outline-none"
                  >
                    <option value="Punjab Central">Punjab Central</option>
                    <option value="Punjab North">Punjab North</option>
                    <option value="Punjab South">Punjab South</option>
                    <option value="Sindh South">Sindh South</option>
                    <option value="KPK West">KPK West</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Assigned TSM / Field Officer*</label>
                  <select
                    value={newTownTsm}
                    onChange={(e) => setNewTownTsm(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 focus:outline-none font-bold text-teal-800"
                  >
                    <option value="Ali Raza (TSM)">Ali Raza (TSM)</option>
                    <option value="Muhammad Usman (TSM)">Muhammad Usman (TSM)</option>
                    <option value="Farhan Siddiqui (TSM)">Farhan Siddiqui (TSM)</option>
                    <option value="Tariq Mansoor (RSM)">Tariq Mansoor (RSM)</option>
                    <option value="Unassigned">Unassigned</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1 font-sans">
                {editingTownId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTownId(null);
                      setNewTownName('');
                    }}
                    className="px-4 py-2 rounded-xl font-bold bg-slate-200 text-slate-600 text-xs"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!newTownName.trim()) {
                      alert('Town Name is required.');
                      return;
                    }
                    if (editingTownId) {
                      setTowns(prev => prev.map(t => t.id === editingTownId ? { ...t, name: newTownName.trim(), area: newTownArea, region: newTownRegion, assignedTsm: newTownTsm } : t));
                      alert(`Town updated! Assigned route connected to ${newTownTsm}.`);
                      setEditingTownId(null);
                    } else {
                      const nt = {
                        id: `TWN-${Math.floor(100 + Math.random() * 900)}`,
                        name: newTownName.trim(),
                        area: newTownArea,
                        region: newTownRegion,
                        assignedTsm: newTownTsm,
                        status: 'ACTIVE'
                      };
                      setTowns(prev => [...prev, nt]);
                      alert(`New Town "${newTownName}" registered and assigned to ${newTownTsm}!`);
                    }
                    setNewTownName('');
                  }}
                  className="px-5 py-2 rounded-xl font-black bg-teal-600 hover:bg-teal-700 text-white text-xs shadow-md"
                >
                  {editingTownId ? 'Save Route Configuration' : 'Register Town & Route'}
                </button>
              </div>
            </div>

            {/* Towns List Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs bg-white">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Town Code</th>
                    <th className="py-2.5 px-3">Town Name</th>
                    <th className="py-2.5 px-3 font-sans">Area / Zone</th>
                    <th className="py-2.5 px-3 font-mono">Region</th>
                    <th className="py-2.5 px-3 font-sans">Assigned TSM Field Representative</th>
                    <th className="py-2.5 px-3 text-center font-sans">Status</th>
                    <th className="py-2.5 px-3 text-right font-sans">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-slate-700 text-[11px]">
                  {towns.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{t.id}</td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-800">{t.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{t.area}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{t.region}</td>
                      <td className="py-2.5 px-3 font-bold text-teal-800">{t.assignedTsm}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] ${
                          t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex justify-end gap-1.5 font-sans">
                          <button
                            type="button"
                            onClick={() => {
                              setTowns(prev => prev.map(o => o.id === t.id ? { ...o, status: o.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : o));
                              alert(`Town route "${t.name}" status updated.`);
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${
                              t.status === 'ACTIVE' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {t.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTownId(t.id);
                              setNewTownName(t.name);
                              setNewTownArea(t.area);
                              setNewTownRegion(t.region);
                              setNewTownTsm(t.assignedTsm);
                            }}
                            className="p-1 text-slate-400 hover:text-teal-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {/* 3. Add / Edit Dealer (Complete Registration Form) */}
      {(modalType === 'ADD_DEALER' || modalType === 'EDIT_DEALER') && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="nm-flat bg-[#E8ECF2] p-6 rounded-3xl border border-white max-w-2xl w-full space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-300 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {modalType === 'ADD_DEALER' ? 'Complete Dealer / Distributor Registration' : 'Edit Commercial Dealer Account'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Region &gt; Area &gt; Territory &gt; TSM &gt; Commercial & Tax Requirements
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="nm-btn w-8 h-8 rounded-full text-slate-600 font-bold hover:text-slate-900 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDealer} className="space-y-4 text-xs">
              {/* Section 1: Geographical Hierarchy & Assignment */}
              <div className="nm-inset p-3.5 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                  1. Geographical Hierarchy &amp; TSM Assignment
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Region *</label>
                    <select
                      value={dealerForm.region}
                      onChange={(e) => setDealerForm({ ...dealerForm, region: e.target.value })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                    >
                      <option value="Punjab Central">Punjab Central (Lahore, Gujranwala)</option>
                      <option value="Punjab North">Punjab North (Rawalpindi, Islamabad)</option>
                      <option value="Punjab South">Punjab South (Multan, Bahawalpur)</option>
                      <option value="Sindh South">Sindh South (Karachi, Hyderabad)</option>
                      <option value="KPK West">KPK West (Peshawar, Mardan)</option>
                      <option value="Balochistan">Balochistan (Quetta)</option>
                      <option value="Federal Capital">Federal Capital</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Area *</label>
                    <input
                      type="text"
                      required
                      value={dealerForm.area}
                      onChange={(e) => setDealerForm({ ...dealerForm, area: e.target.value })}
                      placeholder="e.g. Lahore Division / Karachi Zone"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Territory / Market Beat *</label>
                    <input
                      type="text"
                      required
                      value={dealerForm.territory}
                      onChange={(e) => setDealerForm({ ...dealerForm, territory: e.target.value })}
                      placeholder="e.g. Brandreth Road / Karkhano Market"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Assigned TSM / Sales Officer *</label>
                    <select
                      value={dealerForm.assignedTsm}
                      onChange={(e) => setDealerForm({ ...dealerForm, assignedTsm: e.target.value })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-teal-800"
                    >
                      <option value="Ali Raza (TSM)">Ali Raza (TSM) - Central Lahore</option>
                      <option value="Muhammad Usman (TSM)">Muhammad Usman (TSM) - Gujranwala & Sialkot</option>
                      <option value="Farhan Siddiqui (TSM)">Farhan Siddiqui (TSM) - Karachi South</option>
                      <option value="Zahid Mehmood (ASM)">Zahid Mehmood (ASM) - Rawalpindi Division</option>
                      <option value="Tariq Mansoor (RSM)">Tariq Mansoor (RSM) - KPK Region</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Proprietor & Business Identity */}
              <div className="nm-inset p-3.5 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                  2. Firm Identity &amp; Contact Person
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Business / Shop Name *</label>
                    <input
                      type="text"
                      required
                      value={dealerForm.name}
                      onChange={(e) => setDealerForm({ ...dealerForm, name: e.target.value })}
                      placeholder="e.g. Al-Madina Auto Spares & Lighting"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Customer Category *</label>
                    <select
                      value={dealerForm.customerType}
                      onChange={(e) => setDealerForm({ ...dealerForm, customerType: e.target.value })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                    >
                      <option value="DEALER">Authorized Dealer</option>
                      <option value="DISTRIBUTOR">Regional Distributor</option>
                      <option value="WHOLESALER">Wholesale Stockist</option>
                      <option value="RETAIL_SHOP">Retail Store</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Proprietor / Contact Person *</label>
                    <input
                      type="text"
                      required
                      value={dealerForm.contactPerson}
                      onChange={(e) => setDealerForm({ ...dealerForm, contactPerson: e.target.value })}
                      placeholder="e.g. Haji Muhammad Younas"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">CNIC Number *</label>
                    <input
                      type="text"
                      required
                      value={dealerForm.cnic}
                      onChange={(e) => setDealerForm({ ...dealerForm, cnic: e.target.value })}
                      placeholder="e.g. 35202-1234567-1"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Primary Phone / Mobile *</label>
                    <input
                      type="text"
                      required
                      value={dealerForm.phone}
                      onChange={(e) => setDealerForm({ ...dealerForm, phone: e.target.value })}
                      placeholder="e.g. +92 300 1234567"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">WhatsApp / Alt Phone</label>
                    <input
                      type="text"
                      value={dealerForm.secondaryPhone}
                      onChange={(e) => setDealerForm({ ...dealerForm, secondaryPhone: e.target.value })}
                      placeholder="e.g. +92 321 7654321"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Shop / Outlet Address *</label>
                  <input
                    type="text"
                    required
                    value={dealerForm.address}
                    onChange={(e) => setDealerForm({ ...dealerForm, address: e.target.value })}
                    placeholder="e.g. Shop #42, Main Brandreth Road Market, Lahore"
                    className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium"
                  />
                </div>
              </div>

              {/* Section 3: Tax, Credit & Financial Limit */}
              <div className="nm-inset p-3.5 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                  3. Commercial Terms, Credit Terms &amp; Bank Info
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Credit Limit (PKR) *</label>
                    <input
                      type="number"
                      required
                      value={dealerForm.creditLimit}
                      onChange={(e) => setDealerForm({ ...dealerForm, creditLimit: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-teal-700"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Credit Term (Days) *</label>
                    <input
                      type="number"
                      required
                      value={dealerForm.creditDays}
                      onChange={(e) => setDealerForm({ ...dealerForm, creditDays: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Operating Status</label>
                    <select
                      value={dealerForm.status}
                      onChange={(e) => setDealerForm({ ...dealerForm, status: e.target.value })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                    >
                      <option value="NORMAL">NORMAL (Active Credit)</option>
                      <option value="HIGH_RISK">HIGH_RISK (Watchlist)</option>
                      <option value="CREDIT_LOCKED">CREDIT_LOCKED (Stopped)</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">NTN Number</label>
                    <input
                      type="text"
                      value={dealerForm.ntn}
                      onChange={(e) => setDealerForm({ ...dealerForm, ntn: e.target.value })}
                      placeholder="e.g. 1234567-8"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">STRN (Sales Tax)</label>
                    <input
                      type="text"
                      value={dealerForm.strn}
                      onChange={(e) => setDealerForm({ ...dealerForm, strn: e.target.value })}
                      placeholder="e.g. 32-77-8765-432-1"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Bank Name / Branch</label>
                    <input
                      type="text"
                      value={dealerForm.bankName}
                      onChange={(e) => setDealerForm({ ...dealerForm, bankName: e.target.value })}
                      placeholder="e.g. Meezan Bank Ltd"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium"
                    />
                  </div>
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
                <button type="submit" className="nm-btn-primary px-6 py-2.5 rounded-xl font-black shadow-md">
                  Complete Registration &amp; Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Dealer Dossier Modal (Complete Enterprise Profile) */}
      {modalType === 'DEALER_DOSSIER' && selectedDealer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="nm-flat bg-[#E8ECF2] p-6 rounded-3xl border border-white max-w-xl w-full space-y-4 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-300">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                    {selectedDealer.id}
                  </span>
                  <span className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {selectedDealer.customerType || 'DEALER'}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-800 mt-1">{selectedDealer.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{selectedDealer.town} • {selectedDealer.region}</p>
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
                <span className="text-[10px] text-slate-400 font-bold uppercase">Approved Credit Limit</span>
                <div className="text-base font-black text-teal-700">
                  PKR {selectedDealer.creditLimit.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="nm-inset p-4 rounded-2xl space-y-2 text-xs text-slate-600">
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Proprietor Contact:</span>
                <span className="font-extrabold text-slate-800">{selectedDealer.contactPerson || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">CNIC Number:</span>
                <span className="font-mono font-bold text-slate-800">{selectedDealer.cnic || '35202-1234567-1'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Phone Number:</span>
                <span className="font-bold text-slate-800">{selectedDealer.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Territory &amp; Area:</span>
                <span className="font-bold text-slate-800">{selectedDealer.territory || selectedDealer.town} ({selectedDealer.area || selectedDealer.region})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Assigned TSM / Officer:</span>
                <span className="font-bold text-teal-700">{selectedDealer.assignedTsm || selectedDealer.assignedOfficerName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Payment Term:</span>
                <span className="font-bold text-slate-800">{selectedDealer.creditDays || 30} Days Credit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">NTN / STRN Status:</span>
                <span className="font-mono text-slate-800">{selectedDealer.ntn || 'REG-APPLIED'} / {selectedDealer.strn || 'EXEMPT'}</span>
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

      {/* 6. Add / Edit Employee Registration Form (Complete A-to-Z Information) */}
      {(modalType === 'ADD_SALES_MEMBER' || modalType === 'EDIT_SALES_MEMBER') && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="nm-flat bg-[#E8ECF2] p-6 rounded-3xl border border-white max-w-2xl w-full space-y-4 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-300">
              <div>
                <span className="nm-badge-teal text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  Field Personnel Roster
                </span>
                <h3 className="text-lg font-black text-slate-800 mt-1">
                  {modalType === 'ADD_SALES_MEMBER' ? 'Register New Field Personnel (A to Z Dossier)' : 'Edit Employee Registration Record'}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="nm-btn w-8 h-8 rounded-full text-slate-600 font-bold hover:text-slate-900 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
              {/* Section 1: Personal Identity & Contact */}
              <div className="nm-inset p-3.5 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                  1. Employee Personal Identity &amp; Contact Credentials
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Full Employee Name *</label>
                    <input
                      type="text"
                      required
                      value={employeeForm.name}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                      placeholder="e.g. Muhammad Amjid"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Employee Code / ID *</label>
                    <input
                      type="text"
                      required
                      value={employeeForm.employeeCode}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, employeeCode: e.target.value })}
                      placeholder="e.g. NL-TSM-105"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-mono font-bold text-teal-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">CNIC Number (National ID) *</label>
                    <input
                      type="text"
                      required
                      value={employeeForm.cnic}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, cnic: e.target.value })}
                      placeholder="e.g. 35202-9876543-1"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Primary Mobile / Phone *</label>
                    <input
                      type="text"
                      required
                      value={employeeForm.phone}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                      placeholder="e.g. +92 300 8456101"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Emergency Alt Phone</label>
                    <input
                      type="text"
                      value={employeeForm.emergencyPhone}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyPhone: e.target.value })}
                      placeholder="e.g. +92 321 4455667"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Corporate Email Address *</label>
                    <input
                      type="email"
                      required
                      value={employeeForm.email}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                      placeholder="e.g. amjid@nationallights.com"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Role, Designation & Region */}
              <div className="nm-inset p-3.5 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                  2. Organizational Role &amp; Territory Boundaries
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">System User Role *</label>
                    <select
                      value={employeeForm.role}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value as UserRole })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-teal-800"
                    >
                      <option value="TSM">TSM (Territory Sales Manager)</option>
                      <option value="ASM">ASM (Area Sales Manager)</option>
                      <option value="RSM">RSM (Regional Sales Manager)</option>
                      <option value="ACCOUNTS_OFFICER">Accounts & Recovery Officer</option>
                      <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
                      <option value="FACTORY_MANAGER">Factory Operations</option>
                      <option value="SUPER_ADMIN">Super Admin Executive</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Job Designation *</label>
                    <input
                      type="text"
                      required
                      value={employeeForm.designation}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                      placeholder="e.g. Territory Sales & Recovery Manager"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Assigned Region *</label>
                    <select
                      value={employeeForm.region}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, region: e.target.value })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                    >
                      <option value="Punjab Central">Punjab Central (Lahore, Gujranwala)</option>
                      <option value="Punjab North">Punjab North (Rawalpindi, Islamabad)</option>
                      <option value="Punjab South">Punjab South (Multan, Bahawalpur)</option>
                      <option value="Sindh South">Sindh South (Karachi, Hyderabad)</option>
                      <option value="KPK West">KPK West (Peshawar, Mardan)</option>
                      <option value="Balochistan">Balochistan (Quetta)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Area / Division *</label>
                    <input
                      type="text"
                      required
                      value={employeeForm.area}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, area: e.target.value })}
                      placeholder="e.g. Lahore Division / Karachi Zone"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Primary Market Territory *</label>
                    <input
                      type="text"
                      required
                      value={employeeForm.territory}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, territory: e.target.value })}
                      placeholder="e.g. Brandreth Road & Montgomery Road"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Home Branch / Depot *</label>
                    <select
                      value={employeeForm.baseBranch}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, baseBranch: e.target.value })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                    >
                      <option value="National Lights Head Office, Lahore">National Lights Head Office, Lahore</option>
                      <option value="Karachi Regional Distribution Depot">Karachi Regional Distribution Depot</option>
                      <option value="Rawalpindi / Islamabad Hub">Rawalpindi / Islamabad Hub</option>
                      <option value="Peshawar North Depot">Peshawar North Depot</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Targets, Commission & Salary */}
              <div className="nm-inset p-3.5 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                  3. Monthly Targets, Salary Grade &amp; Route Schedule
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Monthly Sales Quota (PKR) *</label>
                    <input
                      type="number"
                      required
                      value={employeeForm.targetMonthlySales}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, targetMonthlySales: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-teal-700"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Monthly Recovery Quota (PKR) *</label>
                    <input
                      type="number"
                      required
                      value={employeeForm.targetMonthlyRecovery}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, targetMonthlyRecovery: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-indigo-700"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Salary &amp; Commission Grade</label>
                    <input
                      type="text"
                      value={employeeForm.salaryGrade}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, salaryGrade: e.target.value })}
                      placeholder="e.g. Grade B2 + 1.5% Commission"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Date of Joining *</label>
                    <input
                      type="date"
                      required
                      value={employeeForm.dateOfJoining}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, dateOfJoining: e.target.value })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Employment Status</label>
                    <select
                      value={employeeForm.status}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                    >
                      <option value="ACTIVE">ACTIVE (On Field Duty)</option>
                      <option value="ON_LEAVE">ON_LEAVE (Temporary Leave)</option>
                      <option value="INACTIVE">INACTIVE (Deactivated)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Residential Address</label>
                    <input
                      type="text"
                      value={employeeForm.address}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                      placeholder="e.g. House #12, Block B, Bahria Town, Lahore"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Weekly Beat Schedule (Comma Separated)</label>
                  <input
                    type="text"
                    value={employeeForm.beatsStr}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, beatsStr: e.target.value })}
                    placeholder="Monday: Brandreth Road, Tuesday: Montgomery Road, Wednesday: Hall Road"
                    className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium"
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
                <button type="submit" className="nm-btn-primary px-6 py-2.5 rounded-xl font-black shadow-md">
                  Save Personnel Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Employee Dossier Modal (Complete Personnel Profile) */}
      {modalType === 'EMPLOYEE_DOSSIER' && selectedSalesPerson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="nm-flat bg-[#E8ECF2] p-6 rounded-3xl border border-white max-w-xl w-full space-y-4 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-300">
              <div>
                <div className="flex items-center gap-2">
                  <span className="nm-badge-teal text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                    {selectedSalesPerson.role || 'TSM'}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-md">
                    {selectedSalesPerson.employeeCode || selectedSalesPerson.id}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-800 mt-1">{selectedSalesPerson.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{selectedSalesPerson.designation || 'Territory Sales Manager'}</p>
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
                <span className="text-[10px] text-slate-400 font-bold uppercase">Monthly Sales Target</span>
                <div className="text-base font-black text-emerald-700">
                  PKR {(selectedSalesPerson.targetMonthlySales || 2500000).toLocaleString()}
                </div>
              </div>
              <div className="nm-inset p-3 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Monthly Recovery Quota</span>
                <div className="text-base font-black text-indigo-700">
                  PKR {(selectedSalesPerson.targetMonthlyRecovery || 2000000).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="nm-inset p-4 rounded-2xl space-y-2 text-xs text-slate-600">
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">CNIC Number:</span>
                <span className="font-mono font-bold text-slate-800">{selectedSalesPerson.cnic || '35202-9876543-1'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Primary Contact Phone:</span>
                <span className="font-bold text-slate-800">{selectedSalesPerson.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Emergency / Alt Contact:</span>
                <span className="font-bold text-slate-800">{selectedSalesPerson.emergencyPhone || '+92 321 4455667'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Corporate Email:</span>
                <span className="font-bold text-slate-800">{selectedSalesPerson.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Assigned Region &amp; Area:</span>
                <span className="font-bold text-teal-800">{selectedSalesPerson.region} ({selectedSalesPerson.area || 'Central Area'})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Territory &amp; Base Branch:</span>
                <span className="font-bold text-slate-800">{selectedSalesPerson.territory || 'Main Beat'} • {selectedSalesPerson.baseBranch || 'Head Office'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Salary Grade / Commission:</span>
                <span className="font-bold text-slate-800">{selectedSalesPerson.salaryGrade || 'Grade B2 + 1.5% Sales Commission'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-bold">Date of Joining:</span>
                <span className="font-mono text-slate-800">{selectedSalesPerson.dateOfJoining || '2023-01-15'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Residential Address:</span>
                <span className="font-medium text-slate-800 truncate max-w-[240px]">{selectedSalesPerson.address || 'Lahore, Pakistan'}</span>
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

      {/* 8. Add Hierarchy Node Modal (Admin Only) */}
      {modalType === 'ADD_HIERARCHY_NODE' && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="nm-flat bg-[#E8ECF2] p-6 rounded-3xl border border-white max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-800">Add Territory Hierarchy Node</h3>
            <form onSubmit={handleSaveHierarchyNode} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Hierarchy Level Tier *</label>
                <select
                  value={hierarchyForm.tierLevel}
                  onChange={(e) => setHierarchyForm({ ...hierarchyForm, tierLevel: e.target.value })}
                  className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                >
                  <option value="Tier 1: Executive Governance">Tier 1: Executive Governance</option>
                  <option value="Tier 2: Regional Operations (RSM)">Tier 2: Regional Operations (RSM)</option>
                  <option value="Tier 3: Area Divisions (ASM)">Tier 3: Area Divisions (ASM)</option>
                  <option value="Tier 4: Territory Beats (TSM)">Tier 4: Territory Beats (TSM)</option>
                  <option value="Tier 5: Commercial Outlets & Distributors">Tier 5: Commercial Outlets</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Node / Zone Name *</label>
                <input
                  type="text"
                  required
                  value={hierarchyForm.nodeName}
                  onChange={(e) => setHierarchyForm({ ...hierarchyForm, nodeName: e.target.value })}
                  placeholder="e.g. Multan & Bahawalpur Zonal Hub"
                  className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Manager / TSM</label>
                <input
                  type="text"
                  value={hierarchyForm.assignedOfficer}
                  onChange={(e) => setHierarchyForm({ ...hierarchyForm, assignedOfficer: e.target.value })}
                  placeholder="e.g. Muhammad Amjid (RSM)"
                  className="w-full p-2.5 rounded-xl nm-inset text-xs"
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
                  Add Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
