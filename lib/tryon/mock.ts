import type { Garment, TryOnRequest, TryOnResult } from "../types";
import type { TryOnProvider } from "./types";

/**
 * Offline placeholder provider.
 *
 * IMPORTANT: this does NOT do virtual try-on. It layers the garment artwork over
 * the photo at fixed coordinates — there is no body detection, no segmentation,
 * no warping to the subject's pose. It exists so the full request/response path,
 * the loading states, and the error states can be exercised without credentials
 * or GPU time. Results are marked `simulated: true` so the UI can label them.
 */
class MockTryOnProvider implements TryOnProvider {
  readonly name = "mock";

  async run(request: TryOnRequest, garment: Garment): Promise<TryOnResult> {
    const started = Date.now();

    // Stand in for inference latency so loading UI is actually reachable in dev.
    await new Promise((resolve) => setTimeout(resolve, 700));

    const { personWidth: w, personHeight: h } = request;
    const fit = garment.fit;

    // Place the garment art (authored in a 0 0 100 140 box) onto the photo by
    // translating to the fit origin and scaling to the fit size.
    const x = fit.x * w;
    const y = fit.y * h;
    const scaleX = (fit.width * w) / 100;
    const scaleY = (fit.height * h) / 140;

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
      `<image href="${escapeAttr(request.personImage)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`,
      `<g transform="translate(${x} ${y}) scale(${scaleX} ${scaleY})" opacity="0.92">`,
      garment.art,
      `</g>`,
      `</svg>`,
    ].join("");

    return {
      image: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
      garmentId: garment.id,
      provider: this.name,
      elapsedMs: Date.now() - started,
      simulated: true,
      // Compositing, not generation. Claiming this was AI-generated would be a
      // false disclosure in the opposite direction.
      aiGenerated: false,
    };
  }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export const mockProvider = new MockTryOnProvider();
