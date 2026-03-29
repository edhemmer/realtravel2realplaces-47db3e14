/**
 * v5.2.0: TripAskDialog — Grounded single-turn AI assistant
 * Minimal dialog with quick prompts and freeform input.
 * No chat history, no multi-turn, no streaming.
 */

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Trip } from '@/types/database';
import type { CanonicalTripState, CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import type { WeatherSnapshot } from '@/lib/canonicalWeather';
import { resolveCanonicalLifecycle } from '@/lib/canonicalTimePolicy';

const QUICK_PROMPTS = [
  'What should I do next?',
  'Am I running late?',
  'How should I get there?',
  'What should I wear today?',
] as const;

interface TripAskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  canonicalState: CanonicalTripState | null;
  weatherSnapshots?: WeatherSnapshot[];
}

function buildTripContext(trip: Trip, state: CanonicalTripState | null, weather?: WeatherSnapshot[]) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const lifecycle = resolveCanonicalLifecycle(trip.start_date, trip.end_date);

  // Find upcoming events (today, sorted chronologically)
  const upcoming = (state?.timelineEvents ?? [])
    .filter(e => {
      const eventDate = e.datetime instanceof Date ? e.datetime : new Date(e.datetime);
      return eventDate >= now;
    })
    .sort((a, b) => {
      const aTime = a.datetime instanceof Date ? a.datetime.getTime() : new Date(a.datetime).getTime();
      const bTime = b.datetime instanceof Date ? b.datetime.getTime() : new Date(b.datetime).getTime();
      return aTime - bTime;
    })
    .slice(0, 5);

  const nextEvent = upcoming[0] || null;
  const nextEventTime = nextEvent
    ? (nextEvent.datetime instanceof Date ? nextEvent.datetime : new Date(nextEvent.datetime))
    : null;
  const minutesUntil = nextEventTime
    ? Math.round((nextEventTime.getTime() - now.getTime()) / 60000)
    : null;

  // Today's weather
  const todayWeather = weather?.find(w => w.dateISO === todayStr) ||
    (state?.weatherByKey
      ? Object.values(state.weatherByKey).find(w => w.dateISO === todayStr)
      : null);

  // Schedule density
  const todayEvents = (state?.timelineEvents ?? []).filter(e => {
    const d = e.datetime instanceof Date ? e.datetime : new Date(e.datetime);
    return d.toISOString().slice(0, 10) === todayStr;
  });
  const scheduleDensity = todayEvents.length >= 5
    ? 'very busy'
    : todayEvents.length >= 3
      ? 'moderately busy'
      : todayEvents.length >= 1
        ? 'light'
        : 'no events today';

  return {
    tripName: trip.name,
    destination: [trip.destination_city, trip.destination_state, trip.destination_country]
      .filter(Boolean).join(', '),
    startDate: trip.start_date,
    endDate: trip.end_date,
    currentTime: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    phase: lifecycle.phase,
    transportMode: trip.transportation_mode,
    scheduleDensity,
    nextEvent: nextEvent
      ? {
          title: nextEvent.title,
          time: nextEventTime!.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          minutesUntil,
        }
      : null,
    upcomingEvents: upcoming.slice(1, 4).map(e => ({
      title: e.title,
      time: (e.datetime instanceof Date ? e.datetime : new Date(e.datetime))
        .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    })),
    weather: todayWeather
      ? {
          high: todayWeather.high,
          low: todayWeather.low,
          unit: todayWeather.unit,
          condition: todayWeather.condition,
          precipChance: todayWeather.precipChance,
        }
      : null,
  };
}

export function TripAskDialog({ open, onOpenChange, trip, canonicalState, weatherSnapshots }: TripAskDialogProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const askQuestion = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setAnswer(null);

    try {
      const tripContext = buildTripContext(trip, canonicalState, weatherSnapshots);
      const { data, error } = await supabase.functions.invoke('trip-assistant', {
        body: { question: q.trim(), tripContext },
      });

      if (error) {
        toast.error('Unable to get a response right now');
        console.error('Trip assistant error:', error);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setAnswer(data?.answer || 'No response available.');
    } catch (err) {
      console.error('Trip assistant error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [trip, canonicalState, weatherSnapshots]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    askQuestion(question);
  }, [question, askQuestion]);

  const handleQuickPrompt = useCallback((prompt: string) => {
    setQuestion(prompt);
    askQuestion(prompt);
  }, [askQuestion]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setQuestion('');
      setAnswer(null);
    }
    onOpenChange(open);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            Ask about your trip
          </DialogTitle>
          <DialogDescription className="text-xs">
            Get quick, actionable answers based on your trip details.
          </DialogDescription>
        </DialogHeader>

        {/* Quick prompts */}
        {!answer && !loading && (
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => handleQuickPrompt(prompt)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-muted text-foreground transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask anything about your trip…"
            className="text-sm"
            disabled={loading}
            autoFocus
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !question.trim()}
            className="shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>

        {/* Answer */}
        {loading && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Thinking…
          </div>
        )}

        {answer && !loading && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm leading-relaxed text-foreground">{answer}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => {
                setAnswer(null);
                setQuestion('');
              }}
            >
              Ask another question
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
