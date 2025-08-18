'use client';

import {
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    MDXEditor,
    type MDXEditorMethods,
    toolbarPlugin,
    ConditionalContents,
    ChangeCodeMirrorLanguage,
    UndoRedo,
    BoldItalicUnderlineToggles,
    Separator,
    ListsToggle,
    InsertImage,
    InsertTable,
    InsertThematicBreak,
    InsertCodeBlock,
    linkPlugin,
    linkDialogPlugin,
    tablePlugin,
    imagePlugin,
    codeBlockPlugin,
    codeMirrorPlugin,
    diffSourcePlugin, CreateLink,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css'
import { basicDark } from "cm6-theme-basic-dark";
import "./dark-editor.css";
import {useTheme} from "next-themes";
import {forwardRef, Ref} from "react";

interface Props {
    value: string;
    editorRef: Ref<MDXEditorMethods> | null;
    fieldChange: (value: string) => void;
}

const Editor = forwardRef<MDXEditorMethods, Props>(({ value, fieldChange, ...props }, ref) => {

    const { resolvedTheme } = useTheme();

    const theme = resolvedTheme === "dark" ? [basicDark] : [];

    return (
        <MDXEditor
            key={resolvedTheme}
            markdown={value}
            ref={ref}
            className="background-light800_dark200 light-border-2 markdown-editor dark-editor w-full border grid"
            onChange={fieldChange}
            contentEditableClassName="prose min-h-[300px]"
            plugins={[
                headingsPlugin(),
                listsPlugin(),
                linkPlugin(),
                linkDialogPlugin(),
                quotePlugin(),
                thematicBreakPlugin(),
                markdownShortcutPlugin(),
                tablePlugin(),
                imagePlugin(),
                codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
                codeMirrorPlugin({
                    codeBlockLanguages: {
                        css: 'CSS',
                        txt: 'TXT',
                        sql: 'SQL',
                        html: 'HTML',
                        saas: 'SAAS',
                        scss: 'SCSS',
                        bash: 'bash',
                        json: 'JSON',
                        "": 'unspecified',
                        js: 'JavaScript',
                        ts: 'TypeScript',
                        tsx: 'TypeScript (React)',
                        jsx: 'JavaScript (React)',
                        swift: 'Swift',
                        kotlin: 'Kotlin',
                        java: 'Java',
                        csharp: 'C#',
                    },
                    autoLoadLanguageSupport: true,
                    codeMirrorExtensions: theme
                }),
                diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: 'An older version' }),
                toolbarPlugin({
                    toolbarContents: () => (
                        <ConditionalContents
                            options={[
                                {
                                    when: (editor) => editor?.editorType === 'codeblock',
                                    contents: () => <ChangeCodeMirrorLanguage />
                                },
                                {
                                    fallback: () => (
                                        <>
                                            <UndoRedo />
                                            <Separator />

                                            <BoldItalicUnderlineToggles />
                                            <Separator />

                                            <ListsToggle />
                                            <Separator />

                                            <CreateLink />
                                            <InsertImage />
                                            <Separator />

                                            <InsertTable />
                                            <InsertThematicBreak />

                                            <InsertCodeBlock />
                                        </>
                                    )
                                }
                            ]}
                        />
                    )
                })
            ]}
            {...props}
        />
    );
});

Editor.displayName = 'Editor';

export default Editor;
