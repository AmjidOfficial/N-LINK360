import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import {
  NAVIGATION_CONFIG,
  MainDomain,
  OperationSubTab,
  ReportSubTab,
  getFilteredNavItems,
} from '../config/navigation';
import { User as UserType } from '../types';

interface SidebarProps {
  activeDomain: MainDomain;
  setActiveDomain: (domain: MainDomain) => void;
  activeOpTab: OperationSubTab;
  setActiveOpTab: (tab: OperationSubTab) => void;
  activeRepTab: ReportSubTab;
  setActiveRepTab: (tab: ReportSubTab) => void;
  currentUser: UserType;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export const NeumorphicSidebar: React.FC<SidebarProps> = ({
  activeDomain,
  setActiveDomain,
  activeOpTab,
  setActiveOpTab,
  activeRepTab,
  setActiveRepTab,
  currentUser,
  isCollapsed,
  setIsCollapsed,
}) => {
  // State for expanded module accordions inside sidebar
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    DASHBOARDS: true,
    OPERATIONS: true,
    REPORTS: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const navToDomain = (domain: MainDomain, subTab?: string) => {
    setActiveDomain(domain);
    if (domain === 'OPERATIONS' && subTab) {
      setActiveOpTab(subTab as OperationSubTab);
    }
    if (domain === 'REPORTS' && subTab) {
      setActiveRepTab(subTab as ReportSubTab);
    }
  };

  return (
    <aside
      id="NeumorphicSidebar"
      className={`hidden lg:flex flex-col bg-[#E8ECF2] border-r border-white/80 shadow-md transition-all duration-300 sticky top-0 h-screen z-30 select-none ${
        isCollapsed ? 'w-20 p-3' : 'w-64 p-4'
      }`}
    >
      {/* Sidebar Header & Collapse Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-300/80 mb-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center nm-flat text-teal-700 font-black text-sm border border-white shrink-0 shadow-sm">
              NL
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight leading-none">N-LINK 360</h3>
              <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider block mt-0.5">Enterprise Portal</span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="mx-auto w-9 h-9 rounded-2xl flex items-center justify-center nm-flat text-teal-700 font-black text-sm border border-white shadow-sm">
            NL
          </div>
        )}

        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="p-2 rounded-xl nm-btn text-slate-600 hover:text-teal-700 transition-all hover:scale-[1.05] active:scale-[0.95]"
          title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-teal-700" /> : <ChevronLeft className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* Navigation Groupings - Single Source of Truth */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none">
        {NAVIGATION_CONFIG.map((group) => {
          const visibleItems = getFilteredNavItems(group, currentUser);
          if (visibleItems.length === 0) return null;

          const isSectionOpen = isCollapsed || openSections[group.id];

          return (
            <div key={group.id} className="space-y-1">
              {!isCollapsed ? (
                <button
                  onClick={() => toggleSection(group.id)}
                  className="w-full flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-wider px-2 py-1 hover:text-slate-800 transition-colors"
                >
                  <span>{group.number}. {group.label}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${openSections[group.id] ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <div className="h-0.5 bg-slate-300/80 my-2" title={group.label} />
              )}

              {isSectionOpen && (
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    let isActive = false;
                    if (group.id === 'DASHBOARDS') {
                      isActive = activeDomain === 'DASHBOARDS';
                    } else if (group.id === 'OPERATIONS') {
                      isActive = activeDomain === 'OPERATIONS' && activeOpTab === item.id;
                    } else if (group.id === 'REPORTS') {
                      isActive = activeDomain === 'REPORTS' && activeRepTab === item.id;
                    }

                    return (
                      <button
                        key={item.id}
                        onClick={() => navToDomain(group.id, item.id === 'COCKPIT' ? undefined : item.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-xs font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] ${
                          isActive
                            ? 'nm-btn-primary font-bold shadow-sm text-white'
                            : 'nm-btn text-slate-700 hover:text-teal-800 hover:bg-slate-200/50'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                        title={item.label}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-teal-700'}`} />
                        {!isCollapsed && (
                          <div className="flex-1 flex items-center justify-between overflow-hidden">
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${item.badgeColor || 'bg-teal-800 text-teal-100'}`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer User Info */}
      <div className="pt-3 border-t border-slate-300/80 mt-auto space-y-2">
        {!isCollapsed ? (
          <div className="nm-inset p-2.5 rounded-2xl flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-xs shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden leading-tight">
              <span className="text-xs font-bold text-slate-800 block truncate">{currentUser.fullName}</span>
              <span className="text-[9px] text-teal-700 font-bold block uppercase">{currentUser.role.replace('_', ' ')}</span>
            </div>
          </div>
        ) : (
          <div
            className="w-8 h-8 mx-auto rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-xs"
            title={`${currentUser.fullName} (${currentUser.role})`}
          >
            {currentUser.fullName.charAt(0)}
          </div>
        )}
      </div>
    </aside>
  );
};
