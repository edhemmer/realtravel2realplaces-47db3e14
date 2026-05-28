/**
 * Command Palette (⌘K) — universal navigator + action runner.
 *
 * Mounted once at the app root. Opens via:
 *   - useCommandPaletteHotkey()  (⌘K / Ctrl+K)
 *   - openCommandPalette()       (programmatic, e.g. header search button)
 *
 * Items come from the canonical index (`useCommandPaletteIndex`). Selecting
 * a trip remembers it in localStorage so the "Recent" group stays warm
 * across sessions. Selection fires a `select` haptic; commit fires `commit`.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeCommandPalette } from '@/hooks/useCommandPaletteHotkey';
import {
  useCommandPaletteIndex,
  rememberRecentTrip,
  type CommandItem as CmdItem,
} from '@/hooks/useCommandPaletteIndex';
import { haptic } from '@/lib/native/haptics';

const GROUP_ORDER: CmdItem['group'][] = ['Recent', 'Trips', 'Navigate', 'Actions'];

export function CommandPalette() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const items = useCommandPaletteIndex();

  // Wire the global bus -> local open state.
  useEffect(() => {
    return subscribeCommandPalette(({ open: forceOpen, toggle }) => {
      if (toggle) {
        setOpen(prev => !prev);
      } else if (typeof forceOpen === 'boolean') {
        setOpen(forceOpen);
      }
    });
  }, []);

  // Don't render for signed-out visitors (landing/auth pages).
  // Hooks above stay called unconditionally — only the return is gated.
  const grouped = useMemo(() => {
    const g = new Map<CmdItem['group'], CmdItem[]>();
    for (const item of items) {
      const list = g.get(item.group) ?? [];
      list.push(item);
      g.set(item.group, list);
    }
    return g;
  }, [items]);

  if (!user) return null;

  const runItem = (item: CmdItem) => {
    void haptic('commit');
    if (item.id.startsWith('trip:') || item.id.startsWith('recent:')) {
      const tripId = item.id.split(':')[1];
      if (tripId) rememberRecentTrip(tripId);
    }
    item.perform(navigate);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search trips, jump to a page, or run an action…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        {GROUP_ORDER.map((groupName, idx) => {
          const groupItems = grouped.get(groupName);
          if (!groupItems || groupItems.length === 0) return null;
          return (
            <div key={groupName}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={groupName}>
                {groupItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      // cmdk filters on value — include keywords so search hits hint/destination too.
                      value={`${item.label} ${item.keywords ?? ''}`}
                      onSelect={() => runItem(item)}
                    >
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.hint && (
                        <span className="ml-2 truncate text-xs text-muted-foreground">
                          {item.hint}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
