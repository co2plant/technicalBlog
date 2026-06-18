import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/interviews/", "/portfolio", "/posts/my-portfolio-pdf"],
      },
    ],
  };
}
