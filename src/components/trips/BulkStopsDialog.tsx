/**
 * BulkStopsDialog - Bulk Tour Stop Ingestion
 * 
 * v2.1.26: Enhanced parsing with date, address, store number extraction
 * - Parses dates from each line (required)
 * - Extracts times, addresses, store numbers
 * - Inline editing in preview mode
 * - Origin tracking (parsed vs manual)
 * 
 * v2.0.9: Original bulk import functionality
 */

import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Clock, MapPin, Check, AlertCircle, Trash2, Store, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useCreateEngagement } from '@/hooks/useEngagements';
import { useUpsertStopReminder } from '@/hooks/useStopReminders';
import { parseStopsFromText, ParsedStopResult, formatTimeForDisplay } from '@/lib/stopParsing';

interface BulkStopsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  defaultDate: string; // ISO date fallback for stops without dates
}

export function BulkStopsDialog({ open, onOpenChange, tripId, defaultDate }: BulkStopsDialogProps) {
  const [inputText, setInputText] = useState('');
  const [parsedStops, setParsedStops] = useState<ParsedStopResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createStop = useCreateEngagement();
  const upsertReminder = useUpsertStopReminder();
  
  const resetDialog = useCallback(() => {
    setInputText('');
    setParsedStops([]);
    setShowPreview(false);
    setIsCreating(false);
    setIsDragOver(false);
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
    
    const stops = parseStopsFromText(inputText);
    
    if (stops.length === 0) {
      toast.error('No valid stops found');
      return;
    }
    
    setParsedStops(stops);
    setShowPreview(true);
  }, [inputText]);
  
  const handleRemoveStop = useCallback((id: string) => {
    setParsedStops(prev => prev.filter(s => s.id !== id));
  }, []);
  
  // Update a parsed stop field
  const handleUpdateStop = useCallback((id: string, field: keyof ParsedStopResult, value: string) => {
    setParsedStops(prev => prev.map(stop => {
      if (stop.id !== id) return stop;
      return { ...stop, [field]: value, needsReview: false };
    }));
  }, []);
  
  const handleConfirmAdd = useCallback(async () => {
    // Filter out stops without required fields
    const validStops = parsedStops.filter(stop => stop.name && stop.date);
    
    if (validStops.length === 0) {
      toast.error('No valid stops to add. Each stop needs a name and date.');
      return;
    }
    
    setIsCreating(true);
    let successCount = 0;
    let failCount = 0;
    
    // Create stops in order
    for (const stop of validStops) {
      try {
        const startTime = stop.startTime ? `${stop.startTime}:00` : '09:00:00';
        
        const result = await createStop.mutateAsync({
          trip_id: tripId,
          name: stop.name,
          date: stop.date!,
          start_time: startTime,
          end_time: null,
          location: null, // Legacy field, use address instead
          address: stop.address || null,
          store_number: stop.storeNumber || null,
          notes: stop.notes || null,
          origin: 'parsed', // Mark as parsed from bulk import
        });
        
        // Create reminder if stop has an explicit time
        if (stop.startTime && result) {
          try {
            await upsertReminder.mutateAsync({
              engagementId: result.id,
              tripId: tripId,
              date: stop.date!,
              startTime: startTime,
            });
          } catch (reminderError) {
            console.warn('Failed to create reminder for stop:', reminderError);
            // Don't fail the whole operation for a reminder
          }
        }
        
        successCount++;
      } catch (error) {
        console.error('Error creating stop:', error);
        failCount++;
      }
    }
    
    const skippedCount = parsedStops.length - validStops.length;
    
    if (failCount === 0 && skippedCount === 0) {
      toast.success(`Added ${successCount} stop${successCount !== 1 ? 's' : ''}`, {
        description: 'Reminders set for stops with times.',
        duration: 5000,
      });
    } else if (successCount > 0) {
      let message = `Added ${successCount} stop${successCount !== 1 ? 's' : ''}`;
      if (failCount > 0) message += `, ${failCount} failed`;
      if (skippedCount > 0) message += `, ${skippedCount} skipped (missing date)`;
      toast.warning(message);
    } else {
      toast.error('Failed to add stops');
    }
    
    handleClose(false);
  }, [parsedStops, tripId, createStop, upsertReminder, handleClose]);
  
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
      const stops = parseStopsFromText(text);
      if (stops.length > 0) {
        setParsedStops(stops);
        setShowPreview(true);
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
  
  // Count stops that need review
  const needsReviewCount = parsedStops.filter(s => s.needsReview).length;
  const validCount = parsedStops.filter(s => s.name && s.date).length;
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Add Stops</DialogTitle>
          <DialogDescription>
            Paste multiple stops or drag a .txt file. Include date, time, and address for each stop.
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
                  placeholder={`Meeting with Client A, Feb 15 2024, 9:30 AM, 123 Main St, Denver CO 80202
Walmart Store #4532, 2/16/24, 10:00 AM, 456 Oak Ave, Aurora CO
Lunch downtown, February 17, 2024, 12:30 PM
Office visit - 789 Business Blvd, Suite 100`}
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
                <strong>Format (one stop per line):</strong><br />
                Name, Date, Time (optional), Address (optional), Store # (optional)<br />
                <span className="text-muted-foreground">Dates like "Feb 15, 2024" or "2/15/24" are detected automatically.</span>
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{parsedStops.length} parsed</Badge>
                <Badge variant="default" className="bg-green-600">{validCount} ready</Badge>
                {needsReviewCount > 0 && (
                  <Badge variant="destructive">{needsReviewCount} need review</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                Edit text
              </Button>
            </div>
            
            {/* Warning for stops needing review */}
            {needsReviewCount > 0 && (
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700">
                  {needsReviewCount} stop{needsReviewCount !== 1 ? 's' : ''} couldn't be fully parsed. 
                  Edit the fields below or they will be skipped.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Parsed stops list - editable */}
            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-3">
                {parsedStops.map((stop) => (
                  <Card 
                    key={stop.id} 
                    className={`border ${stop.needsReview ? 'border-amber-400 bg-amber-50/30' : 'border-muted'}`}
                  >
                    <CardContent className="p-3 space-y-2">
                      {/* Row 1: Name and delete button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Input
                            value={stop.name}
                            onChange={(e) => handleUpdateStop(stop.id, 'name', e.target.value)}
                            placeholder="Stop name"
                            className="font-medium text-sm h-8"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemoveStop(stop.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Row 2: Date, Time, Store # */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Date *</Label>
                          <Input
                            type="date"
                            value={stop.date || ''}
                            onChange={(e) => handleUpdateStop(stop.id, 'date', e.target.value)}
                            className={`h-7 text-xs ${!stop.date ? 'border-red-400' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Time</Label>
                          <Input
                            type="time"
                            value={stop.startTime || ''}
                            onChange={(e) => handleUpdateStop(stop.id, 'startTime', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Store #</Label>
                          <Input
                            value={stop.storeNumber || ''}
                            onChange={(e) => handleUpdateStop(stop.id, 'storeNumber', e.target.value)}
                            placeholder="#1234"
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                      
                      {/* Row 3: Address */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Address</Label>
                        <Input
                          value={stop.address || ''}
                          onChange={(e) => handleUpdateStop(stop.id, 'address', e.target.value)}
                          placeholder="Street, City, State ZIP"
                          className="h-7 text-xs"
                        />
                      </div>
                      
                      {/* Parse error hint */}
                      {stop.parseError && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {stop.parseError}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            
            {/* Confirm actions */}
            <div className="flex justify-between items-center gap-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {validCount > 0 ? (
                  <>Stops with times get 1-hour reminders</>
                ) : (
                  <span className="text-amber-600">Fix dates to add stops</span>
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAdd}
                  disabled={validCount === 0 || isCreating}
                  className="bg-gradient-ocean hover:opacity-90"
                >
                  {isCreating ? (
                    'Adding...'
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Add {validCount} Stop{validCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
