'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Minus,
  Link as LinkIcon,
  Undo,
  Redo,
  Save,
  FileInput,
  ListTree,
} from 'lucide-react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import FileBrowserModal from './FileBrowserModal';

interface HeadingItem {
  level: number;
  text: string;
  pos: number;
}

function getHeadings(editor: Editor): HeadingItem[] {
  const headings: HeadingItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      headings.push({
        level: node.attrs.level as number,
        text: node.textContent,
        pos,
      });
    }
  });
  return headings;
}

function HeadingIndex({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const headings = getHeadings(editor);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (headings.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="absolute right-12 top-full mt-1 z-50 w-56 bg-popover border border-border rounded-lg shadow-lg py-2 px-3"
      >
        <p className="text-xs text-muted-foreground">No headings found</p>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-12 top-full mt-1 z-50 w-64 max-h-72 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg py-1"
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
        Outline
      </div>
      {headings.map((h, i) => (
        <button
          key={i}
          type="button"
          className="w-full text-left px-3 py-1 hover:bg-accent transition-colors text-sm truncate cursor-pointer"
          style={{ paddingLeft: `${(h.level - 1) * 12 + 12}px` }}
          onClick={() => {
            // Scroll the heading into view
            const resolvedPos = editor.state.doc.resolve(h.pos);
            const dom = editor.view.nodeDOM(resolvedPos.before(resolvedPos.depth + 1));
            if (dom && dom instanceof HTMLElement) {
              dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              // Fallback: set cursor to heading position
              editor.chain().focus().setTextSelection(h.pos + 1).run();
              const { node } = editor.view.domAtPos(h.pos + 1);
              if (node instanceof HTMLElement) {
                node.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } else if (node.parentElement) {
                node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
            onClose();
          }}
        >
          <span
            className={
              h.level === 1
                ? 'font-semibold text-foreground'
                : h.level === 2
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/70 text-xs'
            }
          >
            {h.text}
          </span>
        </button>
      ))}
    </div>
  );
}

interface MarkdownEditorProps {
  filePath: string;
  initialContent: string;
  onSaveStatusChange?: (status: 'saved' | 'unsaved' | 'saving') => void;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors duration-150 ${
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

export default function MarkdownEditor({
  filePath,
  initialContent,
  onSaveStatusChange,
}: MarkdownEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(initialContent);

  const save = useCallback(async (content: string) => {
    setSaveStatus('saving');
    onSaveStatusChange?.('saving');
    try {
      const res = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content }),
      });
      if (res.ok) {
        setSaveStatus('saved');
        onSaveStatusChange?.('saved');
      } else {
        setSaveStatus('unsaved');
        onSaveStatusChange?.('unsaved');
      }
    } catch {
      setSaveStatus('unsaved');
      onSaveStatusChange?.('unsaved');
    }
  }, [filePath, onSaveStatusChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown.getMarkdown() as string;
      contentRef.current = md;
      setSaveStatus('unsaved');
      onSaveStatusChange?.('unsaved');

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => save(md), 1500);
    },
  });

  // Update content when file changes
  useEffect(() => {
    if (editor && initialContent !== contentRef.current) {
      contentRef.current = initialContent;
      editor.commands.setContent(initialContent);
      setSaveStatus('saved');
    }
  }, [initialContent, editor]);

  const insertInclude = useCallback((selectedPath: string) => {
    if (!editor) return;
    const directive = `@${selectedPath}`;
    editor.chain().focus().insertContent(`\n${directive}\n`).run();
  }, [editor]);

  // @ key trigger: open file browser when @ is typed at start of a line
  useEffect(() => {
    if (!editor) return;

    const pluginKey = new PluginKey('at-include-trigger');
    const plugin = new Plugin({
      key: pluginKey,
      props: {
        handleKeyDown(_view, event) {
          if (event.key === '@') {
            const { $from } = editor.state.selection;
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
            if (textBefore.trim() === '') {
              event.preventDefault();
              setFileBrowserOpen(true);
              return true;
            }
          }
          return false;
        },
      },
    });

    editor.registerPlugin(plugin);
    return () => {
      editor.unregisterPlugin(pluginKey);
    };
  }, [editor]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        save(contentRef.current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save]);

  if (!editor) return null;

  const iconSize = 15;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-card flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (⌘B)"
        >
          <Bold size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (⌘I)"
        >
          <Italic size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline (⌘U)"
        >
          <UnderlineIcon size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline Code"
        >
          <Code size={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive('taskList')}
          title="Task List"
        >
          <ListTodo size={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive('link')}
          title="Link"
        >
          <LinkIcon size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setFileBrowserOpen(true)}
          title="Include file (@)"
        >
          <FileInput size={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (⌘Z)"
        >
          <Undo size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (⌘⇧Z)"
        >
          <Redo size={iconSize} />
        </ToolbarButton>

        {/* Index & Save */}
        <div className="ml-auto flex items-center gap-1.5 text-[11px] pr-1 relative">
          <ToolbarButton
            onClick={() => setIndexOpen(!indexOpen)}
            active={indexOpen}
            title="Document Outline"
          >
            <ListTree size={iconSize} />
          </ToolbarButton>
          {indexOpen && editor && (
            <HeadingIndex editor={editor} onClose={() => setIndexOpen(false)} />
          )}
          <ToolbarButton
            onClick={() => {
              if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
              save(contentRef.current);
            }}
            disabled={saveStatus === 'saved' || saveStatus === 'saving'}
            title="Save (⌘S)"
          >
            <Save size={iconSize} />
          </ToolbarButton>
          {saveStatus === 'saved' && (
            <span className="text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Saved
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-yellow-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
              Unsaved
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block animate-pulse" />
              Saving...
            </span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      <FileBrowserModal
        open={fileBrowserOpen}
        onClose={() => setFileBrowserOpen(false)}
        onSelect={insertInclude}
      />
    </div>
  );
}
