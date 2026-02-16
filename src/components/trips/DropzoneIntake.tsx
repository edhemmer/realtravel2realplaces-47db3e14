/**
 * DropzoneIntake — Production-grade multi-file drag/drop + text intake.
 * Supports: PDFs, images (PNG/JPG/WEBP), .eml files, plain text drops.
 * Clickable fallback for mobile. Multi-file queue with per-item status.
 */
import { useCallback, useState, useRef } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, Loader2, FileText, Image, Mail, FileWarning, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { isEmailFile, extractEmailBody } from '@/lib/emailBody';
import { supabase } from '@/integrations/supabase/client';

// ── Types ──────────────────────────────────────────────────

export type IntakeItemStatus = 'queued' | 'parsing' | 'ready' | 'failed';

export interface IntakeItem {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'email' | 'text';
  status: IntakeItemStatus;
  error?: string;
}

interface DropzoneIntakeProps {
  /** Called with extracted text from files or drag-text to feed into the existing parse pipeline */
  onTextExtracted: (text: string) => Promise<void>;
  /** Whether parsing is already in progress (disables intake) */
  isParsing: boolean;
  /** Called when a queue processing starts */
  onProcessingStart?: () => void;
}

// ── Helpers ────────────────────────────────────────────────

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'message/rfc822': ['.eml'],
  'application/octet-stream': ['.eml', '.msg'],
  'text/plain': ['.txt', '.eml'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function fileIcon(type: IntakeItem['type']) {
  switch (type) {
    case 'email': return <Mail className="w-4 h-4" />;
    case 'image': return <Image className="w-4 h-4" />;
    case 'pdf': return <FileText className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
}

function statusIcon(status: IntakeItemStatus) {
  switch (status) {
    case 'queued': return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    case 'parsing': return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
    case 'ready': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
  }
}

function classifyFile(file: File): IntakeItem['type'] {
  if (isEmailFile(file.name)) return 'email';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return 'pdf';
  return 'text';
}

let itemCounter = 0;
function nextId() { return `intake-${++itemCounter}-${Date.now()}`; }

// ── Component ──────────────────────────────────────────────

export function DropzoneIntake({ onTextExtracted, isParsing, onProcessingStart }: DropzoneIntakeProps) {
  const [queue, setQueue] = useState<IntakeItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // ── Process a single file ──────────────────────────────
  const processFile = useCallback(async (file: File, item: IntakeItem): Promise<string | null> => {
    const fileType = classifyFile(file);

    // Email files: extract body text
    if (fileType === 'email') {
      const result = await extractEmailBody(file);
      if (result.success && result.body) return result.body;
      throw new Error(result.error || 'Could not read email file');
    }

    // Text files: read directly
    if (file.type === 'text/plain' || file.type === 'text/html' || file.name.endsWith('.txt')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const raw = e.target?.result as string;
          if (file.type === 'text/html') {
            const div = document.createElement('div');
            div.innerHTML = raw;
            resolve(div.textContent || div.innerText || '');
          } else {
            resolve(raw);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    }

    // Images: send to parse-booking-image as base64
    if (fileType === 'image') {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('parse-booking-image', {
        body: { image: base64, filename: file.name },
      });
      if (error) throw new Error('Image parsing failed');
      if (data?.success && data?.data) {
        // Return a text summary that the existing parse pipeline can use,
        // or return the raw parsed data stringified for the parent to handle
        return JSON.stringify(data.data);
      }
      throw new Error(data?.message || 'Could not extract booking from image');
    }

    // PDFs: read as text (best effort), or inform user
    if (fileType === 'pdf') {
      // PDFs can't be read as text in browser — inform user
      throw new Error('PDF parsing requires opening the file and pasting the text. Use "Paste Confirmation Text".');
    }

    throw new Error('Unsupported file type');
  }, []);

  // ── Process entire queue ───────────────────────────────
  const processQueue = useCallback(async (files: File[]) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    onProcessingStart?.();

    // Build queue items
    const items: (IntakeItem & { file: File })[] = files.map(f => ({
      id: nextId(),
      name: f.name,
      type: classifyFile(f),
      status: 'queued' as IntakeItemStatus,
      file: f,
    }));

    setQueue(items.map(({ file, ...rest }) => rest));
    toast.info(`Processing ${items.length} file(s)...`);

    const allTexts: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Update status to parsing
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'parsing' } : q));

      try {
        const text = await processFile(item.file, item);
        if (text && text.trim()) {
          allTexts.push(text.trim());
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'ready' } : q));
        } else {
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: 'No content extracted' } : q));
        }
      } catch (err: any) {
        console.error(`[Intake] Failed: ${item.name}`, err);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: err.message } : q));
      }
    }

    // Send all extracted text to parser
    if (allTexts.length > 0) {
      await onTextExtracted(allTexts.join('\n\n---\n\n'));
    } else {
      toast.warning('No usable content could be extracted from the dropped files.');
    }

    processingRef.current = false;
    setIsProcessing(false);
  }, [processFile, onTextExtracted, onProcessingStart]);

  // ── Dropzone config ────────────────────────────────────
  const onDrop = useCallback(async (acceptedFiles: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      const reasons = rejections.map(r => `${r.file.name}: ${r.errors.map(e => e.message).join(', ')}`);
      toast.warning(`Some files were rejected: ${reasons.join('; ')}`);
    }
    if (acceptedFiles.length > 0) {
      await processQueue(acceptedFiles);
    }
  }, [processQueue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    disabled: isParsing || isProcessing,
    noClick: false,
    noKeyboard: false,
    // Handle text drops that browsers provide
    onDropAccepted: undefined, // handled in onDrop
  });

  // We need to intercept drops that have NO files but DO have text
  const handleNativeDrop = useCallback(async (e: React.DragEvent) => {
    // If there are files, let react-dropzone handle it
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) return;

    e.preventDefault();
    e.stopPropagation();

    // Try text fallback
    const text = e.dataTransfer.getData('text/plain');
    if (text && text.trim().length > 10) {
      toast.info('Detected dropped text — parsing...');
      await onTextExtracted(text.trim());
      return;
    }

    const html = e.dataTransfer.getData('text/html');
    if (html) {
      const div = document.createElement('div');
      div.innerHTML = html;
      const extracted = (div.textContent || div.innerText || '').trim();
      if (extracted.length > 10) {
        toast.info('Detected dropped text — parsing...');
        await onTextExtracted(extracted);
        return;
      }
    }

    // Nothing usable
    toast.info('No usable content detected. Please copy the confirmation text and use "Paste Confirmation Text" below.', { duration: 5000 });
  }, [onTextExtracted]);

  const busy = isParsing || isProcessing;

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        onDropCapture={handleNativeDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 sm:p-8 transition-all duration-200 text-center cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          busy && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        {busy ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processing your confirmations...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className={cn(
              'w-8 h-8 transition-colors',
              isDragActive ? 'text-primary' : 'text-muted-foreground'
            )} />
            <p className="text-sm font-medium">
              {isDragActive ? 'Drop to parse!' : 'Drop files or tap to select'}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports .eml, images (PNG/JPG), and selected text
            </p>
          </div>
        )}
      </div>

      {/* Queue display */}
      {queue.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {queue.filter(q => q.status === 'ready').length}/{queue.length} processed
          </p>
          {queue.map(item => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm border',
                item.status === 'failed' ? 'bg-destructive/5 border-destructive/20' :
                item.status === 'ready' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
                'bg-muted/30 border-border'
              )}
            >
              {fileIcon(item.type)}
              <span className="flex-1 truncate text-xs">{item.name}</span>
              {statusIcon(item.status)}
              {item.error && (
                <span className="text-xs text-destructive truncate max-w-[120px]" title={item.error}>
                  {item.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Utility ──────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data:mime;base64, prefix
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
