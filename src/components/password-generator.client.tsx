"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PASSWORD_SYMBOLS,
  estimatePasswordStrength,
  generateRandomPassword,
  getInvalidSymbolCharacters,
  normalizeSymbolCharacters,
  PASSWORD_CHARACTER_GROUPS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type PasswordCharacterGroup,
  type PasswordStrength,
} from "@/lib/password-generator";

const DEFAULT_LENGTH = 24;

const DEFAULT_SELECTED_GROUPS: Record<PasswordCharacterGroup, boolean> = {
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
};

type Notice = {
  tone: "success" | "warning";
  message: string;
};

function getValidationMessage(lengthInput: string, selectedGroupCount: number, symbolsSelected: boolean, symbolCharacters: string): string | null {
  const length = Number(lengthInput);

  if (!Number.isInteger(length)) {
    return "길이는 정수로 입력해야 합니다.";
  }

  if (length < PASSWORD_MIN_LENGTH) {
    return `${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  }

  if (length > PASSWORD_MAX_LENGTH) {
    return `${PASSWORD_MAX_LENGTH}자 이하로 설정해야 합니다.`;
  }

  if (selectedGroupCount === 0) {
    return "문자 종류를 하나 이상 선택해야 합니다.";
  }

  if (length < selectedGroupCount) {
    return "길이는 선택한 문자 종류 수 이상이어야 합니다.";
  }

  if (!symbolsSelected) {
    return null;
  }

  if (normalizeSymbolCharacters(symbolCharacters) === "") {
    return "특수문자는 하나 이상 입력해야 합니다.";
  }

  const invalidSymbols = getInvalidSymbolCharacters(symbolCharacters);

  if (invalidSymbols.length > 0) {
    return `특수문자는 ASCII 기호만 사용할 수 있습니다. 제외할 문자: ${formatInvalidSymbolCharacters(invalidSymbols)}`;
  }

  return null;
}

function formatInvalidSymbolCharacters(characters: string[]): string {
  const visibleCharacters = characters.slice(0, 6).map((character) => {
    if (character === " ") {
      return "공백";
    }

    return character;
  });

  return `${visibleCharacters.join(", ")}${characters.length > visibleCharacters.length ? "..." : ""}`;
}

function clampLength(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_LENGTH;
  }

  return Math.min(PASSWORD_MAX_LENGTH, Math.max(PASSWORD_MIN_LENGTH, Math.round(value)));
}

function getStrengthToneClasses(level: PasswordStrength["level"]): string {
  if (level === "strong") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (level === "medium") {
    return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

function getStrengthBarClass(level: PasswordStrength["level"]): string {
  if (level === "strong") {
    return "w-full bg-emerald-500";
  }

  if (level === "medium") {
    return "w-2/3 bg-cyan-500";
  }

  return "w-1/3 bg-amber-500";
}

export function PasswordGenerator() {
  const [lengthInput, setLengthInput] = useState(String(DEFAULT_LENGTH));
  const [selectedGroups, setSelectedGroups] = useState<Record<PasswordCharacterGroup, boolean>>(DEFAULT_SELECTED_GROUPS);
  const [symbolCharacters, setSymbolCharacters] = useState(DEFAULT_PASSWORD_SYMBOLS);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  const selectedGroupKeys = useMemo(
    () => PASSWORD_CHARACTER_GROUPS.filter((group) => selectedGroups[group.key]).map((group) => group.key),
    [selectedGroups],
  );
  const lengthNumber = Number(lengthInput);
  const rangeValue = Number.isInteger(lengthNumber) ? clampLength(lengthNumber) : DEFAULT_LENGTH;
  const normalizedSymbolCharacters = normalizeSymbolCharacters(symbolCharacters);
  const validationMessage = getValidationMessage(lengthInput, selectedGroupKeys.length, selectedGroups.symbols, symbolCharacters);
  const canGenerate = validationMessage === null;
  const passwordStrength = useMemo(() => {
    if (!canGenerate) {
      return null;
    }

    return estimatePasswordStrength({
      length: Number(lengthInput),
      groups: selectedGroupKeys,
      symbolCharacters,
    });
  }, [canGenerate, lengthInput, selectedGroupKeys, symbolCharacters]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  function updateLength(value: string) {
    setLengthInput(value);
    setCopied(false);
    setNotice(null);
  }

  function updateSymbolCharacters(value: string) {
    setSymbolCharacters(value);
    setCopied(false);
    setNotice(null);
  }

  function resetSymbolCharacters() {
    setSymbolCharacters(DEFAULT_PASSWORD_SYMBOLS);
    setCopied(false);
    setNotice(null);
  }

  function toggleGroup(groupKey: PasswordCharacterGroup) {
    setSelectedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
    setCopied(false);
    setNotice(null);
  }

  function generatePassword() {
    if (!canGenerate) {
      return;
    }

    const generatedPassword = generateRandomPassword({
      length: Number(lengthInput),
      groups: selectedGroupKeys,
      symbolCharacters,
    });

    setPassword(generatedPassword);
    void copyGeneratedPassword(generatedPassword);
  }

  async function copyGeneratedPassword(value: string) {
    if (!navigator.clipboard) {
      setCopied(false);
      setNotice({
        tone: "warning",
        message: "비밀번호는 생성됐지만 브라우저에서 자동 복사를 지원하지 않습니다.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setNotice({
        tone: "success",
        message: "비밀번호를 생성하고 클립보드에 복사했습니다.",
      });

      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }

      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
      setNotice({
        tone: "warning",
        message: "비밀번호는 생성됐지만 자동 복사 권한을 받을 수 없습니다.",
      });
    }
  }

  function copyPassword() {
    if (!password) {
      return;
    }

    void copyGeneratedPassword(password);
  }

  return (
    <div className="space-y-6" data-testid="password-generator">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-lg border border-gh-border/70 bg-gh-surface/60 p-5 backdrop-blur-md">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gh-text">조건</h2>
            <p className="mt-1 text-sm text-gh-muted">길이와 포함할 문자 종류를 정합니다.</p>
          </div>

          <div className="space-y-5">
            <label className="block space-y-3">
              <span className="text-sm font-medium text-gh-muted">글자 수</span>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem] sm:items-center">
                <input
                  aria-label="비밀번호 글자 수"
                  className="h-2 w-full accent-cyan-500"
                  max={PASSWORD_MAX_LENGTH}
                  min={PASSWORD_MIN_LENGTH}
                  type="range"
                  value={rangeValue}
                  onChange={(event) => updateLength(event.target.value)}
                />
                <input
                  className="h-11 w-full rounded-lg border border-gh-border bg-gh-bg px-3 font-mono text-gh-text outline-none transition-colors focus:border-cyan-500"
                  data-testid="password-length-input"
                  inputMode="numeric"
                  max={PASSWORD_MAX_LENGTH}
                  min={PASSWORD_MIN_LENGTH}
                  type="number"
                  value={lengthInput}
                  onChange={(event) => updateLength(event.target.value)}
                />
              </div>
              <span className="block text-xs text-gh-muted">최대 {PASSWORD_MAX_LENGTH}자</span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {PASSWORD_CHARACTER_GROUPS.map((group) => {
                const checked = selectedGroups[group.key];

                return (
                  <label
                    key={group.key}
                    className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                      checked
                        ? "border-cyan-500/40 bg-cyan-500/10"
                        : "border-gh-border bg-gh-bg/70 hover:border-gh-muted/70 hover:bg-gh-hover"
                    }`}
                  >
                    <input
                      checked={checked}
                      className="h-4 w-4 accent-cyan-500"
                      type="checkbox"
                      onChange={() => toggleGroup(group.key)}
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold text-gh-text">{group.label}</span>
                      <span className="block font-mono text-xs text-gh-muted">{group.sample}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            {selectedGroups.symbols ? (
              <label className="block space-y-2">
                <span className="flex items-center justify-between gap-3 text-sm font-medium text-gh-muted">
                  <span>사용할 특수문자</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-cyan-400">{normalizedSymbolCharacters.length}개</span>
                    <button
                      className="rounded-md border border-gh-border bg-gh-bg px-2 py-1 text-xs font-semibold text-gh-text transition-colors hover:border-cyan-500/40 hover:bg-gh-hover"
                      data-testid="password-symbols-reset-button"
                      type="button"
                      onClick={resetSymbolCharacters}
                    >
                      기본값
                    </button>
                  </span>
                </span>
                <input
                  className="h-11 w-full rounded-lg border border-gh-border bg-gh-bg px-3 font-mono text-gh-text outline-none transition-colors focus:border-cyan-500"
                  data-testid="password-symbols-input"
                  placeholder="!@._#$"
                  spellCheck={false}
                  type="text"
                  value={symbolCharacters}
                  onChange={(event) => updateSymbolCharacters(event.target.value)}
                />
                <span className="block text-xs text-gh-muted">
                  기본 예시: <span className="font-mono text-cyan-400">! @ . _ # $</span>. 입력한 문자 안에서만 특수문자를 뽑습니다.
                </span>
              </label>
            ) : null}

            {validationMessage ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300" data-testid="password-validation-message">
                {validationMessage}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-gh-border/70 bg-gh-surface/60 p-5 backdrop-blur-md">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gh-text">결과</h2>
              <p className="mt-1 text-sm text-gh-muted">생성된 비밀번호는 저장하지 않습니다.</p>
            </div>
            <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-xs text-emerald-300">
              {selectedGroupKeys.length} rules
            </span>
          </div>

          <div className="rounded-lg border border-gh-border/70 bg-gh-bg p-4">
            <code
              className={`block min-h-24 break-all font-mono text-lg leading-relaxed ${
                password ? "text-gh-text" : "text-gh-muted"
              }`}
              data-testid="password-output"
            >
              {password || "생성 대기"}
            </code>
          </div>

          <div className="mt-4 rounded-lg border border-gh-border/70 bg-gh-bg p-4" data-testid="password-strength">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gh-muted">강도</span>
              {passwordStrength ? (
                <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${getStrengthToneClasses(passwordStrength.level)}`}>
                  {passwordStrength.label}
                </span>
              ) : (
                <span className="rounded-lg border border-gh-border px-2 py-1 text-xs font-semibold text-gh-muted">계산 대기</span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gh-surface">
              <div className={`h-full rounded-full transition-all ${passwordStrength ? getStrengthBarClass(passwordStrength.level) : "w-0"}`} />
            </div>
            <p className="mt-3 font-mono text-xs text-gh-muted">
              {passwordStrength
                ? `${passwordStrength.entropyBits.toFixed(1)} bits / 후보 ${passwordStrength.characterSetSize}자`
                : "조건을 먼저 맞춰주세요."}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <button
              className="h-11 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-gh-border disabled:text-gh-muted"
              data-testid="password-generate-button"
              disabled={!canGenerate}
              type="button"
              onClick={generatePassword}
            >
              생성
            </button>
            <button
              className="h-11 rounded-lg border border-gh-border bg-gh-bg px-4 text-sm font-semibold text-gh-text transition-colors hover:border-emerald-500/40 hover:bg-gh-hover disabled:cursor-not-allowed disabled:text-gh-muted"
              disabled={!password}
              type="button"
              onClick={copyPassword}
            >
              {copied ? "복사됨" : "복사"}
            </button>
          </div>

          {notice ? (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                notice.tone === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
              data-testid="password-copy-alert"
              role="alert"
            >
              {notice.message}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
