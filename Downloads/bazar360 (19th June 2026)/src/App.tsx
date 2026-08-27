import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, MapPin, Gauge, Fuel, Milestone, Star, Award, DollarSign, Send, Hourglass } from 'lucide-react';
import { CarListing, Dealer, Review } from './types';
import { INITIAL_DEALERS, INITIAL_LISTINGS, INITIAL_REVIEWS } from './data';

import { 
  dbFetchDealers, 
  dbFetchListings, 
  dbSaveListing, 
  dbRegisterDealership, 
  dbApproveListing, 
  dbAddReview, 
  dbFetchReviews,
  dbSaveUserProfile,
  dbFetchUserProfile,
  UserProfile,
  seedDatabaseIfEmpty
} from './lib/dbService';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useCurrencyMode } from './lib/currency';

import TopAppBar from './components/TopAppBar';
import BottomNavBar from './components/BottomNavBar';
import HomeView from './components/HomeView';
import DealerStorefrontView from './components/DealerStorefrontView';
import SellWithAIView from './components/SellWithAIView';
import SearchExplorerView from './components/SearchExplorerView';
import RegistrationPortal from './components/RegistrationPortal';
import AdminModerationDeck from './components/AdminModerationDeck';
import MediaFeedView from './components/MediaFeedView';
import MarketInsightsView from './components/MarketInsightsView';
import ConciergeView from './components/ConciergeView';

export default function App() {
  const { renderPrice } = useCurrencyMode();
  const [currentTab, setTab] = useState<string>('home');
  const [selectedDealerId, setSelectedDealerId] = useState<string>('auto-choice-peshawar');
  const [selectedListing, setSelectedListing] = useState<CarListing | null>(null);
  const [compareList, setCompareList] = useState<CarListing[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
  const [activeIndustry, setActiveIndustry] = useState<'Automotive' | 'Footwear' | 'Apparel' | 'Electronics'>('Automotive');

  const handleToggleCompare = (car: CarListing) => {
    setCompareList((prev) => {
      const exists = prev.some(item => item.id === car.id);
      if (exists) {
        return prev.filter(item => item.id !== car.id);
      }
      if (prev.length >= 2) {
        return [prev[1], car];
      }
      return [...prev, car];
    });
  };

  // Dynamic States
  const [listings, setListings] = useState<CarListing[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review[]>>({});
  const [dbLoading, setDbLoading] = useState<boolean>(true);

  // Active Session User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('bazar360_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Migration: Auto-inject standard metadata fields required by the latest rules
          return {
            status: 'Active',
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            ...parsed
          };
        }
      } catch (e) {
        // Fallback
      }
    }
    // Default config: Allow visitors to experience the web catalog purely as guests/visitors.
    return null;
  });

  // Filter trackers
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Memory and Media Optimization: Switch categories wipes comparisons to reclaim RAM
  useEffect(() => {
    if (compareList.length > 0) {
      console.log("[BAZAR360 Memory Safe] Tenant category shift. Wiping active auto comparison arrays...");
      setCompareList([]);
    }
  }, [selectedCategory]);

  // Bid interaction state inside Detail modal
  const [offerInput, setOfferInput] = useState('');
  const [offerSuccessMessage, setOfferSuccessMessage] = useState('');

  // Sync session profile to standard storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('bazar360_user', JSON.stringify(currentUser));
      // Save profile to database
      dbSaveUserProfile(currentUser).catch(err => console.warn('Bypass profile save:', err));
    } else {
      localStorage.removeItem('bazar360_user');
    }
  }, [currentUser]);

  // Initial Sync and Seed workflow
  useEffect(() => {
    async function initDatabase() {
      setDbLoading(true);
      
      // Fast connection race-timer to guarantee instant rendering even if connection is firewalled or slow
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase connection timeout - loading high speed local layout')), 1200)
      );

      try {
        await Promise.race([
          (async () => {
            await seedDatabaseIfEmpty();
            
            const fetchedDealers = await dbFetchDealers();
            const fetchedListings = await dbFetchListings();
            
            setDealers(fetchedDealers);
            setListings(fetchedListings);
            
            // Load reviews in record
            const revsRecord: Record<string, Review[]> = {};
            for (const dl of fetchedDealers) {
              revsRecord[dl.id] = await dbFetchReviews(dl.id);
            }
            setReviewsMap(revsRecord);
          })(),
          timeoutPromise
        ]);
      } catch (err) {
        console.warn('Sandbox local sync fallback activated due to:', err);
        // Load highly responsive mock data instantly so the layout works flawlessly in offline / slow connection modes
        setDealers(INITIAL_DEALERS);
        setListings(INITIAL_LISTINGS);
        
        // Build reviews record from local backups
        const revsRecord: Record<string, Review[]> = {};
        for (const dl of INITIAL_DEALERS) {
          revsRecord[dl.id] = INITIAL_REVIEWS[dl.id] || [];
        }
        setReviewsMap(revsRecord);
      } finally {
        setDbLoading(false);
      }
    }
    initDatabase();
  }, []);

  // Listen for Firebase Auth state changes to sync active user profile details
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("Firebase Auth active session detected for UID:", firebaseUser.uid);
        try {
          const fetchedProfile = await dbFetchUserProfile(firebaseUser.uid);
          if (fetchedProfile) {
            setCurrentUser(fetchedProfile);
          } else {
            // First-time signup fallback: create a robust, rules-compliant profile
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'amjid.bisconni@gmail.com',
              displayName: firebaseUser.displayName || 'Amjid B.',
              phoneNumber: firebaseUser.phoneNumber || '+92 314 3600000',
              phoneVerified: !!firebaseUser.phoneNumber,
              city: 'Lahore',
              state: 'Punjab',
              role: firebaseUser.email === 'amjid.bisconni@gmail.com' ? 'Admin' : 'Buyer',
              status: 'Active',
              socials: {
                facebook: 'https://facebook.com/amjid.bazar360',
                instagram: 'https://instagram.com/amjid_b360'
              },
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              region: 'Lahore'
            };
            setCurrentUser(fallbackProfile);
            await dbSaveUserProfile(fallbackProfile).catch(err => console.warn("Fallback profile save skip:", err));
          }
        } catch (err) {
          console.error("Auth state loading error:", err);
        }
      } else {
        console.log("No active Firebase Auth session. App running in offline guest mode.");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (err) {
      console.warn("Silent auth signout warning:", err);
    }
    setCurrentUser(null);
    localStorage.removeItem('bazar360_user');
    setTab('home');
  };

  const handleRoleSwap = (role: 'Admin' | 'Showroom Owner' | 'Private Seller') => {
    if (!currentUser) return;
    
    let displayName = 'Amjid B.';
    let salesPodId: string | undefined = undefined;
    if (role === 'Admin') {
      displayName = 'Amjid B. (Super Admin)';
    } else if (role === 'Showroom Owner') {
      displayName = 'Amjid B. (Showroom Owner / Dealer)';
      salesPodId = 'auto-choice-peshawar'; // Hard link to Auto Choice Peshawar for live sandbox tests!
    } else if (role === 'Private Seller') {
      displayName = 'Amjid B. (Ad Poster / Private Seller)';
    }
    
    const updatedUser: UserProfile = {
      ...currentUser,
      role,
      displayName,
      salesPodId
    };
    
    setCurrentUser(updatedUser);
  };

  const onSelectDealer = (id: string) => {
    setSelectedDealerId(id);
    setTab('dealer-storefront');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddListing = async (newListing: CarListing) => {
    // 1. Determine permission default values
    const isApprovedByDefault = currentUser?.role === 'Admin' || currentUser?.role === 'Showroom Owner' || currentUser?.role === 'Private Seller';
    
    const finalListing: CarListing = {
      ...newListing,
      approved: isApprovedByDefault,
      assignedSalesRepId: currentUser?.uid || 'guest-seller',
      // If of Showroom Owner role, assign to their showroom
      dealerId: currentUser?.role === 'Showroom Owner' && currentUser?.salesPodId ? currentUser.salesPodId : 'private',
      createdAt: new Date().toISOString()
    };

    // 2. Commit to database
    try {
      await dbSaveListing(finalListing);
    } catch (err) {
      console.warn(err);
    }

    // 3. Update React views instantly
    setListings((prev) => [finalListing, ...prev]);

    if (finalListing.dealerId !== 'private') {
      setDealers((prevDealers) =>
        prevDealers.map((d) =>
          d.id === finalListing.dealerId
            ? { ...d, vehiclesCount: d.vehiclesCount + 1 }
            : d
        )
      );
    }
  };

  const handleApproveListing = async (listingId: string) => {
    try {
      await dbApproveListing(listingId, true);
    } catch (err) {
      console.warn(err);
    }
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, approved: true } : l))
    );
  };

  const handleRejectListing = async (listingId: string) => {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      await deleteDoc(doc(db, 'listings', listingId));
    } catch (err) {
      console.warn(err);
    }
    setListings((prev) => prev.filter((l) => l.id !== listingId));
  };

  const handleAddReview = async (comment: string, rating: number) => {
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      author: currentUser?.displayName || 'Aamir G. (Verified Buyer)',
      rating,
      date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
      comment,
    };

    try {
      await dbAddReview(selectedDealerId, newRev);
    } catch (err) {
      console.warn(err);
    }

    setReviewsMap((prev) => ({
      ...prev,
      [selectedDealerId]: [newRev, ...(prev[selectedDealerId] || [])],
    }));

    // Re-average rating inside dealers state
    setDealers((prevDealers) =>
      prevDealers.map((d) => {
        if (d.id === selectedDealerId) {
          const currentReviews = reviewsMap[selectedDealerId] || [];
          const allRatings = [rating, ...currentReviews.map((r) => r.rating)];
          const sum = allRatings.reduce((acc, curr) => acc + curr, 0);
          const computedAvg = parseFloat((sum / allRatings.length).toFixed(1));
          return { ...d, rating: computedAvg };
        }
        return d;
      })
    );
  };

  const handlePublishActivity = async (dealerId: string, post: any) => {
    setDealers((prevDealers) =>
      prevDealers.map((d) =>
        d.id === dealerId
          ? { ...d, activityFeed: [post, ...(d.activityFeed || [])] }
          : d
      )
    );

    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const dealerRef = doc(db, 'dealers', dealerId);
      const dSnap = await getDoc(dealerRef);
      if (dSnap.exists()) {
        const dData = dSnap.data();
        const currentFeed = dData.activityFeed || [];
        await updateDoc(dealerRef, {
          activityFeed: [post, ...currentFeed],
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Silent activity feed persistence warning:', err);
    }
  };

  const handleApproveActivity = async (dealerId: string, postId: string) => {
    setDealers((prevDealers) =>
      prevDealers.map((d) => {
        if (d.id === dealerId) {
          const updatedFeed = (d.activityFeed || []).map((post) =>
            post.id === postId ? { ...post, status: 'approved' as const } : post
          );
          return { ...d, activityFeed: updatedFeed };
        }
        return d;
      })
    );

    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const dealerRef = doc(db, 'dealers', dealerId);
      const dSnap = await getDoc(dealerRef);
      if (dSnap.exists()) {
        const dData = dSnap.data();
        const currentFeed = dData.activityFeed || [];
        const updatedFeed = currentFeed.map((post: any) =>
          post.id === postId ? { ...post, status: 'approved' } : post
        );
        await updateDoc(dealerRef, {
          activityFeed: updatedFeed,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Silent activity feed approval persistence warning:', err);
    }
  };

  const currentDealer = dealers.find((d) => d.id === selectedDealerId) || dealers[0];

  const handleOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerInput.trim()) return;
    
    const bidAmount = parseInt(offerInput) || 0;
    const listingDealer = dealers.find((d) => d.id === selectedListing?.dealerId);

    setOfferSuccessMessage(
      `✓ Dynamic Offer of Rs. ${bidAmount.toLocaleString()} submitted successfully! ${
        listingDealer?.name || 'Seller'
      } is processing your proposal.`
    );
    setOfferInput('');
    setTimeout(() => {
      setOfferSuccessMessage('');
    }, 5000);
  };

  // RBAC query view filtering based on permissions
  const visibleListings = listings.filter((l) => {
    if (l.approved !== false) return true; // Show all approved listings
    // Non-approved listings only visible to Admins, Showroom Owners, or the listing author
    const isModerator = currentUser?.role === 'Admin' || currentUser?.role === 'Showroom Owner';
    const isOwner = currentUser && l.assignedSalesRepId === currentUser.uid;
    return isModerator || isOwner;
  });

  // Flagship Priority Injection: Sort auto-choice-peshawar entries to the absolute top of everything
  const prioritizedListings = React.useMemo(() => {
    const flagshipListings = visibleListings.filter(l => l.dealerId === 'auto-choice-peshawar');
    const ordinaryListings = visibleListings.filter(l => l.dealerId !== 'auto-choice-peshawar');
    return [...flagshipListings, ...ordinaryListings];
  }, [visibleListings]);

  return (
    <div className="bg-[#0b121f] text-white min-h-screen text-sm font-sans flex flex-col pb-24 md:pb-8">
      
      {/* Dynamic Top Navigation */}
      <TopAppBar
        currentTab={currentTab}
        setTab={setTab}
        onPostAdClick={() => setTab('sell')}
        currentUser={currentUser}
        onLogout={handleLogout}
        activeIndustry={activeIndustry}
        setActiveIndustry={setActiveIndustry}
      />

      {/* Super-Admin Multi-Role Gateway (Exclusive email interception) */}
      {currentUser?.email === 'amjid.bisconni@gmail.com' && (
        <div className="bg-[#050b16] border-b-2 border-orange-500/80 px-5 py-3 sticky top-14 z-40 shadow-xl shadow-black/40">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              <div>
                <span className="text-[10px] text-[#38BDF8] font-bold uppercase tracking-wider font-mono block">Multi-Role Gateway Intercept</span>
                <span className="text-xs text-white/90">Switch active session for owner <span className="font-black text-orange-400">amjid.bisconni@gmail.com</span>:</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleRoleSwap('Admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono border transition-all cursor-pointer select-none ${
                  currentUser.role === 'Admin'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                    : 'bg-[#121a2a] text-gray-400 border-white/5 hover:border-orange-500/35 hover:text-white'
                }`}
              >
                🛠 Super Admin
              </button>
              <button
                onClick={() => handleRoleSwap('Showroom Owner')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono border transition-all cursor-pointer select-none ${
                  currentUser.role === 'Showroom Owner'
                    ? 'bg-[#38BDF8] text-black border-[#38BDF8] shadow-md shadow-[#38BDF8]/20'
                    : 'bg-[#121a2a] text-gray-400 border-white/5 hover:border-[#38BDF8]/35 hover:text-white'
                }`}
              >
                🏬 Dealer (Auto Choice)
              </button>
              <button
                onClick={() => handleRoleSwap('Private Seller')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono border transition-all cursor-pointer select-none ${
                  currentUser.role === 'Private Seller'
                    ? 'bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-500/20'
                    : 'bg-[#121a2a] text-gray-400 border-white/5 hover:border-emerald-500/35 hover:text-white'
                }`}
              >
                📣 Ad Poster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container Core Shell */}
      <main className="flex-grow max-w-[1440px] mx-auto w-full pt-20 px-5 md:px-16">
        
        {activeIndustry !== 'Automotive' && (
          <div className="mb-6 bg-slate-950/90 backdrop-blur-md border border-[#38BDF8]/30 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-scale-fade shadow-xl">
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 uppercase tracking-widest">
                Dynamic Multi-Tenant Partition Activated
              </span>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">
                🛍️ BAZAR360 {activeIndustry} Showcase Channel (Demo Sandbox)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                You are currently viewing the horizontal {activeIndustry} expansion sector. BAZAR360 dynamically adapts its interface parameters, catalog filters, and pricing indices for this domain. The core system remains verified on 'Auto Choice'.
              </p>
            </div>
            <button
              onClick={() => setActiveIndustry('Automotive')}
              className="bg-orange-500 hover:bg-orange-600 active:scale-95 duration-150 text-slate-950 font-mono font-black text-[10px] uppercase py-2.5 px-4.5 rounded-xl block shrink-0 tracking-widest cursor-pointer"
            >
              Reset to Auto Choice
            </button>
          </div>
        )}

        {dbLoading ? (
          <div className="flex flex-col items-center justify-center p-12 min-h-[50vh] space-y-4">
            <div className="relative">
              <Hourglass className="animate-spin text-[#38BDF8]" size={36} />
              <div className="absolute inset-0 border-2 border-dashed border-[#38BDF8] rounded-full animate-ping scale-150 opacity-15"></div>
            </div>
            <p className="text-xs text-[#38BDF8] font-mono tracking-widest uppercase font-bold">Synchronizing Cloud Core</p>
            <p className="text-[10px] text-white/40 font-sans">Connecting to persistent firestore instance & seeding databases...</p>
          </div>
        ) : (
          <>
            {/* Show Moderation Dashboard to Admins or Showroom Owners on home page */}
            {currentTab === 'home' && (currentUser?.role === 'Admin' || currentUser?.role === 'Showroom Owner') && (
              <div className="mb-8">
                <AdminModerationDeck
                  listings={listings}
                  dealers={dealers}
                  onApproveListing={handleApproveListing}
                  onRejectListing={handleRejectListing}
                />
              </div>
            )}

            {currentTab === 'home' && (
              <HomeView
                dealers={dealers}
                listings={prioritizedListings}
                setTab={setTab}
                setSelectedCategory={setSelectedCategory}
                setSearchQuery={setSearchQuery}
                onSelectDealer={onSelectDealer}
                onSelectListing={setSelectedListing}
                onToggleCompare={handleToggleCompare}
                compareList={compareList}
              />
            )}

            {(currentTab === 'inventory' || currentTab === 'search') && (
              <SearchExplorerView
                listings={prioritizedListings}
                dealers={dealers}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelectListing={setSelectedListing}
                onToggleCompare={handleToggleCompare}
                compareList={compareList}
              />
            )}

            {currentTab === 'media' && (
              <MediaFeedView
                dealers={dealers}
                currentUser={currentUser}
              />
            )}

            {currentTab === 'insights' && (
              <MarketInsightsView />
            )}

            {currentTab === 'concierge' && (
              <ConciergeView
                dealers={dealers}
              />
            )}

            {currentTab === 'dealers' && (
              <div className="space-y-6">
                <div className="border-b border-[#1e293b] pb-3">
                  <h2 className="font-sans font-bold text-xl md:text-2xl text-white">Verified Automotive Dealerships</h2>
                  <p className="text-xs text-gray-400 mt-1">Select an elite showroom partner to inspect dedicated inventories and talk with experts</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dealers.map((dealer) => (
                    <div
                      key={dealer.id}
                      onClick={() => onSelectDealer(dealer.id)}
                      className="bg-[#121a2a] border border-[#1e293b] rounded-2xl overflow-hidden group hover:-translate-y-1 cursor-pointer relative shadow-xl duration-200 hover:border-[#00a3ff]"
                    >
                      <div className="h-32 bg-[#051020] relative flex items-center justify-center overflow-hidden">
                        <img
                          alt={dealer.name}
                          className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-300"
                          src={dealer.coverImage}
                          referrerPolicy="no-referrer"
                        />
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center z-10 shadow-lg border-2 border-[#121a2a]">
                          <span className="font-sans font-bold text-xl text-black">
                            {dealer.avatarLetter}
                          </span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div>
                          <h3 className="font-sans font-extrabold text-[#00a3ff] text-base group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                            {dealer.name}
                          </h3>
                          <p className="text-gray-400 text-xs mt-1 flex items-center gap-1 font-sans">
                            <MapPin size={12} className="text-[#00a3ff]" /> {dealer.location}
                          </p>
                        </div>

                        <p className="text-[#a3b3cc] text-xs leading-relaxed line-clamp-2 pr-2 font-sans">
                          {dealer.description}
                        </p>

                        <div className="flex justify-between items-center border-t border-[#1e293b]/50 pt-3 text-[10px]/relaxed">
                          <div className="flex items-center gap-1 font-sans text-gray-500 uppercase tracking-widest font-bold">
                            <Star size={12} className="fill-[#ff6b00] text-[#ff6b00]" /> {dealer.rating} User Score
                          </div>
                          <span className="font-sans text-gray-500 uppercase tracking-widest font-bold">
                            {listings.filter((l) => l.dealerId === dealer.id).length} Active Listings
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentTab === 'dealer-storefront' && (
              <DealerStorefrontView
                dealer={currentDealer}
                listings={prioritizedListings}
                reviews={reviewsMap[selectedDealerId] || []}
                onAddReview={handleAddReview}
                onSelectListing={setSelectedListing}
                onPublishActivity={handlePublishActivity}
                onApproveActivity={handleApproveActivity}
                currentUser={currentUser}
                onAddListing={handleAddListing}
              />
            )}

            {currentTab === 'sell' && (
              <SellWithAIView
                onAddListing={handleAddListing}
                setTab={setTab}
                currentUser={currentUser}
              />
            )}

            {currentTab === 'portal' && (
              <div className="max-w-4xl mx-auto space-y-8 pb-16">
                <div className="border-b border-[#1e293b] pb-3">
                  <h2 className="font-sans font-bold text-xl md:text-2xl text-[#38bdf8] uppercase tracking-tight">BAZAR360 Portal & Forms</h2>
                  <p className="text-xs text-gray-400 mt-1">Register user accounts, submit dealership catalogs, or toggle RBAC privilege contexts for end-to-end testing.</p>
                </div>
                <RegistrationPortal
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  onDealerRegistered={(newD) => {
                    setDealers((prev) => [...prev, newD]);
                    setReviewsMap((prev) => ({ ...prev, [newD.id]: [] }));
                  }}
                />
              </div>
            )}
          </>
        )}

      </main>

      {/* Bottom Nav Bar (Mobile Only) */}
      <BottomNavBar currentTab={currentTab} setTab={setTab} />

      {/* DYNAMIC LISTING DETAILS POPUP MODAL */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-[#0b121f] border border-[#1e293b] rounded-2xl max-w-3xl w-full text-xs font-sans shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col animate-scale-fade">
            
            {/* Header banner */}
            <div className="bg-[#121a2a] p-4 border-b border-[#1e293b] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#001c33] text-[#00a3ff] font-bold text-[9px] uppercase tracking-wider border border-[#00345c] flex items-center gap-1">
                  <ShieldCheck size={10} /> Certified Spec
                </span>
                <span className="text-[10px] text-gray-400 font-sans">Ref ID: {selectedListing.id}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedListing(null);
                  setOfferSuccessMessage('');
                }}
                className="text-gray-400 hover:text-white bg-[#1e293b] hover:bg-gray-800 p-1.5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrolling Core Content */}
            <div className="flex-grow overflow-y-auto no-scrollbar pb-6 space-y-6">
              
              {/* Product Cover image */}
              <div className="h-64 md:h-80 bg-[#051020] relative shrink-0">
                <img
                  src={selectedListing.imageUrl}
                  alt={selectedListing.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Title, details block */}
              <div className="px-6 space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div>
                    <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight">
                      {selectedListing.title}
                    </h2>
                    <p className="text-[#00a3ff] text-xs font-bold font-sans mt-1.5 flex items-center gap-1">
                      <MapPin size={12} /> Nationwide Delivery in Pakistan from {dealers.find((d) => d.id === selectedListing.dealerId)?.name || 'Merchant'}
                    </p>
                  </div>
                  <div className="bg-[#001729] border border-[#003964] px-4 py-3 rounded-xl flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">Certified Valuation</span>
                    <span className="text-xl font-extrabold text-[#ff6b00]">
                      {renderPrice(selectedListing.price)}
                    </span>
                  </div>
                </div>

                {/* Grid Spec Indicators */}
                <div className="grid grid-cols-4 gap-2 text-center pt-2 font-sans text-xs">
                  <div className="bg-[#121a2a] border border-[#1e293b] p-2.5 rounded-xl">
                    <Gauge className="text-[#00a3ff] mx-auto mb-1" size={16} />
                    <span className="text-[9px] text-gray-500 block uppercase font-bold">Mileage</span>
                    <span className="font-bold text-white block mt-0.5">{selectedListing.mileage.toLocaleString()} km</span>
                  </div>
                  <div className="bg-[#121a2a] border border-[#1e293b] p-2.5 rounded-xl">
                    <Fuel className="text-[#00a3ff] mx-auto mb-1" size={16} />
                    <span className="text-[9px] text-gray-500 block uppercase font-bold">Fuel Type</span>
                    <span className="font-bold text-white block mt-0.5">{selectedListing.fuelType}</span>
                  </div>
                  <div className="bg-[#121a2a] border border-[#1e293b] p-2.5 rounded-xl">
                    <span className="material-symbols-outlined shrink-0 text-base text-[#00a3ff] block mb-1">manufacturing</span>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold">Transmission</span>
                    <span className="font-bold text-white block mt-0.5">{selectedListing.transmission}</span>
                  </div>
                  <div className="bg-[#121a2a] border border-[#1e293b] p-2.5 rounded-xl">
                    <Milestone className="text-[#00a3ff] mx-auto mb-1" size={16} />
                    <span className="text-[9px] text-gray-500 block uppercase font-bold text-ellipsis overflow-hidden whitespace-nowrap">Specifications</span>
                    <span className="font-bold text-white block mt-0.5 font-ellipsis overflow-hidden whitespace-nowrap text-[11px]">{selectedListing.specs.regionalSpecs.split(' ')[0]}</span>
                  </div>
                </div>

                {/* Technical data sheets */}
                <div className="bg-[#121a2a] border border-[#1e293b] rounded-xl p-4.5 space-y-2 font-sans text-xs">
                  <h4 className="text-[#00a3ff] font-bold text-xs uppercase tracking-wider border-b border-[#1e293b] pb-1.5 mb-2 flex items-center gap-1">
                    <Award size={14} /> Full Technical Specification Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <p className="flex justify-between border-b border-[#1e293b]/50 pb-1">
                      <span className="text-gray-500">Outer Paint Body:</span> <span className="font-bold text-white">{selectedListing.specs.color}</span>
                    </p>
                    <p className="flex justify-between border-b border-[#1e293b]/50 pb-1">
                      <span className="text-gray-500">Engine block Displacement:</span> <span className="font-bold text-white">{selectedListing.specs.engineSize}</span>
                    </p>
                    <p className="flex justify-between border-b border-[#1e293b]/50 pb-1">
                      <span className="text-gray-500">Horsepower capacity:</span> <span className="font-bold text-white">{selectedListing.specs.horspower}</span>
                    </p>
                    <p className="flex justify-between border-b border-[#1e293b]/50 pb-1">
                      <span className="text-gray-500">Regional Specifications:</span> <span className="font-bold text-[#00a3ff]">{selectedListing.specs.regionalSpecs}</span>
                    </p>
                  </div>
                </div>

                {/* Sales copywriting */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-white font-bold text-xs uppercase tracking-wider border-b border-[#1e293b] pb-1.5">Executive Presentation Description</h4>
                    <p className="text-gray-300 text-xs leading-relaxed font-sans pr-4">{selectedListing.description}</p>
                  </div>

                  {/* Adaptive deep-linking share block */}
                  <div className="bg-[#121a2a] border border-[#1e293b] p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 font-mono">
                    <div className="text-left space-y-0.5">
                      <span className="text-[9.5px] uppercase font-black tracking-widest text-[#00a3ff] block">Adaptive Social Sharing</span>
                      <span className="text-[8px] text-gray-400 font-sans block">Share certified specifications directly</span>
                    </div>
                    <button
                      onClick={async () => {
                        const d = dealers.find((dl) => dl.id === selectedListing.dealerId);
                        const locationText = d?.location || "Alamas Car Village, Ring Road, Peshawar";
                        const shareUrl = `https://bazar360.pk/dealers/${selectedListing.dealerId}/listings/${selectedListing.id}`;
                        const shareTitle = selectedListing.title;
                        const sharePrice = `Rs. ${selectedListing.price.toLocaleString()}`;
                        const textPayload = `🏎️ Premium Sport Entry: *${shareTitle}*\n💰 Demand Price: *${sharePrice}*\n📌 Location Coordinates: *${locationText}*\n\nExplore complete high-resolution specifications and place custom bids directly on the digital showroom gateway here:\n🔗 ${shareUrl}`;

                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: shareTitle,
                              text: textPayload,
                              url: shareUrl
                            });
                          } catch (err) {
                            // ignore
                          }
                        } else {
                          const encodedText = encodeURIComponent(textPayload);
                          window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
                        }
                      }}
                      className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-2.5 px-4 rounded-xl text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 duration-100 cursor-pointer shadow"
                    >
                      <span className="material-symbols-outlined text-[14px]">share</span> Share Spec Sheet
                    </button>
                  </div>
                </div>

                {/* Bid/Offer tool integrations */}
                <div className="bg-[#121a2a]/40 border border-[#1e293b] p-4 rounded-xl space-y-3 font-sans mt-2">
                  <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">Dynamic Offer Pipeline</span>
                  
                  {offerSuccessMessage ? (
                    <div className="p-3 bg-green-950/40 text-green-400 font-bold text-xs rounded border border-green-900 leading-relaxed font-sans shadow-inner">
                      {offerSuccessMessage}
                    </div>
                  ) : (
                    <form onSubmit={handleOfferSubmit} className="flex gap-2">
                      <div className="bg-[#051020] border border-[#1e293b] p-2 rounded-lg flex items-center flex-grow">
                        <DollarSign size={14} className="text-[#00a3ff] mr-1 shrink-0" />
                        <input
                          type="number"
                          placeholder="Place custom offer in PKR / Rs..."
                          className="bg-transparent border-none text-white focus:outline-none focus:ring-0 text-xs w-full"
                          value={offerInput}
                          onChange={(e) => setOfferInput(e.target.value)}
                        />
                      </div>
                      <button
                        type="submit"
                        className="bg-[#00a3ff] hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1 duration-75 text-xs shadow"
                      >
                        <Send size={12} /> Submit Bid
                      </button>
                    </form>
                  )}
                  <span className="text-[9px] text-gray-500 mt-1 block font-sans">Offers sent via the pipeline are non-binding but pre-qualify you in standard showroom inventories.</span>
                </div>

              </div>

            </div>

            {/* Bottom converted Action CTA Bar */}
            <div className="p-4 border-t border-[#1e293b] bg-[#121a2a] flex gap-3 shrink-0">
              <button
                onClick={() => {
                  const d = dealers.find((dl) => dl.id === selectedListing.dealerId);
                  if (d) {
                    onSelectDealer(d.id);
                    setSelectedListing(null);
                  }
                }}
                className="flex-1 bg-transparent border border-[#00a3ff] hover:bg-[#00a3ff]/10 text-[#00a3ff] font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-97 change-all duration-75"
              >
                <span className="material-symbols-outlined shrink-0 text-base">store</span> Contact Showroom Profile
              </button>
              
              <a
                href={`mailto:amjid.bisconni@gmail.com?subject=Inquiry on ${selectedListing.title}&body=Hello, I am interested in checking vehicle specifications on the ${selectedListing.title} listed under id ${selectedListing.id}.`}
                className="flex-1 bg-[#ff6b00] hover:bg-orange-600 border border-orange-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 text-center active:scale-97 change-all duration-75 shadow"
              >
                <span className="material-symbols-outlined shrink-0 text-base">mail</span> Submit Instant Query Card
              </a>
            </div>

          </div>
        </div>
      )}

      {/* STICKY VEHICLE COMPARISON DRAWER BAR */}
      {compareList.length > 0 && (
        <div className="fixed bottom-22 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-[500px] bg-[#0c1221]/95 text-white border border-[#38BDF8]/40 p-3.5 rounded-2xl shadow-2xl backdrop-blur flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="bg-[#38BDF8] text-slate-950 font-mono font-black text-[9px] px-2 py-0.5 rounded-lg">
              {compareList.length}/2 MATCH
            </span>
            <div className="flex -space-x-2">
              {compareList.map((car) => (
                <div key={car.id} className="relative group">
                  <img
                    src={car.imageUrl}
                    alt={car.title}
                    className="w-8 h-8 rounded-full border border-[#0c1221] object-cover"
                  />
                  <button 
                    onClick={() => handleToggleCompare(car)}
                    className="absolute -top-1 -right-1 bg-red-500 p-0.5 rounded-full text-[6px] hover:bg-red-600 border border-[#0c1221] w-3.5 h-3.5 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 font-sans hidden sm:block">Queue set for side-by-side comparison</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompareList([])}
              className="text-[10px] text-gray-400 hover:text-white uppercase font-mono font-bold tracking-wider px-2 py-1"
            >
              Clear
            </button>
            <button
              onClick={() => setShowComparisonModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-black font-mono text-[9px] uppercase px-3 py-2 rounded-xl transition-all shadow-md shadow-orange-950/20 tracking-wider active:scale-95 cursor-pointer"
            >
              Compare Matchup &rarr;
            </button>
          </div>
        </div>
      )}

      {/* DUAL COMPARISON DRAWER SPECIFICATIONS TABLE MODAL */}
      {showComparisonModal && compareList.length > 0 && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-[#0b121f] border border-[#1e293b] rounded-3xl max-w-3xl w-full text-xs font-sans shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col animate-scale-fade">
            
            <div className="bg-[#121a2a] p-4 border-b border-[#1e293b] flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-sans font-black text-white text-sm uppercase tracking-tight">BAZAR360 Dynamic Comparison Deck</h3>
                <p className="text-[9px] text-gray-400 font-mono tracking-wider mt-0.5">Dual car matchup analyzer with active spec matching.</p>
              </div>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="text-gray-400 hover:text-white bg-[#1e293b] p-1.5 rounded-xl border border-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-5 space-y-6">
              
              {/* Product Comparison Header Grid */}
              <div className="grid grid-cols-2 gap-4">
                {compareList.map((car) => (
                  <div key={car.id} className="bg-[#121a2a] p-3 rounded-2xl border border-white/5 space-y-3 relative">
                    <img 
                      src={car.imageUrl} 
                      alt={car.title} 
                      className="w-full h-32 md:h-44 object-cover rounded-xl"
                    />
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-mono tracking-widest text-[#38BDF8] font-bold uppercase">{car.make}</span>
                      <h4 className="font-extrabold text-[#F97316] text-xs uppercase truncate leading-none">{car.title}</h4>
                      <p className="font-mono text-white text-[13px] font-black mt-1">{renderPrice(car.price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Specs Table Matrix */}
              <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#070c12]">
                {[
                  { label: "Production Year", key: "year" },
                  { label: "Brand Make", key: "make" },
                  { label: "Model Variant", key: "model" },
                  { label: "Mileage (km)", key: "mileage", format: (v: number) => `${v.toLocaleString()} km` },
                  { label: "Fuel Category", key: "fuelType" },
                  { label: "Transmission Line", key: "transmission" }
                ].map((spec) => {
                  return (
                    <div key={spec.label} className="grid grid-cols-3 border-b border-white/5 last:border-0 p-3 leading-relaxed">
                      <span className="text-gray-400 font-mono text-[9px] uppercase font-bold flex items-center">{spec.label}</span>
                      {compareList.map((car) => {
                        const rawVal = (car as any)[spec.key];
                        // Zero-Dummy-Data Guard: Avoid empty blanks
                        const valString = rawVal !== undefined && rawVal !== null && rawVal !== "" ? (spec.format ? spec.format(rawVal) : String(rawVal)) : "Not Listed";
                        return (
                          <span key={car.id} className="text-white font-sans text-xs flex items-center pr-2">
                            {valString}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Unique Ecosystem Service Badges comparison */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono font-bold uppercase text-gray-500 tracking-wider">Showroom Certifications Matchup</p>
                <div className="grid grid-cols-2 gap-4">
                  {compareList.map((car) => (
                    <div key={car.id} className="p-3 bg-[#111928] rounded-xl border border-white/5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="font-bold text-[10px] text-white block uppercase font-mono">Verifier Status</span>
                        <div className="flex items-center gap-1 text-xs text-white/70">
                          {car.verified ? (
                            <span className="text-emerald-400 font-bold font-mono">✓ VETTED</span>
                          ) : (
                            <span className="text-orange-400 font-mono">PENDING DESK</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Share Overlay Section */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <button
                  onClick={async () => {
                    const text = `Take a look at this digital car comparison matchup on BAZAR360:\n\n${compareList.map(c => `🏎️ ${c.title} (Rs. ${c.price.toLocaleString()})`).join('\n')}\n\nAnalyze specs side-by-side!`;
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: 'BAZAR360 Dynamic Matchup',
                          text: text,
                          url: window.location.href
                        });
                      } catch (e) {
                        // ignore
                      }
                    } else {
                      await navigator.clipboard.writeText(text);
                      const t = document.getElementById("compare_share_status");
                      if (t) {
                        t.innerText = "✓ Copy-loaded! Ready to paste into WhatsApp / Viber.";
                        setTimeout(() => {
                          t.innerText = "";
                        }, 5000);
                      }
                    }
                  }}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black font-mono text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow"
                >
                  📣 Adaptive Share Matchup (Native / WhatsApp fallback)
                </button>
                <p id="compare_share_status" className="text-center font-mono text-[10px] text-[#38BDF8] font-bold"></p>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
