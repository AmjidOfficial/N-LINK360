/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Sales & Recovery Mobile Application (Field Officer App)
 * Critical Rule: Unified Sales + Recovery Single Role
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  FilePlus,
  FileText,
  History,
  Info,
  MapPin,
  Navigation,
  Package,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import {
  calculateOrderTotals,
  evaluateCreditPolicy,
  validateRecoverySubmission,
} from '../lib/business-rules';
import {
  Customer,
  CustomerRegistrationRequest,
  CustomerVisit,
  InventoryBalance,
  PaymentMode,
  SalesOrder,
  SKU,
  User as UserType,
} from '../types';
import { VisitLogCalendarView } from './VisitLogCalendarView';
import { fetchCustomerLatestBalance } from '../services/supabase-data';

interface SalesRecoveryAppProps {
  currentUser: UserType;
  customers?: Customer[];
  skus?: SKU[];
  inventoryBalances?: InventoryBalance[];
  visits?: CustomerVisit[];
  registrationRequests?: CustomerRegistrationRequest[];
  onBookOrder?: (order: Partial<SalesOrder>) => void;
  onRecordRecovery?: (data: {
    customerId: string;
    amount: number;
    paymentMode: PaymentMode;
    instrumentNumber?: string;
    bankName?: string;
    remarks?: string;
  }) => void;
  onLogVisit?: (visit: Partial<CustomerVisit>) => void;
  onSubmitRegistration?: (req: Partial<CustomerRegistrationRequest>) => void;
}

export const SalesRecoveryApp: React.FC<SalesRecoveryAppProps> = ({
  currentUser,
  customers = [],
  skus = [],
  inventoryBalances = [],
  visits = [],
  registrationRequests = [],
  onBookOrder = (_order: Partial<SalesOrder>) => {},
  onRecordRecovery = (_data: {
    customerId: string;
    amount: number;
    paymentMode: PaymentMode;
    instrumentNumber?: string;
    bankName?: string;
    remarks?: string;
  }) => {},
  onLogVisit = (_visit: Partial<CustomerVisit>) => {},
  onSubmitRegistration = (_req: Partial<CustomerRegistrationRequest>) => {},
}) => {
  const [activeScreen, setActiveScreen] = useState<
    'DASHBOARD' | 'CUSTOMERS' | 'CUSTOMER_PROFILE' | 'ORDER_BOOKING' | 'RECOVERY_FORM' | 'VISIT_LOG' | 'PERFORMANCE' | 'REGISTRATION_FORM' | 'REGISTRATION_HISTORY'
  >('DASHBOARD');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Registration Form State
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regContactNumber, setRegContactNumber] = useState('');
  const [regCnic, setRegCnic] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('Lahore');
  const [regRegion, setRegRegion] = useState('Punjab North');
  const [regType, setRegType] = useState<'DEALER' | 'DISTRIBUTOR'>('DEALER');
  const [regCreditLimit, setRegCreditLimit] = useState<number>(300000);
  const [regCreditDays, setRegCreditDays] = useState<number>(30);
  const [regOpeningBalance, setRegOpeningBalance] = useState<number>(0);
  const [regNotes, setRegNotes] = useState('');
  const [regLatitude, setRegLatitude] = useState<number>(31.5798);
  const [regLongitude, setRegLongitude] = useState<number>(74.3168);

  // Selected visit map pin (interactive state)
  const [selectedMapPin, setSelectedMapPin] = useState<{ id: string; name: string; dist: number; type: string } | null>(null);
  const [visitScreenSubTab, setVisitScreenSubTab] = useState<'CHECKIN' | 'CALENDAR'>('CHECKIN');

  // Advanced Sales & Recovery Ordering State
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [gridOrderQuantities, setGridOrderQuantities] = useState<Record<string, number>>({});
  const [gridOrderDiscounts, setGridOrderDiscounts] = useState<Record<string, number>>({});
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [backordersEnabled, setBackordersEnabled] = useState(false);
  const [orderRecoveryAmount, setOrderRecoveryAmount] = useState<number>(0);
  const [orderPaymentMode, setOrderPaymentMode] = useState<PaymentMode>('CASH');
  const [orderInstrumentNumber, setOrderInstrumentNumber] = useState('');
  const [orderBankName, setOrderBankName] = useState('');
  const [orderRecoveryRemarks, setOrderRecoveryRemarks] = useState('');
  const [showOrderConfirmModal, setShowOrderConfirmModal] = useState(false);
  const [isSyncingBalance, setIsSyncingBalance] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Order Booking State
  const [orderItems, setOrderItems] = useState<
    Array<{ skuId: string; quantity: number; discountPercent: number }>
  >([{ skuId: skus[0]?.id || '', quantity: 50, discountPercent: 0 }]);

  // Recovery Form State
  const [recoveryAmount, setRecoveryAmount] = useState<number>(50000);
  const [recoveryPaymentMode, setRecoveryPaymentMode] = useState<PaymentMode>('CASH');
  const [instrumentNumber, setInstrumentNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [recoveryRemarks, setRecoveryRemarks] = useState<string>('');

  // Visit Log State
  const [visitPurpose, setVisitPurpose] = useState('Routine Sales & Recovery Follow-up');
  const [visitNotes, setVisitNotes] = useState('');
  const [orderTakenInVisit, setOrderTakenInVisit] = useState(false);
  const [recoveryTakenInVisit, setRecoveryTakenInVisit] = useState(false);
  
  // Visit Photo states
  const [visitPhoto, setVisitPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setIsCameraActive(true);
      // Wait for React to render the video element and set srcObject
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera access failed", err);
      alert("Could not access device camera. You can still use simulated snapshots or upload an image file below!");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setVisitPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const selectSimulatedPhoto = (type: 'store' | 'receipt' | 'cheque') => {
    const urls = {
      store: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80', // Shop storefront
      receipt: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80', // Delivery receipt / writing desk
      cheque: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=400&q=80', // Cheque / bank details
    };
    setVisitPhoto(urls[type]);
    stopCamera();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVisitPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Advanced Grid-based Calculations
  const gridComputedItems = Object.entries(gridOrderQuantities)
    .filter(([_, qty]) => Number(qty) > 0)
    .map(([skuId, qty]) => {
      const sku = skus.find((s) => s.id === skuId);
      const discountPercent = Number(gridOrderDiscounts[skuId]) || 0;
      return {
        skuId,
        orderedQuantity: Number(qty),
        unitPrice: sku?.tradePrice || 0,
        discountPercent,
      };
    });

  const gridOrderTotals = calculateOrderTotals(gridComputedItems);
  const gridCreditCheck = evaluateCreditPolicy(selectedCustomer, gridOrderTotals.totalAmount);

  // Submit Handlers
  const handleOrderSubmit = () => {
    if (gridComputedItems.length === 0) {
      alert('Please enter order quantity for at least one SKU in the grid.');
      return;
    }

    const newItems = gridComputedItems.map((item) => {
      const sku = skus.find((s) => s.id === item.skuId)!;
      const gross = item.orderedQuantity * sku.tradePrice;
      const discount = gross * (item.discountPercent / 100);
      return {
        id: `soi-${Date.now()}-${Math.random()}`,
        orderId: '',
        skuId: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.name,
        orderedQuantity: item.orderedQuantity,
        unitPrice: sku.tradePrice,
        discountPercent: item.discountPercent,
        lineTotal: gross - discount,
      };
    });

    // Execute recovery submission in parallel if recovery is collected right inside this workflow
    if (orderRecoveryAmount > 0) {
      const recAmt = orderRecoveryAmount;
      const targetCustId = selectedCustomer.id;
      onRecordRecovery({
        customerId: targetCustId,
        amount: recAmt,
        paymentMode: orderPaymentMode,
        instrumentNumber: orderInstrumentNumber.trim() || undefined,
        bankName: orderBankName.trim() || undefined,
        remarks: orderRecoveryRemarks.trim() || 'Recorded during unified order booking workflow',
      });

      // Background re-validation of customer balance from Supabase
      setIsSyncingBalance(true);
      void (async () => {
        try {
          const liveBal = await fetchCustomerLatestBalance(targetCustId);
          if (liveBal !== null && selectedCustomer && selectedCustomer.id === targetCustId) {
            selectedCustomer.currentBalance = liveBal;
            setSyncNotice(`✓ Verified live balance from Supabase: PKR ${liveBal.toLocaleString()}`);
            setTimeout(() => setSyncNotice(null), 4000);
          }
        } catch (err) {
          console.warn('Background balance check error:', err);
        } finally {
          setIsSyncingBalance(false);
        }
      })();
    }

    onBookOrder({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.companyName,
      customerCode: selectedCustomer.customerCode,
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName,
      orderDate: new Date().toISOString().split('T')[0],
      status: 'SUBMITTED',
      items: newItems,
      subtotal: gridOrderTotals.subtotal,
      discountAmount: gridOrderTotals.discountAmount,
      taxAmount: gridOrderTotals.taxAmount,
      totalAmount: gridOrderTotals.totalAmount,
      creditCheckStatus: gridCreditCheck.status,
      creditCheckNotes: gridCreditCheck.message,
    });

    // Reset advanced grid & recovery state
    setGridOrderQuantities({});
    setGridOrderDiscounts({});
    setOrderRecoveryAmount(0);
    setOrderInstrumentNumber('');
    setOrderBankName('');
    setOrderRecoveryRemarks('');
    setShowOrderConfirmModal(false);

    alert('Unified Sales & Recovery Order submitted successfully!');
    setActiveScreen('DASHBOARD');
  };

  const handleRecoverySubmit = () => {
    const validation = validateRecoverySubmission(
      recoveryAmount,
      recoveryPaymentMode,
      instrumentNumber,
      bankName
    );
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    const recordedAmount = recoveryAmount;
    const targetCustId = selectedCustomer.id;

    onRecordRecovery({
      customerId: targetCustId,
      amount: recordedAmount,
      paymentMode: recoveryPaymentMode,
      instrumentNumber: instrumentNumber.trim() || undefined,
      bankName: bankName.trim() || undefined,
      remarks: recoveryRemarks,
    });

    // Optimistically update current balance locally
    if (selectedCustomer && selectedCustomer.id === targetCustId) {
      selectedCustomer.currentBalance = Math.max(0, selectedCustomer.currentBalance - recordedAmount);
    }

    // Background fetch to re-validate latest ledger running balance directly from Supabase
    setIsSyncingBalance(true);
    void (async () => {
      try {
        const liveBal = await fetchCustomerLatestBalance(targetCustId);
        if (liveBal !== null) {
          if (selectedCustomer && selectedCustomer.id === targetCustId) {
            selectedCustomer.currentBalance = liveBal;
          }
          setSyncNotice(`✓ Verified live balance from Supabase: PKR ${liveBal.toLocaleString()}`);
          setTimeout(() => setSyncNotice(null), 4500);
        }
      } catch (err) {
        console.warn('Background Supabase balance verification error:', err);
      } finally {
        setIsSyncingBalance(false);
      }
    })();

    alert(`Recovery of PKR ${recordedAmount.toLocaleString()} recorded and submitted for verification!`);
    setActiveScreen('DASHBOARD');
  };

  const handleVisitSubmit = () => {
    onLogVisit({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.companyName,
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName,
      checkinTime: new Date().toISOString(),
      checkoutTime: new Date().toISOString(),
      latitude: 31.5798,
      longitude: 74.3168,
      purpose: visitPurpose,
      notes: visitNotes,
      orderPlaced: orderTakenInVisit,
      recoveryCollected: recoveryTakenInVisit,
      photoUrl: visitPhoto || undefined,
    });

    alert('Customer visit recorded with storefront snapshot and GPS location!');
    // Reset fields
    setVisitPurpose('Routine Sales & Recovery Follow-up');
    setVisitNotes('');
    setOrderTakenInVisit(false);
    setRecoveryTakenInVisit(false);
    setVisitPhoto(null);
    setActiveScreen('DASHBOARD');
  };

  const handleRegistrationSubmit = () => {
    if (!regBusinessName.trim()) {
      alert('Business Name is required.');
      return;
    }
    if (!regOwnerName.trim()) {
      alert('Owner Name is required.');
      return;
    }
    if (!regContactNumber.trim()) {
      alert('Contact Number is required.');
      return;
    }
    if (!regCnic.trim()) {
      alert('CNIC is required.');
      return;
    }
    if (!regAddress.trim()) {
      alert('Address is required.');
      return;
    }

    onSubmitRegistration({
      businessName: regBusinessName.trim(),
      ownerName: regOwnerName.trim(),
      contactNumber: regContactNumber.trim(),
      cnic: regCnic.trim(),
      address: regAddress.trim(),
      city: regCity,
      region: regRegion,
      type: regType,
      proposedCreditLimit: regCreditLimit,
      proposedCreditDays: regCreditDays,
      proposedOpeningBalance: regOpeningBalance,
      additionalNotes: regNotes.trim(),
      latitude: regLatitude,
      longitude: regLongitude,
    });

    alert(`Dealer/Distributor registration request for "${regBusinessName}" submitted! Head office will review and authorize.`);
    
    // Reset form fields
    setRegBusinessName('');
    setRegOwnerName('');
    setRegContactNumber('');
    setRegCnic('');
    setRegAddress('');
    setRegNotes('');
    setRegOpeningBalance(0);
    setActiveScreen('DASHBOARD');
  };

  return (
    <div className="max-w-md mx-auto my-4 bg-primary text-deep-green hover:bg-primary/90 rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden min-h-[750px] flex flex-col font-sans">
      
      {/* Mobile Top App Bar */}
      <div className="bg-surface-card p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        {activeScreen !== 'DASHBOARD' ? (
          <button
            onClick={() => setActiveScreen('DASHBOARD')}
            className="flex items-center gap-1 text-xs text-deep-teal font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-deep-green font-black text-xs">
              NL
            </div>
            <div>
              <span className="font-bold text-xs tracking-tight block">N-LINK Field App</span>
              <span className="text-[10px] text-deep-teal font-mono">Sales & Recovery Lead</span>
            </div>
          </div>
        )}

        <div className="text-right">
          <span className="text-[11px] font-bold text-slate-200 block truncate max-w-[140px]">
            {currentUser.fullName}
          </span>
          <span className="text-[9px] text-slate-500 font-mono">Lahore Central</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-surface-card">
        
        {/* ========================================================================= */}
        {/* 1. FIELD DASHBOARD SCREEN */}
        {/* ========================================================================= */}
        {activeScreen === 'DASHBOARD' && (
          <div className="space-y-4">
            
            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px]">Today's Recovery</span>
                  <Wallet className="w-3.5 h-3.5 text-deep-teal" />
                </div>
                <div className="text-base font-bold font-mono text-deep-teal tabular-nums tracking-tight mt-1">
                  PKR 60,000
                </div>
                <span className="text-[10px] text-slate-500">Target: PKR 100k/day</span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px]">Today's Orders</span>
                  <ShoppingBag className="w-3.5 h-3.5 text-deep-teal" />
                </div>
                <div className="text-base font-bold font-mono text-deep-teal tabular-nums tracking-tight mt-1">
                  PKR 76,914
                </div>
                <span className="text-[10px] text-slate-500">1 Order Placed</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveScreen('ORDER_BOOKING')}
                className="p-3 bg-secondary hover:bg-secondary/80 text-deep-green rounded-2xl font-bold flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <FilePlus className="w-5 h-5" />
                <span className="text-[11px]">Book Order</span>
              </button>

              <button
                onClick={() => setActiveScreen('RECOVERY_FORM')}
                className="p-3 bg-secondary hover:bg-secondary text-deep-green rounded-2xl font-bold flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Coins className="w-5 h-5" />
                <span className="text-[11px]">Collect Cash</span>
              </button>

              <button
                onClick={() => setActiveScreen('VISIT_LOG')}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold flex flex-col items-center justify-center gap-1.5 border border-slate-700 shadow-md active:scale-95 transition-all"
              >
                <MapPin className="w-5 h-5 text-rose-400" />
                <span className="text-[11px]">GPS Visit</span>
              </button>
            </div>

            {/* Dealer/Distributor Registration Request Quick Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-secondary/20 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-deep-teal block text-[11px] uppercase tracking-wide">Register Client Lead</span>
                <span className="text-[10px] text-slate-400 block">Propose a new dealer or distributor for office authorization.</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setActiveScreen('REGISTRATION_FORM')}
                  className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-deep-green font-bold rounded-xl text-[10px] whitespace-nowrap"
                >
                  + New Lead
                </button>
                <button
                  onClick={() => setActiveScreen('REGISTRATION_HISTORY')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-[10px] whitespace-nowrap"
                >
                  Status ({registrationRequests.filter(r => r.salesUserId === currentUser.id).length})
                </button>
              </div>
            </div>

            {/* Live Supabase Sync Notice */}
            {syncNotice && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl flex items-center gap-2 text-emerald-200 text-xs shadow-md animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncNotice}</span>
              </div>
            )}
            {isSyncingBalance && !syncNotice && (
              <div className="p-2.5 bg-secondary/10 border border-secondary/30 rounded-xl flex items-center gap-2 text-deep-teal text-[11px] animate-pulse">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing live ledger running balance with Supabase...</span>
              </div>
            )}

            {/* Assigned Customers Quick List */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">My Assigned Portfolio ({customers.length})</span>
                <button
                  onClick={() => setActiveScreen('CUSTOMERS')}
                  className="text-deep-teal text-[11px] font-semibold hover:underline"
                >
                  View All ({customers.length}) &rarr;
                </button>
              </div>

              {customers.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => {
                    setSelectedCustomerId(cust.id);
                    setActiveScreen('CUSTOMER_PROFILE');
                  }}
                  className="p-3.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/60 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] hover:scale-[1.02] transition-all duration-200 shadow-lg"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        {cust.customerCode}
                      </span>
                      <span className="font-bold text-white text-xs">{cust.companyName}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {cust.contactPerson} • {cust.city}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Outstanding:</span>
                    <span className="font-mono font-bold text-deep-teal text-sm tabular-nums tracking-tight">
                      PKR {cust.currentBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Visits Feed */}
            <div className="space-y-2 pt-2">
              <span className="font-bold text-slate-300 block">Today's Visits & Progress</span>
              {visits.map((v) => (
                <div key={v.id} className="p-3 bg-surface-card/80 rounded-xl border border-slate-800 space-y-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{v.customerName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Checked In</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{v.notes}</p>
                  
                  {v.photoUrl && (
                    <div className="my-2 rounded-lg overflow-hidden border border-slate-800/85 max-h-36 bg-surface-card flex items-center justify-center">
                      <img src={v.photoUrl} alt="Storefront / Receipt Capture" className="w-full h-auto max-h-36 object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1 text-[10px] font-mono">
                    <span className={v.orderPlaced ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      Order: {v.orderPlaced ? 'YES' : 'NO'}
                    </span>
                    <span className={v.recoveryCollected ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      Recovery: {v.recoveryCollected ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 1.5 DEDICATED CUSTOMER DIRECTORY SCREEN */}
        {/* ========================================================================= */}
        {activeScreen === 'CUSTOMERS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-bold text-white text-base">Client Portfolio Directory</h2>
                <p className="text-[11px] text-slate-400">Assigned customer accounts and live credit balances</p>
              </div>
              <button
                onClick={() => setActiveScreen('REGISTRATION_FORM')}
                className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-deep-green font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Lead</span>
              </button>
            </div>

            {/* Client Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search clients by trade name, code, city..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-card border border-slate-700/80 rounded-xl text-white text-xs placeholder:text-slate-500 focus:border-secondary"
              />
            </div>

            {/* Customers Card Grid */}
            <div className="space-y-2.5">
              {customers
                .filter((c) => {
                  const t = customerSearchTerm.toLowerCase();
                  return (
                    c.companyName.toLowerCase().includes(t) ||
                    c.customerCode.toLowerCase().includes(t) ||
                    c.city.toLowerCase().includes(t) ||
                    c.contactPerson.toLowerCase().includes(t)
                  );
                })
                .map((cust) => (
                  <div
                    key={cust.id}
                    className="p-3.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/60 rounded-2xl space-y-2.5 shadow-lg transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                            {cust.customerCode}
                          </span>
                          <span className="font-bold text-white text-sm">{cust.companyName}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {cust.contactPerson} • {cust.phone} • {cust.city}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-secondary/15 text-deep-teal border border-secondary/30 rounded font-mono text-[9px] uppercase font-bold">
                        {cust.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs border-t border-slate-800/80">
                      <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Credit Limit</span>
                        <span className="font-mono font-bold text-white block mt-0.5 text-sm tabular-nums tracking-tight">
                          PKR {cust.creditLimit.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Outstanding</span>
                        <span className="font-mono font-bold text-deep-teal block mt-0.5 text-sm tabular-nums tracking-tight">
                          PKR {cust.currentBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setActiveScreen('CUSTOMER_PROFILE');
                        }}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-[11px] text-center"
                      >
                        360° Profile
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setActiveScreen('ORDER_BOOKING');
                        }}
                        className="flex-1 py-1.5 bg-secondary/20 hover:bg-secondary/30 text-deep-green font-bold rounded-xl text-[11px] text-center border border-secondary/30"
                      >
                        Book Order
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setActiveScreen('RECOVERY_FORM');
                        }}
                        className="flex-1 py-1.5 bg-secondary hover:bg-secondary text-deep-green font-bold rounded-xl text-[11px] text-center shadow-sm"
                      >
                        Recovery
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. CUSTOMER 360 PROFILE SCREEN */}
        {/* ========================================================================= */}
        {activeScreen === 'CUSTOMER_PROFILE' && (
          <div className="space-y-4">
            
            {/* Header Badge */}
            <div className="p-4 bg-surface-card rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-deep-teal bg-secondary/10 px-2 py-0.5 rounded">
                {selectedCustomer.customerCode} • {selectedCustomer.type}
              </span>
              <h2 className="text-base font-bold text-white">{selectedCustomer.companyName}</h2>
              <p className="text-slate-400 text-[11px]">
                {selectedCustomer.contactPerson} • {selectedCustomer.phone}
              </p>
              <p className="text-slate-500 text-[11px]">{selectedCustomer.address}</p>
            </div>

            {/* Financial Status Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Credit Limit</span>
                <span className="font-mono font-bold text-white text-sm tabular-nums tracking-tight block mt-0.5">
                  PKR {selectedCustomer.creditLimit.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {selectedCustomer.creditDays} Credit Days
                </span>
              </div>

              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Current Balance</span>
                <span className="font-mono font-bold text-deep-teal text-sm tabular-nums tracking-tight block mt-0.5">
                  PKR {selectedCustomer.currentBalance.toLocaleString()}
                </span>
                <span className="text-[10px] text-deep-teal block mt-0.5 tabular-nums tracking-tight">
                  Avail: PKR {(selectedCustomer.creditLimit - selectedCustomer.currentBalance).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Customer Direct Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setActiveScreen('ORDER_BOOKING')}
                className="py-3 bg-secondary hover:bg-secondary/80 text-deep-green font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <FilePlus className="w-4 h-4" /> Book New Order
              </button>
              <button
                onClick={() => setActiveScreen('RECOVERY_FORM')}
                className="py-3 bg-secondary hover:bg-secondary text-deep-green font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Coins className="w-4 h-4" /> Record Recovery
              </button>
            </div>

            <button
              onClick={() => setActiveScreen('VISIT_LOG')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <MapPin className="w-4 h-4 text-rose-400" /> Log In-Person Visit
            </button>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. ORDER BOOKING SCREEN (ADVANCED SEQUENTIAL SYSTEM) */}
        {/* ========================================================================= */}
        {activeScreen === 'ORDER_BOOKING' && (
          <div className="space-y-4 relative pb-20">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-sm">Unified Order & Recovery Sheet</span>
              <span className="px-2 py-0.5 bg-secondary/10 text-deep-teal font-mono text-[10px] rounded">
                Active Booking
              </span>
            </div>

            {/* STEP 1: CUSTOMER SELECTION & SEARCH */}
            <div className="bg-surface-card p-3.5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider block">
                  Step 1: Client Account Selection
                </span>
                {selectedCustomerId && (
                  <button
                    onClick={() => {
                      setIsCustomerDropdownOpen(!isCustomerDropdownOpen);
                      setCustomerSearchTerm('');
                    }}
                    className="text-deep-teal text-[10px] hover:underline font-bold"
                  >
                    Change Client
                  </button>
                )}
              </div>

              {!selectedCustomerId || isCustomerDropdownOpen ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search by name, ID (DST/DLR), phone or area..."
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-surface-card border border-slate-700 rounded-xl text-white font-semibold text-xs focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Filtered Dropdown List */}
                  <div className="max-h-48 overflow-y-auto bg-surface-card border border-slate-800 rounded-xl divide-y divide-slate-800">
                    {customers
                      .filter((c) => {
                        const term = customerSearchTerm.toLowerCase();
                        return (
                          c.companyName.toLowerCase().includes(term) ||
                          c.customerCode.toLowerCase().includes(term) ||
                          c.phone.includes(term) ||
                          c.city.toLowerCase().includes(term) ||
                          c.region.toLowerCase().includes(term)
                        );
                      })
                      .map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setIsCustomerDropdownOpen(false);
                            setCustomerSearchTerm('');
                          }}
                          className="p-2.5 hover:bg-slate-800 cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] bg-slate-800 font-mono font-bold text-deep-teal px-1 py-0.5 rounded">
                                {c.customerCode}
                              </span>
                              <span className="text-white font-bold text-xs">{c.companyName}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {c.contactPerson} • {c.phone} • {c.city}
                            </span>
                          </div>
                          <div className="text-right text-[10px] text-slate-400">
                            Outstanding: <span className="font-mono text-deep-teal font-bold block">PKR {c.currentBalance.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-surface-card rounded-xl border border-slate-850 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-secondary/10 font-mono font-bold text-deep-teal px-1.5 py-0.5 rounded">
                        {selectedCustomer.customerCode}
                      </span>
                      <span className="text-white font-black text-xs">{selectedCustomer.companyName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {selectedCustomer.contactPerson} • {selectedCustomer.phone} • {selectedCustomer.address}
                    </span>
                  </div>
                  <div className="text-right font-mono text-[10px]">
                    <span className="text-slate-500 block">Credit Limit:</span>
                    <span className="text-white font-bold">PKR {selectedCustomer.creditLimit.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: CUSTOMER BALANCE BANNER */}
            <div className="bg-surface-card p-3 rounded-2xl border border-slate-800 space-y-1.5">
              <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider block">
                Step 2: Real-time Ledger Balance
              </span>
              <div className="grid grid-cols-3 bg-surface-card rounded-xl overflow-hidden border border-slate-800 divide-x divide-slate-800 text-center">
                <div className="p-2.5">
                  <span className="text-[9px] text-slate-500 block">Opening Balance</span>
                  <span className="text-[11px] font-bold text-white font-mono block mt-0.5">
                    PKR {selectedCustomer.currentBalance.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-950/20">
                  <span className="text-[9px] text-deep-teal block">Recovery Entry</span>
                  <span className="text-[11px] font-bold text-deep-teal font-mono block mt-0.5">
                    - PKR {orderRecoveryAmount.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5">
                  <span className="text-[9px] text-slate-500 block">Net Balance</span>
                  <span className="text-[11px] font-bold text-deep-teal font-mono block mt-0.5">
                    PKR {(selectedCustomer.currentBalance - orderRecoveryAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 3: SKU QUICK GRID */}
            <div className="bg-surface-card p-3.5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider block">
                  Step 3: SKU Quick-Entry Grid
                </span>
                
                {/* Backorder Toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] select-none bg-surface-card px-2 py-1 rounded-lg border border-slate-800">
                  <input
                    type="checkbox"
                    checked={backordersEnabled}
                    onChange={(e) => setBackordersEnabled(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span className="text-slate-300 font-semibold">Enable Backorders</span>
                </label>
              </div>

              {/* SKU Search Box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter grid SKUs by name or code..."
                  value={skuSearchQuery}
                  onChange={(e) => setSkuSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-surface-card border border-slate-800 rounded-xl text-white text-[11px]"
                />
              </div>

              {/* Dynamic SKU Grid: Table on Desktop/Tablet (>=640px), Card-View on Mobile (<640px) */}
              
              {/* 1. Desktop / Tablet High-Density Table */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-800 bg-surface-card">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-surface-card text-slate-400 text-[10px] uppercase font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-2.5 text-center w-8">#</th>
                      <th className="p-2.5">SKU Name</th>
                      <th className="p-2.5 text-right w-16">Avail</th>
                      <th className="p-2.5 text-center w-28">Order Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {skus
                      .filter((sku) => {
                        const term = skuSearchQuery.toLowerCase();
                        return (
                          sku.name.toLowerCase().includes(term) ||
                          sku.skuCode.toLowerCase().includes(term)
                        );
                      })
                      .map((sku, idx) => {
                        const stock = inventoryBalances.find((b) => b.skuId === sku.id);
                        const availableQty = stock ? stock.quantityOnHand : 0;
                        const currentVal = gridOrderQuantities[sku.id] || '';
                        
                        return (
                          <tr key={sku.id} className="hover:bg-slate-800/40">
                            <td className="p-2.5 text-center text-slate-500 font-mono font-semibold">{idx + 1}</td>
                            <td className="p-2.5">
                              <span className="text-white font-bold block">{sku.name}</span>
                              <div className="flex gap-2 items-center text-[10px] text-slate-400 mt-0.5">
                                <span className="font-mono bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded text-[9px] font-bold">{sku.skuCode}</span>
                                <span className="font-mono text-emerald-400">PKR {sku.tradePrice.toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-300">
                              <span className={availableQty === 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                                {availableQty.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                placeholder="0"
                                value={currentVal}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                                  
                                  if (val !== '') {
                                    if (!backordersEnabled && val > availableQty) {
                                      setGridOrderQuantities({
                                        ...gridOrderQuantities,
                                        [sku.id]: availableQty
                                      });
                                      alert(`Capped at ${availableQty} as backorders are currently disabled! Check 'Enable Backorders' above to order beyond stock.`);
                                    } else {
                                      setGridOrderQuantities({
                                        ...gridOrderQuantities,
                                        [sku.id]: val
                                      });
                                    }
                                  } else {
                                    const updated = { ...gridOrderQuantities };
                                    delete updated[sku.id];
                                    setGridOrderQuantities(updated);
                                  }
                                }}
                                className="w-20 p-1.5 bg-surface-card border border-slate-700 rounded-lg text-center text-white font-bold font-mono focus:border-secondary text-xs"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* 2. Mobile Touch-Optimized SKU Cards (< 640px) */}
              <div className="block sm:hidden space-y-2.5">
                {skus
                  .filter((sku) => {
                    const term = skuSearchQuery.toLowerCase();
                    return (
                      sku.name.toLowerCase().includes(term) ||
                      sku.skuCode.toLowerCase().includes(term)
                    );
                  })
                  .map((sku) => {
                    const stock = inventoryBalances.find((b) => b.skuId === sku.id);
                    const availableQty = stock ? stock.quantityOnHand : 0;
                    const currentQty = gridOrderQuantities[sku.id] || 0;
                    const lineTotal = currentQty * sku.tradePrice;
                    const isOutOfStock = availableQty <= 0;

                    const handleSetQty = (newQty: number) => {
                      const validQty = Math.max(0, newQty);
                      if (!backordersEnabled && validQty > availableQty) {
                        setGridOrderQuantities({
                          ...gridOrderQuantities,
                          [sku.id]: availableQty
                        });
                        alert(`Capped at ${availableQty} available stock! Enable Backorders to exceed.`);
                        return;
                      }
                      if (validQty === 0) {
                        const updated = { ...gridOrderQuantities };
                        delete updated[sku.id];
                        setGridOrderQuantities(updated);
                      } else {
                        setGridOrderQuantities({
                          ...gridOrderQuantities,
                          [sku.id]: validQty
                        });
                      }
                    };

                    return (
                      <div
                        key={sku.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          currentQty > 0
                            ? 'bg-secondary/10 border-secondary/40 shadow-sm'
                            : 'bg-surface-card border-slate-800'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="font-bold text-white text-xs block leading-snug">{sku.name}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[9px] text-slate-300 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                                {sku.skuCode}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {sku.category}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono text-[10px] px-2 py-0.5 rounded-md font-bold block ${
                                isOutOfStock
                                  ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                                  : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                              }`}
                            >
                              {isOutOfStock ? '0 Avail' : `${availableQty.toLocaleString()} in stock`}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-deep-teal block mt-1">
                              PKR {sku.tradePrice.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Stepper Controls & Line Calculation */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetQty(currentQty - 10)}
                              disabled={currentQty <= 0}
                              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-[10px] font-mono font-bold min-w-[32px] min-h-[36px] flex items-center justify-center active:scale-95"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetQty(currentQty - 1)}
                              disabled={currentQty <= 0}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold min-w-[32px] min-h-[36px] flex items-center justify-center active:scale-95"
                            >
                              -
                            </button>
                            
                            <input
                              type="number"
                              min="0"
                              value={currentQty || ''}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                handleSetQty(val);
                              }}
                              className="w-14 py-1.5 px-1 bg-surface-card border border-slate-700 rounded-lg text-center text-white font-bold font-mono text-xs focus:border-secondary min-h-[36px]"
                            />

                            <button
                              type="button"
                              onClick={() => handleSetQty(currentQty + 1)}
                              className="px-2.5 py-1.5 bg-secondary hover:bg-secondary/80 text-deep-green font-bold rounded-lg text-xs min-w-[32px] min-h-[36px] flex items-center justify-center active:scale-95 shadow-sm"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetQty(currentQty + 10)}
                              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-mono font-bold min-w-[32px] min-h-[36px] flex items-center justify-center active:scale-95"
                            >
                              +10
                            </button>
                          </div>

                          {currentQty > 0 && (
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 block">Line Total:</span>
                              <span className="text-xs font-bold text-emerald-400 font-mono tracking-tight">
                                PKR {lineTotal.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* SKU Grid Totals Summary */}
              {gridComputedItems.length > 0 && (
                <div className="p-2.5 bg-surface-card rounded-xl border border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block">Total Items:</span>
                    <span className="text-white font-bold block mt-0.5">
                      {gridComputedItems.reduce((acc, c) => acc + c.orderedQuantity, 0)} Units ({gridComputedItems.length} SKUs)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">Estimated Value:</span>
                    <span className="text-deep-teal font-extrabold text-xs block mt-0.5">
                      PKR {gridOrderTotals.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 4: RECOVERY SHORTCUT FORM */}
            <div className="bg-surface-card p-3.5 rounded-2xl border border-slate-800 space-y-3">
              <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider block">
                Step 4: Unified Payment Recovery (Optional)
              </span>
              
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Recovery Amount Collected (PKR):</label>
                    <input
                      type="number"
                      placeholder="e.g. 25000"
                      value={orderRecoveryAmount || ''}
                      onChange={(e) => setOrderRecoveryAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full p-2 bg-surface-card border border-slate-700 rounded-xl font-mono text-deep-teal font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Payment Method:</label>
                    <select
                      value={orderPaymentMode}
                      onChange={(e) => setOrderPaymentMode(e.target.value as PaymentMode)}
                      className="w-full p-2 bg-surface-card border border-slate-700 rounded-xl text-white font-semibold text-xs"
                    >
                      <option value="CASH">CASH (Physical Receipt)</option>
                      <option value="CHEQUE">CHEQUE / DEPOSIT</option>
                      <option value="ONLINE_TRANSFER">ONLINE IBFT</option>
                      <option value="PAY_ORDER">PAY ORDER</option>
                    </select>
                  </div>
                </div>

                {orderRecoveryAmount > 0 && (
                  <div className="space-y-2 p-3 bg-surface-card rounded-xl border border-slate-800 animate-fadeIn">
                    {(orderPaymentMode === 'CHEQUE' || orderPaymentMode === 'PAY_ORDER' || orderPaymentMode === 'ONLINE_TRANSFER') && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-500 text-[9px] block mb-0.5">Reference / Instrument No:</label>
                          <input
                            type="text"
                            placeholder="e.g. HBL-009912"
                            value={orderInstrumentNumber}
                            onChange={(e) => setOrderInstrumentNumber(e.target.value)}
                            className="w-full p-1.5 bg-surface-card border border-slate-700 rounded-lg text-white font-mono text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 text-[9px] block mb-0.5">Drawee Bank Name:</label>
                          <input
                            type="text"
                            placeholder="e.g. HBL / MCB"
                            value={orderBankName}
                            onChange={(e) => setOrderBankName(e.target.value)}
                            className="w-full p-1.5 bg-surface-card border border-slate-700 rounded-lg text-white text-[11px]"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-slate-500 text-[9px] block mb-0.5">Deposit Remarks:</label>
                      <input
                        type="text"
                        placeholder="Details of collection, deposit slip note..."
                        value={orderRecoveryRemarks}
                        onChange={(e) => setOrderRecoveryRemarks(e.target.value)}
                        className="w-full p-1.5 bg-surface-card border border-slate-700 rounded-lg text-white text-[11px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 5: PROPOSED CREDIT HEALTH & SUBMIT BUTTON */}
            <div className="space-y-3 pt-1">
              {/* Credit check evaluation */}
              {gridComputedItems.length > 0 && (
                <div className={`p-3 rounded-2xl border ${
                  gridCreditCheck.status === 'GREEN'
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : gridCreditCheck.status === 'AMBER'
                    ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                    : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                }`}>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-[11px]">Proposed Credit Rating: {gridCreditCheck.status}</span>
                      <p className="text-[10px] opacity-90 mt-0.5">{gridCreditCheck.message}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (gridComputedItems.length === 0) {
                    alert('Please enter order quantity for at least one SKU first!');
                    return;
                  }
                  setShowOrderConfirmModal(true);
                }}
                disabled={gridComputedItems.length === 0}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  gridComputedItems.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-secondary hover:bg-secondary/80 text-deep-green hover:shadow-lg hover:shadow-amber-500/10 active:scale-98'
                }`}
              >
                <Send className="w-4 h-4" /> Review & Book Order
              </button>
            </div>

            {/* ========================================================================= */}
            {/* 5. ORDER CONFIRMATION MODAL (STEP 5 PREVIEW) */}
            {/* ========================================================================= */}
            {showOrderConfirmModal && (
              <div className="absolute inset-0 bg-surface-card/95 z-50 rounded-2xl flex flex-col justify-end p-4 animate-slideUp">
                <div className="bg-surface-card border border-slate-800 rounded-3xl p-4 space-y-4 max-h-[90%] overflow-y-auto">
                  <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                    <span className="font-extrabold text-white text-sm">Verify Submission Details</span>
                    <button
                      onClick={() => setShowOrderConfirmModal(false)}
                      className="text-slate-400 hover:text-white font-mono text-xs"
                    >
                      [Dismiss]
                    </button>
                  </div>

                  {/* Summary grid */}
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-surface-card rounded-xl space-y-2 border border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Client Business:</span>
                        <span className="font-bold text-white text-right">{selectedCustomer.companyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Client ID:</span>
                        <span className="font-mono text-deep-teal font-bold">{selectedCustomer.customerCode}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-surface-card rounded-xl space-y-2 border border-slate-800 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Opening Balance:</span>
                        <span className="text-white">PKR {selectedCustomer.currentBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-deep-teal">
                        <span>Recovery Collected:</span>
                        <span>- PKR {orderRecoveryAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1 text-deep-teal font-bold">
                        <span>Net Balance:</span>
                        <span>PKR {(selectedCustomer.currentBalance - orderRecoveryAmount).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-surface-card rounded-xl space-y-2 border border-slate-800 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total SKU Lines:</span>
                        <span className="text-white font-bold">{gridComputedItems.length} SKUs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Product Qty:</span>
                        <span className="text-white font-bold">
                          {gridComputedItems.reduce((acc, c) => acc + c.orderedQuantity, 0)} Units
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1 text-deep-teal font-black">
                        <span>Order Estimated Value:</span>
                        <span>PKR {gridOrderTotals.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Proposed balance prediction */}
                    <div className="p-3 bg-surface-card rounded-xl space-y-1.5 border border-slate-800 font-mono text-[10px]">
                      <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Simulated Ledger Post:</span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Predicted Balance:</span>
                        <span className="text-white font-bold">
                          PKR {(selectedCustomer.currentBalance - orderRecoveryAmount + gridOrderTotals.totalAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Remaining Credit:</span>
                        <span className="text-deep-teal font-bold">
                          PKR {Math.max(0, selectedCustomer.creditLimit - (selectedCustomer.currentBalance - orderRecoveryAmount + gridOrderTotals.totalAmount)).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Credit Status */}
                    <div className={`p-3 rounded-xl border flex items-start gap-2 ${
                      gridCreditCheck.status === 'GREEN'
                        ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                        : gridCreditCheck.status === 'AMBER'
                        ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                        : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                    }`}>
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Credit Review: {gridCreditCheck.status}</span>
                        <p className="text-[10px] opacity-90 mt-0.5">{gridCreditCheck.message}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions inside Modal */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <button
                      onClick={() => setShowOrderConfirmModal(false)}
                      className="py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-2xl text-xs active:scale-95 transition-all"
                    >
                      Cancel / Edit
                    </button>
                    <button
                      onClick={handleOrderSubmit}
                      className="py-3 bg-secondary hover:bg-secondary/80 text-deep-green font-black rounded-2xl text-xs active:scale-95 transition-all"
                    >
                      Confirm & Submit
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. RECOVERY COLLECTION SCREEN */}
        {/* ========================================================================= */}
        {activeScreen === 'RECOVERY_FORM' && (
          <div className="space-y-4">
            
            <div className="border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-sm">Log Debt Recovery Collection</span>
              <p className="text-[10px] text-slate-400">
                Field collection directly credited to customer ledger upon Accounts verification.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Customer:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2 bg-surface-card border border-slate-700 rounded-lg text-white font-semibold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerCode} - {c.companyName} (Due: PKR {c.currentBalance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Amount Collected (PKR):</label>
              <input
                type="number"
                value={recoveryAmount}
                onChange={(e) => setRecoveryAmount(Number(e.target.value))}
                className="w-full p-2 bg-surface-card border border-slate-700 rounded-lg font-mono text-deep-teal font-bold text-base"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Payment Mode:</label>
              <select
                value={recoveryPaymentMode}
                onChange={(e) => setRecoveryPaymentMode(e.target.value as PaymentMode)}
                className="w-full p-2 bg-surface-card border border-slate-700 rounded-lg text-white font-semibold"
              >
                <option value="CASH">CASH (Physical Receipt)</option>
                <option value="CHEQUE">CHEQUE / CHEQUE DEPOSIT</option>
                <option value="ONLINE_TRANSFER">ONLINE BANK TRANSFER / IBFT</option>
                <option value="PAY_ORDER">PAY ORDER</option>
              </select>
            </div>

            {(recoveryPaymentMode === 'CHEQUE' || recoveryPaymentMode === 'PAY_ORDER') && (
              <div className="space-y-2 p-3 bg-surface-card rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">Cheque / Instrument Number:</label>
                  <input
                    type="text"
                    value={instrumentNumber}
                    onChange={(e) => setInstrumentNumber(e.target.value)}
                    placeholder="e.g. HBL-0099412"
                    className="w-full p-1.5 bg-surface-card border border-slate-700 rounded font-mono text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">Drawee Bank Name:</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Habib Bank Ltd / MCB"
                    className="w-full p-1.5 bg-surface-card border border-slate-700 rounded text-white"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Remarks / Deposit Notes:</label>
              <textarea
                value={recoveryRemarks}
                onChange={(e) => setRecoveryRemarks(e.target.value)}
                placeholder="Details of collection..."
                rows={2}
                className="w-full p-2 bg-surface-card border border-slate-700 rounded-lg text-white"
              />
            </div>

            <button
              onClick={handleRecoverySubmit}
              className="w-full py-3 bg-secondary hover:bg-secondary text-deep-green font-bold rounded-xl shadow-md text-sm transition-all"
            >
              Submit Recovery (PKR {recoveryAmount.toLocaleString()})
            </button>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. VISIT LOG & GPS CHECK-IN */}
        {/* ========================================================================= */}
        {activeScreen === 'VISIT_LOG' && (() => {
          const mapCenterLat = 31.5798;
          const mapCenterLng = 74.3168;

          // Helper to calculate distance
          const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371; // Earth's radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return parseFloat((R * c).toFixed(2));
          };

          // Generate map pins relative to current check-in location (31.5798, 74.3168)
          const mapPins = [
            { id: 'self', name: 'Your GPS Check-in Point', lat: mapCenterLat, lng: mapCenterLng, type: 'SELF', outstanding: 0, code: 'ME' },
            ...customers.map((c, idx) => {
              let lat = mapCenterLat;
              let lng = mapCenterLng;
              // Map key customers to realistic Lahore coordinates
              if (c.id === 'c-1') { lat = 31.5790; lng = 74.3120; } // Al-Madina (Brandreth Rd)
              else if (c.id === 'c-2') { lat = 31.5722; lng = 74.3250; } // Bright Spark (Hall Rd)
              else if (c.id === 'c-3') { lat = 31.5880; lng = 74.3210; } // Peshawar (GT Road Link)
              else {
                // Distribute around nicely for visual dispersion
                lat = mapCenterLat + 0.006 * Math.sin(idx * 2.3 + 0.5);
                lng = mapCenterLng + 0.006 * Math.cos(idx * 1.7 + 1.2);
              }
              return {
                id: c.id,
                name: c.companyName,
                lat,
                lng,
                type: c.type,
                outstanding: c.currentBalance,
                code: c.customerCode
              };
            })
          ];

          return (
            <div className="space-y-4">
              
              <div className="border-b border-slate-800 pb-2">
                <span className="font-bold text-white text-sm">Customer Visits & Schedule</span>
                <p className="text-[10px] text-slate-400">
                  GPS check-in timestamp, client discussions, and monthly visit reminders.
                </p>
              </div>

              {/* Sub-tab Navigation: GPS Check-in vs Monthly Calendar */}
              <div className="flex items-center gap-1 bg-surface-card p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setVisitScreenSubTab('CHECKIN')}
                  className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                    visitScreenSubTab === 'CHECKIN'
                      ? 'bg-secondary text-deep-green shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" /> GPS Check-In
                </button>
                <button
                  type="button"
                  onClick={() => setVisitScreenSubTab('CALENDAR')}
                  className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                    visitScreenSubTab === 'CALENDAR'
                      ? 'bg-secondary text-deep-green shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" /> Monthly Calendar & Reminders
                </button>
              </div>

              {/* VIEW 1: MONTHLY CALENDAR & REMINDERS */}
              {visitScreenSubTab === 'CALENDAR' && (
                <div className="space-y-3">
                  <VisitLogCalendarView
                    currentUser={currentUser}
                    visits={visits}
                    customers={customers}
                    isMobileCompact={true}
                    onLogVisitClick={(custId, notes) => {
                      if (custId) setSelectedCustomerId(custId);
                      if (notes) setVisitPurpose(notes);
                      setVisitScreenSubTab('CHECKIN');
                    }}
                  />
                </div>
              )}

              {/* VIEW 2: GPS CHECK-IN & DISCUSSION FORM */}
              {visitScreenSubTab === 'CHECKIN' && (
                <div className="space-y-4">
                  {/* GPS Coordinates Bar */}
                  <div className="p-3 bg-surface-card rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-deep-teal">
                      <Navigation className="w-4 h-4 animate-pulse" />
                      <span className="font-mono text-[11px]">GPS: {mapCenterLat}° N, {mapCenterLng}° E</span>
                    </div>
                    <span className="px-2 py-0.5 bg-secondary/20 text-emerald-300 rounded text-[10px] font-mono">
                      Lahore Market
                    </span>
                  </div>

              {/* Interactive SVG Proximity Map View */}
              <div className="space-y-2">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Lightweight Visit Proximity Map</span>
                
                <div className="relative w-full h-[220px] bg-surface-card rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex flex-col">
                  {/* Map Canvas */}
                  <svg className="w-full h-full flex-1" viewBox="0 0 300 200">
                    {/* Gridlines */}
                    <defs>
                      <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(51, 65, 85, 0.2)" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Dotted street approximations */}
                    <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(51, 65, 85, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
                    <line x1="150" y1="0" x2="150" y2="200" stroke="rgba(51, 65, 85, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
                    <text x="5" y="95" fill="rgba(71, 85, 105, 0.6)" fontSize="7" fontFamily="monospace">BRANDRETH ROAD</text>
                    <text x="155" y="195" fill="rgba(71, 85, 105, 0.6)" fontSize="7" fontFamily="monospace" transform="rotate(-90 155 195)">HALL ROAD</text>

                    {/* Concentric Proximity Rings around SELF (150, 100) */}
                    <circle cx="150" cy="100" r="35" fill="none" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="1" />
                    <circle cx="150" cy="100" r="75" fill="none" stroke="rgba(16, 185, 129, 0.05)" strokeWidth="1" />
                    
                    {/* Ring distance labels */}
                    <text x="188" y="103" fill="rgba(16, 185, 129, 0.4)" fontSize="6" fontFamily="monospace">1.0 km</text>
                    <text x="228" y="103" fill="rgba(16, 185, 129, 0.3)" fontSize="6" fontFamily="monospace">2.5 km</text>

                    {/* Route line if a pin is selected */}
                    {selectedMapPin && (() => {
                      const pin = mapPins.find(p => p.id === selectedMapPin.id);
                      if (pin && pin.id !== 'self') {
                        // Relative coordinates
                        const scaleX = 3500;
                        const scaleY = -3500;
                        const px = 150 + (pin.lng - mapCenterLng) * scaleX;
                        const py = 100 + (pin.lat - mapCenterLat) * scaleY;
                        return (
                          <line 
                            x1="150" y1="100" x2={px} y2={py} 
                            stroke="#f59e0b" strokeWidth="1.5" 
                            strokeDasharray="2 2" className="animate-[dash_2s_linear_infinite]"
                          />
                        );
                      }
                      return null;
                    })()}

                    {/* Render Pins */}
                    {mapPins.map((pin) => {
                      const scaleX = 3500;
                      const scaleY = -3500;

                      const px = pin.id === 'self' ? 150 : Math.min(285, Math.max(15, 150 + (pin.lng - mapCenterLng) * scaleX));
                      const py = pin.id === 'self' ? 100 : Math.min(185, Math.max(15, 100 + (pin.lat - mapCenterLat) * scaleY));

                      if (pin.type === 'SELF') {
                        return (
                          <g key={pin.id} className="cursor-pointer">
                            <circle cx={px} cy={py} r="12" fill="rgba(16, 185, 129, 0.25)" className="animate-ping" style={{ transformOrigin: `${px}px ${py}px` }} />
                            <circle cx={px} cy={py} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                          </g>
                        );
                      }

                      const isSelected = selectedMapPin?.id === pin.id;
                      const dist = getDistanceInKm(mapCenterLat, mapCenterLng, pin.lat, pin.lng);

                      return (
                        <g 
                          key={pin.id} 
                          className="cursor-pointer"
                          onClick={() => setSelectedMapPin({ id: pin.id, name: pin.name, dist, type: pin.type })}
                        >
                          <path 
                            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
                            fill={isSelected ? '#f59e0b' : '#3b82f6'} 
                            stroke="#1e293b" 
                            strokeWidth="1"
                            transform={`translate(${px - 6}, ${py - 12}) scale(0.5)`} 
                          />
                          <rect x={px - 14} y={py - 22} width="28" height="9" rx="2" fill="#1e293b" stroke={isSelected ? '#f59e0b' : 'transparent'} strokeWidth="1" />
                          <text x={px} y={py - 15} textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold" fontFamily="monospace">
                            {pin.code}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div className="absolute bottom-2 right-2 bg-surface-card/95 border border-slate-800 px-2 py-1 rounded text-[8px] font-mono text-slate-400 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> Self
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> Dealers
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> Selected
                    </div>
                  </div>
                </div>

                {selectedMapPin ? (
                  <div className="bg-surface-card p-3 rounded-xl border border-secondary/30 flex items-center justify-between animate-fade-in">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-[11px] truncate max-w-[170px]">{selectedMapPin.name}</span>
                        <span className="px-1.5 py-0.5 bg-slate-800 text-[8px] text-slate-300 font-bold rounded uppercase tracking-wider">
                          {selectedMapPin.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Distance from check-in: <strong className="text-deep-teal">{selectedMapPin.dist} km</strong> 
                        <span className="text-[9px] text-slate-500 ml-1">
                          ({selectedMapPin.dist < 1 ? 'Immediate Proximity' : selectedMapPin.dist < 3 ? 'Nearby Range' : 'Outer Limit'})
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomerId(selectedMapPin.id);
                        setSelectedMapPin(null);
                      }}
                      className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 text-deep-green font-bold rounded text-[10px]"
                    >
                      Check-In
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic text-center">
                    💡 Click any dealer pin above to view distance from check-in coordinates and plot routing.
                  </p>
                )}
              </div>

              {/* Form Controls */}
              <div className="space-y-1">
                <label className="text-slate-400 text-[10px]">Customer visiting:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2 bg-surface-card border border-slate-700 rounded-lg text-white font-semibold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerCode} - {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[10px]">Purpose of Visit:</label>
                <input
                  type="text"
                  value={visitPurpose}
                  onChange={(e) => setVisitPurpose(e.target.value)}
                  className="w-full p-2 bg-surface-card border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[10px]">Discussion Notes & Feedback:</label>
                <textarea
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Market feedback, competitor pricing, delivery issues..."
                  rows={3}
                  className="w-full p-2 bg-surface-card border border-slate-700 rounded-lg text-white"
                />
              </div>

              {/* Storefront / Delivery Receipt Capture Component */}
              <div className="space-y-2 p-3 bg-surface-card rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Storefront & Receipt Capture</span>
                
                {visitPhoto ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-surface-card max-h-48 flex items-center justify-center">
                      <img src={visitPhoto} alt="Captured Storefront" className="w-full h-auto max-h-48 object-contain" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => setVisitPhoto(null)}
                        className="absolute top-2 right-2 bg-rose-600/90 hover:bg-rose-500 text-white p-1.5 rounded-full shadow-md transition-all text-[10px] font-bold"
                        title="Remove Photo"
                      >
                        Delete
                      </button>
                      <div className="absolute bottom-2 left-2 bg-secondary/95 text-deep-green text-[9px] font-bold px-2 py-0.5 rounded shadow">
                        ✓ Snapshot Attached
                      </div>
                    </div>
                    <button
                      onClick={() => startCamera()}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded text-[11px] flex items-center justify-center gap-1 border border-slate-700"
                    >
                      <Camera className="w-3.5 h-3.5" /> Retake Photo
                    </button>
                  </div>
                ) : isCameraActive ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-surface-card aspect-video flex flex-col justify-between">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                        <button
                          onClick={capturePhoto}
                          className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-deep-green font-bold rounded-lg text-xs shadow-lg"
                        >
                          Capture
                        </button>
                        <button
                          onClick={stopCamera}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center">Position the receipt or storefront within the frame.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={startCamera}
                        className="flex-1 py-3 bg-surface-card hover:bg-slate-850 text-deep-teal rounded-lg font-bold border border-slate-750 flex flex-col items-center justify-center gap-1 shadow transition-all active:scale-95"
                      >
                        <Camera className="w-5 h-5 text-deep-teal" />
                        <span className="text-[10px]">Take Live Photo</span>
                      </button>

                      <label className="flex-1 py-3 bg-surface-card hover:bg-slate-850 text-slate-300 rounded-lg font-bold border border-slate-750 flex flex-col items-center justify-center gap-1 shadow transition-all active:scale-95 cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange} 
                          className="hidden" 
                        />
                        <svg className="w-5 h-5 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        <span className="text-[10px] mt-1">Upload File</span>
                      </label>
                    </div>

                    <div className="pt-1 border-t border-slate-900">
                      <span className="text-[10px] text-slate-500 block mb-1">Quick Sandbox Mock Snippets (For Testing):</span>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => selectSimulatedPhoto('store')}
                          className="flex-1 py-1 bg-surface-card hover:bg-slate-850 text-slate-400 rounded border border-slate-800 text-[9px] font-semibold"
                        >
                          + Storefront
                        </button>
                        <button 
                          onClick={() => selectSimulatedPhoto('receipt')}
                          className="flex-1 py-1 bg-surface-card hover:bg-slate-850 text-slate-400 rounded border border-slate-800 text-[9px] font-semibold"
                        >
                          + Receipt
                        </button>
                        <button 
                          onClick={() => selectSimulatedPhoto('cheque')}
                          className="flex-1 py-1 bg-surface-card hover:bg-slate-850 text-slate-400 rounded border border-slate-800 text-[9px] font-semibold"
                        >
                          + Cheque Doc
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 p-3 bg-surface-card rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-order-visit"
                    checked={orderTakenInVisit}
                    onChange={(e) => setOrderTakenInVisit(e.target.checked)}
                    className="rounded text-deep-teal"
                  />
                  <label htmlFor="chk-order-visit" className="text-slate-300 font-medium">
                    Sales order booked during this visit
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-rec-visit"
                    checked={recoveryTakenInVisit}
                    onChange={(e) => setRecoveryTakenInVisit(e.target.checked)}
                    className="rounded text-deep-teal"
                  />
                  <label htmlFor="chk-rec-visit" className="text-slate-300 font-medium">
                    Recovery payment collected during this visit
                  </label>
                </div>
              </div>

              <button
                onClick={handleVisitSubmit}
                className="w-full py-3 bg-secondary hover:bg-secondary/80 text-deep-green font-bold rounded-xl shadow-md text-sm transition-all"
              >
                Complete Check-Out & Save Visit
              </button>
            </div>
          )}

        </div>
      );
    })()}

        {/* ========================================================================= */}
        {/* 6. NEW DEALER / DISTRIBUTOR REGISTRATION REQUEST */}
        {/* ========================================================================= */}
        {activeScreen === 'REGISTRATION_FORM' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-sm">Register Dealer/Distributor</span>
                <p className="text-[10px] text-slate-400">
                  Submit a new client lead for management verification.
                </p>
              </div>
              <span className="px-2 py-0.5 bg-secondary/10 text-deep-teal border border-secondary/20 rounded font-mono text-[9px] uppercase font-bold">
                Authorization Workflow
              </span>
            </div>

            <div className="space-y-3">
              {/* Business Details */}
              <div className="space-y-2 p-3 bg-surface-card rounded-xl border border-slate-800">
                <span className="text-deep-teal text-[9px] uppercase font-bold tracking-wider block">Business Identification</span>
                
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">Business / Trade Name*</label>
                  <input
                    type="text"
                    value={regBusinessName}
                    onChange={(e) => setRegBusinessName(e.target.value)}
                    placeholder="e.g. Al-Hamd Light House"
                    className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">Client Type*</label>
                    <select
                      value={regType}
                      onChange={(e) => setRegType(e.target.value as 'DEALER' | 'DISTRIBUTOR')}
                      className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white"
                    >
                      <option value="DEALER">Dealer (DLR)</option>
                      <option value="DISTRIBUTOR">Distributor (DST)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">Opening Balance (PKR)</label>
                    <input
                      type="number"
                      value={regOpeningBalance || ''}
                      onChange={(e) => setRegOpeningBalance(Number(e.target.value))}
                      placeholder="e.g. 15000"
                      className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Owner / Contact Details */}
              <div className="space-y-2 p-3 bg-surface-card rounded-xl border border-slate-800">
                <span className="text-deep-teal text-[9px] uppercase font-bold tracking-wider block">Owner & Verification Info</span>
                
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">Owner / Contact Person Name*</label>
                  <input
                    type="text"
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    placeholder="e.g. Muhammad Amjad"
                    className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">Owner CNIC Number (Pakistan Format)*</label>
                  <input
                    type="text"
                    value={regCnic}
                    onChange={(e) => setRegCnic(e.target.value)}
                    placeholder="e.g. 35201-1234567-9"
                    className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">Contact Mobile Number*</label>
                  <input
                    type="text"
                    value={regContactNumber}
                    onChange={(e) => setRegContactNumber(e.target.value)}
                    placeholder="e.g. 0321-4567890"
                    className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white font-mono"
                  />
                </div>
              </div>

              {/* Physical Location */}
              <div className="space-y-2 p-3 bg-surface-card rounded-xl border border-slate-800">
                <span className="text-deep-teal text-[9px] uppercase font-bold tracking-wider block">Shop Location & Address</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">City</label>
                    <input
                      type="text"
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">Region</label>
                    <select
                      value={regRegion}
                      onChange={(e) => setRegRegion(e.target.value)}
                      className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white"
                    >
                      <option value="Punjab North">Punjab North (LHR/GUJ)</option>
                      <option value="Punjab South">Punjab South (MUL/FSD)</option>
                      <option value="Sindh Coastal">Sindh Coastal (KHI)</option>
                      <option value="KPK Frontier">KPK Frontier (PEW)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">Shop Physical Address*</label>
                  <textarea
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Shop # 12, Electric Market, Lahore"
                    rows={2}
                    className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white"
                  />
                </div>

                {/* GPS Capture Indicator */}
                <div className="p-2.5 bg-surface-card rounded border border-slate-800 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 text-deep-teal">
                    <MapPin className="w-3.5 h-3.5 animate-pulse" />
                    <span>GPS Attached: {regLatitude}, {regLongitude}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setRegLatitude(31.5582 + (Math.random() - 0.5) * 0.05);
                      setRegLongitude(74.3294 + (Math.random() - 0.5) * 0.05);
                      alert('Coordinates updated from simulator sensor!');
                    }}
                    className="text-deep-teal hover:text-amber-300 font-bold"
                  >
                    Recapture
                  </button>
                </div>
              </div>

              {/* Proposed Credit Policy */}
              <div className="space-y-2 p-3 bg-surface-card rounded-xl border border-slate-800">
                <span className="text-deep-teal text-[9px] uppercase font-bold tracking-wider block">Proposed Accounts terms</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">Proposed Limit (PKR)</label>
                    <input
                      type="number"
                      value={regCreditLimit}
                      onChange={(e) => setRegCreditLimit(Number(e.target.value))}
                      className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">Proposed Credit Days</label>
                    <input
                      type="number"
                      value={regCreditDays}
                      onChange={(e) => setRegCreditDays(Number(e.target.value))}
                      className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">Officer Assessment Notes</label>
                  <textarea
                    value={regNotes}
                    onChange={(e) => setRegNotes(e.target.value)}
                    placeholder="Good market reputation, verified original CNIC, expected sales volume 500k/month..."
                    rows={2}
                    className="w-full p-2 bg-surface-card border border-slate-700 rounded text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleRegistrationSubmit}
                className="w-full py-3 bg-secondary hover:bg-secondary/80 text-deep-green font-bold rounded-xl shadow-md text-sm transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit Lead Registration Request
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. REGISTRATION HISTORY */}
        {/* ========================================================================= */}
        {activeScreen === 'REGISTRATION_HISTORY' && (() => {
          const myRequests = registrationRequests.filter(r => r.salesUserId === currentUser.id);
          
          return (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <span className="font-bold text-white text-sm">My Lead Registrations History</span>
                <p className="text-[10px] text-slate-400">
                  Real-time status tracking for client proposals submitted to Lahore Office.
                </p>
              </div>

              {myRequests.length === 0 ? (
                <div className="text-center py-10 bg-surface-card rounded-2xl border border-slate-800 space-y-2">
                  <p className="text-slate-500 text-[11px]">No registration requests found.</p>
                  <button 
                    onClick={() => setActiveScreen('REGISTRATION_FORM')}
                    className="px-3 py-1 bg-secondary/10 hover:bg-secondary/20 text-deep-teal border border-secondary/30 rounded text-[10px] font-bold"
                  >
                    Propose First Client Lead
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myRequests.map((req) => (
                    <div 
                      key={req.id} 
                      className="p-3.5 bg-surface-card rounded-2xl border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-[11px]">{req.businessName}</span>
                            <span className="px-1.5 py-0.5 bg-slate-800 text-[8px] text-slate-400 font-mono rounded tracking-wider uppercase">
                              {req.type}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500 block">Proposer: {req.ownerName} &bull; Date: {req.submissionDate}</span>
                        </div>

                        {req.status === 'PENDING_APPROVAL' && (
                          <span className="px-2 py-0.5 bg-secondary/10 text-deep-teal border border-secondary/20 rounded-full text-[9px] font-bold">
                            PENDING
                          </span>
                        )}
                        {req.status === 'APPROVED' && (
                          <span className="px-2 py-0.5 bg-secondary/10 text-deep-teal border border-emerald-500/20 rounded-full text-[9px] font-bold">
                            APPROVED
                          </span>
                        )}
                        {req.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-[9px] font-bold">
                            REJECTED
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-900 pt-2 font-mono">
                        <div>
                          <span className="text-slate-500 block text-[9px]">Contact No:</span>
                          <span className="text-slate-300">{req.contactNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px]">Proposed Limit:</span>
                          <span className="text-slate-300">PKR {req.proposedCreditLimit.toLocaleString()}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[9px]">Location Address:</span>
                          <span className="text-slate-300 font-sans truncate block max-w-full">{req.address}, {req.city}</span>
                        </div>
                      </div>

                      {/* Rejected Banner */}
                      {req.status === 'REJECTED' && req.rejectionReason && (
                        <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] text-rose-300">
                          <strong>Rejection Reason:</strong> {req.rejectionReason}
                        </div>
                      )}

                      {/* Approved Verification Details */}
                      {req.status === 'APPROVED' && (
                        <div className="p-2.5 bg-secondary/10 border border-emerald-500/20 rounded-xl space-y-1 text-[10px] text-emerald-300">
                          <div className="flex items-center gap-1 font-bold">
                            <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                            <span>Authorized Account Created</span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-tight">
                            Assigned Code: <strong className="text-white font-mono text-[10px]">{req.approvedCustomerCode}</strong> <br/>
                            Limit Set: <strong className="text-white font-mono">PKR {req.approvedCreditLimit?.toLocaleString()}</strong> ({req.approvedCreditDays} days)
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

      </div>

      {/* Bottom Navigation Bar */}
      <nav aria-label="Field Force Navigation" className="bg-surface-card border-t border-slate-800 py-4 px-4 grid grid-cols-4 gap-4 text-xs text-center sticky bottom-0 z-20 shadow-lg">
        <button
          onClick={() => setActiveScreen('DASHBOARD')}
          className={`py-2 px-1 flex flex-col items-center justify-center gap-1 rounded-xl transition-all min-h-[48px] ${
            activeScreen === 'DASHBOARD'
              ? 'bg-secondary/15 text-deep-teal font-bold border-t-[3px] border-secondary shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[11px]">Home</span>
        </button>

        <button
          onClick={() => setActiveScreen('CUSTOMERS')}
          className={`py-2 px-1 flex flex-col items-center justify-center gap-1 rounded-xl transition-all min-h-[48px] ${
            activeScreen === 'CUSTOMERS'
              ? 'bg-secondary/15 text-deep-teal font-bold border-t-[3px] border-secondary shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px]">Clients</span>
        </button>

        <button
          onClick={() => setActiveScreen('ORDER_BOOKING')}
          className={`py-2 px-1 flex flex-col items-center justify-center gap-1 rounded-xl transition-all min-h-[48px] ${
            activeScreen === 'ORDER_BOOKING'
              ? 'bg-secondary/15 text-deep-teal font-bold border-t-[3px] border-secondary shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <FilePlus className="w-5 h-5" />
          <span className="text-[11px]">Order</span>
        </button>

        <button
          onClick={() => setActiveScreen('RECOVERY_FORM')}
          className={`py-2 px-1 flex flex-col items-center justify-center gap-1 rounded-xl transition-all min-h-[48px] ${
            activeScreen === 'RECOVERY_FORM'
              ? 'bg-secondary/15 text-deep-teal font-bold border-t-[3px] border-secondary shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Coins className="w-5 h-5" />
          <span className="text-[11px]">Recovery</span>
        </button>
      </nav>

    </div>
  );
};
