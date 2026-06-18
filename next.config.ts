import type { NextConfig } from "next";

const noIndexHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet",
  },
  {
    key: "Cache-Control",
    value: "private, no-store, max-age=0",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/interviews/:path*",
        headers: noIndexHeaders,
      },
      {
        source: "/portfolio",
        headers: noIndexHeaders,
      },
      {
        source: "/portfolio/:path*",
        headers: noIndexHeaders,
      },
      {
        source: "/posts/my-portfolio-pdf",
        headers: noIndexHeaders,
      },
      {
        source: "/posts/my-portfolio-pdf/:path*",
        headers: noIndexHeaders,
      },
    ];
  },
};

export default nextConfig;
