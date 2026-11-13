/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Simple Order Entry Drawer
 * Uses unified BulkSkuOrderForm (SKU | Invoice Rate | Order QTY | Total Amount).
 */

import React from 'react';
import { Customer, SalesOrder } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { triggerHaptic } from '../../utils/haptics';
import { BulkSkuOrderForm } from './BulkSkuOrderForm';
import { X } from 'lucide-react';

export interface SimpleOrderEntryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  currentUser: NLinkUser;
  onPlaceOrder: (order: SalesOrder) => void;
  onDownloadPdf?: (order: SalesOrder, customer: Customer) => void;
  onPreviewPdf?: (order: SalesOrder, customer: Customer) => void;
  onWhatsAppShare?: (order: SalesOrder, customer: Customer) => void;
}

export const SimpleOrderEntryDrawer: React.FC<SimpleOrderEntryDrawerProps> = ({
  isOpen,
  onClose,
  customer,
  currentUser,
  onPlaceOrder,
  onDownloadPdf,
  onPreviewPdf,
  onWhatsAppShare,
}) => {
  if (!isOpen) return null;

  const previousBalance = customer.currentBalance ?? customer.openingBalance ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-3xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl border border-[#E2E8F0] dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between bg-[#1B5E3A] text-white">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F59E0B] block">
              Order Form &middot; All SKUs
            </span>
            <h2 className="text-base sm:text-lg font-bold truncate">
              {customer.companyName}
            </h2>
            <p className="text-xs text-slate-300">
              {customer.town || customer.city} &middot; Balance: Rs. {previousBalance.toLocaleString()}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors shrink-0"
            aria-label="Close order drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 bg-[#F8FAFC] dark:bg-[#070D1F] min-w-0">
          <BulkSkuOrderForm
            currentUser={currentUser}
            availableCustomers={[customer]}
            preselectedCustomer={customer}
            onPlaceOrder={onPlaceOrder}
            onDownloadPdf={onDownloadPdf}
            onPreviewPdf={onPreviewPdf}
            onWhatsAppShare={onWhatsAppShare}
          />
        </div>
      </div>
    </div>
  );
};
