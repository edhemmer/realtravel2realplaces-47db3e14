/**
 * Reports Page - Business-only Advanced Reports
 * 
 * Patch 2.4.3: UI-only reporting workspace with filters, sortable table,
 * and export control placeholders. Export logic to be implemented later.
 * 
 * Features:
 * - Multi-trip filtering by date range, trip, companion, Stop, category
 * - Sortable results table
 * - Export buttons (PDF & CSV) - UI only, no export logic yet
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
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Expense, Companion } from '@/types/database';
import { Engagement } from '@/hooks/useEngagements';

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

  // Toast for placeholder exports
  const { toast } = useToast();

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

  // Placeholder export handlers - UI only, logic to be implemented later
  const handleExportPDF = () => {
    toast({
      title: "Export PDF",
      description: "PDF export will generate a branded report with your current filters and data.",
    });
  };

  const handleExportCSV = () => {
    toast({
      title: "Export CSV",
      description: "CSV export will include all visible columns in a machine-readable format.",
    });
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Advanced Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Filter and export expense data across your trips
            </p>
          </div>

          {/* Export Pills */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={sortedRows.length === 0}
              className="rounded-full"
            >
              <FileText className="w-4 h-4 mr-1" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={sortedRows.length === 0}
              className="rounded-full"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
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
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Rows</p>
              <p className="text-2xl font-bold">{sortedRows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">${totals.totalAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">My Share</p>
              <p className="text-2xl font-bold text-primary">${totals.totalMyShare.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
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
              <div className="text-center py-12 text-muted-foreground">
                No expenses match your filters.
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
