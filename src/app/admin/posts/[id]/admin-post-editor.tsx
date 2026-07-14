"use client";

import "@toast-ui/editor/dist/toastui-editor.css";
import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  adminEditorSaveStateReducer,
  createAdminEditorSaveState,
  hasUnsavedChanges,
  isSaveInFlight,
  shouldStartQueuedSave,
  type AdminEditorSaveAction,
  type AdminEditorSaveState,
} from "@/lib/admin-editor-save-state";

type EditorMode = "md" | "mdx";
type PostStatus = "draft" | "published" | "archived" | string;
type AssetRole = "cover" | "inline" | "attachment" | "embedded_pdf";

type ToastEditorInstance = {
  changePreviewStyle(style: "tab" | "vertical"): void;
  destroy(): void;
  exec(name: string, payload?: Record<string, unknown>): void;
  getMarkdown(): string;
  insertText(text: string): void;
  on(type: string, handler: () => void): void;
  setHeight(height: string): void;
  setMinHeight(minHeight: string): void;
};

export type AdminEditorCategory = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
};

export type AdminEditorTag = {
  name: string;
  slug?: string;
};

export type AdminEditorAsset = {
  id: string;
  role: AssetRole;
  publicUrl: string;
  mimeType?: string;
  altText?: string;
  caption?: string;
};

export type AdminEditorPost = {
  id: number;
  title: string;
  description: string;
  excerpt: string;
  author: string;
  status: PostStatus;
  publishedNumber: number | null;
  legacySlug: string | null;
  extension: EditorMode;
  bodyMarkdown: string;
  categorySlug: string;
  tags: AdminEditorTag[];
  originalUrl: string;
  coverImageUrl: string;
  embeddedPdfUrl: string;
  allowPdfDownload: boolean;
  assets: AdminEditorAsset[];
};

type UploadedAssetResponse = {
  publicUrl: string;
  role: AssetRole;
  mimeType: string;
  altText?: string;
  caption?: string;
  uploadedAt: string;
};

type AdminPostEditorProps = {
  initialPost: AdminEditorPost;
  initialCategories: AdminEditorCategory[];
  messages: {
    saved?: boolean;
    published?: string;
    archived?: boolean;
    uploaded?: string;
  };
};

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const PDF_ACCEPT = "application/pdf";
const FULL_WIDTH_PREFERENCE_KEY = "admin-editor-full-width";
const MOBILE_EDITOR_BREAKPOINT = 768;
const EDITOR_VERTICAL_PREVIEW_MIN_WIDTH = 960;
const DESKTOP_SETTINGS_BREAKPOINT = 1280;

export function AdminPostEditor({ initialPost, initialCategories, messages }: AdminPostEditorProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<ToastEditorInstance | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);
  const pdfAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const pdfEmbedInputRef = useRef<HTMLInputElement | null>(null);
  const mobileSettingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const settingsCloseRef = useRef<HTMLButtonElement | null>(null);
  const componentMountedRef = useRef(true);
  const editorMountedRef = useRef(false);
  const editorGenerationRef = useRef(0);
  const editorSyncTimeoutsRef = useRef<Set<number>>(new Set());

  const draftRef = useRef(initialPost);
  const [draft, setDraft] = useState(initialPost);
  const [categories, setCategories] = useState(initialCategories);
  const [assets, setAssets] = useState(initialPost.assets);
  const [tagName, setTagName] = useState("");
  const [tagSlug, setTagSlug] = useState("");
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const initialSaveState = useRef(createAdminEditorSaveState()).current;
  const saveStateRef = useRef(initialSaveState);
  const [saveState, dispatchSaveState] = useReducer(adminEditorSaveStateReducer, initialSaveState);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(messages.saved ? new Date().toISOString() : null);
  const [notice, setNotice] = useState<string>(() => {
    if (messages.published) {
      return `발행 완료: /posts/${messages.published}`;
    }

    if (messages.archived) {
      return "발행취소 완료";
    }

    if (messages.uploaded) {
      return `업로드 완료: ${messages.uploaded}`;
    }

    return "";
  });
  const [error, setError] = useState("");
  const [pendingActions, setPendingActions] = useState<Record<string, number>>({});
  const [editorReady, setEditorReady] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(true);
  const [desktopSettingsVisible, setDesktopSettingsVisible] = useState(true);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const operationTailRef = useRef<Promise<void>>(Promise.resolve());
  const contentSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const contentSaveRequestedRef = useRef(false);
  const manualSaveNoticeRequestedRef = useRef(false);
  const manualRevisionRequestedRef = useRef(false);
  const categorySlugManuallyEditedRef = useRef(false);
  const navigationBypassRef = useRef(false);

  const publicPostUrl = draft.status === "published" && draft.publishedNumber ? `/posts/${draft.publishedNumber}` : null;
  const selectedCategory = categories.find((category) => category.slug === draft.categorySlug);
  const hasUnsavedContent = hasUnsavedChanges(saveState);
  const saveInFlight = isSaveInFlight(saveState);
  const hasPendingAction = Object.keys(pendingActions).length > 0;

  const transitionSaveState = useCallback((action: AdminEditorSaveAction): AdminEditorSaveState => {
    const nextState = adminEditorSaveStateReducer(saveStateRef.current, action);
    saveStateRef.current = nextState;
    dispatchSaveState(action);
    return nextState;
  }, []);

  const replaceDraft = useCallback((update: (current: AdminEditorPost) => AdminEditorPost) => {
    const nextDraft = update(draftRef.current);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, []);

  const beginPendingAction = useCallback((action: string) => {
    setPendingActions((current) => ({
      ...current,
      [action]: (current[action] ?? 0) + 1,
    }));
  }, []);

  const endPendingAction = useCallback((action: string) => {
    setPendingActions((current) => {
      const next = { ...current };
      const count = next[action] ?? 0;

      if (count <= 1) {
        delete next[action];
      } else {
        next[action] = count - 1;
      }

      return next;
    });
  }, []);

  const enqueueExclusive = useCallback(function enqueueExclusiveOperation<T>(operation: () => Promise<T>): Promise<T> {
    const result = operationTailRef.current.catch(() => undefined).then(operation);
    operationTailRef.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }, []);

  const markDirty = useCallback(() => {
    transitionSaveState({ type: "edited" });

    if (contentSavePromiseRef.current) {
      contentSaveRequestedRef.current = true;
    }

    setNotice("");
  }, [transitionSaveState]);

  const updateDraft = useCallback(
    <K extends keyof AdminEditorPost>(key: K, value: AdminEditorPost[K]) => {
      replaceDraft((current) => ({
        ...current,
        [key]: value,
      }));
      markDirty();
    },
    [markDirty, replaceDraft],
  );

  useEffect(() => {
    try {
      const storedPreference = window.localStorage.getItem(FULL_WIDTH_PREFERENCE_KEY);

      if (storedPreference === "true" || storedPreference === "false") {
        setIsFullWidth(storedPreference === "true");
      }
    } catch {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  }, []);

  useEffect(() => {
    function closeMobileSettingsAtDesktopWidth() {
      if (window.innerWidth >= DESKTOP_SETTINGS_BREAKPOINT) {
        setMobileSettingsOpen(false);
      }
    }

    window.addEventListener("resize", closeMobileSettingsAtDesktopWidth);
    return () => window.removeEventListener("resize", closeMobileSettingsAtDesktopWidth);
  }, []);

  useEffect(() => {
    if (!mobileSettingsOpen) {
      return;
    }

    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (settingsCloseRef.current ?? settingsPanelRef.current)?.focus();

    function handleSettingsKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileSettingsOpen(false);
        return;
      }

      if (event.key !== "Tab" || !settingsPanelRef.current) {
        return;
      }

      const focusableElements = Array.from(
        settingsPanelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
        settingsPanelRef.current.focus();
        return;
      }

      const activeElement = document.activeElement;

      if (!settingsPanelRef.current.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleSettingsKeyDown);

    return () => {
      document.removeEventListener("keydown", handleSettingsKeyDown);
      document.body.style.overflow = previousBodyOverflow;

      const desktopSettingsTrigger = document.querySelector<HTMLButtonElement>('button[aria-label="설정 패널"]');
      const focusTarget = window.innerWidth >= DESKTOP_SETTINGS_BREAKPOINT
        ? desktopSettingsTrigger
        : previouslyFocusedElement;

      if (focusTarget?.isConnected) {
        focusTarget.focus();
      }
    };
  }, [mobileSettingsOpen]);

  const saveDraft = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        manualSaveNoticeRequestedRef.current = true;
        manualRevisionRequestedRef.current = true;
      }

      if (contentSavePromiseRef.current) {
        if (!silent) {
          contentSaveRequestedRef.current = true;
        }

        return contentSavePromiseRef.current;
      }

      contentSaveRequestedRef.current = true;

      const queuedSave = enqueueExclusive(async () => {
        const pendingAction = manualSaveNoticeRequestedRef.current ? "save" : "autosave";
        beginPendingAction(pendingAction);
        setError("");
        let succeeded = true;

        try {
          while (
            componentMountedRef.current &&
            (contentSaveRequestedRef.current || shouldStartQueuedSave(saveStateRef.current))
          ) {
            contentSaveRequestedRef.current = false;
            const revision = saveStateRef.current.editRevision;
            const saveMode = manualRevisionRequestedRef.current ? "manual" : "autosave";

            if (revision === saveStateRef.current.savedRevision && saveMode !== "manual") {
              break;
            }

            const payload = currentPayload(draftRef.current, editorRef.current);
            manualRevisionRequestedRef.current = false;
            transitionSaveState({ type: "saveStarted", revision });

            try {
              const response = await requestJson<{ savedAt: string }>(
                `/admin/api/posts/${draftRef.current.id}/draft`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    ...payload,
                    saveMode,
                  }),
                },
              );

              setError("");
              setLastSavedAt(response.savedAt);
              const nextSaveState = transitionSaveState({ type: "saveSucceeded", revision });

              if (shouldStartQueuedSave(nextSaveState)) {
                contentSaveRequestedRef.current = true;
              }
            } catch (saveError) {
              transitionSaveState({ type: "saveFailed", revision });
              setError(errorMessage(saveError));

              if (manualRevisionRequestedRef.current && componentMountedRef.current) {
                contentSaveRequestedRef.current = true;
                continue;
              }

              contentSaveRequestedRef.current = false;
              succeeded = false;
              break;
            }
          }

          if (succeeded && manualSaveNoticeRequestedRef.current) {
            setNotice("임시저장 완료");
          }

          return succeeded;
        } finally {
          manualSaveNoticeRequestedRef.current = false;
          endPendingAction(pendingAction);
        }
      });

      const trackedSave = queuedSave.finally(() => {
        if (contentSavePromiseRef.current === trackedSave) {
          contentSavePromiseRef.current = null;
        }
      });

      contentSavePromiseRef.current = trackedSave;
      return trackedSave;
    },
    [beginPendingAction, endPendingAction, enqueueExclusive, transitionSaveState],
  );

  useEffect(() => {
    let mounted = true;
    componentMountedRef.current = true;
    const editorSyncTimeouts = editorSyncTimeoutsRef.current;

    async function mountEditor() {
      const [{ default: Editor }] = await Promise.all([
        import("@toast-ui/editor"),
        import("@toast-ui/editor/dist/i18n/ko-kr"),
      ]);

      if (!mounted || !editorHostRef.current || editorRef.current) {
        return;
      }

      const editorLayout = responsiveEditorLayout(editorHostRef.current.clientWidth);
      const editor = new Editor({
        el: editorHostRef.current,
        height: editorLayout.height,
        minHeight: editorLayout.minHeight,
        initialValue: initialPost.bodyMarkdown,
        initialEditType: "wysiwyg",
        previewStyle: editorLayout.previewStyle,
        language: "ko-KR",
        usageStatistics: false,
        toolbarItems: [
          ["heading", "bold", "italic", "strike"],
          ["hr", "quote"],
          ["ul", "ol", "task"],
          ["table", "image", "link"],
          ["code", "codeblock"],
        ],
        hooks: {
          addImageBlobHook: async (blob, callback) => {
            try {
              const file = blob instanceof File ? blob : new File([blob], `image-${Date.now()}.png`, { type: blob.type });
              const asset = await uploadAssetWithPending(file, "inline");

              if (!componentMountedRef.current) {
                return;
              }

              callback(asset.publicUrl, file.name || "image");
              scheduleBodySyncFromEditor();
            } catch (uploadError) {
              setError(errorMessage(uploadError));
            }
          },
        },
      });

      editor.on("change", () => {
        syncBodyFromEditor();
      });

      editorRef.current = editor;
      editorMountedRef.current = true;
      setEditorReady(true);
    }

    void mountEditor();

    return () => {
      mounted = false;
      componentMountedRef.current = false;
      editorMountedRef.current = false;
      editorGenerationRef.current += 1;

      for (const timeoutId of editorSyncTimeouts) {
        window.clearTimeout(timeoutId);
      }

      editorSyncTimeouts.clear();
      editorRef.current?.destroy();
      editorRef.current = null;
    };
    // The editor is intentionally mounted once with the first server payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editorReady) {
      return;
    }

    function syncEditorLayoutToViewport() {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const editorWidth = editorHostRef.current?.clientWidth ?? window.innerWidth;
      const layout = responsiveEditorLayout(editorWidth);
      editor.setHeight(layout.height);
      editor.setMinHeight(layout.minHeight);
      editor.changePreviewStyle(layout.previewStyle);
    }

    syncEditorLayoutToViewport();
    window.addEventListener("resize", syncEditorLayoutToViewport);

    return () => {
      window.removeEventListener("resize", syncEditorLayoutToViewport);
    };
  }, [desktopSettingsVisible, editorReady, isFullWidth]);

  useEffect(() => {
    if (saveState.status !== "dirty") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveDraft({ silent: true });
    }, 30000);

    return () => window.clearTimeout(timeoutId);
  }, [saveDraft, saveState.status]);

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (navigationBypassRef.current) {
        return;
      }

      if (!hasUnsavedContent && !saveInFlight && !hasPendingAction) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasPendingAction, hasUnsavedContent, saveInFlight]);

  useEffect(() => {
    function guardClientNavigation(event: MouseEvent) {
      if (navigationBypassRef.current) {
        return;
      }

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");

      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);

      if (destination.origin !== window.location.origin) {
        return;
      }

      if (
        !hasUnsavedChanges(saveStateRef.current) &&
        !isSaveInFlight(saveStateRef.current) &&
        !hasPendingAction
      ) {
        return;
      }

      if (window.confirm("저장되지 않은 변경사항이나 진행 중인 작업이 있습니다. 페이지를 이동할까요?")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener("click", guardClientNavigation, true);
    return () => document.removeEventListener("click", guardClientNavigation, true);
  }, [hasPendingAction]);

  function syncBodyFromEditor() {
    const editor = editorRef.current;

    if (!editorMountedRef.current || !editor) {
      return;
    }

    const markdown = editor.getMarkdown();

    replaceDraft((current) => ({
      ...current,
      bodyMarkdown: markdown,
    }));
    markDirty();
  }

  function scheduleBodySyncFromEditor() {
    if (!editorMountedRef.current) {
      return;
    }

    const generation = editorGenerationRef.current;
    const timeoutId = window.setTimeout(() => {
      editorSyncTimeoutsRef.current.delete(timeoutId);

      if (!editorMountedRef.current || generation !== editorGenerationRef.current) {
        return;
      }

      syncBodyFromEditor();
    }, 0);

    editorSyncTimeoutsRef.current.add(timeoutId);
  }

  async function publishCurrentPost() {
    if (contentSavePromiseRef.current) {
      const saved = await contentSavePromiseRef.current;

      if (!saved) {
        return;
      }
    }

    const published = await enqueueExclusive(async () => {
      beginPendingAction("publish");
      setError("");
      const revision = saveStateRef.current.editRevision;
      const tracksUnsavedContent = revision !== saveStateRef.current.savedRevision;

      if (tracksUnsavedContent) {
        transitionSaveState({ type: "saveStarted", revision });
      }

      try {
        const response = await requestJson<{ publishedNumber: number; url: string; publishedAt: string }>(
          `/admin/api/posts/${draftRef.current.id}/publish`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(currentPayload(draftRef.current, editorRef.current)),
          },
        );

        replaceDraft((current) => ({
          ...current,
          status: "published",
          publishedNumber: response.publishedNumber,
        }));
        setLastSavedAt(response.publishedAt);

        if (tracksUnsavedContent) {
          transitionSaveState({ type: "saveSucceeded", revision });
        }

        setNotice(`발행 완료: ${response.url}`);
        return true;
      } catch (publishError) {
        if (tracksUnsavedContent) {
          transitionSaveState({ type: "saveFailed", revision });
        }

        setError(errorMessage(publishError));
        return false;
      } finally {
        endPendingAction("publish");

        if (saveStateRef.current.editRevision > revision) {
          contentSaveRequestedRef.current = true;
        }
      }
    });

    if (published && componentMountedRef.current && contentSaveRequestedRef.current) {
      void saveDraft({ silent: true });
    }
  }

  async function archiveCurrentPost() {
    if (hasUnsavedChanges(saveStateRef.current) || isSaveInFlight(saveStateRef.current)) {
      const saved = await saveDraft({ silent: true });

      if (!saved) {
        return;
      }
    }

    const archived = await enqueueExclusive(async () => {
      beginPendingAction("archive");
      setError("");
      const revision = saveStateRef.current.editRevision;

      try {
        await requestJson(`/admin/api/posts/${draftRef.current.id}/archive`, {
          method: "POST",
        });
        replaceDraft((current) => ({
          ...current,
          status: "archived",
        }));
        setNotice("발행취소 완료");
        return true;
      } catch (archiveError) {
        setError(errorMessage(archiveError));
        return false;
      } finally {
        endPendingAction("archive");

        if (saveStateRef.current.editRevision > revision) {
          contentSaveRequestedRef.current = true;
        }
      }
    });

    if (archived && componentMountedRef.current && contentSaveRequestedRef.current) {
      void saveDraft({ silent: true });
    }
  }

  async function deleteCurrentPost() {
    if (!window.confirm("이 글을 삭제할까요? 삭제한 글은 공개 목록과 관리자 목록에서 사라집니다.")) {
      return;
    }

    beginPendingAction("delete");
    setError("");

    try {
      await enqueueExclusive(() =>
        requestJson(`/admin/api/posts/${draftRef.current.id}/delete`, {
          method: "POST",
        }),
      );
      navigationBypassRef.current = true;
      window.location.href = "/admin?deleted=1";
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      endPendingAction("delete");
    }
  }

  async function openPreview() {
    if (hasUnsavedChanges(saveStateRef.current) || isSaveInFlight(saveStateRef.current)) {
      const saved = await saveDraft({ silent: true });

      if (!saved) {
        return;
      }
    }

    window.open(`/admin/posts/${draftRef.current.id}/preview`, "_blank", "noopener,noreferrer");
  }

  async function uploadAssetFile(file: File, role: AssetRole): Promise<UploadedAssetResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("role", role);
    formData.append("altText", file.name.replace(/\.[^.]+$/, ""));
    formData.append("caption", file.name);

    const asset = await requestJson<UploadedAssetResponse>(`/admin/api/posts/${draftRef.current.id}/assets`, {
      method: "POST",
      body: formData,
    });

    if (componentMountedRef.current) {
      setAssets((current) => [
        {
          id: `${asset.publicUrl}-${asset.uploadedAt}`,
          role: asset.role,
          publicUrl: asset.publicUrl,
          mimeType: asset.mimeType,
          altText: asset.altText,
          caption: asset.caption,
        },
        ...current,
      ]);
    }

    return asset;
  }

  async function uploadAssetWithPending(file: File, role: AssetRole): Promise<UploadedAssetResponse> {
    const pendingAction = `upload-${role}`;
    beginPendingAction(pendingAction);

    try {
      return await uploadAssetFile(file, role);
    } finally {
      endPendingAction(pendingAction);
    }
  }

  async function handleAssetInput(fileList: FileList | null, role: AssetRole) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    setError("");

    try {
      const asset = await uploadAssetWithPending(file, role);

      if (!componentMountedRef.current) {
        return;
      }

      if (role === "cover") {
        updateDraft("coverImageUrl", asset.publicUrl);
        setNotice("커버 이미지가 설정됐습니다.");
        return;
      }

      if (role === "embedded_pdf") {
        updateDraft("embeddedPdfUrl", asset.publicUrl);
        insertLinkAsset(asset.publicUrl, "PDF 보기");
        setNotice("PDF 임베드가 설정됐습니다.");
        return;
      }

      if (asset.mimeType.startsWith("image/")) {
        insertImageAsset(asset.publicUrl, file.name.replace(/\.[^.]+$/, ""));
      } else {
        insertLinkAsset(asset.publicUrl, file.name);
      }

      setNotice("본문에 자산을 삽입했습니다.");
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    }
  }

  function insertMarkdown(markdown: string) {
    if (!componentMountedRef.current) {
      return;
    }

    const editor = editorRef.current;

    if (editor) {
      editor.insertText(markdown);
      scheduleBodySyncFromEditor();
      return;
    }

    replaceDraft((current) => ({
      ...current,
      bodyMarkdown: `${current.bodyMarkdown}${markdown}`,
    }));
    markDirty();
  }

  function insertImageAsset(publicUrl: string, altText: string) {
    const editor = editorRef.current;

    if (editor) {
      editor.exec("addImage", {
        imageUrl: publicUrl,
        altText,
      });
      scheduleBodySyncFromEditor();
      return;
    }

    insertMarkdown(`\n\n![${altText}](${publicUrl})\n`);
  }

  function insertLinkAsset(publicUrl: string, label: string) {
    const editor = editorRef.current;

    if (editor) {
      editor.exec("addLink", {
        linkUrl: publicUrl,
        linkText: label,
      });
      scheduleBodySyncFromEditor();
      return;
    }

    insertMarkdown(`\n\n[${label}](${publicUrl})\n`);
  }

  function addTag() {
    const name = tagName.trim();
    const explicitSlug = tagSlug.trim();
    const generatedSlug = slugify(name);
    const slug = explicitSlug || generatedSlug;

    if (!name) {
      return;
    }

    if (!slug || !isValidSlug(slug)) {
      setError("한글 태그는 영문 slug를 같이 입력해야 합니다.");
      return;
    }

    replaceDraft((current) => ({
      ...current,
      tags: uniqueTags([...current.tags, { name, slug: slug === generatedSlug ? undefined : slug }]),
    }));
    setTagName("");
    setTagSlug("");
    setError("");
    markDirty();
  }

  function removeTag(index: number) {
    replaceDraft((current) => ({
      ...current,
      tags: current.tags.filter((_, tagIndex) => tagIndex !== index),
    }));
    markDirty();
  }

  async function createCategory() {
    const name = categoryName.trim();
    const slug = categorySlug.trim() || slugify(name);

    if (!name || !slug || !isValidSlug(slug)) {
      setError("카테고리 이름과 영문 slug를 확인해주세요.");
      return;
    }

    beginPendingAction("category");
    setError("");

    try {
      const category = await requestJson<AdminEditorCategory>("/admin/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          sortOrder: categories.length,
        }),
      });

      if (!componentMountedRef.current) {
        return;
      }

      setCategories((current) => [...current, category].sort((left, right) => left.sortOrder - right.sortOrder));
      updateDraft("categorySlug", category.slug);
      setCategoryName("");
      setCategorySlug("");
      categorySlugManuallyEditedRef.current = false;
      setCategoryFormOpen(false);
      setNotice("카테고리가 추가됐습니다.");
    } catch (categoryError) {
      setError(errorMessage(categoryError));
    } finally {
      endPendingAction("category");
    }
  }

  function toggleFullWidth() {
    setIsFullWidth((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(FULL_WIDTH_PREFERENCE_KEY, String(next));
      } catch {
        // The layout still updates even when the preference cannot be persisted.
      }

      return next;
    });
  }

  return (
    <div
      data-layout={isFullWidth ? "full" : "constrained"}
      data-testid="admin-editor-shell"
      className={`relative left-1/2 w-[calc(100vw-2rem)] -translate-x-1/2 pb-8 ${
        isFullWidth ? "max-w-none" : "max-w-[1200px]"
      }`}
    >
      <input
        ref={inlineImageInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        onChange={(event) => void handleAssetInput(event.currentTarget.files, "inline")}
      />
      <input
        ref={coverImageInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        onChange={(event) => void handleAssetInput(event.currentTarget.files, "cover")}
      />
      <input
        ref={pdfAttachmentInputRef}
        type="file"
        accept={PDF_ACCEPT}
        className="sr-only"
        onChange={(event) => void handleAssetInput(event.currentTarget.files, "attachment")}
      />
      <input
        ref={pdfEmbedInputRef}
        type="file"
        accept={PDF_ACCEPT}
        className="sr-only"
        onChange={(event) => void handleAssetInput(event.currentTarget.files, "embedded_pdf")}
      />

      <header className="relative z-20 -mx-4 border-b border-gh-border/70 bg-gh-bg/95 px-4 py-3 backdrop-blur md:sticky md:top-14 md:-mx-6 md:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gh-muted">
              <Link
                href="/admin"
                className="font-semibold text-gh-muted hover:text-gh-text"
              >
                목록
              </Link>
              <span>/</span>
              <span>{selectedCategory?.name ?? draft.categorySlug}</span>
              <span className={statusBadgeClass(draft.status)}>{statusLabel(draft.status)}</span>
              {publicPostUrl ? (
                <Link href={publicPostUrl} className="text-gh-accent hover:underline">
                  공개 글
                </Link>
              ) : null}
            </div>
            <input
              aria-label="글 제목"
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              className="w-full border-none bg-transparent text-3xl font-bold text-gh-text outline-none placeholder:text-gh-muted md:text-4xl"
              placeholder="제목을 입력하세요"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span aria-live="polite" className="min-w-24 text-sm text-gh-muted">
              {saveStateLabel(saveState, lastSavedAt)}
            </span>
            <button
              type="button"
              ref={mobileSettingsTriggerRef}
              aria-controls="admin-post-settings"
              aria-expanded={mobileSettingsOpen}
              aria-haspopup="dialog"
              aria-label="설정 열기"
              onClick={() => setMobileSettingsOpen(true)}
              className="inline-flex min-h-10 items-center rounded-md border border-gh-border px-3 py-2 text-sm font-semibold text-gh-text hover:bg-gh-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 xl:hidden"
            >
              설정
            </button>
            <button
              type="button"
              aria-pressed={isFullWidth}
              aria-label="전체 너비"
              onClick={toggleFullWidth}
              className={`hidden min-h-10 items-center rounded-md border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 xl:inline-flex ${
                isFullWidth
                  ? "border-gh-text bg-gh-text text-gh-bg"
                  : "border-gh-border text-gh-text hover:bg-gh-surface"
              }`}
            >
              전체 너비
            </button>
            <button
              type="button"
              aria-controls="admin-post-settings"
              aria-expanded={desktopSettingsVisible}
              aria-label="설정 패널"
              onClick={() => setDesktopSettingsVisible((current) => !current)}
              className="hidden min-h-10 items-center rounded-md border border-gh-border px-3 py-2 text-sm font-semibold text-gh-text hover:bg-gh-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 xl:inline-flex"
            >
              설정
            </button>
            <button
              type="button"
              onClick={() => void openPreview()}
              disabled={hasPendingAction}
              className="rounded-md border border-gh-border px-3 py-2 text-sm font-semibold text-gh-text hover:bg-gh-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              미리보기
            </button>
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={hasPendingAction}
              className="rounded-md border border-gh-border px-3 py-2 text-sm font-semibold text-gh-text hover:bg-gh-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              임시저장
            </button>
            <button
              type="button"
              onClick={() => void publishCurrentPost()}
              disabled={hasPendingAction}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              발행
            </button>
          </div>
        </div>
        {notice ? (
          <p role="status" className="mt-3 text-sm text-emerald-300">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}
      </header>

      <div
        className={`mt-6 grid gap-6 ${
          desktopSettingsVisible
            ? "xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]"
            : "xl:grid-cols-1"
        }`}
      >
        <section className="min-w-0" data-testid="admin-editor-writing-pane">
          <textarea
            aria-label="글 설명"
            value={draft.description}
            onChange={(event) => updateDraft("description", event.target.value)}
            className="mb-4 min-h-24 w-full resize-y rounded-md border border-gh-border bg-gh-surface px-4 py-3 text-base leading-relaxed text-gh-text outline-none focus:border-indigo-400"
            placeholder="검색과 공유에 쓰일 설명을 입력하세요"
          />
          <div className="admin-toast-editor rounded-lg border border-gh-border bg-white">
            {!editorReady ? <div className="p-6 text-sm text-slate-500">에디터를 불러오는 중입니다.</div> : null}
            <div ref={editorHostRef} data-testid="admin-toast-editor-host" />
          </div>
        </section>

        <MobileSettingsPortal active={mobileSettingsOpen}>
          <aside
            id="admin-post-settings"
            role={mobileSettingsOpen ? "dialog" : undefined}
            aria-modal={mobileSettingsOpen ? true : undefined}
            aria-labelledby={mobileSettingsOpen ? "admin-post-settings-title" : undefined}
            aria-label={mobileSettingsOpen ? undefined : "글 설정"}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setMobileSettingsOpen(false);
              }
            }}
            className={`max-xl:fixed max-xl:inset-0 max-xl:z-[70] max-xl:justify-end max-xl:bg-black/60 xl:sticky xl:top-40 xl:max-h-[calc(100dvh-11rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain ${
              mobileSettingsOpen ? "max-xl:flex" : "max-xl:hidden"
            } ${desktopSettingsVisible ? "xl:block" : "xl:hidden"}`}
          >
            <div
              ref={settingsPanelRef}
              tabIndex={-1}
              className="h-full w-[min(92vw,24rem)] overflow-y-auto overscroll-contain border-l border-gh-border bg-gh-bg p-4 shadow-2xl outline-none xl:h-auto xl:w-auto xl:overflow-visible xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none"
            >
              <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-gh-border bg-gh-bg pb-3 xl:hidden">
                <h2 id="admin-post-settings-title" className="font-bold text-gh-text">
                  글 설정
                </h2>
                <button
                  ref={settingsCloseRef}
                  type="button"
                  aria-label="설정 닫기"
                  onClick={() => setMobileSettingsOpen(false)}
                  className="inline-flex min-h-10 items-center rounded-md border border-gh-border px-3 py-2 text-sm font-semibold text-gh-text hover:bg-gh-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  닫기
                </button>
              </div>

              <div className="space-y-4">
                <Panel title="작성 설정">
                  <FieldLabel label="카테고리">
                    <div className="flex gap-2">
                      <select
                        value={draft.categorySlug}
                        onChange={(event) => updateDraft("categorySlug", event.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-gh-text outline-none focus:border-indigo-400"
                      >
                        {categories.map((category) => (
                          <option key={category.slug} value={category.slug}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setCategoryFormOpen((current) => !current)}
                        className="rounded-md border border-gh-border px-3 py-2 text-sm font-semibold text-gh-text hover:bg-gh-surface"
                        aria-label="카테고리 추가"
                      >
                        +
                      </button>
                    </div>
                  </FieldLabel>

                  {categoryFormOpen ? (
                    <div className="mt-3 space-y-2 rounded-md border border-gh-border bg-gh-bg p-3">
                      <input
                        aria-label="카테고리 이름"
                        value={categoryName}
                        onChange={(event) => {
                          const nextName = event.target.value;
                          setCategoryName(nextName);

                          if (!categorySlugManuallyEditedRef.current) {
                            setCategorySlug(slugify(nextName));
                          }
                        }}
                        className="w-full rounded-md border border-gh-border bg-gh-surface px-3 py-2 text-sm text-gh-text outline-none focus:border-indigo-400"
                        placeholder="카테고리 이름"
                      />
                      <input
                        aria-label="카테고리 slug"
                        value={categorySlug}
                        onChange={(event) => {
                          const nextSlug = event.target.value;
                          setCategorySlug(nextSlug);
                          categorySlugManuallyEditedRef.current = Boolean(
                            nextSlug && nextSlug !== slugify(categoryName),
                          );
                        }}
                        className="w-full rounded-md border border-gh-border bg-gh-surface px-3 py-2 text-sm text-gh-text outline-none focus:border-indigo-400"
                        placeholder="category-slug"
                      />
                      <button
                        type="button"
                        onClick={() => void createCategory()}
                        disabled={hasPendingAction}
                        className="w-full rounded-md bg-gh-text px-3 py-2 text-sm font-semibold text-gh-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        카테고리 추가
                      </button>
                    </div>
                  ) : null}

                  <FieldLabel label="요약">
                    <textarea
                      value={draft.excerpt}
                      onChange={(event) => updateDraft("excerpt", event.target.value)}
                      className="min-h-24 w-full resize-y rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm leading-relaxed text-gh-text outline-none focus:border-indigo-400"
                      placeholder="목록 카드에 보일 요약"
                    />
                  </FieldLabel>

                  <div className="grid grid-cols-2 gap-2">
                    <FieldLabel label="작성자">
                      <input
                        value={draft.author}
                        onChange={(event) => updateDraft("author", event.target.value)}
                        className="w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm text-gh-text outline-none focus:border-indigo-400"
                      />
                    </FieldLabel>
                    <FieldLabel label="형식">
                      <select
                        value={draft.extension}
                        onChange={(event) => updateDraft("extension", event.target.value as EditorMode)}
                        className="w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm text-gh-text outline-none focus:border-indigo-400"
                      >
                        <option value="mdx">mdx</option>
                        <option value="md">md</option>
                      </select>
                    </FieldLabel>
                  </div>
                </Panel>

                <Panel title="태그">
                  <div className="flex flex-wrap gap-2">
                    {draft.tags.map((tag, index) => (
                      <button
                        key={`${tag.name}-${tag.slug ?? index}`}
                        type="button"
                        onClick={() => removeTag(index)}
                        className="rounded-full border border-gh-border bg-gh-bg px-3 py-1 text-sm text-gh-text hover:border-red-400 hover:text-red-300"
                        title="클릭하면 삭제됩니다"
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2">
                    <input
                      aria-label="태그 이름"
                      value={tagName}
                      onChange={(event) => setTagName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          addTag();
                        }
                      }}
                      className="w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm text-gh-text outline-none focus:border-indigo-400"
                      placeholder="태그 이름"
                    />
                    <input
                      aria-label="태그 slug"
                      value={tagSlug}
                      onChange={(event) => setTagSlug(event.target.value)}
                      className="w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm text-gh-text outline-none focus:border-indigo-400"
                      placeholder="한글 태그용 slug"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="rounded-md border border-gh-border px-3 py-2 text-sm font-semibold text-gh-text hover:bg-gh-bg"
                    >
                      태그 추가
                    </button>
                  </div>
                </Panel>

                <Panel title="이미지와 PDF">
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => inlineImageInputRef.current?.click()}
                      disabled={hasPendingAction}
                      className="rounded-md border border-gh-border px-3 py-2 text-sm font-semibold text-gh-text hover:bg-gh-bg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      본문 이미지 삽입
                    </button>
                    <button
                      type="button"
                      onClick={() => coverImageInputRef.current?.click()}
                      disabled={hasPendingAction}
                      className="rounded-md border border-gh-border px-3 py-2 text-sm font-semibold text-gh-text hover:bg-gh-bg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      커버 이미지 설정
                    </button>
                    <button
                      type="button"
                      onClick={() => pdfAttachmentInputRef.current?.click()}
                      disabled={hasPendingAction}
                      className="rounded-md border border-gh-border px-3 py-2 text-sm font-semibold text-gh-text hover:bg-gh-bg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      PDF 링크 삽입
                    </button>
                    <button
                      type="button"
                      onClick={() => pdfEmbedInputRef.current?.click()}
                      disabled={hasPendingAction}
                      className="rounded-md border border-gh-border px-3 py-2 text-sm font-semibold text-gh-text hover:bg-gh-bg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      PDF 임베드 설정
                    </button>
                  </div>

                  {draft.coverImageUrl ? (
                    <div
                      className="mt-3 h-36 overflow-hidden rounded-md border border-gh-border bg-cover bg-center"
                      style={{ backgroundImage: `url("${draft.coverImageUrl.replaceAll('"', "%22")}")` }}
                    />
                  ) : null}

                  <label className="mt-3 flex items-center gap-2 text-sm text-gh-text">
                    <input
                      type="checkbox"
                      checked={draft.allowPdfDownload}
                      onChange={(event) => updateDraft("allowPdfDownload", event.target.checked)}
                    />
                    PDF 다운로드 허용
                  </label>
                </Panel>

                <Panel title="자산 목록">
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {assets.length === 0 ? <p className="text-sm text-gh-muted">업로드된 자산이 없습니다.</p> : null}
                    {assets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => insertAsset(asset)}
                        className="w-full rounded-md border border-gh-border bg-gh-bg p-3 text-left hover:border-indigo-400"
                      >
                        <span className="block text-xs font-semibold uppercase text-gh-muted">{asset.role}</span>
                        <span className="mt-1 block break-all font-mono text-xs text-gh-text">{asset.publicUrl}</span>
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel title="고급 설정">
                  <FieldLabel label="원문 URL">
                    <input
                      value={draft.originalUrl}
                      onChange={(event) => updateDraft("originalUrl", event.target.value)}
                      className="w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm text-gh-text outline-none focus:border-indigo-400"
                    />
                  </FieldLabel>
                  <FieldLabel label="커버 이미지 URL">
                    <input
                      value={draft.coverImageUrl}
                      onChange={(event) => updateDraft("coverImageUrl", event.target.value)}
                      className="w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm text-gh-text outline-none focus:border-indigo-400"
                    />
                  </FieldLabel>
                  <FieldLabel label="임베드 PDF URL">
                    <input
                      value={draft.embeddedPdfUrl}
                      onChange={(event) => updateDraft("embeddedPdfUrl", event.target.value)}
                      className="w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm text-gh-text outline-none focus:border-indigo-400"
                    />
                  </FieldLabel>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void archiveCurrentPost()}
                      disabled={hasPendingAction}
                      className="flex-1 rounded-md border border-amber-500/40 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      발행취소
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCurrentPost()}
                      disabled={hasPendingAction}
                      className="flex-1 rounded-md border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                </Panel>
              </div>
            </div>
          </aside>
        </MobileSettingsPortal>
      </div>
    </div>
  );

  function insertAsset(asset: AdminEditorAsset) {
    const label = asset.caption || asset.altText || asset.publicUrl.split("/").at(-1) || "asset";

    if (asset.mimeType?.startsWith("image/")) {
      insertImageAsset(asset.publicUrl, label);
      return;
    }

    insertLinkAsset(asset.publicUrl, label);
  }
}

function responsiveEditorLayout(editorWidth: number): {
  height: string;
  minHeight: string;
  previewStyle: "tab" | "vertical";
} {
  const isCompactViewport = window.innerWidth < MOBILE_EDITOR_BREAKPOINT;
  const reservedHeight = isCompactViewport ? 180 : 200;
  const maximumHeight = isCompactViewport ? 760 : 960;
  const height = Math.round(
    Math.min(maximumHeight, Math.max(440, window.innerHeight - reservedHeight)),
  );
  const preferredMinHeight = isCompactViewport ? 320 : 520;
  const minHeight = Math.min(preferredMinHeight, height - 75);

  return {
    height: `${height}px`,
    minHeight: `${minHeight}px`,
    previewStyle: editorWidth < EDITOR_VERTICAL_PREVIEW_MIN_WIDTH ? "tab" : "vertical",
  };
}

function MobileSettingsPortal({ active, children }: { active: boolean; children: React.ReactNode }) {
  if (active && typeof document !== "undefined") {
    return createPortal(children, document.body);
  }

  return children;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gh-border bg-gh-surface/80 p-4">
      <h2 className="text-sm font-bold text-gh-text">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gh-text">
      <span className="mb-1 block text-xs font-semibold uppercase text-gh-muted">{label}</span>
      {children}
    </label>
  );
}

function currentPayload(draft: AdminEditorPost, editor: ToastEditorInstance | null) {
  return {
    title: draft.title,
    description: draft.description,
    excerpt: draft.excerpt,
    bodyMarkdown: editor?.getMarkdown() ?? draft.bodyMarkdown,
    extension: draft.extension,
    author: draft.author,
    categorySlug: draft.categorySlug,
    tags: draft.tags,
    originalUrl: draft.originalUrl,
    coverImageUrl: draft.coverImageUrl,
    embeddedPdfUrl: draft.embeddedPdfUrl,
    allowPdfDownload: draft.allowPdfDownload,
  };
}

async function requestJson<T = unknown>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}.`);
  }

  return payload as T;
}

function uniqueTags(tags: AdminEditorTag[]): AdminEditorTag[] {
  const unique = new Map<string, AdminEditorTag>();

  for (const tag of tags) {
    unique.set(tag.slug ?? slugify(tag.name), tag);
  }

  return [...unique.values()];
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(value);
}

function statusLabel(status: PostStatus): string {
  switch (status) {
    case "published":
      return "발행됨";
    case "archived":
      return "발행취소";
    case "draft":
      return "초안";
    default:
      return status;
  }
}

function statusBadgeClass(status: PostStatus): string {
  const base = "rounded-full px-2 py-0.5 text-xs font-semibold";

  switch (status) {
    case "published":
      return `${base} bg-emerald-500/15 text-emerald-300`;
    case "archived":
      return `${base} bg-amber-500/15 text-amber-300`;
    default:
      return `${base} bg-gh-surface text-gh-muted`;
  }
}

function saveStateLabel(state: AdminEditorSaveState, savedAt: string | null): string {
  if (state.status === "saving") {
    return "저장 중";
  }

  if (state.status === "dirty") {
    return "저장 안 됨";
  }

  if (state.status === "error") {
    return "저장 실패";
  }

  if (savedAt) {
    return `저장됨 ${formatTime(savedAt)}`;
  }

  return "대기 중";
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
}
