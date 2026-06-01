import type { NextRequest } from "next/server";

const ALLOWED_SVG_HOSTS = new Set(["img.shields.io", "skillicons.dev"]);

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");

  if (target === null) {
    return new Response("Missing url", { status: 400 });
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (targetUrl.protocol !== "https:" || !ALLOWED_SVG_HOSTS.has(targetUrl.hostname)) {
    return new Response("Unsupported url", { status: 400 });
  }

  const upstreamResponse = await fetch(targetUrl, {
    next: {
      revalidate: 86_400,
    },
  });

  if (!upstreamResponse.ok) {
    return new Response("Failed to fetch svg", { status: 502 });
  }

  const svg = await upstreamResponse.text();

  return new Response(svg, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
