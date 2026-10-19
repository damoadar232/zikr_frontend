import { Extension, type JSONContent } from "@tiptap/core";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

const LyricTypography = Extension.create({
    name: "lyricTypography",
    addGlobalAttributes() {
        return [
            {
                types: ["textStyle"],
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) => element.style.fontSize || null,
                        renderHTML: (attributes) => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
                    },
                },
            },
            {
                types: ["paragraph"],
                attributes: {
                    paragraphSpacing: {
                        default: null,
                        parseHTML: (element) => element.style.marginBottom || null,
                        renderHTML: (attributes) => attributes.paragraphSpacing ? { style: `margin-bottom: ${attributes.paragraphSpacing}` } : {},
                    },
                },
            },
        ];
    },
});

export const lyricRichTextExtensions = [
    StarterKit,
    TextStyle,
    Color,
    FontFamily,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    LyricTypography,
];

export function LyricDocumentView({ document, language, dir, className = "" }: { document: JSONContent; language: string; dir: string; className?: string }) {
    const editor = useEditor({
        extensions: lyricRichTextExtensions,
        content: document,
        editable: false,
        immediatelyRender: false,
        editorProps: { attributes: { lang: language, dir } },
    });

    useEffect(() => {
        if (!editor || JSON.stringify(editor.getJSON()) === JSON.stringify(document)) return;
        editor.commands.setContent(document, { emitUpdate: false });
    }, [document, editor]);

    return <div className={`lyric-rich-view ${className}`} lang={language} dir={dir}><EditorContent editor={editor} /></div>;
}