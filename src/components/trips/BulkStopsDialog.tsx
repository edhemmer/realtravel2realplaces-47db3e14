/**
 * BulkStopsDialog - Bulk Tour Stop Ingestion
 * 
 * v2.0.9: Allows Business users to add multiple stops at once via:
 * - Copy/paste multiline text
 * - Drag & drop a plain text file (.txt)
 * 
 * Parsing Rules (v1 - accuracy over cleverness):
 * - Each non-empty line = one stop
 * - Title: text before first "-" or "," (if present)
 * - Location: remaining text after separator
 * - Time hint: trailing time token (9:30 AM, 14:00, etc.)
 * - Never fail whole batch because of one bad line
 */

import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Clock, MapPin, Check, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useCreateEngagement } from '@/hooks/useEngagements';

interface BulkStopsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  defaultDate: string; // ISO date for new stops
}

interface ParsedStop {
  id: string;
  title: string;
  location: string;
  timeHint: string | null; // e.g., "09:30" or null
  timeIsEstimated: boolean; // v2.1.3: true if time was defaulted
  rawLine: string;
  parseError?: string;
}

// Time patterns to detect trailing times
const TIME_PATTERNS = [
  // 12-hour format: 9:30 AM, 9:30AM, 9:30 am, etc.
  /\b(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)\s*$/i,
  // 24-hour format: 14:00, 09:30, etc.
  /\b(\d{1,2}):(\d{2})\s*$/,
  // Hour only with AM/PM: 9 AM, 9AM, etc.
  /\b(\d{1,2})\s*(am|pm|AM|PM)\s*$/i,
];

/**
 * Parse a single line into a stop object
 */
function parseLine(line: string, index: number): ParsedStop {
  const rawLine = line.trim();
  const id = `bulk-${index}-${Date.now()}`;
  
  if (!rawLine) {
    return {
      id,
      title: '',
      location: '',
      timeHint: null,
      timeIsEstimated: true,
      rawLine,
      parseError: 'Empty line',
    };
  }
  
  let workingText = rawLine;
  let timeHint: string | null = null;
  
  // Try to extract trailing time
  for (const pattern of TIME_PATTERNS) {
    const match = workingText.match(pattern);
    if (match) {
      // Parse the matched time into HH:MM format
      if (match[3]) {
        // 12-hour format with AM/PM
        let hours = parseInt(match[1], 10);
        const minutes = match[2] ? match[2] : '00';
        const isPM = match[3]?.toLowerCase() === 'pm' || match[2]?.toLowerCase() === 'pm';
        
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        timeHint = `${hours.toString().padStart(2, '0')}:${minutes}`;
      } else if (match[2]) {
        // 24-hour format HH:MM
        const hours = parseInt(match[1], 10);
        timeHint = `${hours.toString().padStart(2, '0')}:${match[2]}`;
      }
      
      // Remove time from working text
      workingText = workingText.replace(pattern, '').trim();
      break;
    }
  }
  
  // Split on first separator (- or ,)
  let title = workingText;
  let location = '';
  
  const separatorIndex = Math.min(
    workingText.indexOf('-') >= 0 ? workingText.indexOf('-') : Infinity,
    workingText.indexOf(',') >= 0 ? workingText.indexOf(',') : Infinity
  );
  
  if (separatorIndex !== Infinity) {
    title = workingText.slice(0, separatorIndex).trim();
    location = workingText.slice(separatorIndex + 1).trim();
  }
  
  // v2.1.3: Track if time was found or will be estimated
  const timeIsEstimated = timeHint === null;
  
  return {
    id,
    title: title || rawLine, // Fallback to full line if no title extracted
    location,
    timeHint,
    timeIsEstimated,
    rawLine,
  };
}

/**
 * Parse multiline text into stop objects
 */
function parseStopsText(text: string): ParsedStop[] {
  const lines = text.split('\n');
  return lines
    .map((line, index) => parseLine(line, index))
    .filter(stop => stop.title.length > 0); // Filter out empty lines
}

/**
 * Format time hint for display
 */
function formatTimeHint(timeHint: string | null): string {
  if (!timeHint) return '--:--';
  
  const [hours, minutes] = timeHint.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0);
  return format(date, 'h:mm a');
}

export function BulkStopsDialog({ open, onOpenChange, tripId, defaultDate }: BulkStopsDialogProps) {
  const [inputText, setInputText] = useState('');
  const [parsedStops, setParsedStops] = useState<ParsedStop[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // v2.1.3: Track parse source for confidence indicators
  const [parseSource, setParseSource] = useState<'file' | 'text' | null>(null);
  
  const createStop = useCreateEngagement();
  
  const resetDialog = useCallback(() => {
    setInputText('');
    setParsedStops([]);
    setShowPreview(false);
    setIsCreating(false);
    setIsDragOver(false);
    setParseSource(null);
  }, []);
  
  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  }, [onOpenChange, resetDialog]);
  
  const handleParse = useCallback(() => {
    if (!inputText.trim()) {
      toast.error('Please enter stop information');
      return;
    }
    
    const stops = parseStopsText(inputText);
    
    if (stops.length === 0) {
      toast.error('No valid stops found');
      return;
    }
    
    setParsedStops(stops);
    setShowPreview(true);
    setParseSource('text');
  }, [inputText]);
  
  const handleRemoveStop = useCallback((id: string) => {
    setParsedStops(prev => prev.filter(s => s.id !== id));
  }, []);
  
  const handleConfirmAdd = useCallback(async () => {
    if (parsedStops.length === 0) {
      toast.error('No stops to add');
      return;
    }
    
    setIsCreating(true);
    let successCount = 0;
    let failCount = 0;
    
    // Create stops in order
    for (const stop of parsedStops) {
      try {
        const startTime = stop.timeHint ? `${stop.timeHint}:00` : '09:00:00';
        
        await createStop.mutateAsync({
          trip_id: tripId,
          name: stop.title,
          date: defaultDate,
          start_time: startTime,
          end_time: null,
          location: stop.location || null,
          notes: null,
        });
        successCount++;
      } catch (error) {
        console.error('Error creating stop:', error);
        failCount++;
      }
    }
    
    if (failCount === 0) {
      toast.success(`Added ${successCount} stop${successCount !== 1 ? 's' : ''}`, {
        description: 'You can edit times, names, or locations after import.',
        duration: 5000,
      });
    } else if (successCount > 0) {
      toast.warning(`Added ${successCount} stop${successCount !== 1 ? 's' : ''}, ${failCount} failed`);
    } else {
      toast.error('Failed to add stops');
    }
    
    handleClose(false);
  }, [parsedStops, tripId, defaultDate, createStop, handleClose]);
  
  // File handling
  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
      toast.error('Please drop a .txt file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputText(text);
      // Auto-parse after file load
      const stops = parseStopsText(text);
      if (stops.length > 0) {
        setParsedStops(stops);
        setShowPreview(true);
        setParseSource('file');
        toast.success(`Parsed ${stops.length} stop${stops.length !== 1 ? 's' : ''} from file`);
      }
    };
    reader.readAsText(file);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Add Stops</DialogTitle>
          <DialogDescription>
            Paste multiple stops or drag a .txt file. One stop per line.
          </DialogDescription>
        </DialogHeader>
        
        {!showPreview ? (
          <div className="space-y-4">
            {/* Drop zone / input area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="w-4 h-4" />
                  <span>Paste text below or drop a .txt file</span>
                </div>
                
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Client meeting - 123 Main St, 9:30 AM
Office visit, Downtown HQ 2:00 PM
Lunch with team - Cafe Rio
Conference call 3:30 PM`}
                  rows={8}
                  className="resize-none font-mono text-sm"
                />
                
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Browse .txt file
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,text/plain"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
              </div>
            </div>
            
            {/* Parsing hint */}
            <Alert className="bg-muted/50 border-muted-foreground/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Format:</strong> Title - Location, Time<br />
                Times like "9:30 AM" or "14:00" are detected automatically.
              </AlertDescription>
            </Alert>
            
            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleParse}
                disabled={!inputText.trim()}
                className="bg-gradient-ocean hover:opacity-90"
              >
                Preview Stops
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            {/* Preview header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{parsedStops.length} stop{parsedStops.length !== 1 ? 's' : ''}</Badge>
                <span className="text-sm text-muted-foreground">
                  for {format(new Date(defaultDate), 'MMM d, yyyy')}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                Edit text
              </Button>
            </div>
            
            {/* v2.1.3: Parsed-from indicator */}
            {parseSource && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="w-3 h-3" />
                <span>Parsed from {parseSource === 'file' ? 'file' : 'pasted text'}</span>
              </div>
            )}
            
            {/* Parsed stops list */}
            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-2">
                {parsedStops.map((stop) => (
                  <Card key={stop.id} className="border-muted">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{stop.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {stop.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{stop.location}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeHint(stop.timeHint)}
                              {/* v2.1.3: Time confidence hint */}
                              {stop.timeIsEstimated && (
                                <span className="text-muted-foreground/70">(estimated)</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveStop(stop.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            
            {/* Confirm actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAdd}
                disabled={parsedStops.length === 0 || isCreating}
                className="bg-gradient-ocean hover:opacity-90"
              >
                {isCreating ? (
                  'Adding...'
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Add {parsedStops.length} Stop{parsedStops.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
