/**
 * ParseHint - Shared UI for parsing confidence indicators
 * 
 * v2.1.3: Contextual hints for parsed data origin and estimation
 * 
 * Design principles:
 * - Small, muted, non-intrusive
 * - Informational only (non-clickable)
 * - Context-aware: cost hints for Bookings/Expenses, origin hints for Tour
 */

import { FileText, Mail, Receipt, Plane, Building2, Car, Upload, ListPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Parse origin types for different contexts
 */
export type ParseOrigin = 
  // Cost-bearing items (Bookings, Expenses)
  | 'email' 
  | 'pasted_text' 
  | 'receipt'
  // Tour/Stops origins
  | 'bookings'      // Auto-drafted from flight/stay/rental
  | 'bulk_import'   // Bulk import from text
  | 'bulk_email'    // Bulk import from email
  | null;           // Manual entry - no hint shown

/**
 * Get the display label for a parse origin
 */
export function getOriginLabel(origin: ParseOrigin): string | null {
  switch (origin) {
    case 'email': return 'From email';
    case 'pasted_text': return 'From pasted text';
    case 'receipt': return 'From receipt';
    case 'bookings': return 'From bookings';
    case 'bulk_import': return 'Imported from text';
    case 'bulk_email': return 'Imported from email';
    case null: return null;
    default: return null;
  }
}

/**
 * Get the icon for a parse origin
 */
function getOriginIcon(origin: ParseOrigin) {
  switch (origin) {
    case 'email':
    case 'bulk_email':
      return <Mail className="w-3 h-3" />;
    case 'pasted_text':
    case 'bulk_import':
      return <FileText className="w-3 h-3" />;
    case 'receipt':
      return <Receipt className="w-3 h-3" />;
    case 'bookings':
      return <Upload className="w-3 h-3" />;
    default:
      return null;
  }
}

interface ParseOriginHintProps {
  origin: ParseOrigin;
  className?: string;
}

/**
 * Small inline hint showing where data came from
 */
export function ParseOriginHint({ origin, className }: ParseOriginHintProps) {
  const label = getOriginLabel(origin);
  const icon = getOriginIcon(origin);
  
  if (!label) return null;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs text-muted-foreground",
      className
    )}>
      {icon}
      <span>{label}</span>
    </span>
  );
}

interface EstimatedHintProps {
  children: React.ReactNode;
  isEstimated: boolean;
  className?: string;
}

/**
 * Wrapper that appends "(estimated)" to content when applicable
 */
export function EstimatedHint({ children, isEstimated, className }: EstimatedHintProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {children}
      {isEstimated && (
        <span className="text-muted-foreground/70 text-xs">(estimated)</span>
      )}
    </span>
  );
}

interface StopSourceHintProps {
  /** Source from notes or reference_id pattern */
  source: 'flight' | 'stay' | 'rental' | 'bulk' | 'bulk_email' | 'manual' | null;
  className?: string;
}

/**
 * Specific hint for Tour stops showing their origin
 */
export function StopSourceHint({ source, className }: StopSourceHintProps) {
  if (!source || source === 'manual') return null;
  
  let icon: React.ReactNode = null;
  let label: string = '';
  
  switch (source) {
    case 'flight':
      icon = <Plane className="w-3 h-3" />;
      label = 'From flight';
      break;
    case 'stay':
      icon = <Building2 className="w-3 h-3" />;
      label = 'From stay';
      break;
    case 'rental':
      icon = <Car className="w-3 h-3" />;
      label = 'From car rental';
      break;
    case 'bulk':
      icon = <ListPlus className="w-3 h-3" />;
      label = 'Imported from text';
      break;
    case 'bulk_email':
      icon = <Mail className="w-3 h-3" />;
      label = 'Imported from email';
      break;
  }
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs text-muted-foreground",
      className
    )}>
      {icon}
      <span>{label}</span>
    </span>
  );
}

/**
 * Determine stop source from notes content
 * Used to parse auto-drafted stop notes
 */
export function inferStopSource(notes: string | null): StopSourceHintProps['source'] {
  if (!notes) return 'manual';
  
  const lower = notes.toLowerCase();
  
  // Check for bulk import markers first
  if (lower.includes('imported from email') || lower.includes('bulk email')) {
    return 'bulk_email';
  }
  if (lower.includes('imported') || lower.includes('bulk')) {
    return 'bulk';
  }
  
  // Check for booking-derived sources (auto-drafted)
  if (lower.includes('auto-drafted from flight') || lower.includes('flight')) {
    return 'flight';
  }
  if (lower.includes('auto-drafted from stay') || lower.includes('stay')) {
    return 'stay';
  }
  if (lower.includes('auto-drafted from car rental') || lower.includes('rental')) {
    return 'rental';
  }
  
  return 'manual';
}

/**
 * Check if an expense was created from parsing
 * Looks for telltale notes patterns
 */
export function inferExpenseOrigin(notes: string | null): ParseOrigin {
  if (!notes) return null;
  
  const lower = notes.toLowerCase();
  
  if (lower.includes('from receipt') || lower.includes('receipt upload')) {
    return 'receipt';
  }
  if (lower.includes('from email')) {
    return 'email';
  }
  if (lower.includes('parsed') || lower.includes('created from')) {
    return 'pasted_text';
  }
  
  return null;
}
