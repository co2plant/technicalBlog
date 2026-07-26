"use client";

import { useRef, useSyncExternalStore } from "react";

const SEOUL_TIME_ZONE = "Asia/Seoul";
const REFRESH_INTERVAL_MS = 30_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function AdminSessionTimer({ expiresAt }: { expiresAt: number }) {
  const expiryMs = expiresAt * 1000;
  const expiryDate = new Date(expiryMs);
  const now = useClientNow();

  const referenceNow = new Date(now ?? expiryMs);
  const absolute = `${relativeDayLabel(expiryDate, referenceNow)} ${formatClock(expiryDate)}`;
  const remainingMs = now === null ? null : expiryMs - now;
  const expired = remainingMs !== null && remainingMs <= 0;

  return (
    <span
      aria-live="polite"
      className={`text-xs ${expired ? "font-semibold text-red-400" : "text-gh-muted"}`}
    >
      {expired
        ? "세션 만료됨 · 다시 로그인이 필요합니다"
        : remainingMs === null
          ? `세션 만료 ${absolute}`
          : `세션 만료까지 ${formatRemaining(remainingMs)} (${absolute})`}
    </span>
  );
}

function useClientNow(): number | null {
  const snapshotRef = useRef<number | null>(null);

  return useSyncExternalStore(
    (onChange) => {
      snapshotRef.current = Date.now();
      onChange();
      const intervalId = window.setInterval(() => {
        snapshotRef.current = Date.now();
        onChange();
      }, REFRESH_INTERVAL_MS);
      return () => window.clearInterval(intervalId);
    },
    () => snapshotRef.current,
    () => null,
  );
}

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function seoulDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function relativeDayLabel(target: Date, now: Date): string {
  const targetKey = seoulDayKey(target);

  if (targetKey === seoulDayKey(now)) {
    return "오늘";
  }

  if (targetKey === seoulDayKey(new Date(now.getTime() + DAY_MS))) {
    return "내일";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL_TIME_ZONE,
    month: "long",
    day: "numeric",
  }).format(target);
}

function formatRemaining(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }

  if (minutes > 0) {
    return `${minutes}분`;
  }

  return "1분 미만";
}
