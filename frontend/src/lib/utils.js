import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format number as SAR currency
export function formatCurrency(value, showSymbol = true) {
  if (value === null || value === undefined || isNaN(value)) return showSymbol ? 'SAR 0.00' : '0.00';
  const formatted = new Intl.NumberFormat('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return showSymbol ? `SAR ${formatted}` : formatted;
}

/** Compact SAR for snapshot rows (e.g. SAR 136K). Full precision in detail panels. */
export function formatCurrencyCompact(value, showSymbol = true) {
  const n = Number(value);
  if (value === null || value === undefined || isNaN(n)) return showSymbol ? 'SAR 0' : '0';
  const prefix = showSymbol ? 'SAR ' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const m = n / 1_000_000;
    return `${prefix}${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (abs >= 1_000) {
    const k = n / 1_000;
    return `${prefix}${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return formatCurrency(n, showSymbol);
}

// Format percentage
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

// Format number with commas
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-SA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Generate unique ID
export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Get deal status color class
export function getDealStatusClass(status) {
  switch (status?.toLowerCase()) {
    case 'healthy':
      return 'deal-healthy';
    case 'risk':
      return 'deal-risk';
    case 'underpriced':
      return 'deal-underpriced';
    default:
      return 'deal-healthy';
  }
}

// Get margin color class
export function getMarginColorClass(marginPercent) {
  if (marginPercent >= 30) return 'text-emerald-600';
  if (marginPercent >= 20) return 'text-amber-600';
  return 'text-red-600';
}

export function getStandardMonthlyHours(config = {}) {
  const weeks = Number(config.weeks_per_month ?? 4);
  const days = Number(config.work_days_per_week ?? 5);
  const hoursPerDay = Number(config.hours_per_work_day ?? 8);
  const total = weeks * days * hoursPerDay;
  return total > 0 ? total : 160;
}

export function hoursFromUtilization(utilizationPercent, monthlyHours = 160) {
  if (utilizationPercent === null || utilizationPercent === undefined || isNaN(utilizationPercent)) return 0;
  const std = monthlyHours > 0 ? monthlyHours : 160;
  return Math.round((utilizationPercent / 100) * std * 100) / 100;
}

export function utilizationFromHours(hours, monthlyHours = 160) {
  if (hours === null || hours === undefined || isNaN(hours)) return 0;
  const std = monthlyHours > 0 ? monthlyHours : 160;
  return Math.round((hours / std) * 10000) / 100;
}

// Deep clone object
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
