import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIMessageProps {
    content: string;
    className?: string;
}

export default function AIMessage({ content, className = "" }: AIMessageProps) {
    // Process the content to handle escaped characters
    const processedContent = content
        .replace(/\\n/g, '\n')           // Convert \n to actual newlines
        .replace(/\\t/g, '\t')           // Convert \t to actual tabs
        .replace(/\\r/g, '\r')           // Convert \r to actual carriage returns
        .replace(/\\\\/g, '\\');         // Convert \\ to single backslash

    return (
        <div className={`text-sm ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                                        code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        
                        return !inline && match ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 my-2 overflow-x-auto">
                                <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
                                    <code>{String(children).replace(/\n$/, '')}</code>
                                </pre>
                            </div>
                        ) : (
                            <code
                                className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono"
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                                        h1: ({ children }) => (                        <h1 className="text-base font-bold mb-2 mt-3 first:mt-0 text-gray-900">{children}</h1>                    ),                    h2: ({ children }) => (                        <h2 className="text-sm font-bold mb-1 mt-2 first:mt-0 text-gray-900">{children}</h2>                    ),                    h3: ({ children }) => (                        <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0 text-gray-800">{children}</h3>                    ),                    p: ({ children }) => (                        <p className="mb-2 last:mb-0 leading-relaxed text-gray-700">{children}</p>                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-sm leading-relaxed">{children}</li>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic text-gray-600">
                            {children}
                        </blockquote>
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto mb-2">
                            <table className="min-w-full border-collapse border border-gray-300 text-sm">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-gray-50">{children}</thead>
                    ),
                    th: ({ children }) => (
                        <th className="border border-gray-300 px-2 py-1 text-left font-medium">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="border border-gray-300 px-2 py-1">{children}</td>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic">{children}</em>
                    ),
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                        >
                            {children}
                        </a>
                    ),
                    hr: () => (
                        <hr className="border-gray-300 my-3" />
                    ),
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
} 