import React from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  XCircle,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';

export interface AnimatedOrderStatusBadgeProps {
  status?: string | null;
  shahzadApproval?: string | null;
  dualApprovalStatus?: string | null;
  index?: number;
  className?: string;
}

type StatusVariant = 'approved' | 'rejected' | 'dispatch' | 'invoiced' | 'pending';

interface ResolvedOrderStatus {
  label: string;
  variant: StatusVariant;
}

export function resolveOrderStatusDisplay(
  status?: string | null,
  shahzadApproval?: string | null,
  dualApprovalStatus?: string | null
): ResolvedOrderStatus {
  const raw = String(status || 'SUBMITTED').trim().toUpperCase();

  if (raw === 'REJECTED' || raw === 'CANCELLED' || raw === 'REVERSED') {
    return {
      label: raw === 'CANCELLED' ? 'Cancelled' : raw === 'REVERSED' ? 'Reversed' : 'Rejected',
      variant: 'rejected',
    };
  }
  if (raw === 'DELIVERED') {
    return { label: 'Delivered', variant: 'approved' };
  }
  if (raw === 'PARTIALLY_DELIVERED') {
    return { label: 'Partial Delivery', variant: 'dispatch' };
  }
  if (raw === 'DISPATCHED' || raw === 'IN_TRANSIT') {
    return { label: raw === 'IN_TRANSIT' ? 'In Transit' : 'Dispatched', variant: 'dispatch' };
  }
  if (raw === 'INVOICED') {
    return { label: 'Invoiced', variant: 'invoiced' };
  }
  if (raw === 'PACKED') {
    return { label: 'Packed', variant: 'invoiced' };
  }
  if (
    raw === 'APPROVED' ||
    raw === 'VERIFIED' ||
    shahzadApproval === 'APPROVED' ||
    dualApprovalStatus === 'DUAL_APPROVED'
  ) {
    return { label: raw === 'VERIFIED' ? 'Verified' : 'Approved', variant: 'approved' };
  }
  if (raw === 'PENDING_APPROVAL' || raw === 'PENDING') {
    return { label: 'Pending Approval', variant: 'pending' };
  }
  if (raw === 'DRAFT') {
    return { label: 'Draft', variant: 'pending' };
  }
  return { label: 'Submitted', variant: 'pending' };
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  approved:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70',
  invoiced:
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/70',
  dispatch:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/70',
  pending:
    'bg-orange-50 text-[#EA580C] border-orange-200 dark:bg-orange-950/50 dark:text-[#F97316] dark:border-orange-800/70',
  rejected:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70',
};

export const AnimatedOrderStatusBadge: React.FC<AnimatedOrderStatusBadgeProps> = ({
  status,
  shahzadApproval,
  dualApprovalStatus,
  index = 0,
  className = '',
}) => {
  const { label, variant } = resolveOrderStatusDisplay(
    status,
    shahzadApproval,
    dualApprovalStatus
  );

  const Icon =
    variant === 'approved'
      ? CheckCircle2
      : variant === 'rejected'
      ? XCircle
      : variant === 'dispatch'
      ? Truck
      : variant === 'invoiced'
      ? label === 'Packed'
        ? Package
        : FileCheck2
      : status === 'DRAFT'
      ? AlertCircle
      : Clock;

  return (
    <motion.span
      initial={{ opacity: 0, y: 4, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.18,
        delay: Math.min(Math.max(index, 0) * 0.025, 0.2),
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </motion.span>
  );
};
