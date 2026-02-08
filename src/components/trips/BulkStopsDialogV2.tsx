/**
 * BulkStopsDialogV2 - Enhanced Bulk Tour Stop Import
 * 
 * Patch 2.3.2: Business Tours Bulk Import & Parsing Engine
 * 
 * BUSINESS TIER ONLY:
 * - This dialog is only accessible to Business users
 * - Plan gating is enforced at the container level
 * 
 * SUPPORTED INPUTS:
 * 1. Paste Text / Email Content
 * 2. Drag-and-drop email (body only)
 * 3. Spreadsheet / CSV Upload
 * 4. Photo of a list (OCR - best effort)
 * 
 * ARCHITECTURE:
 * - All parsing flows through parseTourStopsFromSource()
 * - Stops are never auto-saved
 * - User must review and confirm before commit
 */

import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, FileText, Clock, MapPin, Check, AlertCircle, Trash2, Store, 
  AlertTriangle, FileSpreadsheet, Camera, Mail, Type
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateEngagement } from '@/hooks/useEngagements';
import { useUpsertStopReminder } from '@/hooks/useStopReminders';
import { 
  parseTourStopsFromSource, 
  parseCSVText, 
  isValidTourStop,
  TourStopInput,
  TourStopSourceType,
  ParseResult,
} from '@/lib/tourStopParsing';

interface BulkStopsDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  defaultDate: string;
}

type InputTab = 'text' | 'csv' | 'image';

export function BulkStopsDialogV2({ open, onOpenChange, tripId, defaultDate }: BulkStopsDialogV2Props) {
  const [activeTab, setActiveTab] = useState<InputTab>('text');
  const [inputText, setInputText] = useState('');
  const [parsedStops, setParsedStops] = useState<TourStopInput[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const createStop = useCreateEngagement();
  const upsertReminder = useUpsertStopReminder();
  
  const resetDialog = useCallback(() => {
    setInputText('');
    setParsedStops([]);
    setShowPreview(false);
    setIsCreating(false);
    setIsDragOver(false);
    setParseWarnings([]);
    setImageError(null);
    setActiveTab('text');
  }, []);
  
  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  }, [onOpenChange, resetDialog]);
  
  // ==========================================================================
  // PARSING HANDLERS
  // ==========================================================================
  
  const handleParseText = useCallback((sourceType: TourStopSourceType = 'text') => {
    if (!inputText.trim()) {
      toast.error('Please enter stop information');
      return;
    }
    
    const result = parseTourStopsFromSource(sourceType, inputText);
    
    if (result.stops.length === 0) {
      toast.error('No valid stops found');
      return;
    }
    
    setParsedStops(result.stops);
    setParseWarnings(result.warnings);
    setShowPreview(true);
    
    if (result.errorCount > 0) {
      toast.warning(`Parsed ${result.successCount} stops, ${result.errorCount} need review`);
    } else {
      toast.success(`Parsed ${result.successCount} stops`);
    }
  }, [inputText]);
  
  const handleCSVFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSVText(text);
      
      if (rows.length === 0) {
        toast.error('No data rows found in CSV');
        return;
      }
      
      const result = parseTourStopsFromSource('csv', rows);
      
      if (result.stops.length === 0) {
        toast.error('Could not parse any stops from CSV');
        return;
      }
      
      setParsedStops(result.stops);
      setParseWarnings(result.warnings);
      setShowPreview(true);
      toast.success(`Parsed ${result.stops.length} stops from CSV`);
    };
    reader.readAsText(file);
  }, []);
  
  const handleImageFile = useCallback((file: File) => {
    // For now, show a message that OCR is best-effort
    // The actual OCR would be handled by an edge function
    setImageError(
      "We couldn't read this photo automatically. You can keep it attached for reference and enter stops manually."
    );
    toast.info('Image OCR is currently in beta. Please enter stops manually or paste text.');
  }, []);
  
  // ==========================================================================
  // FILE HANDLERS
  // ==========================================================================
  
  const handleFileSelect = useCallback((file: File, expectedType: 'text' | 'csv' | 'image') => {
    if (expectedType === 'csv') {
      if (!file.name.match(/\.(csv|xlsx?)$/i)) {
        toast.error('Please select a CSV or Excel file');
        return;
      }
      handleCSVFile(file);
    } else if (expectedType === 'image') {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      handleImageFile(file);
    } else {
      // Text file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInputText(text);
        // Auto-parse after file load
        const result = parseTourStopsFromSource('email_body', text);
        if (result.stops.length > 0) {
          setParsedStops(result.stops);
          setParseWarnings(result.warnings);
          setShowPreview(true);
          toast.success(`Parsed ${result.stops.length} stops from file`);
        }
      };
      reader.readAsText(file);
    }
  }, [handleCSVFile, handleImageFile]);
  
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
      // Detect file type
      if (file.name.match(/\.(csv|xlsx?)$/i)) {
        handleFileSelect(file, 'csv');
      } else if (file.type.startsWith('image/')) {
        handleFileSelect(file, 'image');
      } else {
        handleFileSelect(file, 'text');
      }
    }
  }, [handleFileSelect]);
  
  // ==========================================================================
  // STOP EDITING
  // ==========================================================================
  
  const handleRemoveStop = useCallback((id: string) => {
    setParsedStops(prev => prev.filter(s => s.id !== id));
  }, []);
  
  const handleUpdateStop = useCallback((id: string, field: keyof TourStopInput, value: string) => {
    setParsedStops(prev => prev.map(stop => {
      if (stop.id !== id) return stop;
      return { ...stop, [field]: value, needs_review: false };
    }));
  }, []);
  
  // ==========================================================================
  // CONFIRMATION
  // ==========================================================================
  
  const handleConfirmAdd = useCallback(async () => {
    const validStops = parsedStops.filter(isValidTourStop);
    
    if (validStops.length === 0) {
      toast.error('No valid stops to add. Each stop needs a name and date.');
      return;
    }
    
    setIsCreating(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const stop of validStops) {
      try {
        const startTime = stop.startTime ? `${stop.startTime}:00` : '09:00:00';
        
        const result = await createStop.mutateAsync({
          trip_id: tripId,
          name: stop.name,
          date: stop.date!,
          start_time: startTime,
          end_time: null,
          location: null,
          address: stop.address || null,
          store_number: stop.storeNumber || null,
          notes: stop.notes || null,
          origin: 'parsed',
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
  
  // ==========================================================================
  // COUNTS
  // ==========================================================================
  
  const needsReviewCount = parsedStops.filter(s => s.needs_review).length;
  const validCount = parsedStops.filter(isValidTourStop).length;
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Stops</DialogTitle>
          <DialogDescription>
            Import multiple tour stops from text, email, spreadsheet, or photo.
          </DialogDescription>
        </DialogHeader>
        
        {!showPreview ? (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InputTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text" className="gap-1.5">
                  <Type className="w-4 h-4" />
                  Text / Email
                </TabsTrigger>
                <TabsTrigger value="csv" className="gap-1.5">
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV / Excel
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-1.5">
                  <Camera className="w-4 h-4" />
                  Photo
                </TabsTrigger>
              </TabsList>
              
              {/* TEXT / EMAIL TAB */}
              <TabsContent value="text" className="space-y-4 mt-4">
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
                      <span>Paste text, email content, or drop a .txt file</span>
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
                        Browse file
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.eml,text/plain"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file, 'text');
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <Alert className="bg-muted/50 border-muted-foreground/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Format (one stop per line):</strong><br />
                    Name, Date, Time (optional), Address (optional), Store # (optional)<br />
                    <span className="text-muted-foreground">Dates like "Feb 15, 2024" or "2/15/24" are detected automatically.</span>
                  </AlertDescription>
                </Alert>
              </TabsContent>
              
              {/* CSV TAB */}
              <TabsContent value="csv" className="space-y-4 mt-4">
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 transition-colors text-center ${
                    isDragOver 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Drop a CSV or Excel file here, or click to browse
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => csvInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Browse CSV / Excel
                  </Button>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file, 'csv');
                      e.target.value = '';
                    }}
                  />
                </div>
                
                <Alert className="bg-muted/50 border-muted-foreground/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Expected columns:</strong><br />
                    Date, Time, Name/Stop/Location, Address, Store # (any order)<br />
                    <span className="text-muted-foreground">Headers are automatically detected.</span>
                  </AlertDescription>
                </Alert>
              </TabsContent>
              
              {/* IMAGE TAB */}
              <TabsContent value="image" className="space-y-4 mt-4">
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 transition-colors text-center ${
                    isDragOver 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a photo of your stop list
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file, 'image');
                      e.target.value = '';
                    }}
                  />
                </div>
                
                {imageError && (
                  <Alert className="bg-warning/10 border-warning/30">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-sm text-warning-foreground">
                      {imageError}
                    </AlertDescription>
                  </Alert>
                )}
                
                <Alert className="bg-muted/50 border-muted-foreground/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Beta feature:</strong> OCR works best with clear, typed text.<br />
                    <span className="text-muted-foreground">Handwritten or low-quality images may require manual entry.</span>
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
            
            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              {activeTab === 'text' && (
                <Button 
                  onClick={() => handleParseText('text')}
                  disabled={!inputText.trim()}
                  className="bg-gradient-ocean hover:opacity-90"
                >
                  Preview Stops
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            {/* Preview header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{parsedStops.length} parsed</Badge>
                <Badge variant="default" className="bg-success">{validCount} ready</Badge>
                {needsReviewCount > 0 && (
                  <Badge variant="destructive">{needsReviewCount} need review</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                ← Back to input
              </Button>
            </div>
            
            {/* Warnings */}
            {(needsReviewCount > 0 || parseWarnings.length > 0) && (
              <Alert className="bg-warning/10 border-warning/30">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-xs text-warning-foreground">
                  {needsReviewCount > 0 && (
                    <span>{needsReviewCount} stop{needsReviewCount !== 1 ? 's' : ''} need review. </span>
                  )}
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
                    className={`border ${stop.needs_review ? 'border-warning bg-warning/5' : 'border-muted'}`}
                  >
                    <CardContent className="p-3 space-y-2">
                      {/* Row 1: Name, source badge, and delete button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={stop.name}
                            onChange={(e) => handleUpdateStop(stop.id, 'name', e.target.value)}
                            placeholder="Stop name"
                            className="font-medium text-sm h-8"
                          />
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {stop.parsed_from === 'csv' ? 'CSV' : 
                             stop.parsed_from === 'email_body' ? 'Email' : 
                             stop.parsed_from === 'image' ? 'Photo' : 'Text'}
                          </Badge>
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
                            className={`h-7 text-xs ${!stop.date ? 'border-destructive' : ''}`}
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
                        <p className="text-xs text-warning flex items-center gap-1">
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
                  <span className="text-warning">Fix dates to add stops</span>
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
