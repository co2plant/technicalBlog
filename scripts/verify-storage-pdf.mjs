import process from "node:process";

const url = process.argv[2] ?? process.env.STORAGE_PDF_URL;

if (!url) {
  throw new Error("Provide a PDF URL: npm run verify:storage-pdf -- https://...");
}

const headResponse = await fetch(url, {
  method: "HEAD",
});

if (!headResponse.ok) {
  throw new Error(`PDF HEAD request failed with ${headResponse.status}.`);
}

const contentType = headResponse.headers.get("content-type") ?? "";

if (!contentType.toLowerCase().includes("application/pdf")) {
  throw new Error(`Expected application/pdf content-type, received "${contentType}".`);
}

const rangeResponse = await fetch(url, {
  headers: {
    Range: "bytes=0-1023",
  },
});

if (rangeResponse.status !== 206 && rangeResponse.status !== 200) {
  throw new Error(`PDF Range request failed with ${rangeResponse.status}.`);
}

const acceptRanges = headResponse.headers.get("accept-ranges") ?? rangeResponse.headers.get("accept-ranges") ?? "";
const body = Buffer.from(await rangeResponse.arrayBuffer());

if (body.length === 0) {
  throw new Error("PDF Range request returned an empty body.");
}

console.log(
  JSON.stringify(
    {
      url,
      contentType,
      rangeStatus: rangeResponse.status,
      acceptRanges: acceptRanges || "not-advertised",
      bytesRead: body.length,
      status: "ok",
    },
    null,
    2,
  ),
);
