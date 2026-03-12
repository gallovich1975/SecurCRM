import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format currency in EUR
export function formatCurrency(amount) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
}

// Format date in Italian format
export function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

// Format date with time
export function formatDateTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// Get relative time
export function getRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diff = d - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) return `${Math.abs(days)} giorni fa`;
  if (days === 0) return 'Oggi';
  if (days === 1) return 'Domani';
  if (days <= 7) return `Tra ${days} giorni`;
  if (days <= 30) return `Tra ${Math.ceil(days / 7)} settimane`;
  return `Tra ${Math.ceil(days / 30)} mesi`;
}

// Check if date is overdue
export function isOverdue(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

// Check if date is within days
export function isWithinDays(date, days) {
  if (!date) return false;
  const now = new Date();
  const target = new Date(date);
  const diff = (target - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

// Get status color
export function getStatusColor(status) {
  const colors = {
    // Quote status
    bozza: 'bg-slate-100 text-slate-700',
    inviato: 'bg-blue-100 text-blue-700',
    approvato: 'bg-emerald-100 text-emerald-700',
    rifiutato: 'bg-red-100 text-red-700',
    // Invoice status
    da_emettere: 'bg-slate-100 text-slate-700',
    emessa: 'bg-blue-100 text-blue-700',
    pagata: 'bg-emerald-100 text-emerald-700',
    scaduta: 'bg-red-100 text-red-700',
    // Project status
    pianificato: 'bg-slate-100 text-slate-700',
    in_corso: 'bg-blue-100 text-blue-700',
    in_pausa: 'bg-amber-100 text-amber-700',
    completato: 'bg-emerald-100 text-emerald-700',
    annullato: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-slate-100 text-slate-700';
}

// Get status label in Italian
export function getStatusLabel(status) {
  const labels = {
    // Quote status
    bozza: 'Bozza',
    inviato: 'Inviato',
    approvato: 'Approvato',
    rifiutato: 'Rifiutato',
    // Invoice status
    da_emettere: 'Da emettere',
    emessa: 'Emessa',
    pagata: 'Pagata',
    scaduta: 'Scaduta',
    // Project status
    pianificato: 'Pianificato',
    in_corso: 'In corso',
    in_pausa: 'In pausa',
    completato: 'Completato',
    annullato: 'Annullato',
  };
  return labels[status] || status;
}

// Get service type label
export function getServiceTypeLabel(type) {
  const labels = {
    sito_ecommerce: 'Sito E-commerce',
    sito_aziendale: 'Sito Aziendale',
    seo: 'SEO',
    ads: 'ADS',
    grafica: 'Grafica',
    altro: 'Altro',
  };
  return labels[type] || type;
}

// Get recurrence label
export function getRecurrenceLabel(type) {
  const labels = {
    mensile: 'Mensile',
    trimestrale: 'Trimestrale',
    semestrale: 'Semestrale',
    annuale: 'Annuale',
  };
  return labels[type] || type;
}

// Get invoice type label
export function getInvoiceTypeLabel(type) {
  const labels = {
    acconto: 'Acconto',
    saldo: 'Saldo',
    ricorrente: 'Ricorrente',
  };
  return labels[type] || type;
}

// Generate initials from name
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
