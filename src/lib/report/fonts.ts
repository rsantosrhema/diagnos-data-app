import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");

function dataUri(file: string): string {
  const buffer = readFileSync(path.join(FONT_DIR, file));
  return `data:font/ttf;base64,${buffer.toString("base64")}`;
}

let registered = false;

export function registerReportFonts(): void {
  if (registered) return;

  Font.register({
    family: "Inter",
    fonts: [
      { src: dataUri("Inter-Regular.ttf"), fontWeight: 400 },
      { src: dataUri("Inter-Medium.ttf"), fontWeight: 500 },
      { src: dataUri("Inter-SemiBold.ttf"), fontWeight: 600 },
    ],
  });

  Font.register({
    family: "Poppins",
    fonts: [{ src: dataUri("Poppins-SemiBold.ttf"), fontWeight: 600 }],
  });

  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
