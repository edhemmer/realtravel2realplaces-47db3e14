/**
 * DropzoneIntake — Production-grade multi-file drag/drop + text intake.
 * Supports: PDFs, images (PNG/JPG/WEBP), .eml files, plain text drops.
 * Clickable fallback for mobile. Multi-file queue with per-item status.
 * 
 * v4.0: Max 5 files per batch with friendly messaging and batch summary.
 */
import { useCallback, useState, useRef } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, Loader2, FileText, Image, Mail, CheckCircle2, XCircle, AlertCircle, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { isEmailFile, extractEmailBody } from '@/lib/emailBody';
import { supabase } from '@/integrations/supabase/client';

// ── Types ──────────────────────────────────────────────────

export type IntakeItemStatus = 'queued' | 'parsing' | 'ready' | 'failed' | 'duplicate';

export interface IntakeItem {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'email' | 'text';
  status: IntakeItemStatus;
  error?: string;
}

/** Batch summary shown after all files are processed */
export interface BatchSummary {
  added: number;
  duplicateSkipped: number;
  failed: number;
  total: number;
}

interface DropzoneIntakeProps {
  /** Called with extracted text from files or drag-text to feed into the existing parse pipeline */
  onTextExtracted: (text: string) => Promise<void>;
  /** Whether parsing is already in progress (disables intake) */
  isParsing: boolean;
  /** Called when a queue processing starts */
  onProcessingStart?: () => void;
}

// ── Constants ──────────────────────────────────────────────

const MAX_BATCH_SIZE = 5;

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

// ── Helpers ────────────────────────────────────────────────

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
    case 'duplicate': return <SkipForward className="w-4 h-4 text-amber-500" />;
    case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
  }
}

function statusLabel(status: IntakeItemStatus): string {
  switch (status) {
    case 'queued': return 'Waiting';
    case 'parsing': return 'Processing';
    case 'ready': return 'Added';
    case 'duplicate': return 'Duplicate skipped';
    case 'failed': return "Couldn't detect trip details";
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
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const processingRef = useRef(false);
  /** Track content hashes for deduplication within a session */
  const processedHashesRef = useRef(new Set<string>());

  // Simple content hash for dedup
  const hashContent = (text: string): string => {
    let hash = 0;
    const str = text.trim().substring(0, 500); // Use first 500 chars for hash
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  };

  // ── Process a single file ──────────────────────────────
  const processFile = useCallback(async (file: File): Promise<string | null> => {
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
        return JSON.stringify(data.data);
      }
      throw new Error(data?.message || 'Could not extract booking from image');
    }

    // PDFs: read as text (best effort), or inform user
    if (fileType === 'pdf') {
      throw new Error('PDF parsing requires opening the file and pasting the text. Use "Paste Confirmation Text".');
    }

    throw new Error('Unsupported file type');
  }, []);

  // ── Process entire queue ───────────────────────────────
  const processQueue = useCallback(async (files: File[]) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setBatchSummary(null);
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

    const summary: BatchSummary = { added: 0, duplicateSkipped: 0, failed: 0, total: items.length };

    // Process sequentially
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'parsing' } : q));

      try {
        const text = await processFile(item.file);
        if (text && text.trim()) {
          // Deduplication check
          const contentHash = hashContent(text);
          if (processedHashesRef.current.has(contentHash)) {
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'duplicate' } : q));
            summary.duplicateSkipped++;
          } else {
            processedHashesRef.current.add(contentHash);
            // Send to parse pipeline immediately (sequential commit)
            await onTextExtracted(text.trim());
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'ready' } : q));
            summary.added++;
          }
        } else {
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: "Couldn't detect trip details" } : q));
          summary.failed++;
        }
      } catch (err: any) {
        console.error(`[Intake] Failed: ${item.name}`, err);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: "Couldn't detect trip details" } : q));
        summary.failed++;
      }
    }

    setBatchSummary(summary);
    processingRef.current = false;
    setIsProcessing(false);
  }, [processFile, onTextExtracted, onProcessingStart]);

  // ── Dropzone config ────────────────────────────────────
  const onDrop = useCallback(async (acceptedFiles: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      const reasons = rejections.map(r => `${r.file.name}: ${r.errors.map(e => e.message).join(', ')}`);
      toast.warning(`Some files were rejected: ${reasons.join('; ')}`);
    }
    if (acceptedFiles.length === 0) return;

    // Enforce batch limit
    let filesToProcess = acceptedFiles;
    if (acceptedFiles.length > MAX_BATCH_SIZE) {
      filesToProcess = acceptedFiles.slice(0, MAX_BATCH_SIZE);
      toast.info('You can upload up to 5 emails at a time.', { duration: 4000 });
    }

    await processQueue(filesToProcess);
  }, [processQueue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    disabled: isParsing || isProcessing,
    noClick: false,
    noKeyboard: false,
  });

  // Handle text drops (no files)
  const handleNativeDrop = useCallback(async (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) return;

    e.preventDefault();
    e.stopPropagation();

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

    toast.info('No usable content detected. Please copy the confirmation text and use "Paste Confirmation Text" below.', { duration: 5000 });
  }, [onTextExtracted]);

  const busy = isParsing || isProcessing;

  return (
    <div className="space-y-3">
      {/* v3.9.7: Confirmation-only guidance */}
      <p className="text-xs text-muted-foreground px-1">
        Upload confirmation emails only. Do not upload receipts, invoices, or credit card statements.
      </p>

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
              {isDragActive ? 'Drop to parse!' : 'Drop confirmation emails here or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground">
              Upload up to 5 email files (.eml) at once.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Each email is processed individually to keep your trip organized accurately.
            </p>
          </div>
        )}
      </div>

      {/* Queue display */}
      {queue.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {queue.filter(q => q.status === 'ready' || q.status === 'duplicate').length}/{queue.length} processed
          </p>
          {queue.map(item => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm border',
                item.status === 'failed' ? 'bg-destructive/5 border-destructive/20' :
                item.status === 'ready' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
                item.status === 'duplicate' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' :
                'bg-muted/30 border-border'
              )}
            >
              {fileIcon(item.type)}
              <span className="flex-1 truncate text-xs">{item.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{statusLabel(item.status)}</span>
              {statusIcon(item.status)}
            </div>
          ))}
        </div>
      )}

      {/* Batch summary */}
      {batchSummary && !isProcessing && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            {buildSummaryText(batchSummary)}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Summary builder ──────────────────────────────────────

function buildSummaryText(s: BatchSummary): string {
  const parts: string[] = [];
  if (s.added > 0) parts.push(`${s.added} item${s.added !== 1 ? 's' : ''} added`);
  if (s.duplicateSkipped > 0) parts.push(`${s.duplicateSkipped} duplicate${s.duplicateSkipped !== 1 ? 's' : ''} skipped`);
  if (s.failed > 0) parts.push(`${s.failed} email${s.failed !== 1 ? 's' : ''} couldn't be processed`);
  if (parts.length === 0) return 'No items were added.';
  return parts.join('\n');
}

// ── Utility ──────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
