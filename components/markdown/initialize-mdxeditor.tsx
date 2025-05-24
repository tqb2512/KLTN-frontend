"use client";
import type { ForwardedRef } from "react";
import {
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    MDXEditor,
    tablePlugin,
    linkPlugin,
    toolbarPlugin,
    codeBlockPlugin,
    codeMirrorPlugin,
    UndoRedo,
    BoldItalicUnderlineToggles,
    CodeToggle,
    CreateLink,
    InsertTable,
    InsertThematicBreak,
    ListsToggle,
    BlockTypeSelect,
    InsertCodeBlock,
    type MDXEditorMethods,
    type MDXEditorProps
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

export default function InitializedMDXEditor({
    editorRef,
    ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
    return (
        <MDXEditor
            plugins={[
                headingsPlugin(),
                listsPlugin(),
                quotePlugin(),
                thematicBreakPlugin(),
                markdownShortcutPlugin(),
                tablePlugin(),
                linkPlugin(),
                codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
                codeMirrorPlugin({
                    codeBlockLanguages: {
                        js: 'JavaScript',
                        ts: 'TypeScript',
                        tsx: 'TypeScript (React)',
                        jsx: 'JavaScript (React)',
                        java: 'Java',
                        python: 'Python',
                        css: 'CSS',
                        html: 'HTML',
                        json: 'JSON',
                        sql: 'SQL',
                        bash: 'Bash',
                        shell: 'Shell',
                        yaml: 'YAML',
                        xml: 'XML',
                        php: 'PHP',
                        cpp: 'C++',
                        c: 'C',
                        csharp: 'C#',
                        go: 'Go',
                        rust: 'Rust',
                        dart: 'Dart',
                        kotlin: 'Kotlin',
                        swift: 'Swift',
                        ruby: 'Ruby',
                        txt: 'Plain Text'
                    }
                }),
                toolbarPlugin({
                    toolbarContents: () => (
                        <>
                            <UndoRedo />
                            {' | '}
                            <BoldItalicUnderlineToggles />
                            {' | '}
                            <CodeToggle />
                            {' | '}
                            <InsertCodeBlock />
                            {' | '}
                            <CreateLink />
                            {' | '}
                            <ListsToggle />
                            {' | '}
                            <InsertTable />
                            {' | '}
                            <InsertThematicBreak />
                        </>
                    )
                })
            ]}
            className="mdxeditor h-full"
            contentEditableClassName="mdxeditor-editor"
            {...props}
            ref={editorRef}
        />
    )
}
