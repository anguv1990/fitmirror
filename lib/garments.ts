import type { Garment } from "./types";

/**
 * The catalog. Hardcoded on purpose — this is a scaffold, so there is no
 * database yet. Swap this module for a data-access layer when one exists; the
 * rest of the app only depends on `getGarment` / `GARMENTS`.
 */
export const GARMENTS: Garment[] = [
  {
    id: "tee-oatmeal",
    name: "Boxy Tee",
    category: "top",
    accent: "#d9cbb4",
    fit: { x: 0.22, y: 0.22, width: 0.56, height: 0.42 },
    art: `
      <path d="M30 12 L14 22 L8 44 L22 50 L22 30 Z" fill="#cdbb9f"/>
      <path d="M70 12 L86 22 L92 44 L78 50 L78 30 Z" fill="#cdbb9f"/>
      <path d="M30 12 H70 L78 30 V104 H22 V30 Z" fill="#d9cbb4"/>
      <path d="M30 12 Q50 26 70 12 L64 10 Q50 20 36 10 Z" fill="#bfae93"/>
    `,
  },
  {
    id: "shirt-indigo",
    name: "Indigo Overshirt",
    category: "top",
    accent: "#3f5b86",
    fit: { x: 0.19, y: 0.21, width: 0.62, height: 0.46 },
    art: `
      <path d="M28 12 L10 24 L4 48 L20 54 L20 32 Z" fill="#35507a"/>
      <path d="M72 12 L90 24 L96 48 L80 54 L80 32 Z" fill="#35507a"/>
      <path d="M28 12 H72 L80 32 V108 H20 V32 Z" fill="#3f5b86"/>
      <path d="M50 14 V108" stroke="#2b4066" stroke-width="1.6"/>
      <path d="M28 12 L50 30 L44 12 Z" fill="#4a6a99"/>
      <path d="M72 12 L50 30 L56 12 Z" fill="#4a6a99"/>
      <circle cx="50" cy="48" r="1.6" fill="#d8dee9"/>
      <circle cx="50" cy="68" r="1.6" fill="#d8dee9"/>
      <circle cx="50" cy="88" r="1.6" fill="#d8dee9"/>
    `,
  },
  {
    id: "hoodie-slate",
    name: "Slate Hoodie",
    category: "top",
    accent: "#5c6470",
    fit: { x: 0.17, y: 0.19, width: 0.66, height: 0.5 },
    art: `
      <path d="M28 16 L8 28 L2 54 L18 60 L18 36 Z" fill="#4e5661"/>
      <path d="M72 16 L92 28 L98 54 L82 60 L82 36 Z" fill="#4e5661"/>
      <path d="M28 16 H72 L82 36 V112 H18 V36 Z" fill="#5c6470"/>
      <path d="M32 14 Q50 34 68 14 Q58 6 50 6 Q42 6 32 14 Z" fill="#6b737f"/>
      <path d="M32 74 H68 V90 H32 Z" fill="#515964"/>
      <path d="M44 16 V30" stroke="#e2e5ea" stroke-width="1.4"/>
      <path d="M56 16 V30" stroke="#e2e5ea" stroke-width="1.4"/>
    `,
  },
  {
    id: "jacket-olive",
    name: "Olive Field Jacket",
    category: "outerwear",
    accent: "#6b7350",
    fit: { x: 0.15, y: 0.2, width: 0.7, height: 0.52 },
    art: `
      <path d="M26 14 L6 26 L0 52 L16 58 L16 34 Z" fill="#5c6344"/>
      <path d="M74 14 L94 26 L100 52 L84 58 L84 34 Z" fill="#5c6344"/>
      <path d="M26 14 H74 L84 34 V116 H16 V34 Z" fill="#6b7350"/>
      <path d="M50 16 V116" stroke="#4c5239" stroke-width="1.8"/>
      <rect x="24" y="60" width="18" height="14" fill="#5c6344"/>
      <rect x="58" y="60" width="18" height="14" fill="#5c6344"/>
      <rect x="24" y="88" width="18" height="16" fill="#5c6344"/>
      <rect x="58" y="88" width="18" height="16" fill="#5c6344"/>
      <path d="M26 14 Q38 24 34 14 Z" fill="#7c8560"/>
      <path d="M74 14 Q62 24 66 14 Z" fill="#7c8560"/>
    `,
  },
  {
    id: "dress-rust",
    name: "Rust Midi Dress",
    category: "dress",
    accent: "#a8552f",
    fit: { x: 0.24, y: 0.21, width: 0.54, height: 0.66 },
    art: `
      <path d="M34 10 L20 20 L16 40 L28 44 L30 28 Z" fill="#8f4826"/>
      <path d="M66 10 L80 20 L84 40 L72 44 L70 28 Z" fill="#8f4826"/>
      <path d="M34 10 H66 L70 30 L78 128 H22 L30 30 Z" fill="#a8552f"/>
      <path d="M34 10 Q50 24 66 10 L60 8 Q50 18 40 8 Z" fill="#8f4826"/>
      <path d="M26 72 H74" stroke="#8f4826" stroke-width="2"/>
    `,
  },
  {
    id: "knit-cream",
    name: "Cream Cable Knit",
    category: "top",
    accent: "#ece1cd",
    fit: { x: 0.18, y: 0.2, width: 0.64, height: 0.47 },
    art: `
      <path d="M28 14 L9 26 L3 50 L19 56 L19 34 Z" fill="#ddd0b8"/>
      <path d="M72 14 L91 26 L97 50 L81 56 L81 34 Z" fill="#ddd0b8"/>
      <path d="M28 14 H72 L81 34 V110 H19 V34 Z" fill="#ece1cd"/>
      <path d="M30 14 Q50 30 70 14 Q60 8 50 8 Q40 8 30 14 Z" fill="#ddd0b8"/>
      <path d="M42 30 V106 M50 30 V106 M58 30 V106" stroke="#dbcdb2" stroke-width="1.2"/>
      <path d="M19 100 H81" stroke="#ddd0b8" stroke-width="4"/>
    `,
  },
];

export function getGarment(id: string): Garment | undefined {
  return GARMENTS.find((g) => g.id === id);
}
