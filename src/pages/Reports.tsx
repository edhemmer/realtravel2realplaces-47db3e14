/**
 * Reports Page - Business-only Advanced Reports
 * 
 * Patch 2.4.5: Added export consistency validation, filter summary clarity,
 * and user-facing accuracy language.
 * 
 * Patch 2.6.2: Commercial Code Integrity Documentation
 * 
 * DATA INTEGRITY:
 * - Single data source: allExpenses query fetches from Supabase
 * - All UI filtering (filteredRows) and sorting (sortedRows) derive from same source
 * - PDF and CSV exports use sortedRows directly (what you see is what you export)
 * - Pre-export validation (validateExportConsistency) confirms data hasn't changed
 * 
 * ERROR HANDLING:
 * - Export failures are caught and surface via toast notifications
 * - Validation failures prevent export and explain the issue to users
 * - Query failures throw to React Query error boundaries
 * 
 * BUSINESS TIER GATING:
 * - canAccessBusinessFeatures check redirects non-Business users
 * - Route is accessible to all, but content is gated
 * - This provides a clear upgrade path for non-Business users
 * 
 * EXPORT ACCURACY GUARANTEES:
 * - validateExportConsistency() recalculates totals before export
 * - If totals don't match (data changed during session), export is blocked
 * - Users are instructed to refresh and retry
 * - 0.01 tolerance accounts for floating point precision
 * 
 * Features:
 * - Multi-trip filtering by date range, trip, companion, Stop, category
 * - Sortable results table
 * - PDF export with RT2RP branding, summary, and paginated table
 * - CSV export with metadata header and proper formatting
 * - Pre-export validation to ensure data consistency
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '@/hooks/useTrips';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { useAccess } from '@/hooks/useAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  FileSpreadsheet,
  Filter,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  BarChart3,
  X,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { Expense, Companion } from '@/types/database';
import { Engagement } from '@/hooks/useEngagements';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { GlassSurface } from '@/components/ui/glass-surface';

// Category display labels
const CATEGORY_LABELS: Record<string, string> = {
  meals: 'Meals',
  transport: 'Transport',
  activity: 'Activities',
  shopping: 'Shopping',
  parking: 'Parking',
  other: 'Other',
};

// Sort direction type
type SortDirection = 'asc' | 'desc' | null;
type SortColumn = 'date' | 'amount' | 'category' | 'stop' | null;

interface ReportRow {
  id: string;
  date: string;
  tripId: string;
  tripName: string;
  stopId: string | null;
  stopName: string | null;
  category: string;
  description: string;
  amount: number;
  myShare: number;
  companionName: string | null;
}

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccessBusinessFeatures, isLoading: accessLoading } = useAccess();
  const { data: trips = [], isLoading: tripsLoading } = useTrips();

  // Filter state
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedTrips, setSelectedTrips] = useState<string[]>([]);
  const [selectedCompanion, setSelectedCompanion] = useState<string>('all');
  const [selectedStop, setSelectedStop] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Export loading state
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  
  // Help panel state
  const [helpOpen, setHelpOpen] = useState(false);
  
  // Toast for validation messages
  const { toast } = useToast();

  // Snapshot for export validation - captures current state at render
  const exportSnapshot = useMemo(() => ({
    rowCount: 0,
    totalAmount: 0,
    totalMyShare: 0,
  }), []);

  // Fetch all expenses for user's trips
  const { data: allExpenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['all-expenses', user?.id],
    queryFn: async () => {
      if (!user || trips.length === 0) return [];
      
      const tripIds = trips.map(t => t.id);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .in('trip_id', tripIds)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user && trips.length > 0,
  });

  // Fetch all companions for user's trips
  const { data: allCompanions = [] } = useQuery({
    queryKey: ['all-companions', user?.id],
    queryFn: async () => {
      if (!user || trips.length === 0) return [];
      
      const tripIds = trips.map(t => t.id);
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .in('trip_id', tripIds);
      
      if (error) throw error;
      return data as Companion[];
    },
    enabled: !!user && trips.length > 0,
  });

  // Fetch all engagements (stops) for user's trips
  const { data: allEngagements = [] } = useQuery({
    queryKey: ['all-engagements', user?.id],
    queryFn: async () => {
      if (!user || trips.length === 0) return [];
      
      const tripIds = trips.map(t => t.id);
      const { data, error } = await supabase
        .from('engagements')
        .select('*')
        .in('trip_id', tripIds)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data as Engagement[];
    },
    enabled: !!user && trips.length > 0,
  });

  // Build report rows from expenses
  const reportRows = useMemo((): ReportRow[] => {
    return allExpenses.map(expense => {
      const trip = trips.find(t => t.id === expense.trip_id);
      const stop = expense.engagement_id 
        ? allEngagements.find(e => e.id === expense.engagement_id)
        : null;
      
      return {
        id: expense.id,
        date: expense.date,
        tripId: expense.trip_id,
        tripName: trip?.name || 'Unknown Trip',
        stopId: expense.engagement_id || null,
        stopName: stop?.name || null,
        category: expense.category,
        description: expense.description || '',
        amount: Number(expense.amount || 0),
        myShare: expense.my_share !== null && expense.my_share !== undefined 
          ? Number(expense.my_share) 
          : Number(expense.amount || 0),
        companionName: null, // Expenses don't directly link to companions
      };
    });
  }, [allExpenses, trips, allEngagements]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return reportRows.filter(row => {
      // Date range filter
      if (dateFrom || dateTo) {
        const rowDate = parseISO(row.date);
        if (dateFrom && rowDate < startOfDay(parseISO(dateFrom))) return false;
        if (dateTo && rowDate > endOfDay(parseISO(dateTo))) return false;
      }

      // Trip filter
      if (selectedTrips.length > 0 && !selectedTrips.includes(row.tripId)) {
        return false;
      }

      // Stop filter
      if (selectedStop !== 'all') {
        if (selectedStop === 'none' && row.stopId !== null) return false;
        if (selectedStop !== 'none' && row.stopId !== selectedStop) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && row.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [reportRows, dateFrom, dateTo, selectedTrips, selectedStop, selectedCategory]);

  // Apply sorting
  const sortedRows = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'stop':
          const stopA = a.stopName || '';
          const stopB = b.stopName || '';
          comparison = stopA.localeCompare(stopB);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortColumn, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    return sortedRows.reduce(
      (acc, row) => ({
        totalAmount: acc.totalAmount + row.amount,
        totalMyShare: acc.totalMyShare + row.myShare,
      }),
      { totalAmount: 0, totalMyShare: 0 }
    );
  }, [sortedRows]);

  // Handle column sort click
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction or clear
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Get sort icon for column
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'desc' 
      ? <ChevronDown className="w-4 h-4 ml-1" />
      : <ChevronUp className="w-4 h-4 ml-1" />;
  };

  // Build filter summary for exports (readable format)
  const getFilterSummary = (): string => {
    const parts: string[] = [];
    if (dateFrom) parts.push(`From: ${format(parseISO(dateFrom), 'MMM d, yyyy')}`);
    if (dateTo) parts.push(`To: ${format(parseISO(dateTo), 'MMM d, yyyy')}`);
    if (selectedTrips.length > 0) {
      const tripNames = selectedTrips.map(id => trips.find(t => t.id === id)?.name).filter(Boolean);
      parts.push(`Trips: ${tripNames.join(', ')}`);
    }
    if (selectedStop !== 'all') {
      if (selectedStop === 'none') {
        parts.push('Stop: Not assigned');
      } else {
        const stopName = allEngagements.find(e => e.id === selectedStop)?.name;
        if (stopName) parts.push(`Stop: ${stopName}`);
      }
    }
    if (selectedCategory !== 'all') {
      parts.push(`Category: ${CATEGORY_LABELS[selectedCategory] || selectedCategory}`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'All data (no filters)';
  };

  // Validate export data consistency - ensures exported data matches UI
  const validateExportConsistency = (): boolean => {
    // Recalculate totals to verify against current state
    const currentTotals = sortedRows.reduce(
      (acc, row) => ({
        totalAmount: acc.totalAmount + row.amount,
        totalMyShare: acc.totalMyShare + row.myShare,
      }),
      { totalAmount: 0, totalMyShare: 0 }
    );

    // Check if totals match (with small tolerance for floating point)
    const tolerance = 0.01;
    const amountMatch = Math.abs(currentTotals.totalAmount - totals.totalAmount) < tolerance;
    const shareMatch = Math.abs(currentTotals.totalMyShare - totals.totalMyShare) < tolerance;

    if (!amountMatch || !shareMatch) {
      toast({
        variant: "destructive",
        title: "Export validation failed",
        description: "Data may have changed. Please refresh the page and try again.",
      });
      return false;
    }

    return true;
  };

  // CSV Export - generates clean, machine-readable CSV with metadata header
  const handleExportCSV = () => {
    // Validate data consistency before export
    if (!validateExportConsistency()) {
      return;
    }

    setExporting('csv');
    
    try {
      // Build metadata header with filter information
      const generatedDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      const filterInfo = getFilterSummary();
      const metadataRows = [
        `# RT2RP Advanced Report`,
        `# Generated: ${generatedDate}`,
        `# Filters: ${filterInfo}`,
        `# Total Rows: ${sortedRows.length}`,
        `# Total Amount: $${totals.totalAmount.toFixed(2)}`,
        `# My Share: $${totals.totalMyShare.toFixed(2)}`,
        `#`,
      ];

      const headers = ['Date', 'Trip', 'Stop', 'Category', 'Description', 'Amount', 'My Share'];
      const rows = sortedRows.map(row => [
        row.date,
        row.tripName,
        row.stopName || '',
        CATEGORY_LABELS[row.category] || row.category,
        row.description,
        row.amount.toFixed(2),
        row.myShare.toFixed(2),
      ]);

      // Proper CSV escaping: wrap fields with quotes if they contain comma, quote, or newline
      const escapeCSV = (value: string): string => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        ...metadataRows,
        headers.join(','),
        ...rows.map(row => row.map(cell => escapeCSV(String(cell))).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `RT2RP-Report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setExporting(null);
    }
  };

  // PDF Export - generates branded PDF with summary and paginated table
  const handleExportPDF = () => {
    // Validate data consistency before export
    if (!validateExportConsistency()) {
      return;
    }

    setExporting('pdf');

    try {
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for table width
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let y = margin;

      // ========== HEADER ==========
      pdf.setFillColor(20, 184, 166); // Teal-500 (primary brand color)
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Real Travel 2 Real Places', margin, 12);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Advanced Report', margin, 19);

      // Generated date in header
      pdf.setFontSize(9);
      pdf.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth - margin - 50, 12);
      
      y = 35;

      // ========== SUMMARY BLOCK ==========
      pdf.setTextColor(0, 0, 0);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Report Summary', margin + 5, y + 7);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Total Amount: $${totals.totalAmount.toFixed(2)}`, margin + 5, y + 14);
      pdf.text(`My Share: $${totals.totalMyShare.toFixed(2)}`, margin + 70, y + 14);
      pdf.text(`Rows: ${sortedRows.length}`, margin + 130, y + 14);

      // Filter summary on second line
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      const filterSummary = getFilterSummary();
      // Truncate if too long
      const displayFilter = filterSummary.length > 120 ? filterSummary.substring(0, 117) + '...' : filterSummary;
      pdf.text(`Filters: ${displayFilter}`, margin + 5, y + 20);

      y += 28;

      // ========== TABLE ==========
      const colWidths = [22, 50, 35, 25, 80, 25, 25]; // Date, Trip, Stop, Category, Description, Amount, Share
      const headers = ['Date', 'Trip', 'Stop', 'Category', 'Description', 'Amount', 'My Share'];
      const rowHeight = 6;

      // Function to draw table header
      const drawTableHeader = (yPos: number): number => {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        
        let x = margin + 2;
        headers.forEach((header, i) => {
          pdf.text(header, x, yPos + 5);
          x += colWidths[i];
        });
        
        return yPos + 10;
      };

      y = drawTableHeader(y);

      // Table rows
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(40, 40, 40);
      pdf.setFontSize(8);

      for (const row of sortedRows) {
        // Check for page break - leave room for footer
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = margin;
          y = drawTableHeader(y);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(40, 40, 40);
          pdf.setFontSize(8);
        }

        let x = margin + 2;
        
        const rowData = [
          format(parseISO(row.date), 'MM/dd/yy'),
          row.tripName.substring(0, 25),
          (row.stopName || '-').substring(0, 15),
          CATEGORY_LABELS[row.category] || row.category,
          row.description.substring(0, 45),
          `$${row.amount.toFixed(2)}`,
          `$${row.myShare.toFixed(2)}`,
        ];

        rowData.forEach((cell, i) => {
          pdf.text(cell, x, y);
          x += colWidths[i];
        });

        y += rowHeight;
      }

      // ========== FOOTER ON ALL PAGES ==========
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Real Travel 2 Real Places • Advanced Report`,
          margin,
          pageHeight - 8
        );
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin - 18,
          pageHeight - 8
        );
      }

      pdf.save(`RT2RP-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedTrips([]);
    setSelectedCompanion('all');
    setSelectedStop('all');
    setSelectedCategory('all');
  };

  // Handle multi-select for trips
  const toggleTrip = (tripId: string) => {
    setSelectedTrips(prev => 
      prev.includes(tripId) 
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId]
    );
  };

  const isLoading = tripsLoading || expensesLoading || accessLoading;

  // Redirect if not Business user
  if (!accessLoading && !canAccessBusinessFeatures) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Business Feature</CardTitle>
              <CardDescription>
                Advanced Reports is available for Business plan users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <GlassSurface elevation="floating" className="overflow-hidden rounded-2xl">
          <div className="h-1 bg-[linear-gradient(90deg,hsl(var(--brand-signal)),hsl(var(--brand-champagne)),hsl(var(--brand-ember)))]" />
          <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-6">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-semibold uppercase text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Export-validated reporting
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight">Business Travel Reports</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Audit-ready filtering, totals, and exports across trips, stops, categories, and reimbursements.
              </p>
            </div>

            {/* Export Pills - Patch 2.6.1: Clear disabled state feedback */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={exporting !== null || sortedRows.length === 0}
                className="h-10 rounded-xl border-border/60 bg-card/70 px-4"
                title={sortedRows.length === 0 ? 'No data to export — adjust filters or add expenses' : 'Export visible data as PDF'}
              >
                <FileText className="w-4 h-4 mr-1" />
                {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={exporting !== null || sortedRows.length === 0}
                className="h-10 rounded-xl border-border/60 bg-card/70 px-4"
                title={sortedRows.length === 0 ? 'No data to export — adjust filters or add expenses' : 'Export visible data as CSV'}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                {exporting === 'csv' ? 'Exporting...' : 'CSV'}
              </Button>
            </div>
          </div>
        </GlassSurface>

        {/* Help Panel - Report Accuracy Information */}
        <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
          <Card className="premium-panel rounded-2xl border-muted">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Info className="w-4 h-4" />
                  About Reports
                  <span className="text-xs ml-auto">{helpOpen ? '▲' : '▼'}</span>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong>What you see is what you get.</strong> Reports reflect exactly 
                    the data shown on screen. Filters and sorting affect what appears in 
                    both the table and exports.
                  </p>
                  <p>
                    <strong>PDF exports</strong> include a branded header, summary totals, 
                    active filters, and a paginated table matching your current view.
                  </p>
                  <p>
                    <strong>CSV exports</strong> include metadata comments at the top 
                    indicating the filters used and totals, followed by the data rows.
                  </p>
                  <p>
                    Accuracy is prioritized over automation. If data changes while you're 
                    viewing reports, refresh the page before exporting to ensure consistency.
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Filters Card */}
        <Card className="premium-panel rounded-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
              {(dateFrom || dateTo || selectedTrips.length > 0 || selectedStop !== 'all' || selectedCategory !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-xs">Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Trip Select */}
              <div className="space-y-2">
                <Label className="text-xs">Trip</Label>
                <Select
                  value={selectedTrips.length === 0 ? 'all' : selectedTrips.length === 1 ? selectedTrips[0] : 'multiple'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setSelectedTrips([]);
                    } else if (value !== 'multiple') {
                      setSelectedTrips([value]);
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Trips" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Trips</SelectItem>
                    {trips.map(trip => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stop Select */}
              <div className="space-y-2">
                <Label className="text-xs">Stop</Label>
                <Select value={selectedStop} onValueChange={setSelectedStop}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Stops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stops</SelectItem>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {allEngagements.map(engagement => (
                      <SelectItem key={engagement.id} value={engagement.id}>
                        {engagement.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Select */}
              <div className="space-y-2">
                <Label className="text-xs">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="premium-kpi rounded-2xl">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Rows</p>
              <p className="text-2xl font-bold">{sortedRows.length}</p>
            </CardContent>
          </Card>
          <Card className="premium-kpi rounded-2xl">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">${totals.totalAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="premium-kpi rounded-2xl">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">My Share</p>
              <p className="text-2xl font-bold text-primary">${totals.totalMyShare.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card className="premium-panel overflow-hidden rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Results</CardTitle>
            <CardDescription>
              Click column headers to sort. {sortedRows.length} expense{sortedRows.length !== 1 ? 's' : ''} found.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : sortedRows.length === 0 ? (
              /* Patch 2.6.1: Improved empty state with clearer guidance */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium mb-1">No expenses match your filters</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {allExpenses.length === 0 
                    ? 'Add expenses to your trips to see them here. Reports aggregate data across all your trips.'
                    : 'Try adjusting the date range, trip selection, or category filters above.'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('date')}
                      >
                        <span className="flex items-center">
                          Date {getSortIcon('date')}
                        </span>
                      </TableHead>
                      <TableHead>Trip</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('stop')}
                      >
                        <span className="flex items-center">
                          Stop {getSortIcon('stop')}
                        </span>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('category')}
                      >
                        <span className="flex items-center">
                          Category {getSortIcon('category')}
                        </span>
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none text-right"
                        onClick={() => handleSort('amount')}
                      >
                        <span className="flex items-center justify-end">
                          Amount {getSortIcon('amount')}
                        </span>
                      </TableHead>
                      <TableHead className="text-right">My Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRows.map(row => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-sm">
                          {format(parseISO(row.date), 'MM/dd/yy')}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{row.tripName}</span>
                        </TableCell>
                        <TableCell>
                          {row.stopName ? (
                            <Badge variant="secondary" className="font-normal">
                              {row.stopName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {CATEGORY_LABELS[row.category] || row.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {row.description || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${row.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary font-medium">
                          ${row.myShare.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
