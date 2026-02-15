/**
 * v3.8.5: Client-Side Photo OCR for Tour Stop Import
 * 
 * Uses Tesseract.js for free, in-memory OCR. No storage, no external AI.
 * Images are processed entirely client-side and never uploaded.
 */

import { createWorker, OEM } from 'tesseract.js';
import { TourImportItem } from './types';
import { parseEmailToItems } from './emailParse';

// ============================================================================
// PUBLIC API
// ============================================================================

export interface OcrProgress {
  status: string;
  progress: number;
}

/**
 * Parse a photo/image file into TourImportItems via OCR.
 * 
 * Flow: Image → Tesseract OCR → extracted text → emailParse (line-by-line)
 * 
 * @param file - Image file (JPEG, PNG, etc.)
 * @param onProgress - Optional progress callback
 * @returns Parsed items with source = PHOTO_OCR
 */
export async function parsePhotoToItems(
  file: File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<TourImportItem[]> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  
  try {
    onProgress?.({ status: 'Initializing OCR engine...', progress: 0.1 });
    
    worker = await createWorker('eng', OEM.DEFAULT, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress?.({ 
            status: 'Reading text from image...', 
            progress: 0.2 + (m.progress * 0.6),
          });
        }
      },
    });

    onProgress?.({ status: 'Processing image...', progress: 0.3 });
    
    // Read image as data URL (in-memory, no upload)
    const imageData = await fileToDataURL(file);
    
    const { data } = await worker.recognize(imageData);
    
    onProgress?.({ status: 'Parsing extracted text...', progress: 0.85 });
    
    const extractedText = data.text?.trim();
    if (!extractedText) {
      return [];
    }
    
    // Reuse email parser on OCR text (same line-by-line logic)
    const items = parseEmailToItems(extractedText);
    
    // Override source to PHOTO_OCR and slightly lower confidence
    return items.map(item => ({
      ...item,
      source: 'PHOTO_OCR' as const,
      confidence: Math.max(0, item.confidence - 0.1),
    }));
    
  } finally {
    if (worker) {
      await worker.terminate();
    }
    onProgress?.({ status: 'Done', progress: 1.0 });
  }
}

// ============================================================================
// INTERNAL
// ============================================================================

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
