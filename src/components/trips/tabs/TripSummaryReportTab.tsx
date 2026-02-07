/**
 * TripSummaryReportTab - Pro & Business Trip Summary with PDF Export
 * 
 * Patch 2.4.0: Professional trip summary for sharing with companions.
 * v2.0.8: Uses unified display formatting for dates and costs.
 * 
 * Features:
 * - Read-only summary view with trip details
 * - Total trip expense and individual shares
 * - Bookings overview (flights, stays, rentals)
 * - Expense summary by category
 * - Individualized PDF generation for owner and companions
 */

import { useState, useMemo } from 'react';
import { useTrip } from '@/hooks/useTrips';
import { useExpenses } from '@/hooks/useExpenses';
import { useBookings } from '@/hooks/useBookings';
import { useCompanions } from '@/hooks/useCompanions';
import { Companion } from '@/types/database';
import { 
  calculateTripCostSummary, 
  calculateCategorySummary,
  getOutOfPocketExpenses,
} from '@/lib/expenseCalculations';
import { 
  formatTripDateRange, 
  formatCurrency, 
  TRIP_TOTAL_LABEL, 
  MY_SHARE_LABEL 
} from '@/lib/displayFormats';
import { useParking } from '@/hooks/useParking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  FileDown, 
  Plane, 
  Hotel, 
  Car, 
  Ticket, 
  Train,
  Receipt,
  Utensils,
  PartyPopper,
  ShoppingBag,
  ParkingCircle,
  MoreHorizontal,
  User,
  Users,
  Calendar,
  MapPin,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import { useTripPermission } from '@/pages/TripDetail';

interface TripSummaryReportTabProps {
  tripId: string;
}

// Category display config
const CATEGORY_CONFIG = {
  meals: { label: 'Meals', icon: Utensils, color: 'text-orange-600' },
  transport: { label: 'Transport', icon: Car, color: 'text-blue-600' },
  activity: { label: 'Activities', icon: PartyPopper, color: 'text-purple-600' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: 'text-pink-600' },
  parking: { label: 'Parking', icon: ParkingCircle, color: 'text-slate-600' },
  other: { label: 'Other', icon: MoreHorizontal, color: 'text-gray-600' },
};

// Booking type display config
const BOOKING_TYPE_CONFIG = {
  flight: { label: 'Flights', icon: Plane },
  stay: { label: 'Stays', icon: Hotel },
  car_rental: { label: 'Car Rentals', icon: Car },
  activity: { label: 'Activities', icon: Ticket },
  transport: { label: 'Transport', icon: Train },
};

export function TripSummaryReportTab({ tripId }: TripSummaryReportTabProps) {
  const { isOwner } = useTripPermission();
  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(tripId);
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(tripId);
  const { data: companions = [], isLoading: companionsLoading } = useCompanions(tripId);
  const { data: parking = [] } = useParking(tripId);
  
  const [selectedCompanion, setSelectedCompanion] = useState<string>('owner');
  const [generating, setGenerating] = useState(false);

  const isLoading = tripLoading || expensesLoading || bookingsLoading || companionsLoading;

  // Calculate cost summary
  const costSummary = useMemo(() => {
    return calculateTripCostSummary(expenses, bookings, parking);
  }, [expenses, bookings, parking]);

  // Calculate category breakdown
  const categorySummary = useMemo(() => {
    const outOfPocket = getOutOfPocketExpenses(expenses);
    return calculateCategorySummary(outOfPocket);
  }, [expenses]);

  // Group bookings by type
  const bookingsByType = useMemo(() => {
    const grouped: Record<string, typeof bookings> = {};
    for (const booking of bookings) {
      const type = booking.booking_type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(booking);
    }
    return grouped;
  }, [bookings]);

  // Get share for selected person
  const getShareForPerson = (personId: string): number => {
    if (personId === 'owner') {
      return costSummary.totalMyShare;
    }
    // For companions, find their portion_owed
    const companion = companions.find(c => c.id === personId);
    return companion?.portion_owed || 0;
  };

  // Get name for selected person
  const getNameForPerson = (personId: string): string => {
    if (personId === 'owner') {
      return 'Trip Owner';
    }
    const companion = companions.find(c => c.id === personId);
    return companion?.name || 'Unknown';
  };

  // Generate PDF for a specific person
  const generatePDF = async (personId: string) => {
    if (!trip) return;
    
    setGenerating(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let y = margin;

      const personName = getNameForPerson(personId);
      const personShare = getShareForPerson(personId);

      // ========== HEADER ==========
      // Brand header
      pdf.setFillColor(20, 184, 166); // Teal-500
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Real Travel 2 Real Places', margin, 18);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Trip Summary Report', margin, 28);
      
      y = 50;

      // ========== RECIPIENT & TRIP INFO ==========
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Prepared for:', margin, y);
      
      pdf.setFontSize(16);
      pdf.text(personName, margin, y + 8);
      
      y += 20;

      // Trip name
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(trip.name, margin, y);
      y += 10;

      // Trip dates and destination - v2.0.8: Use unified formatting
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const dateRange = formatTripDateRange(trip.start_date, trip.end_date);
      pdf.text(dateRange, margin, y);
      y += 6;
      
      const destination = [trip.destination_city, trip.destination_state, trip.destination_country]
        .filter(Boolean).join(', ');
      pdf.text(destination, margin, y);
      y += 15;

      // ========== COST SUMMARY - v2.0.8: Unified labels ==========
      pdf.setFillColor(248, 250, 252); // Slate-50
      pdf.roundedRect(margin, y, contentWidth, 40, 3, 3, 'F');
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Cost Summary', margin + 5, y + 10);

      // Total Trip Cost
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${TRIP_TOTAL_LABEL}:`, margin + 5, y + 20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatCurrency(costSummary.totalCost), margin + 55, y + 20);

      // Individual Share
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${MY_SHARE_LABEL}:`, margin + 5, y + 28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(20, 184, 166); // Teal
      pdf.text(formatCurrency(personShare), margin + 55, y + 28);
      
      y += 50;

      // ========== BOOKINGS OVERVIEW ==========
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Bookings Overview', margin, y);
      y += 8;

      const bookingTypes = ['flight', 'stay', 'car_rental', 'activity', 'transport'] as const;
      
      for (const type of bookingTypes) {
        const typeBookings = bookingsByType[type] || [];
        if (typeBookings.length === 0) continue;

        const config = BOOKING_TYPE_CONFIG[type];
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(60, 60, 60);
        pdf.text(`${config.label} (${typeBookings.length})`, margin, y);
        y += 6;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);

        for (const booking of typeBookings.slice(0, 5)) { // Limit to 5 per type
          const costStr = booking.total_cost ? ` (${formatCurrency(booking.total_cost)})` : '';
          const bookingInfo = booking.vendor_name + 
            (booking.confirmation_number ? ` - ${booking.confirmation_number}` : '') +
            costStr;
          
          // Truncate if too long
          const truncated = bookingInfo.length > 70 ? bookingInfo.substring(0, 67) + '...' : bookingInfo;
          pdf.text(`• ${truncated}`, margin + 5, y);
          y += 5;

          // Check for page break
          if (y > 260) {
            pdf.addPage();
            y = margin;
          }
        }

        if (typeBookings.length > 5) {
          pdf.text(`  ... and ${typeBookings.length - 5} more`, margin + 5, y);
          y += 5;
        }

        y += 5;
      }

      y += 5;

      // ========== EXPENSE SUMMARY BY CATEGORY ==========
      if (y > 220) {
        pdf.addPage();
        y = margin;
      }

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Expense Summary by Category', margin, y);
      y += 10;

      const categories = ['meals', 'transport', 'activity', 'shopping', 'parking', 'other'] as const;
      
      for (const category of categories) {
        const amount = categorySummary[category];
        if (amount === 0) continue;

        const config = CATEGORY_CONFIG[category];
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text(config.label, margin + 5, y);
        pdf.text(formatCurrency(amount), margin + 80, y);
        y += 6;
      }

      // ========== FOOTER ==========
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Generated on ${format(new Date(), 'MMMM d, yyyy')} • Real Travel 2 Real Places`,
          margin,
          pdf.internal.pageSize.getHeight() - 10
        );
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin - 20,
          pdf.internal.pageSize.getHeight() - 10
        );
      }

      // Download
      const fileName = `Trip-Summary-${trip.name.replace(/[^a-zA-Z0-9]/g, '-')}-${personName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trip) return null;

  const currentPersonShare = getShareForPerson(selectedCompanion);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Trip Summary Report
              </CardTitle>
              <CardDescription>
                Professional summary for sharing with companions
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Pro Feature
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trip Info - v2.0.8: Unified date formatting */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold">{trip.name}</h3>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatTripDateRange(trip.start_date, trip.end_date)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {[trip.destination_city, trip.destination_state, trip.destination_country].filter(Boolean).join(', ')}
              </span>
              <span className="flex items-center gap-1">
                {companions.length === 0 ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                {companions.length === 0 
                  ? '1 traveler' 
                  : `${companions.length} traveler${companions.length === 1 ? '' : 's'}`
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Summary Card - v2.0.8: Unified labels and formatting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{TRIP_TOTAL_LABEL}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{TRIP_TOTAL_LABEL}</p>
              <p className="text-2xl font-bold">{formatCurrency(costSummary.totalCost)}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">{MY_SHARE_LABEL}</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(costSummary.totalMyShare)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bookings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(['flight', 'stay', 'car_rental', 'activity', 'transport'] as const).map(type => {
              const typeBookings = bookingsByType[type] || [];
              if (typeBookings.length === 0) return null;

              const config = BOOKING_TYPE_CONFIG[type];
              const Icon = config.icon;

              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="font-medium">{config.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {typeBookings.length}
                    </Badge>
                  </div>
                  <div className="pl-6 space-y-1">
                    {typeBookings.map(booking => (
                      <div key={booking.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {booking.vendor_name}
                          {booking.confirmation_number && ` • ${booking.confirmation_number}`}
                        </span>
                        {booking.total_cost > 0 && (
                          <span className="font-medium">{formatCurrency(booking.total_cost)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {bookings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No bookings recorded for this trip.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expense Summary by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(['meals', 'transport', 'activity', 'shopping', 'parking', 'other'] as const).map(category => {
              const amount = categorySummary[category];
              const config = CATEGORY_CONFIG[category];
              const Icon = config.icon;

              return (
                <div 
                  key={category} 
                  className={`p-3 rounded-lg border ${amount > 0 ? 'bg-background' : 'bg-muted/30'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${amount > 0 ? config.color : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <p className={`text-lg font-semibold ${amount > 0 ? '' : 'text-muted-foreground'}`}>
                    {formatCurrency(amount)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* PDF Download Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Download PDF
          </CardTitle>
          <CardDescription>
            Generate a professional PDF for yourself or a companion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* My PDF */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">My Trip Summary</p>
                <p className="text-sm text-muted-foreground">
                  Your share: ${costSummary.totalMyShare.toFixed(2)}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => generatePDF('owner')}
              disabled={generating}
            >
              <FileDown className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Download'}
            </Button>
          </div>

          {/* Companion PDFs - only show for trip owner */}
          {isOwner && companions.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-3">Companion Reports</p>
                <div className="space-y-2">
                  {companions.map(companion => (
                    <div 
                      key={companion.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                          <User className="w-4 h-4 text-secondary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{companion.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Share: ${(companion.portion_owed || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => generatePDF(companion.id)}
                        disabled={generating}
                      >
                        <FileDown className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {companions.length === 0 && isOwner && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Add companions to generate individualized reports for them.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
