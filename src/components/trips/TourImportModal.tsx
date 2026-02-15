/**
 * v3.8.5: Tour Import Modal
 * 
 * 3-tab intake: Photo, Email/Text, Spreadsheet
 * Parses input → review items → confirm to create stops.
 */

import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Camera, Mail, FileSpreadsheet, Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TourImportItem } from '@/lib/tours/import/types';
import { parseEmailToItems } from '@/lib/tours/import/emailParse';
import { parseSheetToItems } from '@/lib/tours/import/sheetParse';
import { parsePhotoToItems, OcrProgress } from '@/lib/tours/import/photoOcr';
import { validateItems } from '@/lib/tours/import/validate';
import { TourImportReview } from './TourImportReview';

interface TourImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
}

type InputTab = 'photo' | 'email' | 'spreadsheet';

export function TourImportModal({ open, onOpenChange, tripId }: TourImportModalProps) {
  const [activeTab, setActiveTab] = useState<InputTab>('email');
  const [inputText, setInputText] = useState('');
  const [items, setItems] = useState<TourImportItem[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const emlInputRef = useRef<HTMLInputElement>(null);

  const resetModal = useCallback(() => {
    setInputText('');
    setItems([]);
    setShowReview(false);
    setIsParsing(false);
    setOcrProgress(null);
    setActiveTab('email');
  }, []);

  const handleClose = useCallback((open: boolean) => {
    if (!open) resetModal();
    onOpenChange(open);
  }, [onOpenChange, resetModal]);

  // ========================================================================
  // PARSE HANDLERS
  // ========================================================================

  const handleParseText = useCallback(() => {
    if (!inputText.trim()) {
      toast.error('Please enter stop information');
      return;
    }
    const parsed = parseEmailToItems(inputText);
    if (parsed.length === 0) {
      toast.error('No stops could be extracted from the text');
      return;
    }
    const validated = validateItems(parsed);
    setItems(validated);
    setShowReview(true);
    toast.success(`Extracted ${parsed.length} stop(s) for review`);
  }, [inputText]);

  const handleEmlFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputText(text);
      const parsed = parseEmailToItems(text);
      if (parsed.length > 0) {
        setItems(validateItems(parsed));
        setShowReview(true);
        toast.success(`Extracted ${parsed.length} stop(s) from file`);
      } else {
        toast.error('No stops found in the file');
      }
    };
    reader.readAsText(file);
  }, []);

  const handlePhotoFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setIsParsing(true);
    setOcrProgress({ status: 'Starting...', progress: 0 });
    try {
      const parsed = await parsePhotoToItems(file, setOcrProgress);
      if (parsed.length === 0) {
        toast.error('Could not extract any stops from the image. Try pasting the text instead.');
        return;
      }
      setItems(validateItems(parsed));
      setShowReview(true);
      toast.success(`Extracted ${parsed.length} stop(s) from photo`);
    } catch {
      toast.error('OCR failed. Please try pasting the text manually.');
    } finally {
      setIsParsing(false);
      setOcrProgress(null);
    }
  }, []);

  const handleSheetFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(csv|xlsx?)$/i)) {
      toast.error('Please select a CSV or Excel file');
      return;
    }
    setIsParsing(true);
    try {
      const parsed = await parseSheetToItems(file);
      if (parsed.length === 0) {
        toast.error('No stops found in the spreadsheet');
        return;
      }
      setItems(validateItems(parsed));
      setShowReview(true);
      toast.success(`Extracted ${parsed.length} stop(s) from spreadsheet`);
    } catch {
      toast.error('Failed to read the spreadsheet file');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleImportComplete = useCallback(() => {
    handleClose(false);
  }, [handleClose]);

  // ========================================================================
  // RENDER
  // ========================================================================

  if (showReview) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Review Import</DialogTitle>
            <DialogDescription>
              Review and fix any issues before importing stops.
            </DialogDescription>
          </DialogHeader>
          <TourImportReview
            items={items}
            onItemsChange={setItems}
            tripId={tripId}
            onComplete={handleImportComplete}
            onBack={() => setShowReview(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Tour Stops</DialogTitle>
          <DialogDescription>
            Upload a photo, paste text, or import a spreadsheet to add tour stops.
          </DialogDescription>
        </DialogHeader>

        {isParsing && ocrProgress && (
          <div className="space-y-2 py-4">
            <p className="text-sm text-muted-foreground">{ocrProgress.status}</p>
            <Progress value={ocrProgress.progress * 100} className="h-2" />
          </div>
        )}

        {isParsing && !ocrProgress && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Processing file...</span>
          </div>
        )}

        {!isParsing && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InputTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="photo" className="gap-1.5">
                <Camera className="w-4 h-4" />
                Photo
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5">
                <Mail className="w-4 h-4" />
                Email / Text
              </TabsTrigger>
              <TabsTrigger value="spreadsheet" className="gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                Spreadsheet
              </TabsTrigger>
            </TabsList>

            {/* PHOTO TAB */}
            <TabsContent value="photo" className="space-y-4 mt-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onClick={() => photoInputRef.current?.click()}
              >
                <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Upload a photo of your tour schedule or itinerary
                </p>
                <p className="text-xs text-muted-foreground">
                  OCR will extract text — best with clear, typed text
                </p>
                <Button variant="outline" size="sm" className="mt-4">
                  <Upload className="w-4 h-4 mr-2" />
                  Select Photo
                </Button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
              <Alert className="bg-muted/50 border-muted-foreground/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Photos are processed in your browser and never uploaded to any server.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* EMAIL / TEXT TAB */}
            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Paste tour stop info, one per line:\n\nClient meeting, Feb 15 2025, 9:30 AM, Denver CO\nSite visit, 2/16/25, Atlanta GA\nLunch downtown, February 17 2025`}
                  rows={8}
                  className="resize-none font-mono text-sm"
                />
                <div className="flex items-center gap-2">
                  <Button onClick={handleParseText} disabled={!inputText.trim()}>
                    Parse Text
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => emlInputRef.current?.click()}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Upload .eml / .txt
                  </Button>
                  <input
                    ref={emlInputRef}
                    type="file"
                    accept=".txt,.eml,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleEmlFile(file);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
              <Alert className="bg-muted/50 border-muted-foreground/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Format:</strong> Name, Date, Time (optional), Location — one stop per line.
                  Dates and times are auto-detected. No times are invented.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* SPREADSHEET TAB */}
            <TabsContent value="spreadsheet" className="space-y-4 mt-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onClick={() => sheetInputRef.current?.click()}
              >
                <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Upload a CSV or Excel file with tour stops
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Upload className="w-4 h-4 mr-2" />
                  Browse File
                </Button>
                <input
                  ref={sheetInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSheetFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
              <Alert className="bg-muted/50 border-muted-foreground/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Supported columns:</strong> date (required), time, title/name, venue, city, state/region, country, address, location, notes.
                  Headers are detected automatically.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
