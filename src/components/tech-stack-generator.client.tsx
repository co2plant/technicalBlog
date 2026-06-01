"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";

type SkillIconsTheme = "light" | "dark";

type TechStackItem = {
  id: string;
  name: string;
  skillIconId: string;
  shieldLogo: string;
  version: string;
  color: string;
  logoColor: string;
};

type TechStackField = keyof Omit<TechStackItem, "id">;

type TechCategory = "language" | "frontend" | "backend" | "database" | "infra" | "tooling" | "mobile" | "ai";

type TechCatalogItem = {
  aliases: string[];
  category: TechCategory;
  color: string;
  logoColor: string;
  name: string;
  shieldLogo: string;
  skillIconId: string;
};

type SvgAsset = {
  height: number;
  href: string;
  width: number;
};

const TECH_CATEGORY_LABELS: Record<TechCategory | "all", string> = {
  all: "전체",
  ai: "AI",
  backend: "Backend",
  database: "Database",
  frontend: "Frontend",
  infra: "Infra",
  language: "Language",
  mobile: "Mobile",
  tooling: "Tooling",
};

const TECH_CATEGORIES: Array<TechCategory | "all"> = [
  "all",
  "frontend",
  "backend",
  "language",
  "database",
  "infra",
  "tooling",
  "mobile",
  "ai",
];

const TECH_CATALOG: TechCatalogItem[] = [
  {
    name: "TypeScript",
    skillIconId: "ts",
    shieldLogo: "typescript",
    color: "3178C6",
    logoColor: "white",
    category: "language",
    aliases: ["ts"],
  },
  {
    name: "JavaScript",
    skillIconId: "js",
    shieldLogo: "javascript",
    color: "F7DF1E",
    logoColor: "black",
    category: "language",
    aliases: ["js", "ecmascript"],
  },
  {
    name: "Java",
    skillIconId: "java",
    shieldLogo: "openjdk",
    color: "ED8B00",
    logoColor: "white",
    category: "language",
    aliases: ["openjdk", "jvm"],
  },
  {
    name: "Kotlin",
    skillIconId: "kotlin",
    shieldLogo: "kotlin",
    color: "7F52FF",
    logoColor: "white",
    category: "language",
    aliases: ["kt"],
  },
  {
    name: "Python",
    skillIconId: "python",
    shieldLogo: "python",
    color: "3776AB",
    logoColor: "white",
    category: "language",
    aliases: ["py"],
  },
  {
    name: "Go",
    skillIconId: "go",
    shieldLogo: "go",
    color: "00ADD8",
    logoColor: "white",
    category: "language",
    aliases: ["golang"],
  },
  {
    name: "Rust",
    skillIconId: "rust",
    shieldLogo: "rust",
    color: "000000",
    logoColor: "white",
    category: "language",
    aliases: ["rs"],
  },
  {
    name: "React",
    skillIconId: "react",
    shieldLogo: "react",
    color: "61DAFB",
    logoColor: "black",
    category: "frontend",
    aliases: ["reactjs"],
  },
  {
    name: "Next.js",
    skillIconId: "nextjs",
    shieldLogo: "nextdotjs",
    color: "000000",
    logoColor: "white",
    category: "frontend",
    aliases: ["next", "nextjs"],
  },
  {
    name: "Vue",
    skillIconId: "vue",
    shieldLogo: "vuedotjs",
    color: "4FC08D",
    logoColor: "white",
    category: "frontend",
    aliases: ["vuejs"],
  },
  {
    name: "Nuxt",
    skillIconId: "nuxtjs",
    shieldLogo: "nuxt",
    color: "00DC82",
    logoColor: "white",
    category: "frontend",
    aliases: ["nuxtjs"],
  },
  {
    name: "Angular",
    skillIconId: "angular",
    shieldLogo: "angular",
    color: "DD0031",
    logoColor: "white",
    category: "frontend",
    aliases: ["angularjs"],
  },
  {
    name: "Svelte",
    skillIconId: "svelte",
    shieldLogo: "svelte",
    color: "FF3E00",
    logoColor: "white",
    category: "frontend",
    aliases: ["sveltekit"],
  },
  {
    name: "Tailwind CSS",
    skillIconId: "tailwind",
    shieldLogo: "tailwindcss",
    color: "06B6D4",
    logoColor: "white",
    category: "frontend",
    aliases: ["tailwind", "css"],
  },
  {
    name: "HTML",
    skillIconId: "html",
    shieldLogo: "html5",
    color: "E34F26",
    logoColor: "white",
    category: "frontend",
    aliases: ["html5"],
  },
  {
    name: "CSS",
    skillIconId: "css",
    shieldLogo: "css",
    color: "663399",
    logoColor: "white",
    category: "frontend",
    aliases: ["css3"],
  },
  {
    name: "Sass",
    skillIconId: "sass",
    shieldLogo: "sass",
    color: "CC6699",
    logoColor: "white",
    category: "frontend",
    aliases: ["scss"],
  },
  {
    name: "Node.js",
    skillIconId: "nodejs",
    shieldLogo: "nodedotjs",
    color: "5FA04E",
    logoColor: "white",
    category: "backend",
    aliases: ["node", "nodejs"],
  },
  {
    name: "Express",
    skillIconId: "express",
    shieldLogo: "express",
    color: "000000",
    logoColor: "white",
    category: "backend",
    aliases: ["expressjs"],
  },
  {
    name: "NestJS",
    skillIconId: "nestjs",
    shieldLogo: "nestjs",
    color: "E0234E",
    logoColor: "white",
    category: "backend",
    aliases: ["nest"],
  },
  {
    name: "Spring Boot",
    skillIconId: "spring",
    shieldLogo: "springboot",
    color: "6DB33F",
    logoColor: "white",
    category: "backend",
    aliases: ["spring", "springboot"],
  },
  {
    name: "Django",
    skillIconId: "django",
    shieldLogo: "django",
    color: "092E20",
    logoColor: "white",
    category: "backend",
    aliases: ["python django"],
  },
  {
    name: "Flask",
    skillIconId: "flask",
    shieldLogo: "flask",
    color: "000000",
    logoColor: "white",
    category: "backend",
    aliases: ["python flask"],
  },
  {
    name: "FastAPI",
    skillIconId: "fastapi",
    shieldLogo: "fastapi",
    color: "009688",
    logoColor: "white",
    category: "backend",
    aliases: ["fast api"],
  },
  {
    name: "GraphQL",
    skillIconId: "graphql",
    shieldLogo: "graphql",
    color: "E10098",
    logoColor: "white",
    category: "backend",
    aliases: ["gql"],
  },
  {
    name: "MySQL",
    skillIconId: "mysql",
    shieldLogo: "mysql",
    color: "4479A1",
    logoColor: "white",
    category: "database",
    aliases: ["mariadb", "sql"],
  },
  {
    name: "PostgreSQL",
    skillIconId: "postgres",
    shieldLogo: "postgresql",
    color: "4169E1",
    logoColor: "white",
    category: "database",
    aliases: ["postgres", "psql"],
  },
  {
    name: "MongoDB",
    skillIconId: "mongodb",
    shieldLogo: "mongodb",
    color: "47A248",
    logoColor: "white",
    category: "database",
    aliases: ["mongo"],
  },
  {
    name: "Redis",
    skillIconId: "redis",
    shieldLogo: "redis",
    color: "FF4438",
    logoColor: "white",
    category: "database",
    aliases: ["cache"],
  },
  {
    name: "SQLite",
    skillIconId: "sqlite",
    shieldLogo: "sqlite",
    color: "003B57",
    logoColor: "white",
    category: "database",
    aliases: ["sql lite"],
  },
  {
    name: "Firebase",
    skillIconId: "firebase",
    shieldLogo: "firebase",
    color: "DD2C00",
    logoColor: "white",
    category: "database",
    aliases: ["firestore"],
  },
  {
    name: "Docker",
    skillIconId: "docker",
    shieldLogo: "docker",
    color: "2496ED",
    logoColor: "white",
    category: "infra",
    aliases: ["container"],
  },
  {
    name: "Kubernetes",
    skillIconId: "kubernetes",
    shieldLogo: "kubernetes",
    color: "326CE5",
    logoColor: "white",
    category: "infra",
    aliases: ["k8s"],
  },
  {
    name: "AWS",
    skillIconId: "aws",
    shieldLogo: "amazonwebservices",
    color: "232F3E",
    logoColor: "white",
    category: "infra",
    aliases: ["amazon web services"],
  },
  {
    name: "GCP",
    skillIconId: "gcp",
    shieldLogo: "googlecloud",
    color: "4285F4",
    logoColor: "white",
    category: "infra",
    aliases: ["google cloud"],
  },
  {
    name: "Azure",
    skillIconId: "azure",
    shieldLogo: "azuredevops",
    color: "0078D7",
    logoColor: "white",
    category: "infra",
    aliases: ["microsoft azure"],
  },
  {
    name: "Vercel",
    skillIconId: "vercel",
    shieldLogo: "vercel",
    color: "000000",
    logoColor: "white",
    category: "infra",
    aliases: ["deployment"],
  },
  {
    name: "Nginx",
    skillIconId: "nginx",
    shieldLogo: "nginx",
    color: "009639",
    logoColor: "white",
    category: "infra",
    aliases: ["web server"],
  },
  {
    name: "Linux",
    skillIconId: "linux",
    shieldLogo: "linux",
    color: "FCC624",
    logoColor: "black",
    category: "infra",
    aliases: ["ubuntu", "server"],
  },
  {
    name: "Git",
    skillIconId: "git",
    shieldLogo: "git",
    color: "F05032",
    logoColor: "white",
    category: "tooling",
    aliases: ["vcs"],
  },
  {
    name: "GitHub",
    skillIconId: "github",
    shieldLogo: "github",
    color: "181717",
    logoColor: "white",
    category: "tooling",
    aliases: ["github"],
  },
  {
    name: "GitHub Actions",
    skillIconId: "githubactions",
    shieldLogo: "githubactions",
    color: "2088FF",
    logoColor: "white",
    category: "tooling",
    aliases: ["actions", "ci", "cd"],
  },
  {
    name: "Vite",
    skillIconId: "vite",
    shieldLogo: "vite",
    color: "646CFF",
    logoColor: "white",
    category: "tooling",
    aliases: ["bundler"],
  },
  {
    name: "Vitest",
    skillIconId: "vitest",
    shieldLogo: "vitest",
    color: "6E9F18",
    logoColor: "white",
    category: "tooling",
    aliases: ["test"],
  },
  {
    name: "Playwright",
    skillIconId: "playwright",
    shieldLogo: "playwright",
    color: "2EAD33",
    logoColor: "white",
    category: "tooling",
    aliases: ["e2e"],
  },
  {
    name: "Postman",
    skillIconId: "postman",
    shieldLogo: "postman",
    color: "FF6C37",
    logoColor: "white",
    category: "tooling",
    aliases: ["api client"],
  },
  {
    name: "Figma",
    skillIconId: "figma",
    shieldLogo: "figma",
    color: "F24E1E",
    logoColor: "white",
    category: "tooling",
    aliases: ["design"],
  },
  {
    name: "Android",
    skillIconId: "androidstudio",
    shieldLogo: "android",
    color: "3DDC84",
    logoColor: "black",
    category: "mobile",
    aliases: ["android studio"],
  },
  {
    name: "Flutter",
    skillIconId: "flutter",
    shieldLogo: "flutter",
    color: "02569B",
    logoColor: "white",
    category: "mobile",
    aliases: ["dart"],
  },
  {
    name: "TensorFlow",
    skillIconId: "tensorflow",
    shieldLogo: "tensorflow",
    color: "FF6F00",
    logoColor: "white",
    category: "ai",
    aliases: ["ml", "machine learning"],
  },
  {
    name: "PyTorch",
    skillIconId: "pytorch",
    shieldLogo: "pytorch",
    color: "EE4C2C",
    logoColor: "white",
    category: "ai",
    aliases: ["torch", "deep learning"],
  },
  {
    name: "OpenCV",
    skillIconId: "opencv",
    shieldLogo: "opencv",
    color: "5C3EE8",
    logoColor: "white",
    category: "ai",
    aliases: ["computer vision"],
  },
];

const INITIAL_ITEMS: TechStackItem[] = [
  {
    id: "typescript",
    name: "TypeScript",
    skillIconId: "ts",
    shieldLogo: "typescript",
    version: "5.9.3",
    color: "3178C6",
    logoColor: "white",
  },
  {
    id: "nextjs",
    name: "Next.js",
    skillIconId: "nextjs",
    shieldLogo: "nextdotjs",
    version: "16.2.2",
    color: "000000",
    logoColor: "white",
  },
  {
    id: "react",
    name: "React",
    skillIconId: "react",
    shieldLogo: "react",
    version: "19.2.4",
    color: "61DAFB",
    logoColor: "black",
  },
  {
    id: "tailwind",
    name: "Tailwind CSS",
    skillIconId: "tailwind",
    shieldLogo: "tailwindcss",
    version: "4.1.17",
    color: "06B6D4",
    logoColor: "white",
  },
  {
    id: "vitest",
    name: "Vitest",
    skillIconId: "vitest",
    shieldLogo: "vitest",
    version: "3.2.4",
    color: "6E9F18",
    logoColor: "white",
  },
  {
    id: "playwright",
    name: "Playwright",
    skillIconId: "playwright",
    shieldLogo: "playwright",
    version: "1.56.1",
    color: "2EAD33",
    logoColor: "white",
  },
];

function sanitizeSkillIconId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeHexColor(value: string): string {
  const trimmed = value.trim().replace(/^#/, "");

  if (/^[0-9a-fA-F]{3}$/.test(trimmed) || /^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return "555555";
}

function encodeShieldSegment(value: string): string {
  return encodeURIComponent(value.trim().replace(/-/g, "--").replace(/_/g, "__"));
}

function buildSkillIconsUrl(items: TechStackItem[], theme: SkillIconsTheme, perLine: number): string {
  const iconIds = items
    .map((item) => sanitizeSkillIconId(item.skillIconId))
    .filter(Boolean)
    .map(encodeURIComponent);

  if (iconIds.length === 0) {
    return "";
  }

  return `https://skillicons.dev/icons?i=${iconIds.join(",")}&theme=${theme}&perline=${perLine}`;
}

function buildShieldUrl(item: TechStackItem): string {
  const label = encodeShieldSegment(item.name || "Tech");
  const message = encodeShieldSegment(item.version || "version");
  const color = normalizeHexColor(item.color);
  const params = new URLSearchParams({ style: "for-the-badge" });
  const logo = item.shieldLogo.trim();
  const logoColor = item.logoColor.trim();

  if (logo !== "") {
    params.set("logo", logo);
  }

  if (logoColor !== "") {
    params.set("logoColor", logoColor);
  }

  return `https://img.shields.io/badge/${label}-${message}-${color}?${params.toString()}`;
}

function buildShieldMarkdown(item: TechStackItem): string {
  const label = item.name.trim() || "Tech";

  return `![${label}](${buildShieldUrl(item)})`;
}

function estimateSkillIconsSize(iconCount: number, perLine: number): Pick<SvgAsset, "height" | "width"> {
  const iconSize = 48;
  const gap = 8;
  const columns = Math.max(1, Math.min(iconCount, perLine));
  const rows = Math.max(1, Math.ceil(iconCount / perLine));

  return {
    height: rows * iconSize + (rows - 1) * gap,
    width: columns * iconSize + (columns - 1) * gap,
  };
}

function readSvgSize(svg: string, fallback: Pick<SvgAsset, "height" | "width">): Pick<SvgAsset, "height" | "width"> {
  const width = Number.parseFloat(svg.match(/\bwidth=["']?([\d.]+)/)?.[1] ?? "");
  const height = Number.parseFloat(svg.match(/\bheight=["']?([\d.]+)/)?.[1] ?? "");

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { height, width };
  }

  const viewBoxValues = svg
    .match(/\bviewBox=["']([^"']+)["']/)?.[1]
    ?.trim()
    .split(/\s+/)
    .map(Number);

  if (viewBoxValues?.length === 4 && viewBoxValues.every(Number.isFinite)) {
    return {
      height: viewBoxValues[3],
      width: viewBoxValues[2],
    };
  }

  return fallback;
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildSvgProxyUrl(url: string): string {
  return `/api/tech-stack-svg?url=${encodeURIComponent(url)}`;
}

function escapeSvgAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function fetchSvgAsset(url: string, fallback: Pick<SvgAsset, "height" | "width">): Promise<SvgAsset> {
  try {
    const response = await fetch(buildSvgProxyUrl(url));

    if (!response.ok) {
      throw new Error("Failed to fetch SVG");
    }

    const svg = await response.text();
    const size = readSvgSize(svg, fallback);

    return {
      ...size,
      href: svgToDataUri(svg),
    };
  } catch {
    return {
      ...fallback,
      href: url,
    };
  }
}

type StackSvgOptions = {
  badges: SvgAsset[];
  includeBadges: boolean;
  includeSkillIcons: boolean;
  skillIcons: SvgAsset | null;
};

function createStackSvg({ badges, includeBadges, includeSkillIcons, skillIcons }: StackSvgOptions): string {
  const maxContentWidth = 720;
  const sectionGap = 18;
  const badgeGap = 10;
  const elements: string[] = [];
  let width = 0;
  let y = 0;

  if (includeSkillIcons && skillIcons !== null) {
    elements.push(
      `<image href="${escapeSvgAttribute(skillIcons.href)}" x="0" y="0" width="${skillIcons.width}" height="${skillIcons.height}" />`,
    );
    width = Math.max(width, skillIcons.width);
    y += skillIcons.height;
  }

  if (includeBadges && badges.length > 0) {
    if (y > 0) {
      y += sectionGap;
    }

    let rowX = 0;
    let rowHeight = 0;

    for (const badge of badges) {
      if (rowX > 0 && rowX + badge.width > maxContentWidth) {
        width = Math.max(width, rowX - badgeGap);
        rowX = 0;
        y += rowHeight + badgeGap;
        rowHeight = 0;
      }

      elements.push(
        `<image href="${escapeSvgAttribute(badge.href)}" x="${rowX}" y="${y}" width="${badge.width}" height="${badge.height}" />`,
      );
      rowX += badge.width + badgeGap;
      rowHeight = Math.max(rowHeight, badge.height);
    }

    width = Math.max(width, rowX - badgeGap);
    y += rowHeight;
  }

  const height = Math.max(1, y);
  const svgWidth = Math.max(1, width);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${height}" viewBox="0 0 ${svgWidth} ${height}">`,
    ...elements,
    "</svg>",
  ].join("");
}

function createEmptyItem(): TechStackItem {
  return {
    id: `tech-${Date.now()}`,
    name: "",
    skillIconId: "",
    shieldLogo: "",
    version: "",
    color: "555555",
    logoColor: "white",
  };
}

function createItemFromCatalog(catalogItem: TechCatalogItem): TechStackItem {
  return {
    id: `${catalogItem.skillIconId}-${Date.now()}`,
    name: catalogItem.name,
    skillIconId: catalogItem.skillIconId,
    shieldLogo: catalogItem.shieldLogo,
    version: "",
    color: catalogItem.color,
    logoColor: catalogItem.logoColor,
  };
}

function isEmptyItem(item: TechStackItem): boolean {
  return item.name.trim() === "" && item.skillIconId.trim() === "" && item.shieldLogo.trim() === "" && item.version.trim() === "";
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/[\s._-]+/g, "");
}

type CopyButtonProps = {
  copyKey: string;
  copiedKey: string | null;
  disabled?: boolean;
  label: string;
  value: string;
  onCopy: (copyKey: string, value: string) => void;
};

function CopyButton({ copyKey, copiedKey, disabled = false, label, value, onCopy }: CopyButtonProps) {
  return (
    <button
      type="button"
      className="min-h-11 rounded-lg border border-gh-border bg-gh-bg px-3 py-2 text-left text-sm font-semibold text-gh-text transition-colors hover:border-cyan-500/40 hover:bg-gh-hover disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={() => onCopy(copyKey, value)}
    >
      {copiedKey === copyKey ? "복사됨" : label}
    </button>
  );
}

type DownloadButtonProps = {
  disabled?: boolean;
  downloadKey: string;
  downloadedKey: string | null;
  label: string;
  onDownload: (downloadKey: string) => void;
};

function DownloadButton({ disabled = false, downloadKey, downloadedKey, label, onDownload }: DownloadButtonProps) {
  return (
    <button
      type="button"
      className="min-h-11 rounded-lg border border-gh-border bg-gh-bg px-3 py-2 text-left text-sm font-semibold text-gh-text transition-colors hover:border-emerald-500/40 hover:bg-gh-hover disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={() => onDownload(downloadKey)}
    >
      {downloadedKey === downloadKey ? "다운로드됨" : label}
    </button>
  );
}

type TechCatalogProps = {
  activeCategory: TechCategory | "all";
  isSearchActive: boolean;
  items: TechCatalogItem[];
  query: string;
  selectedSkillIconIds: Set<string>;
  totalCount: number;
  onAdd: (catalogItem: TechCatalogItem) => void;
  onCategoryChange: (category: TechCategory | "all") => void;
  onQueryChange: (query: string) => void;
};

function TechCatalog({
  activeCategory,
  isSearchActive,
  items,
  query,
  selectedSkillIconIds,
  totalCount,
  onAdd,
  onCategoryChange,
  onQueryChange,
}: TechCatalogProps) {
  return (
    <div className="rounded-lg border border-gh-border/70 bg-gh-surface/60 p-5 backdrop-blur-md">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gh-text">기술 검색</h2>
        <p className="mt-1 text-sm text-gh-muted">기술명을 검색하거나 카테고리에서 골라 바로 추가합니다.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.2fr)]">
        <label className="space-y-2">
          <span className="text-sm font-medium text-gh-muted">검색어</span>
          <input
            className="h-11 w-full rounded-lg border border-gh-border bg-gh-bg px-3 text-gh-text outline-none transition-colors focus:border-cyan-500"
            data-testid="tech-search-input"
            placeholder="React, Spring, Docker"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-medium text-gh-muted">카테고리</span>
          <div className="flex flex-wrap gap-2">
            {TECH_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={activeCategory === category}
                className={`h-9 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                  activeCategory === category
                    ? "border-cyan-500/40 bg-cyan-500 text-white"
                    : "border-gh-border bg-gh-bg text-gh-muted hover:bg-gh-hover hover:text-gh-text"
                }`}
                onClick={() => onCategoryChange(category)}
              >
                {TECH_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5" data-testid="tech-catalog-results">
        {!isSearchActive ? (
          <div className="rounded-lg border border-dashed border-gh-border p-4 text-sm text-gh-muted" data-testid="tech-catalog-idle">
            검색어를 입력하거나 카테고리를 선택하면 결과가 표시됩니다.
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gh-border p-4 text-sm text-gh-muted" data-testid="tech-catalog-empty">
            일치하는 기술이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gh-muted">
              <span>
                검색 결과 {totalCount}개
                {totalCount > items.length ? ` 중 ${items.length}개 표시` : ""}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const isSelected = selectedSkillIconIds.has(item.skillIconId);

                return (
                  <button
                    key={`${item.category}-${item.skillIconId}-${item.name}`}
                    type="button"
                    className="min-h-24 rounded-lg border border-gh-border/70 bg-gh-bg/70 p-3 text-left transition-colors hover:border-cyan-500/40 hover:bg-gh-hover disabled:cursor-not-allowed disabled:opacity-55"
                    data-testid={`tech-catalog-add-${item.skillIconId}`}
                    disabled={isSelected}
                    onClick={() => onAdd(item)}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-semibold text-gh-text">{item.name}</span>
                        <span className="mt-1 block font-mono text-xs text-gh-muted">
                          {item.skillIconId} / {item.shieldLogo}
                        </span>
                      </span>
                      <span className="rounded-md border border-gh-border bg-gh-surface px-2 py-0.5 text-[11px] font-semibold text-gh-muted">
                        {TECH_CATEGORY_LABELS[item.category]}
                      </span>
                    </span>
                    <span className="mt-3 inline-block text-sm font-semibold text-gh-accent">
                      {isSelected ? "추가됨" : "추가"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
type TechRowProps = {
  item: TechStackItem;
  canDelete: boolean;
  onChange: (id: string, field: TechStackField, value: string) => void;
  onDelete: (id: string) => void;
};

function TechRow({ item, canDelete, onChange, onDelete }: TechRowProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-gh-border/60 bg-gh-bg/70 p-3 lg:grid-cols-[minmax(10rem,1.3fr)_minmax(7rem,0.8fr)_minmax(8rem,0.9fr)_minmax(6rem,0.6fr)_minmax(6rem,0.6fr)_minmax(6rem,0.6fr)_auto] lg:items-end">
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase text-gh-muted">기술명</span>
        <input
          className="h-10 w-full rounded-lg border border-gh-border bg-gh-bg px-3 text-sm text-gh-text outline-none transition-colors focus:border-cyan-500"
          value={item.name}
          onChange={(event) => onChange(item.id, "name", event.target.value)}
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase text-gh-muted">아이콘 ID</span>
        <input
          className="h-10 w-full rounded-lg border border-gh-border bg-gh-bg px-3 font-mono text-sm text-gh-text outline-none transition-colors focus:border-cyan-500"
          value={item.skillIconId}
          onChange={(event) => onChange(item.id, "skillIconId", event.target.value)}
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase text-gh-muted">로고 slug</span>
        <input
          className="h-10 w-full rounded-lg border border-gh-border bg-gh-bg px-3 font-mono text-sm text-gh-text outline-none transition-colors focus:border-cyan-500"
          value={item.shieldLogo}
          onChange={(event) => onChange(item.id, "shieldLogo", event.target.value)}
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase text-gh-muted">버전</span>
        <input
          className="h-10 w-full rounded-lg border border-gh-border bg-gh-bg px-3 font-mono text-sm text-gh-text outline-none transition-colors focus:border-amber-500"
          value={item.version}
          onChange={(event) => onChange(item.id, "version", event.target.value)}
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase text-gh-muted">색상</span>
        <input
          className="h-10 w-full rounded-lg border border-gh-border bg-gh-bg px-3 font-mono text-sm text-gh-text outline-none transition-colors focus:border-amber-500"
          value={item.color}
          onChange={(event) => onChange(item.id, "color", event.target.value)}
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase text-gh-muted">로고색</span>
        <input
          className="h-10 w-full rounded-lg border border-gh-border bg-gh-bg px-3 font-mono text-sm text-gh-text outline-none transition-colors focus:border-amber-500"
          value={item.logoColor}
          onChange={(event) => onChange(item.id, "logoColor", event.target.value)}
        />
      </label>

      <button
        type="button"
        className="h-10 rounded-lg border border-gh-border px-3 text-sm font-semibold text-gh-muted transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canDelete}
        onClick={() => onDelete(item.id)}
      >
        삭제
      </button>
    </div>
  );
}

export function TechStackGenerator() {
  const [items, setItems] = useState<TechStackItem[]>(INITIAL_ITEMS);
  const [theme, setTheme] = useState<SkillIconsTheme>("light");
  const [perLine, setPerLine] = useState(6);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<TechCategory | "all">("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadedKey, setDownloadedKey] = useState<string | null>(null);

  const skillIconsUrl = useMemo(() => buildSkillIconsUrl(items, theme, perLine), [items, perLine, theme]);

  const selectedSkillIconIds = useMemo(
    () => new Set(items.map((item) => sanitizeSkillIconId(item.skillIconId)).filter(Boolean)),
    [items],
  );

  const normalizedCatalogQuery = normalizeSearchText(catalogQuery);
  const isCatalogSearchActive = normalizedCatalogQuery !== "" || activeCategory !== "all";

  const catalogMatches = useMemo(() => {
    if (!isCatalogSearchActive) {
      return [];
    }

    return TECH_CATALOG.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }

      if (normalizedCatalogQuery === "") {
        return true;
      }

      const searchableText = [
        item.name,
        item.skillIconId,
        item.shieldLogo,
        TECH_CATEGORY_LABELS[item.category],
        ...item.aliases,
      ]
        .map(normalizeSearchText)
        .join(" ");

      return searchableText.includes(normalizedCatalogQuery);
    });
  }, [activeCategory, isCatalogSearchActive, normalizedCatalogQuery]);

  const filteredCatalogItems = useMemo(() => catalogMatches.slice(0, 8), [catalogMatches]);

  const skillIconCount = useMemo(
    () => items.filter((item) => item.skillIconId.trim() !== "").length,
    [items],
  );

  const badgeItems = useMemo(
    () => items.filter((item) => item.name.trim() !== "" && item.version.trim() !== ""),
    [items],
  );

  const badgesMarkdown = useMemo(() => badgeItems.map(buildShieldMarkdown).join("\n"), [badgeItems]);

  const skillIconsMarkdown = useMemo(() => {
    if (skillIconsUrl === "") {
      return "";
    }

    return `![Skills](${skillIconsUrl})`;
  }, [skillIconsUrl]);

  const fullMarkdown = useMemo(() => {
    return [skillIconsMarkdown, badgesMarkdown].filter(Boolean).join("\n\n");
  }, [badgesMarkdown, skillIconsMarkdown]);

  function updateItem(id: string, field: TechStackField, value: string) {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function deleteItem(id: string) {
    setItems((currentItems) => {
      if (currentItems.length <= 1) {
        return currentItems;
      }

      return currentItems.filter((item) => item.id !== id);
    });
  }

  function addItem() {
    setItems((currentItems) => [...currentItems, createEmptyItem()]);
  }

  function addCatalogItem(catalogItem: TechCatalogItem) {
    setItems((currentItems) => {
      if (currentItems.some((item) => sanitizeSkillIconId(item.skillIconId) === catalogItem.skillIconId)) {
        return currentItems;
      }

      const nextItem = createItemFromCatalog(catalogItem);
      const emptyItemIndex = currentItems.findIndex(isEmptyItem);

      if (emptyItemIndex === -1) {
        return [...currentItems, nextItem];
      }

      return currentItems.map((item, index) => (index === emptyItemIndex ? nextItem : item));
    });
  }

  function resetItems() {
    setItems(INITIAL_ITEMS);
    setTheme("light");
    setPerLine(6);
    setCatalogQuery("");
    setActiveCategory("all");
  }

  function copyText(copyKey: string, value: string) {
    if (!navigator.clipboard || value === "") {
      return;
    }

    void navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(copyKey);
      window.setTimeout(() => setCopiedKey(null), 1200);
    });
  }

  async function downloadGeneratedSvg(downloadKey: string) {
    const skillIconsAsset =
      skillIconsUrl === ""
        ? null
        : await fetchSvgAsset(skillIconsUrl, estimateSkillIconsSize(skillIconCount, perLine));
    const badgeAssets = await Promise.all(
      badgeItems.map((item) => fetchSvgAsset(buildShieldUrl(item), { height: 28, width: 160 })),
    );

    const svg = createStackSvg({
      badges: badgeAssets,
      includeBadges: downloadKey !== "skill-icons-svg",
      includeSkillIcons: downloadKey !== "badges-svg",
      skillIcons: skillIconsAsset,
    });

    const fileName =
      downloadKey === "skill-icons-svg"
        ? "tech-stack-skill-icons.svg"
        : downloadKey === "badges-svg"
          ? "tech-stack-version-badges.svg"
          : "tech-stack-full.svg";

    downloadTextFile(fileName, svg, "image/svg+xml;charset=utf-8");
    setDownloadedKey(downloadKey);
    window.setTimeout(() => setDownloadedKey(null), 1200);
  }

  return (
    <div className="space-y-6" data-testid="tech-stack-generator">
      <section className="space-y-6">
        <TechCatalog
          activeCategory={activeCategory}
          isSearchActive={isCatalogSearchActive}
          items={filteredCatalogItems}
          query={catalogQuery}
          selectedSkillIconIds={selectedSkillIconIds}
          totalCount={catalogMatches.length}
          onAdd={addCatalogItem}
          onCategoryChange={setActiveCategory}
          onQueryChange={setCatalogQuery}
        />

        <div className="rounded-lg border border-gh-border/70 bg-gh-surface/60 p-5 backdrop-blur-md">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gh-text">기술 목록</h2>
              <p className="mt-1 text-sm text-gh-muted">Skill Icons ID와 Shields 로고 slug를 기준으로 이미지를 만듭니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="h-10 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 text-sm font-semibold text-cyan-500 transition-colors hover:bg-cyan-500/15"
                onClick={addItem}
              >
                행 추가
              </button>
              <button
                type="button"
                className="h-10 rounded-lg border border-gh-border px-3 text-sm font-semibold text-gh-muted transition-colors hover:bg-gh-hover hover:text-gh-text"
                onClick={resetItems}
              >
                초기화
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <TechRow
                key={item.id}
                item={item}
                canDelete={items.length > 1}
                onChange={updateItem}
                onDelete={deleteItem}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gh-border/70 bg-gh-surface/60 p-5 backdrop-blur-md">
          <h2 className="text-xl font-semibold text-gh-text">옵션</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(12rem,0.8fr)_minmax(10rem,0.7fr)_minmax(12rem,0.7fr)]">
            <div className="space-y-2">
              <span className="text-sm font-medium text-gh-muted">테마</span>
              <div className="grid h-11 grid-cols-2 rounded-lg border border-gh-border bg-gh-bg p-1">
                {(["light", "dark"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-md px-3 text-sm font-semibold transition-colors ${
                      theme === option ? "bg-cyan-500 text-white" : "text-gh-muted hover:bg-gh-hover hover:text-gh-text"
                    }`}
                    onClick={() => setTheme(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-gh-muted">줄당 아이콘 수</span>
              <input
                className="h-11 w-full rounded-lg border border-gh-border bg-gh-bg px-3 font-mono text-gh-text outline-none transition-colors focus:border-cyan-500"
                max="50"
                min="1"
                type="number"
                value={perLine}
                onChange={(event) => setPerLine(Math.min(50, Math.max(1, Number(event.target.value) || 1)))}
              />
            </label>

            <div className="rounded-lg border border-gh-border/60 bg-gh-bg/60 p-4">
              <div className="text-sm font-semibold text-gh-text">생성 범위</div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gh-muted">아이콘</dt>
                  <dd className="font-mono text-gh-text">{skillIconCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gh-muted">버전 배지</dt>
                  <dd className="font-mono text-gh-text">{badgeItems.length}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-lg border border-gh-border/70 bg-gh-surface/60 p-5 backdrop-blur-md">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gh-text">미리보기</h2>
            <p className="mt-1 text-sm text-gh-muted">아이콘 묶음과 버전 배지가 포트폴리오에 들어갈 형태로 표시됩니다.</p>
          </div>

          <div className="space-y-5">
            <div className="rounded-lg border border-gh-border/60 bg-gh-bg/70 p-4">
              <div className="mb-3 text-sm font-semibold text-gh-muted">Skill Icons</div>
              {skillIconsUrl === "" ? (
                <p className="text-sm text-gh-muted">아이콘 ID를 입력하면 미리보기가 표시됩니다.</p>
              ) : (
                <img
                  src={skillIconsUrl}
                  alt="기술스택 아이콘 미리보기"
                  className="max-w-full rounded-md"
                  data-testid="tech-stack-skill-icons-preview"
                />
              )}
            </div>

            <div className="rounded-lg border border-gh-border/60 bg-gh-bg/70 p-4">
              <div className="mb-3 text-sm font-semibold text-gh-muted">Version Badges</div>
              {badgeItems.length === 0 ? (
                <p className="text-sm text-gh-muted">기술명과 버전을 입력하면 배지가 표시됩니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2" data-testid="tech-stack-badges-preview">
                  {badgeItems.map((item) => (
                    <img
                      key={item.id}
                      src={buildShieldUrl(item)}
                      alt={`${item.name} ${item.version}`}
                      className="h-7 w-auto max-w-full"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gh-border/70 bg-gh-surface/60 p-5 backdrop-blur-md">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gh-text">복사와 다운로드</h2>
              <p className="mt-1 text-sm text-gh-muted">생성된 URL, Markdown, SVG 파일을 바로 가져갑니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-64">
              <CopyButton
                copyKey="skill-url"
                copiedKey={copiedKey}
                disabled={skillIconsUrl === ""}
                label="URL"
                value={skillIconsUrl}
                onCopy={copyText}
              />
              <CopyButton
                copyKey="all-markdown"
                copiedKey={copiedKey}
                disabled={fullMarkdown === ""}
                label="전체 Markdown"
                value={fullMarkdown}
                onCopy={copyText}
              />
              <DownloadButton
                downloadKey="skill-icons-svg"
                downloadedKey={downloadedKey}
                disabled={skillIconsUrl === ""}
                label="아이콘 SVG"
                onDownload={downloadGeneratedSvg}
              />
              <DownloadButton
                downloadKey="badges-svg"
                downloadedKey={downloadedKey}
                disabled={badgeItems.length === 0}
                label="배지 SVG"
                onDownload={downloadGeneratedSvg}
              />
              <DownloadButton
                downloadKey="full-svg"
                downloadedKey={downloadedKey}
                disabled={skillIconsUrl === "" && badgeItems.length === 0}
                label="전체 SVG"
                onDownload={downloadGeneratedSvg}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gh-muted">Skill Icons Markdown</span>
              <textarea
                className="min-h-24 w-full resize-y rounded-lg border border-gh-border bg-gh-bg p-3 font-mono text-xs leading-relaxed text-gh-text outline-none transition-colors focus:border-cyan-500"
                readOnly
                value={skillIconsMarkdown}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gh-muted">Version Badges Markdown</span>
              <textarea
                className="min-h-40 w-full resize-y rounded-lg border border-gh-border bg-gh-bg p-3 font-mono text-xs leading-relaxed text-gh-text outline-none transition-colors focus:border-amber-500"
                readOnly
                value={badgesMarkdown}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gh-muted">전체 Markdown</span>
              <textarea
                className="min-h-44 w-full resize-y rounded-lg border border-gh-border bg-gh-bg p-3 font-mono text-xs leading-relaxed text-gh-text outline-none transition-colors focus:border-emerald-500"
                readOnly
                value={fullMarkdown}
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
