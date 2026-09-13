'use client';

import React, { useState } from 'react';
import { ExternalLink, ZoomIn, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface FormattedQuestionTextProps {
  text: string;
  className?: string;
  textClassName?: string;
}

interface ParsedQuestion {
  cleanText: string;
  imageUrls: string[];
  fileAttachments: string[];
}

/**
 * Extracts [IMAGE:url], [ATTACHMENT:url], and ![alt](url) from raw question text
 */
function extractAttachments(rawText: string): ParsedQuestion {
  if (!rawText) {
    return { cleanText: '', imageUrls: [], fileAttachments: [] };
  }

  const imageUrls: string[] = [];
  const fileAttachments: string[] = [];

  // Match [IMAGE:https://...] or [IMAGE:http://...]
  let workingText = rawText.replace(/\[IMAGE:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
    imageUrls.push(url.trim());
    return '';
  });

  // Match markdown images: ![alt](url)
  workingText = workingText.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/gi, (_, _alt, url) => {
    imageUrls.push(url.trim());
    return '';
  });

  // Match [ATTACHMENT:https://...]
  workingText = workingText.replace(/\[ATTACHMENT:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
    const trimmed = url.trim();
    if (/\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(trimmed)) {
      imageUrls.push(trimmed);
    } else {
      fileAttachments.push(trimmed);
    }
    return '';
  });

  return {
    cleanText: workingText.trim(),
    imageUrls,
    fileAttachments,
  };
}

/**
 * Parses markdown/tags like **bold**, *italic*, <u>underline</u>, `code`, and [font=...] into React nodes
 */
function renderRichContent(text: string): React.ReactNode[] {
  if (!text) return [];

  // Lines split to preserve paragraphs
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Regex matching tokens:
    // 1. [font=(serif|mono|math|sans|heading)](.*?)[/font]
    // 2. **bold** or <b>bold</b> or <strong>bold</strong>
    // 3. *italic* or <i>italic</i> or <em>italic</em>
    // 4. <u>underline</u>
    // 5. `code`
    // 6. [size=(lg|xl|sm)](.*?)[/size]
    const tokenRegex =
      /(\[font=(serif|mono|math|sans|heading)\](.*?)\[\/font\]|\*\*(.*?)\*\*|<b>(.*?)<\/b>|<strong>(.*?)<\/strong>|\*(.*?)\*|<i>(.*?)<\/i>|<em>(.*?)<\/em>|<u>(.*?)<\/u>|`(.*?)`|\[size=(lg|xl|sm)\](.*?)\[\/size\])/gi;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(line)) !== null) {
      const matchIndex = match.index;

      // Push raw text preceding this match
      if (matchIndex > lastIndex) {
        elements.push(line.substring(lastIndex, matchIndex));
      }

      const fullMatch = match[0];

      if (fullMatch.startsWith('[font=')) {
        const fontType = match[2]?.toLowerCase();
        const content = match[3];
        let fontClass = 'font-sans';
        if (fontType === 'serif') fontClass = 'font-serif tracking-wide';
        else if (fontType === 'mono') fontClass = 'font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800';
        else if (fontType === 'math') fontClass = 'font-mono text-indigo-900 bg-indigo-50/80 px-1.5 py-0.5 rounded font-medium';
        else if (fontType === 'heading') fontClass = 'font-heading font-extrabold text-slate-900';

        elements.push(
          <span key={`font-${lineIdx}-${matchIndex}`} className={fontClass}>
            {content}
          </span>
        );
      } else if (fullMatch.startsWith('**') || fullMatch.startsWith('<b>') || fullMatch.startsWith('<strong>')) {
        const boldText = match[4] || match[5] || match[6] || '';
        elements.push(
          <strong key={`bold-${lineIdx}-${matchIndex}`} className="font-extrabold text-slate-900">
            {boldText}
          </strong>
        );
      } else if (fullMatch.startsWith('*') || fullMatch.startsWith('<i>') || fullMatch.startsWith('<em>')) {
        const italicText = match[7] || match[8] || match[9] || '';
        elements.push(
          <em key={`italic-${lineIdx}-${matchIndex}`} className="italic text-slate-800">
            {italicText}
          </em>
        );
      } else if (fullMatch.startsWith('<u>')) {
        const underlineText = match[10] || '';
        elements.push(
          <span key={`u-${lineIdx}-${matchIndex}`} className="underline underline-offset-2 decoration-slate-400">
            {underlineText}
          </span>
        );
      } else if (fullMatch.startsWith('`')) {
        const codeText = match[11] || '';
        elements.push(
          <code
            key={`code-${lineIdx}-${matchIndex}`}
            className="font-mono text-[0.9em] bg-slate-100 text-orange-600 px-1.5 py-0.5 rounded border border-slate-200"
          >
            {codeText}
          </code>
        );
      } else if (fullMatch.startsWith('[size=')) {
        const size = match[12]?.toLowerCase();
        const sizeText = match[13] || '';
        let sizeClass = 'text-base';
        if (size === 'lg') sizeClass = 'text-lg font-semibold';
        if (size === 'xl') sizeClass = 'text-xl font-bold';
        if (size === 'sm') sizeClass = 'text-xs text-slate-500';

        elements.push(
          <span key={`size-${lineIdx}-${matchIndex}`} className={sizeClass}>
            {sizeText}
          </span>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    // Push trailing raw text
    if (lastIndex < line.length) {
      elements.push(line.substring(lastIndex));
    }

    return (
      <span key={`line-${lineIdx}`} className="block min-h-[1.25em]">
        {elements.length > 0 ? elements : <br />}
      </span>
    );
  });
}

export function FormattedQuestionText({
  text,
  className = '',
  textClassName = 'text-base sm:text-lg font-medium text-slate-900 leading-relaxed',
}: FormattedQuestionTextProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const { cleanText, imageUrls, fileAttachments } = extractAttachments(text);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Formatted Question Text */}
      <div className={textClassName}>{renderRichContent(cleanText)}</div>

      {/* Image / Diagram Attachments */}
      {imageUrls.length > 0 && (
        <div className="space-y-3 pt-2">
          {imageUrls.map((imgUrl, i) => (
            <div
              key={i}
              className="group relative inline-block max-w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm hover:shadow-md transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl}
                alt={`Question diagram ${i + 1}`}
                className="max-h-80 sm:max-h-96 w-auto object-contain rounded-2xl cursor-pointer"
                onClick={() => setZoomedImage(imgUrl)}
              />
              <button
                type="button"
                onClick={() => setZoomedImage(imgUrl)}
                className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-[11px] font-semibold backdrop-blur-sm"
                title="Click to expand diagram"
              >
                <ZoomIn className="h-3.5 w-3.5" />
                <span>Zoom</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Non-Image Attachments (e.g. PDF/DOCX link) */}
      {fileAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {fileAttachments.map((fileUrl, i) => (
            <a
              key={i}
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-bold transition-all shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5 text-orange-600" />
              <span>Reference Attachment #{i + 1}</span>
            </a>
          ))}
        </div>
      )}

      {/* Zoom Lightbox Modal */}
      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-slate-950/95 border-slate-800 rounded-3xl overflow-hidden">
          <div className="relative p-2 flex items-center justify-center min-h-[300px]">
            {zoomedImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={zoomedImage}
                alt="Enlarged question diagram"
                className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl"
              />
            )}
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
