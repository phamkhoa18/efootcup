"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    Heading1, Heading2, Heading3,
    List, ListOrdered, Quote, Code, Minus,
    Image as ImageIcon, Link as LinkIcon, Loader2,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Highlighter, Undo, Redo, Pilcrow, RemoveFormatting,
    Link2Off
} from "lucide-react";
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface TiptapEditorProps {
    content: string;
    onChange: (html: string) => void;
    onImageUpload?: (file: File) => Promise<string | null>;
    placeholder?: string;
    isUploading?: boolean;
}

export default function TiptapEditor({
    content,
    onChange,
    onImageUpload,
    placeholder = "Viết nội dung bài viết...",
    isUploading = false,
}: TiptapEditorProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkOpen, setLinkOpen] = useState(false);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                codeBlock: false,
            }),
            Image.configure({
                HTMLAttributes: { class: "rounded-lg max-w-full mx-auto" },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: "text-primary underline cursor-pointer" },
            }),
            Placeholder.configure({ placeholder }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Underline,
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
        ],
        content,
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none min-h-[400px] p-4 focus:outline-none text-foreground",
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // sync content from outside
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content, { emitUpdate: false });
        }
    }, [content]);

    const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onImageUpload) return;
        const url = await onImageUpload(file);
        if (url && editor) {
            editor.chain().focus().setImage({ src: url, alt: file.name }).run();
        }
        e.target.value = "";
    }, [editor, onImageUpload]);

    const setLink = useCallback(() => {
        if (!editor) return;
        if (!linkUrl) {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
        } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
        }
        setLinkUrl("");
        setLinkOpen(false);
    }, [editor, linkUrl]);

    if (!editor) return null;

    const ToolBtn = ({ active, onClick, title, children, disabled }: {
        active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean;
    }) => (
        <Button
            variant={active ? "secondary" : "ghost"}
            size="sm"
            onClick={onClick}
            title={title}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${active ? "bg-accent text-accent-foreground" : ""}`}
            type="button"
        >
            {children}
        </Button>
    );

    return (
        <div className="border rounded-lg overflow-hidden bg-background">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 p-1.5 border-b bg-muted/30 flex-wrap">
                {/* Undo / Redo */}
                <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Hoàn tác" disabled={!editor.can().undo()}>
                    <Undo className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Làm lại" disabled={!editor.can().redo()}>
                    <Redo className="w-4 h-4" />
                </ToolBtn>

                <Separator orientation="vertical" className="h-5 mx-0.5" />

                {/* Format */}
                <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="In đậm">
                    <Bold className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="In nghiêng">
                    <Italic className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Gạch chân">
                    <UnderlineIcon className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Gạch ngang">
                    <Strikethrough className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight">
                    <Highlighter className="w-4 h-4" />
                </ToolBtn>

                <Separator orientation="vertical" className="h-5 mx-0.5" />

                {/* Headings */}
                <ToolBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
                    <Heading1 className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
                    <Heading2 className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
                    <Heading3 className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().setParagraph().run()} title="Paragraph" active={editor.isActive("paragraph")}>
                    <Pilcrow className="w-4 h-4" />
                </ToolBtn>

                <Separator orientation="vertical" className="h-5 mx-0.5" />

                {/* Lists */}
                <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Danh sách">
                    <List className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Danh sách số">
                    <ListOrdered className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Trích dẫn">
                    <Quote className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Code">
                    <Code className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Đường kẻ ngang">
                    <Minus className="w-4 h-4" />
                </ToolBtn>

                <Separator orientation="vertical" className="h-5 mx-0.5" />

                {/* Align */}
                <ToolBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Căn trái">
                    <AlignLeft className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Căn giữa">
                    <AlignCenter className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Căn phải">
                    <AlignRight className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justify">
                    <AlignJustify className="w-4 h-4" />
                </ToolBtn>

                <Separator orientation="vertical" className="h-5 mx-0.5" />

                {/* Link */}
                <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant={editor.isActive("link") ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            type="button"
                        >
                            <LinkIcon className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3 space-y-2" align="start">
                        <Label className="text-xs">URL</Label>
                        <div className="flex gap-2">
                            <Input
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://..."
                                className="h-8 text-sm"
                                onKeyDown={(e) => e.key === "Enter" && setLink()}
                            />
                            <Button size="sm" onClick={setLink} className="h-8">OK</Button>
                        </div>
                        {editor.isActive("link") && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { editor.chain().focus().unsetLink().run(); setLinkOpen(false); }}
                                className="w-full gap-1 text-destructive h-7 text-xs"
                                type="button"
                            >
                                <Link2Off className="w-3 h-3" /> Bỏ link
                            </Button>
                        )}
                    </PopoverContent>
                </Popover>

                {/* Image Upload */}
                <ToolBtn onClick={() => imageInputRef.current?.click()} title="Chèn ảnh" disabled={isUploading}>
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                </ToolBtn>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

                <Separator orientation="vertical" className="h-5 mx-0.5" />

                {/* Clear */}
                <ToolBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Xóa format">
                    <RemoveFormatting className="w-4 h-4" />
                </ToolBtn>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />

        </div>
    );
}
