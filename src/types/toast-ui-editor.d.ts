declare module "@toast-ui/editor" {
  type HookCallback = (url: string, text?: string) => void;

  type AddImageBlobHook = (blob: Blob | File, callback: HookCallback) => void | Promise<void>;

  type EditorMode = "markdown" | "wysiwyg";

  type PreviewStyle = "tab" | "vertical";

  type ToolbarItem =
    | "heading"
    | "bold"
    | "italic"
    | "strike"
    | "hr"
    | "quote"
    | "ul"
    | "ol"
    | "task"
    | "table"
    | "image"
    | "link"
    | "code"
    | "codeblock";

  export type EditorOptions = {
    el: HTMLElement;
    height?: string;
    minHeight?: string;
    initialValue?: string;
    initialEditType?: EditorMode;
    previewStyle?: PreviewStyle;
    language?: string;
    usageStatistics?: boolean;
    toolbarItems?: ToolbarItem[][];
    hooks?: {
      addImageBlobHook?: AddImageBlobHook;
    };
  };

  export default class Editor {
    constructor(options: EditorOptions);
    destroy(): void;
    exec(name: string, payload?: Record<string, unknown>): void;
    getMarkdown(): string;
    insertText(text: string): void;
    on(type: string, handler: () => void): void;
  }
}

declare module "@toast-ui/editor/dist/i18n/ko-kr" {
  const locale: unknown;
  export default locale;
}
