"use client";

import { useFormStatus } from "react-dom";

export function CreatePostButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "생성 중..." : "새 글"}
    </button>
  );
}
