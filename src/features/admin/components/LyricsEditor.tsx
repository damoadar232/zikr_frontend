import type { JSONContent } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import { useRef, useState } from "react";
import { LyricDocumentView, lyricRichTextExtensions } from "../../lyrics/components/LyricRichText";
import { lyricFontFamilies, sanitizeLyricDocument, sanitizePastedLyricHTML } from "../../lyrics/utils/lyricDocumentSafety";

const languages = [
    { code: "ur", label: "Urdu", dir: "rtl" as const, defaultFont: "Noto Naskh Arabic" },
    { code: "hi", label: "Hindi", dir: "ltr" as const, defaultFont: "Noto Sans Devanagari" },
    { code: "en", label: "Roman English", dir: "ltr" as const, defaultFont: "Noto Serif" },
];

const fontSizes = ["14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px"];

export function LyricsEditor({ documents, onChange }: { documents: Record<string, JSONContent>; onChange: (language: string, document: JSONContent) => void }) {
    const [languageCode, setLanguageCode] = useState("ur");
    const [showPreview, setShowPreview] = useState(false);
    const [, setSelectionVersion] = useState(0);
    const savedSelection = useRef<{ from: number; to: number } | null>(null);
    const language = languages.find((item) => item.code === languageCode) || languages[0];
    const document = documents[language.code];
    const editor = useEditor({
        extensions: lyricRichTextExtensions,
        content: document ? sanitizeLyricDocument(document) : undefined,
        immediatelyRender: false,
        editorProps: {
            attributes: { lang: language.code, dir: language.dir, "aria-label": `${language.label} lyrics editor` },
            transformPastedHTML: sanitizePastedLyricHTML,
        },
        onUpdate: ({ editor: currentEditor }) => onChange(language.code, sanitizeLyricDocument(currentEditor.getJSON())),
        onSelectionUpdate: ({ editor: currentEditor }) => {
            const { from, to } = currentEditor.state.selection;
            savedSelection.current = { from, to };
            setSelectionVersion((version) => version + 1);
        },
    }, [language.code]);
    const attributes = editor?.getAttributes("textStyle") || {};
    const fontFamily = attributes.fontFamily || language.defaultFont;
    const textColor = attributes.color || "#252525";
    const highlightColor = editor?.getAttributes("highlight").color || "#f4dfaa";
    const paragraphSpacing = editor?.getAttributes("paragraph").paragraphSpacing || "16px";

    const changeLanguage = (index: number) => setLanguageCode(languages[(index + languages.length) % languages.length].code);
    const toolbarButton = (label: string, active: boolean, command: () => void, disabled = false) => <button key={label} type="button" className={active ? "active" : ""} aria-label={label} aria-pressed={active} disabled={disabled || !editor} onMouseDown={(event) => event.preventDefault()} onClick={command}>{label}</button>;
    const applyTextColor = (color: string) => {
        if (!editor) return;
        const selection = savedSelection.current;
        const maxPosition = editor.state.doc.content.size;
        const from = Math.max(1, Math.min(selection?.from ?? editor.state.selection.from, maxPosition));
        const to = Math.max(from, Math.min(selection?.to ?? editor.state.selection.to, maxPosition));
        editor.chain().focus().setTextSelection({ from, to }).setColor(color).run();
    };
    const applyHighlightColor = (color: string) => {
        if (!editor) return;
        const selection = savedSelection.current;
        if (selection) editor.chain().focus().setTextSelection(selection).setHighlight({ color }).run();
        else editor.chain().focus().setHighlight({ color }).run();
    };

    return <section className="lyrics-editor" aria-label="Rich text lyrics editor">
        <div className="lyrics-editor-tabs" role="tablist" aria-label="Lyrics language">
            {languages.map((item, index) => <button key={item.code} type="button" role="tab" id={`lyric-tab-${item.code}`} aria-selected={language.code === item.code} aria-controls="lyric-editor-panel" tabIndex={language.code === item.code ? 0 : -1} onClick={() => setLanguageCode(item.code)} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); changeLanguage(index + (event.key === "ArrowRight" ? 1 : -1)); } }}>{item.label}</button>)}
        </div>
        <div className="lyrics-editor-heading"><div><h3>{language.label} lyrics</h3><small>{language.dir === "rtl" ? "Right-to-left" : "Left-to-right"} · formatted content is stored as structured JSON</small></div><button type="button" className="lyrics-preview-toggle" aria-pressed={showPreview} onClick={() => setShowPreview((value) => !value)}>{showPreview ? "Hide preview" : "Preview"}</button></div>
        <div className="lyrics-format-toolbar" role="toolbar" aria-label="Text formatting">
            {toolbarButton("Bold", !!editor?.isActive("bold"), () => editor?.chain().focus().toggleBold().run())}
            {toolbarButton("Italic", !!editor?.isActive("italic"), () => editor?.chain().focus().toggleItalic().run())}
            {toolbarButton("Underline", !!editor?.isActive("underline"), () => editor?.chain().focus().toggleUnderline().run())}
            <label><span>Text color</span><input type="color" aria-label="Text color" value={textColor} onMouseDown={() => { if (editor) savedSelection.current = { from: editor.state.selection.from, to: editor.state.selection.to }; }} onChange={(event) => applyTextColor(event.target.value)} /></label>
            <label><span>Highlight</span><input type="color" aria-label="Highlight color" value={highlightColor} onMouseDown={() => { if (editor) savedSelection.current = { from: editor.state.selection.from, to: editor.state.selection.to }; }} onChange={(event) => applyHighlightColor(event.target.value)} /></label>
            <label className="lyrics-editor-select"><span>Font</span><select aria-label="Font family" value={fontFamily} onChange={(event) => editor?.chain().focus().setFontFamily(event.target.value).run()}>{lyricFontFamilies.map((font) => <option key={font} value={font} style={{ fontFamily: `"${font}", serif` }}>{font}</option>)}</select></label>
            <label className="lyrics-editor-select"><span>Size</span><select aria-label="Font size" value={attributes.fontSize || ""} onChange={(event) => event.target.value && editor?.chain().focus().setMark("textStyle", { fontSize: event.target.value }).run()}><option value="">Default</option>{fontSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            <div className="lyrics-toolbar-group" aria-label="Text alignment">{(["left", "center", "right", "justify"] as const).map((alignment) => toolbarButton(`Align ${alignment}`, !!editor?.isActive({ textAlign: alignment }), () => editor?.chain().focus().setTextAlign(alignment).run()))}</div>
            <label className="lyrics-editor-select"><span>Paragraph spacing</span><select aria-label="Paragraph spacing" value={paragraphSpacing} onChange={(event) => editor?.chain().focus().updateAttributes("paragraph", { paragraphSpacing: event.target.value }).run()}>{["8px", "16px", "24px", "32px"].map((spacing) => <option key={spacing} value={spacing}>{spacing}</option>)}</select></label>
            {toolbarButton("Line break", false, () => editor?.chain().focus().setHardBreak().run())}
            {toolbarButton("Undo", false, () => editor?.chain().focus().undo().run(), !editor?.can().undo())}
            {toolbarButton("Redo", false, () => editor?.chain().focus().redo().run(), !editor?.can().redo())}
            {toolbarButton("Clear formatting", false, () => editor?.chain().focus().unsetAllMarks().run())}
        </div>
        <div className={`lyrics-editor-workspace${showPreview ? " with-preview" : ""}`}>
            <div className="lyrics-editor-canvas" id="lyric-editor-panel" role="tabpanel" aria-labelledby={`lyric-tab-${language.code}`}>
                <EditorContent editor={editor} />
            </div>
            {showPreview && <section className="lyrics-editor-preview" aria-label={`${language.label} lyrics preview`}><h4>Preview</h4><LyricDocumentView document={document} language={language.code} dir={language.dir} /></section>}
        </div>
    </section>;
}