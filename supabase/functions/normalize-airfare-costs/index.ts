/**
 * Normalize Airfare Costs Migration (v2.1.9)
 * 
 * This function scans existing trips for duplicated airfare costs and normalizes them.
 * 
 * Pattern detected:
 * - Multiple flight bookings for the same trip with identical confirmation numbers
 * - Each booking has the same total_cost (the full trip fare copied to each leg)
 * - This causes the trip total to be N× the actual airfare
 * 
 * Fix applied:
 * - Keep only one booking with the total cost
 * - Set other duplicate bookings' total_cost to 0
 * - Or merge duplicates into a single booking record
 * 
 * This is a one-time migration to fix legacy data.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface DuplicateGroup {
  tripId: string;
  confirmationNumber: string;
  bookingIds: string[];
  duplicateCost: number;
  bookingCount: number;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Authentication required." 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Use service role key for migration (needs to update any user's data)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Also validate the calling user's session
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        success: false,
        message: "Invalid session." 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for options
    let dryRun = true;
    let tripId: string | null = null;
    
    try {
      const body = await req.json();
      dryRun = body.dryRun !== false; // Default to dry run for safety
      tripId = body.tripId || null;
    } catch {
      // Use defaults
    }

    // Query to find flight bookings with potential duplicates
    // Looking for multiple flight bookings in the same trip with:
    // 1. Same confirmation number
    // 2. Same or similar total_cost
    let query = supabaseAdmin
      .from('bookings')
      .select('id, trip_id, booking_type, confirmation_number, total_cost, vendor_name, airline, start_datetime, end_datetime, notes')
      .eq('booking_type', 'flight')
      .not('confirmation_number', 'is', null)
      .order('trip_id')
      .order('confirmation_number');
    
    if (tripId) {
      query = query.eq('trip_id', tripId);
    }
    
    const { data: flightBookings, error: fetchError } = await query;
    
    if (fetchError) {
      console.error("Error fetching bookings:", fetchError);
      return new Response(JSON.stringify({ 
        success: false,
        message: "Failed to fetch bookings." 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!flightBookings || flightBookings.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "No flight bookings found to analyze.",
        duplicatesFound: 0,
        bookingsFixed: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group bookings by trip_id + confirmation_number
    const groups = new Map<string, typeof flightBookings>();
    
    for (const booking of flightBookings) {
      const key = `${booking.trip_id}::${booking.confirmation_number?.toLowerCase().trim()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(booking);
    }

    // Find groups with duplicates (same confirmation, same cost)
    const duplicateGroups: DuplicateGroup[] = [];
    
    for (const [key, bookings] of groups) {
      if (bookings.length > 1) {
        // Check if they have the same total_cost (indicating duplication)
        const costs = bookings.map(b => Number(b.total_cost || 0));
        const uniqueCosts = new Set(costs);
        
        // If all bookings have the same non-zero cost, this is likely a duplication
        if (uniqueCosts.size === 1 && costs[0] > 0) {
          const [tripId] = key.split('::');
          duplicateGroups.push({
            tripId,
            confirmationNumber: bookings[0].confirmation_number!,
            bookingIds: bookings.map(b => b.id),
            duplicateCost: costs[0],
            bookingCount: bookings.length
          });
        }
      }
    }

    if (duplicateGroups.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "No duplicate airfare costs detected.",
        duplicatesFound: 0,
        bookingsFixed: 0,
        dryRun 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Report what we found
    const report = {
      duplicateGroups: duplicateGroups.map(g => ({
        tripId: g.tripId,
        confirmationNumber: g.confirmationNumber,
        duplicateCount: g.bookingCount,
        duplicatedCost: g.duplicateCost,
        totalBeforeFix: g.duplicateCost * g.bookingCount,
        totalAfterFix: g.duplicateCost,
        savings: g.duplicateCost * (g.bookingCount - 1)
      })),
      totalDuplicateGroups: duplicateGroups.length,
      totalBookingsAffected: duplicateGroups.reduce((sum, g) => sum + g.bookingCount, 0),
      totalOvercharge: duplicateGroups.reduce((sum, g) => sum + g.duplicateCost * (g.bookingCount - 1), 0)
    };

    if (dryRun) {
      return new Response(JSON.stringify({ 
        success: true,
        message: `Found ${duplicateGroups.length} duplicate group(s). Run with dryRun=false to fix.`,
        dryRun: true,
        ...report
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply the fix: Keep the first booking's cost, zero out the rest
    let bookingsFixed = 0;
    const errors: string[] = [];
    
    for (const group of duplicateGroups) {
      // Keep the first booking, zero out the rest
      const [keepId, ...zeroOutIds] = group.bookingIds;
      
      for (const bookingId of zeroOutIds) {
        const { error: updateError } = await supabaseAdmin
          .from('bookings')
          .update({ 
            total_cost: 0,
            my_share: 0,
            notes: `[v2.1.9 normalized: cost moved to primary booking ${keepId}]`
          })
          .eq('id', bookingId);
        
        if (updateError) {
          errors.push(`Failed to update booking ${bookingId}: ${updateError.message}`);
        } else {
          bookingsFixed++;
        }
      }
    }

    // Also need to clean up linked expenses
    // Find expenses linked to the zeroed-out bookings and delete them
    const { data: expenses } = await supabaseAdmin
      .from('expenses')
      .select('id, notes')
      .ilike('notes', '%[linked_booking:%');
    
    let expensesDeleted = 0;
    
    if (expenses) {
      for (const expense of expenses) {
        // Extract booking ID from notes
        const match = expense.notes?.match(/\[linked_booking:([a-f0-9-]+)\]/);
        if (match) {
          const linkedBookingId = match[1];
          // Check if this booking was zeroed out
          const wasZeroed = duplicateGroups.some(g => 
            g.bookingIds.slice(1).includes(linkedBookingId)
          );
          
          if (wasZeroed) {
            const { error: deleteError } = await supabaseAdmin
              .from('expenses')
              .delete()
              .eq('id', expense.id);
            
            if (!deleteError) {
              expensesDeleted++;
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: errors.length === 0,
      message: `Fixed ${bookingsFixed} duplicate booking(s), deleted ${expensesDeleted} duplicate expense(s).`,
      dryRun: false,
      bookingsFixed,
      expensesDeleted,
      errors: errors.length > 0 ? errors : undefined,
      ...report
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Migration error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      message: "An unexpected error occurred during migration." 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
