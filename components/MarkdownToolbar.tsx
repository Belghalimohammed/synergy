import React from 'react';
import { 
    BoldIcon, ItalicIcon, StrikethroughIcon, HeadingIcon, 
    ListBulletIcon, QuoteIcon, CodeBracketIcon, LinkIcon, PhotoIcon 
} from './Icons';

interface MarkdownToolbarProps {
  editorRef: React.RefObject<HTMLTextAreaElement>;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  onInsertImage: () => void;
}

type FormatType = 'bold' | 'italic' | 'strike' | 'h2' | 'ul' | 'quote' | 'code' | 'link';

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ editorRef, setContent, onInsertImage }) => {

  const applyFormat = (type: FormatType) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let newText = '';
    let newCursorPos = start;

    const applyWrapping = (prefix: string, suffix: string, defaultText: string) => {
      const textToWrap = selectedText || defaultText;
      const wrappedText = `${prefix}${textToWrap}${suffix}`;
      newText = textarea.value.substring(0, start) + wrappedText + textarea.value.substring(end);
      newCursorPos = selectedText ? (start + wrappedText.length) : (start + prefix.length);
      const selectionEndPos = selectedText ? newCursorPos : start + prefix.length + defaultText.length;
      return { newText, start: newCursorPos, end: selectionEndPos };
    };

    const applyLinePrefix = (prefix: string) => {
        const currentLineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
        newText = textarea.value.substring(0, currentLineStart) + prefix + textarea.value.substring(currentLineStart);
        const newPos = start + prefix.length;
        return {newText, start: newPos, end: newPos};
    }

    let positions: { newText: string; start: number; end: number };

    switch (type) {
      case 'bold':
        positions = applyWrapping('**', '**', 'bold text');
        break;
      case 'italic':
        positions = applyWrapping('*', '*', 'italic text');
        break;
      case 'strike':
        positions = applyWrapping('~~', '~~', 'strikethrough');
        break;
      case 'h2':
        positions = applyLinePrefix('## ');
        break;
      case 'ul':
        positions = applyLinePrefix('- ');
        break;
      case 'quote':
        positions = applyLinePrefix('> ');
        break;
      case 'code':
        positions = applyWrapping('`', '`', 'code');
        break;
      case 'link':
        positions = applyWrapping('[', '](url)', 'link text');
        break;
      default:
        return;
    }
    
    setContent(positions.newText);

    // This needs to be deferred to allow React to re-render
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = positions.start;
      textarea.selectionEnd = positions.end;
    }, 0);
  };
  
  const toolbarItems = [
    { type: 'h2', icon: HeadingIcon, tooltip: 'Heading' },
    { type: 'bold', icon: BoldIcon, tooltip: 'Bold' },
    { type: 'italic', icon: ItalicIcon, tooltip: 'Italic' },
    { type: 'strike', icon: StrikethroughIcon, tooltip: 'Strikethrough' },
    { type: 'ul', icon: ListBulletIcon, tooltip: 'Bullet List' },
    { type: 'quote', icon: QuoteIcon, tooltip: 'Quote' },
    { type: 'code', icon: CodeBracketIcon, tooltip: 'Code' },
    { type: 'link', icon: LinkIcon, tooltip: 'Link' },
  ] as const;


  return (
    <div className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] p-2 flex items-center gap-1">
       {toolbarItems.map(({ type, icon: Icon, tooltip }) => (
            <button
                key={type}
                type="button"
                onClick={() => applyFormat(type)}
                title={tooltip}
                className="p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-quaternary)] hover:text-[var(--text-primary)] transition-colors"
            >
                <Icon className="w-4 h-4" />
            </button>
       ))}
       <div className="h-5 w-px bg-[var(--border-color)] mx-1"></div>
       <button
            type="button"
            onClick={onInsertImage}
            title="Insert Image"
            className="p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-quaternary)] hover:text-[var(--text-primary)] transition-colors"
        >
            <PhotoIcon className="w-4 h-4" />
        </button>
    </div>
  );
};

export default MarkdownToolbar;