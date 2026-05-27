import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Canonical realtime sync bridge.
 *
 * Subscribes to postgres_changes on the tables that drive the execution layer
 * and invalidates the corresponding react-query keys so web and iOS stay live.
 *
 * - One concept = one helper. Shared across web + native (canonical principle).
 * - Debounced per table (400ms) to avoid invalidation storms.
 * - Auto-resubscribes on auth user change. No-ops when signed out.
 * - Pure side-effect component; renders nothing.
 */
const TABLES = [
  "trips",
  "trip_engagements",
  "trip_events",
  "bookings",
  "expenses",
] as const;

type TableName = (typeof TABLES)[number];

export function RealtimeSyncBridge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const timers = useRef<Partial<Record<TableName, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => {
    if (!user) return;

    const scheduleInvalidate = (table: TableName) => {
      if (timers.current[table]) clearTimeout(timers.current[table]);
      timers.current[table] = setTimeout(() => {
        // Broad key prefix — covers list + detail variants.
        queryClient.invalidateQueries({ queryKey: [table] });
        // Common alias keys used elsewhere in the codebase.
        if (table === "trip_engagements" || table === "trip_events") {
          queryClient.invalidateQueries({ queryKey: ["timeline"] });
        }
        if (table === "bookings") {
          queryClient.invalidateQueries({ queryKey: ["trip-bookings"] });
        }
        if (table === "expenses") {
          queryClient.invalidateQueries({ queryKey: ["trip-expenses"] });
        }
      }, 400);
    };

    const channel = supabase.channel(`rt-sync-${user.id}`);

    for (const table of TABLES) {
      channel.on(
        // @ts-expect-error — supabase-js types are narrow for the literal
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => scheduleInvalidate(table),
      );
    }

    channel.subscribe();

    return () => {
      Object.values(timers.current).forEach((t) => t && clearTimeout(t));
      timers.current = {};
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return null;
}
