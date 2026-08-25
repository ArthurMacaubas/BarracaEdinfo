import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.MAIN_LAYOUT_URL ?? "http://localhost:3000";
const evidenceDirectory = process.env.MAIN_LAYOUT_EVIDENCE_DIR ?? "/home/ubuntu/webdev-static-assets/barraca-agostina-ifro-layout";
const pages = [
  { name: "cadastro", route: "/" },
  { name: "pedido", route: "/pedido" },
  { name: "dashboard", route: "/painel" },
];

await mkdir(evidenceDirectory, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const results = [];
  for (const item of pages) {
    await page.goto(`${baseUrl}${item.route}`, { waitUntil: "networkidle" });
    const screenshotPath = join(evidenceDirectory, `tela-principal-${item.name}-1280x720.png`);
    await page.screenshot({ path: screenshotPath });
    const layout = await page.evaluate(() => {
      const header = document.querySelector("header");
      const heading = document.querySelector("main h1");
      const bounds = element => element ? (() => { const { top, right, bottom, left } = element.getBoundingClientRect(); return { top, right, bottom, left }; })() : null;
      return { innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, headerBounds: bounds(header), headingBounds: bounds(heading) };
    });
    const fitsHorizontally = layout.scrollWidth <= layout.innerWidth + 1 && layout.bodyWidth <= layout.innerWidth + 1;
    const keyElementsVisible = layout.headerBounds && layout.headingBounds && layout.headerBounds.left >= 0 && layout.headerBounds.right <= layout.innerWidth && layout.headingBounds.left >= 0 && layout.headingBounds.right <= layout.innerWidth && layout.headingBounds.bottom <= 720;
    if (!fitsHorizontally || !keyElementsVisible) throw new Error(`Página principal não cabe corretamente em ${item.route}: ${JSON.stringify(layout)}`);
    results.push({ ...item, screenshotPath, ...layout });
    console.log(`OK ${item.route} ${JSON.stringify(layout)}`);
  }
  const reportPath = join(evidenceDirectory, "validacao-tela-principal-1280x720.json");
  await writeFile(reportPath, `${JSON.stringify({ viewport: { width: 1280, height: 720 }, results }, null, 2)}\n`);
  console.log(`Evidências da tela principal arquivadas em ${evidenceDirectory}`);
} finally {
  await browser.close();
}
