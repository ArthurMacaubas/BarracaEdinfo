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
    if (item.name === "cadastro") {
      await page.locator("#sponsor-visual-name").fill("Prévia da Padaria");
      await page.locator("#sponsor-visual-url").fill("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='120'%3E%3Crect width='100%25' height='100%25' fill='%23ffffff'/%3E%3Ctext x='120' y='70' text-anchor='middle' font-size='28'%3ELOGO%3C/text%3E%3C/svg%3E");
      await page.locator("#sponsor-visual-color").evaluate(input => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set; setter?.call(input, "#b45309"); input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    const screenshotPath = join(evidenceDirectory, `tela-principal-${item.name}-1280x720.png`);
    await page.screenshot({ path: screenshotPath });
    const layout = await page.evaluate(() => {
      const header = document.querySelector("header");
      const heading = document.querySelector("main h1");
      const sectionByTitle = (title) => Array.from(document.querySelectorAll("h2")).find(element => element.textContent?.trim() === title) ?? null;
      const productTitle = sectionByTitle("Produtos");
      const hardwareTitle = sectionByTitle("Conexão do hardware");
      const legacyGoal = document.querySelector("#sales-goal");
      const sponsorPreviewSurface = document.querySelector("[data-testid='sponsor-preview-surface']");
      const sponsorPreviewImage = document.querySelector("[data-testid='sponsor-preview-image']");
      const sponsorEditActions = Array.from(document.querySelectorAll("button")).filter(button => button.textContent?.includes("Editar")).length;
      const draggableSponsors = document.querySelectorAll("article[draggable='true']").length;
      const suggestedColors = document.querySelectorAll("button[aria-label^='Usar ']").length;
      const transitionControl = document.querySelector("input[aria-label='Duração da transição']");
      const bounds = element => element ? (() => { const { top, right, bottom, left } = element.getBoundingClientRect(); return { top, right, bottom, left }; })() : null;
      const isVisible = element => Boolean(element && (() => { const style = getComputedStyle(element); const rect = element.getBoundingClientRect(); return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0; })());
      return { innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, headerBounds: bounds(header), headingBounds: bounds(heading), productTitleBounds: bounds(productTitle), hardwareTitleBounds: bounds(hardwareTitle), legacyGoalVisible: isVisible(legacyGoal), sponsorPreviewImageVisible: isVisible(sponsorPreviewImage), sponsorPreviewColor: sponsorPreviewSurface ? getComputedStyle(sponsorPreviewSurface).backgroundColor : null, sponsorEditActions, draggableSponsors, suggestedColors, transitionControlVisible: isVisible(transitionControl) };
    });
    const fitsHorizontally = layout.scrollWidth <= layout.innerWidth + 1 && layout.bodyWidth <= layout.innerWidth + 1;
    const keyElementsVisible = layout.headerBounds && layout.headingBounds && layout.headerBounds.left >= 0 && layout.headerBounds.right <= layout.innerWidth && layout.headingBounds.left >= 0 && layout.headingBounds.right <= layout.innerWidth && layout.headingBounds.bottom <= 720;
    const cadastroPreserved = item.name !== "cadastro" || (layout.productTitleBounds && layout.productTitleBounds.right > layout.productTitleBounds.left && layout.hardwareTitleBounds && layout.hardwareTitleBounds.right > layout.hardwareTitleBounds.left && !layout.legacyGoalVisible);
    const sponsorPreviewIsAccurate = item.name !== "cadastro" || (layout.sponsorPreviewImageVisible && layout.sponsorPreviewColor === "rgb(180, 83, 9)");
    const sponsorManagementReady = item.name !== "cadastro" || (layout.sponsorEditActions > 0 && layout.draggableSponsors > 0 && layout.suggestedColors >= 6 && layout.transitionControlVisible);
    if (!fitsHorizontally || !keyElementsVisible || !cadastroPreserved || !sponsorPreviewIsAccurate || !sponsorManagementReady) throw new Error(`Página principal não cabe corretamente em ${item.route}: ${JSON.stringify(layout)}`);
    results.push({ ...item, screenshotPath, ...layout });
    console.log(`OK ${item.route} ${JSON.stringify(layout)}`);
  }
  const reportPath = join(evidenceDirectory, "validacao-tela-principal-1280x720.json");
  await writeFile(reportPath, `${JSON.stringify({ viewport: { width: 1280, height: 720 }, results }, null, 2)}\n`);
  console.log(`Evidências da tela principal arquivadas em ${evidenceDirectory}`);
} finally {
  await browser.close();
}
