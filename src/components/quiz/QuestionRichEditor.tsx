'use client';

import React, { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Type,
  Image as ImageIcon,
  Paperclip,
  Code,
  Trash2,
  Eye,
  Edit3,
  Loader2,
  X,
  Sparkles,
  Link2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { SupabaseClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormattedQuestionText } from './FormattedQuestionText';

interface QuestionRichEditorProps {
  value: string;
  onChange: (val: string) => void;
  qIndex: number;
  marks: number;
  onMarksChange: (marks: number) => void;
  onRemoveQuestion?: () => void;
  canRemove?: boolean;
  supabase: SupabaseClient;
}

const COMMON_SYMBOLS = [
  '²', '³', '₁', '₂', '√', 'π', 'θ', '±', 'Δ', 'α', 'β', 'γ', 'Ω', 'λ', 'μ', '°', '→', '∞', '≤', '≥', '≠', '≈', '∫', '∑'
];

export function QuestionRichEditor({
  value,
  onChange,
  qIndex,
  marks,
  onMarksChange,
  onRemoveQuestion,
  canRemove,
  supabase,
}: QuestionRichEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPreview, setIsPreview] = useState(false);
  const [isAttachDialogOpen, setIsAttachDialogOpen] = useState(false);
  const [attachmentUrlInput, setAttachmentUrlInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);

  // Helper to wrap selected text in textarea
  const wrapSelection = (before: string, after: string, placeholder = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);

    const replacement = selected ? `${before}${selected}${after}` : `${before}${placeholder}${after}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selected
        ? start + replacement.length
        : start + before.length;
      textarea.setSelectionRange(
        newCursorPos,
        selected ? newCursorPos : newCursorPos + placeholder.length
      );
    }, 10);
  };

  const insertAtCursor = (insertion: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + insertion);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + insertion + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const nextPos = start + insertion.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  // Upload local image file to Supabase Storage
  const handleUploadImageFile = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported image format', {
        description: 'Please upload a JPG, PNG, WEBP, or SVG file.',
      });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image too large (max 20 MB)');
      return;
    }

    try {
      setIsUploadingImage(true);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `quiz-attachments/${Date.now()}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('course-materials')
        .getPublicUrl(data.path);

      // Append [IMAGE:url] to question text
      const newText = value ? `${value.trim()}\n\n[IMAGE:${publicUrl}]` : `[IMAGE:${publicUrl}]`;
      onChange(newText);
      toast.success('Diagram attachment added to question');
      setIsAttachDialogOpen(false);
      setAttachmentUrlInput('');
    } catch (err: any) {
      console.error('Attachment upload failed:', err);
      toast.error('Failed to upload image: ' + (err.message || 'Storage error'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Add image by URL or Google Drive
  const handleAddImageUrl = () => {
    let raw = attachmentUrlInput.trim();
    if (!raw) {
      toast.error('Please enter an image URL');
      return;
    }

    // Google Drive share link converter
    const gDriveMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (gDriveMatch && gDriveMatch[1]) {
      raw = `https://drive.google.com/uc?export=view&id=${gDriveMatch[1]}`;
    }

    const newText = value ? `${value.trim()}\n\n[IMAGE:${raw}]` : `[IMAGE:${raw}]`;
    onChange(newText);
    toast.success('Attachment linked to question');
    setIsAttachDialogOpen(false);
    setAttachmentUrlInput('');
  };

  // Remove existing attachment from question text
  const handleRemoveAttachment = (url: string) => {
    let updated = value.replace(`[IMAGE:${url}]`, '').replace(`![](${url})`, '');
    updated = updated.replace(/\n{3,}/g, '\n\n').trim();
    onChange(updated);
    toast.success('Attachment removed');
  };

  // Extract current attachments for thumbnail preview
  const attachedImages: string[] = [];
  const imageRegex = /\[IMAGE:(https?:\/\/[^\]]+)\]|!\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imageRegex.exec(value)) !== null) {
    const matchedUrl = imgMatch[1] || imgMatch[2];
    if (matchedUrl && !attachedImages.includes(matchedUrl)) {
      attachedImages.push(matchedUrl);
    }
  }

  return (
    <div className="space-y-3">
      {/* Question Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-stone-900 border border-stone-400 text-[#a05120] flex items-center justify-center text-xs font-extrabold shadow-sm">
            {qIndex + 1}
          </span>
          <span className="text-xs font-bold text-[#111111]">Question #{qIndex + 1}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Marks input */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-stone-500">Marks:</span>
            <input
              type="number"
              min="1"
              max="20"
              value={marks}
              onChange={(e) => onMarksChange(Number(e.target.value))}
              className="w-14 h-8 rounded-studio text-xs text-center font-bold bg-white text-[#111111] placeholder:text-stone-400 border border-stone-400 focus:border-[#a05120] focus:outline-none"
            />
          </div>

          {/* Preview toggle */}
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[20px] text-xs font-semibold border transition-all ${
              isPreview
                ? 'bg-[#a8f1e0] text-[#111111] font-bold border-[#a8f1e0]'
                : 'bg-stone-50 border-stone-400 text-[#111111] hover:border-[#a05120] hover:text-[#a05120]'
            }`}
            title="Toggle Student Preview"
          >
            {isPreview ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span>{isPreview ? 'Edit' : 'Preview'}</span>
          </button>

          {/* Remove Question */}
          {canRemove && onRemoveQuestion && (
            <button
              type="button"
              onClick={onRemoveQuestion}
              className="p-1.5 rounded-full text-stone-400 hover:text-red-500 hover:bg-stone-100 transition-colors"
              title="Remove question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Body */}
      {isPreview ? (
        <div className="p-4 rounded-studio bg-white border border-stone-300 text-[#111111] shadow-inner min-h-[110px]">
          <FormattedQuestionText
            text={value || '*(No question text entered yet)*'}
            textClassName="text-sm font-medium text-[#111111] leading-relaxed"
          />
        </div>
      ) : (
        <div className="rounded-studio border border-stone-300 bg-white overflow-hidden focus-within:border-[#a05120] transition-all">
          {/* Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-1 px-2.5 py-2 bg-stone-50 border-b border-stone-200 text-stone-600">
            {/* Bold */}
            <button
              type="button"
              onClick={() => wrapSelection('**', '**', 'bold text')}
              className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 hover:text-[#111111] font-bold transition-colors"
              title="Bold (**text**)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => wrapSelection('*', '*', 'italic text')}
              className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 hover:text-[#111111] italic transition-colors"
              title="Italic (*text*)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>

            {/* Underline */}
            <button
              type="button"
              onClick={() => wrapSelection('<u>', '</u>', 'underlined text')}
              className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 hover:text-[#111111] underline transition-colors"
              title="Underline (<u>text</u>)"
            >
              <Underline className="h-3.5 w-3.5" />
            </button>

            {/* Code / Formula inline */}
            <button
              type="button"
              onClick={() => wrapSelection('`', '`', 'formula/code')}
              className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 hover:text-[#111111] transition-colors font-mono"
              title="Inline Code or Formula (`code`)"
            >
              <Code className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-stone-300 mx-1" />

            {/* Font Style Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-stone-200 text-xs font-semibold text-stone-600 hover:text-[#111111] transition-colors"
                  title="Change Font Family / Style"
                >
                  <Type className="h-3.5 w-3.5" />
                  <span>Font</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-studio shadow-xl bg-white border border-stone-300 text-[#111111] text-xs z-50">
                <DropdownMenuItem
                  onClick={() => wrapSelection('[font=sans]', '[/font]', 'Standard text')}
                  className="font-sans hover:bg-stone-100 focus:bg-stone-100 text-[#111111] cursor-pointer"
                >
                  Default Sans
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => wrapSelection('[font=serif]', '[/font]', 'Classic editorial text')}
                  className="font-serif tracking-wide hover:bg-stone-100 focus:bg-stone-100 text-[#111111] cursor-pointer"
                >
                  Classic Serif
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => wrapSelection('[font=mono]', '[/font]', 'Monospace code')}
                  className="font-mono hover:bg-stone-100 focus:bg-stone-100 text-[#111111] cursor-pointer"
                >
                  Monospace (Code)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => wrapSelection('[font=math]', '[/font]', 'E = mc²')}
                  className="font-mono hover:bg-stone-100 focus:bg-stone-100 text-[#a05120] font-semibold cursor-pointer"
                >
                  Math Formula
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => wrapSelection('[font=heading]', '[/font]', 'Prominent Question Header')}
                  className="font-extrabold hover:bg-stone-100 focus:bg-stone-100 text-[#111111] cursor-pointer"
                >
                  Heading Style
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Math Symbols Toggle */}
            <button
              type="button"
              onClick={() => setShowSymbols(!showSymbols)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                showSymbols ? 'bg-stone-200 text-[#a05120] font-bold border border-stone-300' : 'hover:bg-stone-200 text-stone-600 hover:text-[#111111]'
              }`}
              title="Insert Math/Physics formula symbols"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#a05120]" />
              <span>Symbols</span>
            </button>

            <div className="h-4 w-px bg-stone-300 mx-1" />

            {/* Image / Attachment Button */}
            <button
              type="button"
              onClick={() => setIsAttachDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-studio bg-stone-100 hover:bg-stone-200 border border-stone-300 hover:border-[#a05120] text-[#a05120] text-xs font-bold transition-colors ml-auto shadow-xs"
              title="Add Image or Diagram Attachment"
            >
              <ImageIcon className="h-3.5 w-3.5 text-[#a05120]" />
              <span>Add Diagram</span>
            </button>
          </div>

          {/* Quick Symbols Ribbon (when toggled open) */}
          {showSymbols && (
            <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-stone-50 border-b border-stone-200 animate-in fade-in duration-200">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mr-1">
                Quick Insert:
              </span>
              {COMMON_SYMBOLS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => insertAtCursor(sym)}
                  className="w-7 h-7 rounded-[8px] bg-white hover:bg-stone-100 hover:border-[#a05120] border border-stone-300 text-xs font-mono font-bold text-[#111111] flex items-center justify-center transition-all hover:scale-110"
                  title={`Insert ${sym}`}
                >
                  {sym}
                </button>
              ))}
            </div>
          )}

          {/* Main Question Textarea */}
          <textarea
            ref={textareaRef}
            placeholder="Type question problem statement here (e.g. In the given circuit diagram, find the equivalent resistance...)"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3.5 text-xs text-[#111111] placeholder:text-stone-400 focus:outline-none min-h-[90px] resize-y bg-white"
            required
          />

          {/* Attached Images Mini-Viewer (inside editor card) */}
          {attachedImages.length > 0 && (
            <div className="px-3.5 pb-3 pt-2 border-t border-stone-200 flex flex-wrap gap-3 items-center bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Attached Diagram{attachedImages.length > 1 ? 's' : ''}:
              </span>
              {attachedImages.map((url, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-studio border border-stone-400 bg-white p-1.5 flex items-center gap-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Question Diagram"
                    className="h-10 w-14 object-cover rounded-[8px]"
                  />
                  <span className="text-[10px] text-stone-500 font-mono max-w-[100px] truncate">
                    Attachment #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(url)}
                    className="p-1 rounded-full text-stone-400 hover:text-red-500 hover:bg-stone-100 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attachment Upload Dialog */}
      <Dialog open={isAttachDialogOpen} onOpenChange={setIsAttachDialogOpen}>
        <DialogContent className="rounded-studio p-6 max-w-md bg-white border border-stone-300 text-[#111111] shadow-xl">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-heading font-extrabold text-lg text-[#111111] flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-[#a05120]" />
              Attach Diagram to Question #{qIndex + 1}
            </DialogTitle>
            <p className="text-xs text-stone-500">
              Upload a circuit diagram, geometry figure, physics setup, or paste an image URL.
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Option 1: File Upload from device */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-[#111111] block">
                Option 1: Upload from your device
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadImageFile(file);
                }}
              />
              <button
                type="button"
                disabled={isUploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-stone-300 hover:border-[#a05120] bg-stone-50 hover:bg-stone-100 rounded-studio p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="h-6 w-6 text-[#a05120] animate-spin" />
                    <span className="text-xs font-bold text-[#111111]">Uploading diagram...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-[#a05120]" />
                    <span className="text-xs font-bold text-[#111111]">
                      Choose image / diagram file
                    </span>
                    <span className="text-[10px] text-stone-500">
                      PNG, JPG, WEBP, or SVG (up to 20 MB)
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px bg-stone-200 flex-1" />
              <span className="text-[10px] font-bold uppercase text-stone-400">OR</span>
              <div className="h-px bg-stone-200 flex-1" />
            </div>

            {/* Option 2: Image URL / Google Drive */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#111111] block">
                Option 2: Paste Web Image or Google Drive Link
              </span>
              <div className="flex items-center gap-2">
                <input
                  placeholder="https://... or Google Drive image link"
                  value={attachmentUrlInput}
                  onChange={(e) => setAttachmentUrlInput(e.target.value)}
                  className="rounded-studio h-10 text-xs flex-1 bg-white text-[#111111] placeholder:text-stone-400 border border-stone-300 px-3.5 focus:border-[#a05120] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="rounded-studio bg-[#a05120] hover:bg-[#864319] text-white text-xs font-bold px-4 h-10 shadow-xs transition-colors"
                >
                  Attach
                </button>
              </div>
              <p className="text-[10px] text-stone-500 leading-relaxed">
                Google Drive links are automatically converted into direct embeddable previews.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
