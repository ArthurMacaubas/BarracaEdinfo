import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const baseUrl = process.env.PUBLIC_LAYOUT_URL ?? "http://localhost:3000";
const states = [
  { name: "meta", route: "/chamadas?preview=goal&sponsors=1" },
  { name: "pix", route: "/chamadas?preview=pix&sponsors=1" },
  { name: "promocao", route: "/chamadas?sponsors=1" },
];
const evidenceDirectory = process.env.PUBLIC_LAYOUT_EVIDENCE_DIR ?? "/home/ubuntu/webdev-static-assets/barraca-agostina-ifro-layout";

await mkdir(evidenceDirectory, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const results = [];
  for (const { name, route } of states) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const screenshotPath = join(evidenceDirectory, `tela-publica-${name}-1280x720.png`);
    await page.screenshot({ path: screenshotPath });
    const layout = await page.evaluate(() => {
      const stage = document.querySelector(".public-stage");
      const promotion = document.querySelector(".promotion-announcement");
      const reward = document.querySelector(".promotion-reward");
      const rewardCopy = reward?.querySelector("p");
      const toBounds = (element) => element ? (() => {
        const { top, right, bottom, left, width, height } = element.getBoundingClientRect();
        return { top, right, bottom, left, width, height };
      })() : null;
      return {
        innerHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        bodyHeight: document.body.scrollHeight,
        stageHeight: stage?.getBoundingClientRect().height ?? 0,
        bodyOverflowY: getComputedStyle(document.body).overflowY,
        stageOverflowY: stage ? getComputedStyle(stage).overflowY : "missing",
        promotionBounds: toBounds(promotion),
        rewardBounds: toBounds(reward),
        rewardCopyBounds: toBounds(rewardCopy),
      };
    });
    const exceedsViewport = layout.documentHeight > layout.innerHeight + 1 || layout.bodyHeight > layout.innerHeight + 1 || layout.stageHeight > layout.innerHeight + 1;
    const allowsVerticalScroll = layout.bodyOverflowY === "scroll" || layout.bodyOverflowY === "auto" || layout.stageOverflowY === "scroll" || layout.stageOverflowY === "auto";
    const promotionIsVisible = !layout.promotionBounds || (
      layout.promotionBounds.top >= 0 &&
      layout.promotionBounds.bottom <= layout.innerHeight &&
      layout.rewardBounds?.top >= 0 &&
      layout.rewardBounds?.bottom <= layout.innerHeight &&
      layout.rewardCopyBounds?.top >= layout.rewardBounds.top &&
      layout.rewardCopyBounds?.bottom <= layout.rewardBounds.bottom
    );
    if (exceedsViewport || allowsVerticalScroll || !promotionIsVisible) {
      throw new Error(`Layout público excede o monitor em ${route}: ${JSON.stringify(layout)}`);
    }
    results.push({ state: name, route, screenshotPath, ...layout });
    console.log(`OK ${route} ${JSON.stringify(layout)}`);
  }
  const reportPath = join(evidenceDirectory, "validacao-tela-publica-1280x720.json");
  await writeFile(reportPath, `${JSON.stringify({ viewport: { width: 1280, height: 720 }, results }, null, 2)}\n`);
  console.log(`Evidências arquivadas em ${evidenceDirectory}`);
} finally {
  await browser.close();
}
