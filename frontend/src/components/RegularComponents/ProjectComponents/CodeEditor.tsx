import Editor from "@monaco-editor/react";
import { useTheme } from "../../../contexts/ThemeContext";
import { editor } from "monaco-editor";

type Props = {
  code: string;
  setCode?: (val: string) => void;
  language?: string;
};

export default function CodeEditor({ code, setCode = () => { }, language = "html" }: Props) {
  const { isDark } = useTheme();

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    // Register Tailwind CSS classes for autocomplete
    monaco.languages.registerCompletionItemProvider('html', {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        // Common Tailwind classes
        const tailwindClasses = [
          // Flexbox & Grid
          'flex', 'flex-col', 'flex-row', 'flex-wrap', 'grid', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4',
          'items-center', 'items-start', 'items-end', 'justify-center', 'justify-start', 'justify-end', 'justify-between', 'justify-around',
          'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8',

          // Spacing
          'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'p-10', 'p-12',
          'm-0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-6', 'm-8', 'm-auto',
          'px-2', 'px-4', 'px-6', 'px-8', 'py-2', 'py-4', 'py-6', 'py-8',
          'mx-auto', 'my-4', 'mt-4', 'mb-4', 'ml-4', 'mr-4',

          // Sizing
          'w-full', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4', 'w-screen',
          'h-full', 'h-screen', 'h-auto', 'min-h-screen',
          'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-4xl', 'max-w-6xl',

          // Typography
          'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl',
          'font-normal', 'font-medium', 'font-semibold', 'font-bold',
          'text-left', 'text-center', 'text-right',
          'text-white', 'text-black', 'text-gray-500', 'text-gray-700', 'text-blue-500', 'text-red-500', 'text-green-500',
          'italic', 'not-italic', 'uppercase', 'lowercase', 'capitalize',

          // Colors
          'bg-white', 'bg-black', 'bg-transparent',
          'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300', 'bg-gray-500', 'bg-gray-700', 'bg-gray-900',
          'bg-blue-50', 'bg-blue-100', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700',
          'bg-red-50', 'bg-red-100', 'bg-red-500', 'bg-red-600',
          'bg-green-50', 'bg-green-100', 'bg-green-500', 'bg-green-600',

          // Borders
          'border', 'border-0', 'border-2', 'border-4',
          'border-gray-200', 'border-gray-300', 'border-blue-500',
          'rounded', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',

          // Effects
          'shadow', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl',
          'opacity-0', 'opacity-50', 'opacity-75', 'opacity-100',
          'hover:opacity-80', 'hover:bg-gray-100', 'hover:text-blue-600',
          'transition', 'transition-all', 'duration-150', 'duration-300',

          // Display
          'block', 'inline-block', 'inline', 'hidden',
          'absolute', 'relative', 'fixed', 'sticky',
          'inset-0', 'top-0', 'bottom-0', 'left-0', 'right-0',
          'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50',

          // Overflow
          'overflow-hidden', 'overflow-auto', 'overflow-scroll', 'overflow-x-auto', 'overflow-y-auto',
        ];

        const suggestions = tailwindClasses.map(className => ({
          label: className,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: className,
          range: range,
          documentation: `Tailwind CSS class: ${className}`
        }));

        return { suggestions };
      }
    });
  };

  return (
    <Editor
      height="100%"
      width="100%"
      theme={isDark ? "vs-dark" : "vs-light"}
      language={language}
      value={code}
      onChange={(v) => setCode(v || "")}
      onMount={handleEditorDidMount}
      options={{
        minimap: { enabled: true },
        automaticLayout: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, "Courier New", monospace',
        fontLigatures: true,
        lineHeight: 20,
        wordWrap: "off",
        tabSize: 3,
        suggest: {
          snippetsPreventQuickSuggestions: false,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true
        }
      }}
    />
  );
}
