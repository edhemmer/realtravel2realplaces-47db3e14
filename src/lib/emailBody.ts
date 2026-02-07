/**
 * Email Body Extraction Utility
 * 
 * v2.1.2: Centralized helper to extract the human-readable body text from email files.
 * Used by both Bulk Stops and Bookings ingestion pipelines.
 * 
 * Supports:
 * - .eml files (standard RFC 5322 MIME format)
 * - .msg files (simplified text extraction - no full Outlook parsing)
 * 
 * Rules:
 * - Extract only the main message body
 * - Ignore all attachments (PDFs, ICS, images, etc.)
 * - Return plain text suitable for AI parsing
 */

export interface EmailExtractionResult {
  success: boolean;
  body: string;
  error?: string;
}

/**
 * Check if a file is an email file based on extension
 */
export function isEmailFile(filename: string): boolean {
  const ext = filename.toLowerCase();
  return ext.endsWith('.eml') || ext.endsWith('.msg');
}

/**
 * Extract the human-readable body text from an email file.
 * Ignores attachments completely.
 * 
 * @param file - The email file (.eml or .msg)
 * @returns Promise resolving to extraction result
 */
export async function extractEmailBody(file: File): Promise<EmailExtractionResult> {
  const filename = file.name.toLowerCase();
  
  try {
    if (filename.endsWith('.eml')) {
      return await parseEmlFile(file);
    } else if (filename.endsWith('.msg')) {
      return await parseMsgFile(file);
    } else {
      return {
        success: false,
        body: '',
        error: 'Unsupported email format. Please use .eml or .msg files.',
      };
    }
  } catch (err) {
    console.error('Email extraction error:', err);
    return {
      success: false,
      body: '',
      error: 'This email format couldn\'t be read automatically. Please open it and copy/paste the confirmation text instead.',
    };
  }
}

/**
 * Parse an .eml file (RFC 5322 MIME format)
 * Extracts the text/plain or text/html body, ignoring attachments
 */
async function parseEmlFile(file: File): Promise<EmailExtractionResult> {
  const rawContent = await file.text();
  
  // Split headers from body (separated by double CRLF or LF)
  const headerBodySplit = rawContent.split(/\r?\n\r?\n/);
  
  if (headerBodySplit.length < 2) {
    return {
      success: false,
      body: '',
      error: 'Could not parse email structure.',
    };
  }
  
  const headers = headerBodySplit[0];
  const bodyContent = headerBodySplit.slice(1).join('\n\n');
  
  // Check Content-Type to determine if it's multipart
  const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n;]+)/i);
  const contentType = contentTypeMatch?.[1]?.toLowerCase() || 'text/plain';
  
  // Check for boundary in multipart emails
  const boundaryMatch = headers.match(/boundary=\"?([^\";\r\n]+)\"?/i);
  
  if (contentType.includes('multipart') && boundaryMatch) {
    // Multipart email - extract text parts only, skip attachments
    const boundary = boundaryMatch[1];
    const extractedBody = extractMultipartBody(bodyContent, boundary);
    
    if (extractedBody) {
      return {
        success: true,
        body: cleanEmailText(extractedBody),
      };
    }
  }
  
  // Check for quoted-printable or base64 encoding
  const transferEncodingMatch = headers.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
  const encoding = transferEncodingMatch?.[1]?.trim().toLowerCase();
  
  let decodedBody = bodyContent;
  
  if (encoding === 'quoted-printable') {
    decodedBody = decodeQuotedPrintable(bodyContent);
  } else if (encoding === 'base64') {
    try {
      decodedBody = atob(bodyContent.replace(/\s/g, ''));
    } catch {
      // If base64 decode fails, use raw content
      decodedBody = bodyContent;
    }
  }
  
  // If HTML, strip tags
  if (contentType.includes('text/html')) {
    decodedBody = stripHtmlTags(decodedBody);
  }
  
  return {
    success: true,
    body: cleanEmailText(decodedBody),
  };
}

/**
 * Extract body from multipart MIME content
 * Prioritizes text/plain, falls back to text/html, ignores attachments
 */
function extractMultipartBody(content: string, boundary: string): string | null {
  const boundaryMarker = `--${boundary}`;
  const parts = content.split(boundaryMarker);
  
  let textPlainBody: string | null = null;
  let textHtmlBody: string | null = null;
  
  for (const part of parts) {
    // Skip empty parts and end markers
    if (!part.trim() || part.trim() === '--') continue;
    
    // Split part headers from part body
    const partSplit = part.split(/\r?\n\r?\n/);
    if (partSplit.length < 2) continue;
    
    const partHeaders = partSplit[0];
    const partBody = partSplit.slice(1).join('\n\n');
    
    // Check part Content-Type
    const partContentTypeMatch = partHeaders.match(/Content-Type:\s*([^\r\n;]+)/i);
    const partContentType = partContentTypeMatch?.[1]?.toLowerCase() || '';
    
    // Skip attachments (Content-Disposition: attachment)
    if (partHeaders.match(/Content-Disposition:\s*attachment/i)) {
      continue;
    }
    
    // Skip non-text content types (images, PDFs, etc.)
    if (!partContentType.includes('text/') && !partContentType.includes('multipart/')) {
      continue;
    }
    
    // Handle nested multipart
    if (partContentType.includes('multipart/')) {
      const nestedBoundaryMatch = partHeaders.match(/boundary=\"?([^\";\r\n]+)\"?/i);
      if (nestedBoundaryMatch) {
        const nestedBody = extractMultipartBody(partBody, nestedBoundaryMatch[1]);
        if (nestedBody) {
          return nestedBody;
        }
      }
      continue;
    }
    
    // Check transfer encoding
    const partEncodingMatch = partHeaders.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
    const partEncoding = partEncodingMatch?.[1]?.trim().toLowerCase();
    
    let decodedPart = partBody;
    
    if (partEncoding === 'quoted-printable') {
      decodedPart = decodeQuotedPrintable(partBody);
    } else if (partEncoding === 'base64') {
      try {
        decodedPart = atob(partBody.replace(/\s/g, ''));
      } catch {
        decodedPart = partBody;
      }
    }
    
    if (partContentType.includes('text/plain')) {
      textPlainBody = decodedPart;
    } else if (partContentType.includes('text/html')) {
      textHtmlBody = stripHtmlTags(decodedPart);
    }
  }
  
  // Prefer plain text, fall back to HTML
  return textPlainBody || textHtmlBody;
}

/**
 * Parse an .msg file (Outlook format)
 * Note: Full .msg parsing requires complex OLE/CFBF parsing.
 * This is a simplified extraction that looks for readable text.
 */
async function parseMsgFile(file: File): Promise<EmailExtractionResult> {
  // .msg files are binary OLE/CFBF format
  // For a simplified approach, we try to extract readable text strings
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Look for text content in the binary file
  let extractedText = '';
  let currentString = '';
  
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    
    // Check for printable ASCII or common unicode
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
      currentString += String.fromCharCode(byte);
    } else if (byte === 0 && i + 1 < bytes.length && bytes[i + 1] >= 32 && bytes[i + 1] <= 126) {
      // Skip null bytes in UTF-16 encoding
      continue;
    } else {
      // End of string
      if (currentString.length > 20) {
        // Only keep meaningful strings
        extractedText += currentString + '\n';
      }
      currentString = '';
    }
  }
  
  // Add final string
  if (currentString.length > 20) {
    extractedText += currentString;
  }
  
  if (!extractedText.trim()) {
    return {
      success: false,
      body: '',
      error: 'This email format couldn\'t be read automatically. Please open it and copy/paste the confirmation text instead.',
    };
  }
  
  // Try to find the actual email body content
  // Look for common email content patterns
  const cleaned = cleanMsgExtraction(extractedText);
  
  if (cleaned.length < 50) {
    return {
      success: false,
      body: '',
      error: 'This email format couldn\'t be read automatically. Please open it and copy/paste the confirmation text instead.',
    };
  }
  
  return {
    success: true,
    body: cleaned,
  };
}

/**
 * Clean up text extracted from .msg binary
 */
function cleanMsgExtraction(text: string): string {
  // Remove common Outlook metadata strings
  const metadataPatterns = [
    /IPM\.Note/g,
    /SMTP/gi,
    /x-ms-[a-z-]+/gi,
    /microsoft/gi,
    /outlook/gi,
    /\{[0-9A-F-]{36}\}/gi, // GUIDs
  ];
  
  let cleaned = text;
  for (const pattern of metadataPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Clean up whitespace
  cleaned = cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 3) // Skip very short lines
    .join('\n');
  
  return cleanEmailText(cleaned);
}

/**
 * Decode quoted-printable encoding
 */
function decodeQuotedPrintable(text: string): string {
  return text
    // Handle soft line breaks
    .replace(/=\r?\n/g, '')
    // Decode hex-encoded characters
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtmlTags(html: string): string {
  // Remove script and style blocks
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Convert <br> and block elements to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/?(p|div|tr|li|h[1-6])[^>]*>/gi, '\n');
  
  // Remove all other tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '\"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  return text;
}

/**
 * Clean and normalize extracted email text
 */
function cleanEmailText(text: string): string {
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace from each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}
