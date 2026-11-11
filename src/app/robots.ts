import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/interviews/", "/portfolio", "/posts/my-portfolio-pdf"],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
