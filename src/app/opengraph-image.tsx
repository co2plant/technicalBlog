import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-metadata";

export const alt = SITE_NAME;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0d1117",
          color: "#f0f6fc",
          padding: "72px",
          fontFamily: "Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "-120px",
            top: "-160px",
            width: "520px",
            height: "520px",
            borderRadius: "9999px",
            background: "rgba(37, 99, 235, 0.42)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "-90px",
            bottom: "-180px",
            width: "520px",
            height: "520px",
            borderRadius: "9999px",
            background: "rgba(20, 184, 166, 0.32)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "26px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              color: "#7dd3fc",
              fontSize: "30px",
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "9999px",
                background: "#38bdf8",
              }}
            />
            co2plant
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              maxWidth: "900px",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "76px",
                lineHeight: 1.08,
                letterSpacing: "0",
                fontWeight: 900,
              }}
            >
              {SITE_NAME}
            </h1>
            <p
              style={{
                margin: 0,
                color: "#c9d1d9",
                fontSize: "34px",
                lineHeight: 1.35,
              }}
            >
              {SITE_DESCRIPTION}
            </p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#8b949e",
            fontSize: "28px",
            position: "relative",
          }}
        >
          <span>Web · Java · Open Source · Portfolio</span>
          <span>co2plant.dev</span>
        </div>
      </div>
    ),
    size,
  );
}
