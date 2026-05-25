"use client";

import { useMemo, useState } from "react";

const PHI = (1 + Math.sqrt(5)) / 2;
const UNIT_OPTIONS = ["px", "rem", "%"] as const;

type Unit = (typeof UNIT_OPTIONS)[number];
type FrameBasis = "width" | "height";

const numberFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 3,
});

function parsePositiveNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function formatNumber(value: number): string {
  return numberFormatter.format(Number(value.toFixed(3)));
}

function formatCssNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function formatMeasurement(value: number | null, unit: Unit): string {
  if (value === null) {
    return "-";
  }

  return `${formatNumber(value)}${unit}`;
}

type ResultRowProps = {
  label: string;
  value: string;
  detail: string;
};

function ResultRow({ label, value, detail }: ResultRowProps) {
  return (
    <div className="grid gap-2 border-b border-gh-border/50 py-4 last:border-b-0 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center">
      <div className="text-sm font-medium text-gh-muted">{label}</div>
      <div className="font-mono text-lg font-semibold text-gh-text">{value}</div>
      <div className="font-mono text-xs text-gh-muted">{detail}</div>
    </div>
  );
}

type CopyButtonProps = {
  copyKey: string;
  copiedKey: string | null;
  label: string;
  value: string;
  onCopy: (copyKey: string, value: string) => void;
};

function CopyButton({ copyKey, copiedKey, label, value, onCopy }: CopyButtonProps) {
  return (
    <button
      type="button"
      className="rounded-lg border border-gh-border bg-gh-bg px-3 py-2 text-left font-mono text-xs text-gh-text transition-colors hover:border-cyan-500/40 hover:bg-gh-hover"
      onClick={() => onCopy(copyKey, value)}
    >
      <span className="block text-[11px] font-semibold uppercase text-cyan-400">
        {copiedKey === copyKey ? "복사됨" : label}
      </span>
      <span className="mt-1 block break-all">{value}</span>
    </button>
  );
}

export function GoldenRatioCalculator() {
  const [baseValue, setBaseValue] = useState("16");
  const [unit, setUnit] = useState<Unit>("px");
  const [frameBasis, setFrameBasis] = useState<FrameBasis>("width");
  const [frameValue, setFrameValue] = useState("1440");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const baseNumber = parsePositiveNumber(baseValue);
  const frameNumber = parsePositiveNumber(frameValue);

  const scaleRows = useMemo(() => {
    const smaller = baseNumber === null ? null : baseNumber / PHI;
    const larger = baseNumber === null ? null : baseNumber * PHI;
    const doubleLarger = baseNumber === null ? null : baseNumber * PHI * PHI;

    return [
      {
        label: "작은 값",
        value: formatMeasurement(smaller, unit),
        detail: `${baseValue || "-"} / 1.618`,
      },
      {
        label: "기준값",
        value: formatMeasurement(baseNumber, unit),
        detail: baseValue || "-",
      },
      {
        label: "큰 값",
        value: formatMeasurement(larger, unit),
        detail: `${baseValue || "-"} * 1.618`,
      },
      {
        label: "확장 값",
        value: formatMeasurement(doubleLarger, unit),
        detail: `${baseValue || "-"} * 2.618`,
      },
    ];
  }, [baseNumber, baseValue, unit]);

  const frame = useMemo(() => {
    if (frameNumber === null) {
      return null;
    }

    if (frameBasis === "width") {
      return {
        landscapeWidth: frameNumber,
        landscapeHeight: frameNumber / PHI,
        portraitWidth: frameNumber,
        portraitHeight: frameNumber * PHI,
      };
    }

    return {
      landscapeWidth: frameNumber * PHI,
      landscapeHeight: frameNumber,
      portraitWidth: frameNumber / PHI,
      portraitHeight: frameNumber,
    };
  }, [frameBasis, frameNumber]);

  const cssSnippets = useMemo(() => {
    if (frame === null) {
      return [
        { key: "landscape-ratio", label: "가로 비율", value: "aspect-ratio: 1.618 / 1;" },
        { key: "portrait-ratio", label: "세로 비율", value: "aspect-ratio: 1 / 1.618;" },
      ];
    }

    return [
      { key: "landscape-ratio", label: "가로 비율", value: "aspect-ratio: 1.618 / 1;" },
      {
        key: "landscape-size",
        label: "가로 크기",
        value: `width: ${formatCssNumber(frame.landscapeWidth)}${unit}; height: ${formatCssNumber(frame.landscapeHeight)}${unit};`,
      },
      { key: "portrait-ratio", label: "세로 비율", value: "aspect-ratio: 1 / 1.618;" },
      {
        key: "portrait-size",
        label: "세로 크기",
        value: `width: ${formatCssNumber(frame.portraitWidth)}${unit}; height: ${formatCssNumber(frame.portraitHeight)}${unit};`,
      },
    ];
  }, [frame, unit]);

  function copyText(copyKey: string, value: string) {
    if (!navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(copyKey);
      window.setTimeout(() => setCopiedKey(null), 1200);
    });
  }

  return (
    <div className="space-y-6" data-testid="golden-ratio-calculator">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-lg border border-gh-border/70 bg-gh-surface/60 p-5 backdrop-blur-md">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gh-text">스케일</h2>
            <p className="mt-1 text-sm text-gh-muted">폰트, 간격, 컴포넌트 크기를 1.618 기준으로 계산합니다.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gh-muted">기준값</span>
              <input
                className="h-11 w-full rounded-lg border border-gh-border bg-gh-bg px-3 font-mono text-gh-text outline-none transition-colors focus:border-cyan-500"
                inputMode="decimal"
                min="0"
                type="number"
                value={baseValue}
                onChange={(event) => setBaseValue(event.target.value)}
              />
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium text-gh-muted">단위</span>
              <div className="grid h-11 grid-cols-3 rounded-lg border border-gh-border bg-gh-bg p-1">
                {UNIT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-md px-3 text-sm font-semibold transition-colors ${
                      unit === option ? "bg-cyan-500 text-white" : "text-gh-muted hover:bg-gh-hover hover:text-gh-text"
                    }`}
                    onClick={() => setUnit(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-gh-border/60 bg-gh-bg/60">
            <div className="px-4">
              {scaleRows.map((row) => (
                <ResultRow key={row.label} label={row.label} value={row.value} detail={row.detail} />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gh-border/70 bg-gh-surface/60 p-5 backdrop-blur-md">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gh-text">프레임</h2>
            <p className="mt-1 text-sm text-gh-muted">가로형과 세로형 화면 비율을 같은 기준값에서 함께 계산합니다.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gh-muted">기준 길이</span>
              <input
                className="h-11 w-full rounded-lg border border-gh-border bg-gh-bg px-3 font-mono text-gh-text outline-none transition-colors focus:border-amber-500"
                inputMode="decimal"
                min="0"
                type="number"
                value={frameValue}
                onChange={(event) => setFrameValue(event.target.value)}
              />
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium text-gh-muted">기준축</span>
              <div className="grid h-11 grid-cols-2 rounded-lg border border-gh-border bg-gh-bg p-1">
                {(["width", "height"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-md px-3 text-sm font-semibold transition-colors ${
                      frameBasis === option ? "bg-amber-500 text-white" : "text-gh-muted hover:bg-gh-hover hover:text-gh-text"
                    }`}
                    onClick={() => setFrameBasis(option)}
                  >
                    {option === "width" ? "가로" : "세로"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gh-border/60 bg-gh-bg/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-gh-text">가로형</h3>
                <span className="font-mono text-xs text-amber-400">1.618:1</span>
              </div>
              <div className="aspect-[1.618/1] rounded-md border border-amber-500/30 bg-amber-500/10" />
              <p className="mt-3 font-mono text-sm text-gh-text">
                {frame === null
                  ? "-"
                  : `${formatMeasurement(frame.landscapeWidth, unit)} x ${formatMeasurement(frame.landscapeHeight, unit)}`}
              </p>
            </div>

            <div className="rounded-lg border border-gh-border/60 bg-gh-bg/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-gh-text">세로형</h3>
                <span className="font-mono text-xs text-cyan-400">1:1.618</span>
              </div>
              <div className="mx-auto aspect-[1/1.618] h-36 rounded-md border border-cyan-500/30 bg-cyan-500/10" />
              <p className="mt-3 font-mono text-sm text-gh-text">
                {frame === null
                  ? "-"
                  : `${formatMeasurement(frame.portraitWidth, unit)} x ${formatMeasurement(frame.portraitHeight, unit)}`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gh-border/70 bg-gh-surface/60 p-5 backdrop-blur-md">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gh-text">CSS</h2>
            <p className="mt-1 text-sm text-gh-muted">계산된 비율과 크기를 바로 복사합니다.</p>
          </div>
          <div className="font-mono text-sm text-gh-muted">phi = {PHI.toFixed(6)}</div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {cssSnippets.map((snippet) => (
            <CopyButton
              key={snippet.key}
              copyKey={snippet.key}
              copiedKey={copiedKey}
              label={snippet.label}
              value={snippet.value}
              onCopy={copyText}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
