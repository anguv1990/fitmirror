import type { NextConfig } from "next";

/**
 * Dev harnesses are excluded from the production build by file extension, not
 * by a runtime guard.
 *
 * `app/dev/*` holds the pose and G8 calibration harnesses. A `notFound()` guard
 * would still compile them into the bundle and leave the routes present but
 * 404ing; the calibration harness accepts photo uploads, so "unreachable" is a
 * weaker claim than "not shipped". Next resolves pages by globbing `page.{ext}`
 * against this list, so omitting `dev.tsx` in production means `page.dev.tsx`
 * is never matched and never compiled.
 *
 * Consequence to know about: the harnesses exist under `npm run dev` and
 * nowhere else. `/dev/calibrate` is live tooling for gate G8, so it must keep
 * working there — see docs/04-prerequisite-gate.md.
 */
const DEV_PAGE_EXTENSIONS = ["dev.tsx", "dev.ts"];
const PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];

const nextConfig: NextConfig = {
  pageExtensions:
    process.env.NODE_ENV === "development"
      ? [...PAGE_EXTENSIONS, ...DEV_PAGE_EXTENSIONS]
      : PAGE_EXTENSIONS,

  // Try-on payloads are data URLs, which are larger than the default body limit.
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
