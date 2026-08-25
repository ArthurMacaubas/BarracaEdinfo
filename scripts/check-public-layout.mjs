import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const baseUrl = process.env.PUBLIC_LAYOUT_URL ?? "http://localhost:3000";
const states = [
  { name: "meta", route: "/chamadas?preview=goal&sponsors=1" },
  { name: "pix", route: "/chamadas?preview=pix&sponsors=1" },
  { name: "pix-confirmado", route: "/chamadas?preview=pix&sponsors=1&pixConfirmed=1" },
  { name: "promocao", route: "/chamadas?preview=promotion&sponsors=1" },
  { name: "boas-vindas", route: "/chamadas?preview=promotion&sponsors=1&welcome=1" },
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
    const sponsorBefore = name === "promocao" ? (await page.locator(".sponsor-tile p").allTextContents()).join("|") : "";
    let sponsorAfter = "";
    if (name === "promocao") {
      const rotationMs = Number(await page.locator(".sponsor-three-grid").getAttribute("data-rotation-ms") ?? "2240");
      await page.waitForTimeout(rotationMs + 700);
      sponsorAfter = (await page.locator(".sponsor-tile p").allTextContents()).join("|");
      await page.screenshot({ path: join(evidenceDirectory, "tela-publica-promocao-rotacionada-1280x720.png") });
    }
    const layout = await page.evaluate(() => {
      const stage = document.querySelector(".public-stage");
      const canvas = document.querySelector(".public-canvas");
      const goalTitle = document.querySelector(".goal-title");
      const goalValue = document.querySelector(".goal-value");
      const goalMessage = document.querySelector(".goal-message");
      const pixTitle = document.querySelector(".pix-copy h1");
      const pixCaption = document.querySelector(".pix-caption");
      const pixQr = document.querySelector(".pix-qr-frame");
      const pixCountdown = document.querySelector(".pix-countdown");
      const pixConfirmed = document.querySelector(".pix-payment-status.confirmed");
      const promotion = document.querySelector(".promotion-announcement");
      const reward = document.querySelector(".promotion-reward");
      const rewardCopy = reward?.querySelector("p");
      const welcomeCard = document.querySelector(".welcome-card");
      const sponsorTiles = document.querySelectorAll(".sponsor-tile");
      const sponsorImageFits = Array.from(document.querySelectorAll(".sponsor-tile img")).every(image => getComputedStyle(image).objectFit === "contain");
      const sponsorBackgrounds = Array.from(sponsorTiles).map(tile => getComputedStyle(tile).backgroundColor);
      const sponsorGroupAnimation = getComputedStyle(document.querySelector(".sponsor-three-grid") ?? document.body).animationName;
      const sponsorTransitionDuration = getComputedStyle(document.querySelector(".sponsor-three-grid") ?? document.body).animationDuration;
      const sponsorRotationMs = Number(document.querySelector(".sponsor-three-grid")?.getAttribute("data-rotation-ms") ?? "0");
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
        canvasBounds: toBounds(canvas),
        goalTitleBounds: toBounds(goalTitle),
        goalValueBounds: toBounds(goalValue),
        goalMessageBounds: toBounds(goalMessage),
        pixTitleBounds: toBounds(pixTitle),
        pixCaptionBounds: toBounds(pixCaption),
        pixQrBounds: toBounds(pixQr),
        pixCountdownBounds: toBounds(pixCountdown),
        pixConfirmed: Boolean(pixConfirmed),
        promotionBounds: toBounds(promotion),
        rewardBounds: toBounds(reward),
        rewardCopyBounds: toBounds(rewardCopy),
        welcomeCardBounds: toBounds(welcomeCard),
        sponsorTileCount: sponsorTiles.length,
        sponsorImageFits,
        sponsorBackgrounds,
        sponsorGroupAnimation,
        sponsorTransitionDuration,
        sponsorRotationMs,
      };
    });
    layout.sponsorBefore = sponsorBefore;
    layout.sponsorAfter = sponsorAfter;
    const exceedsViewport = layout.documentHeight > layout.innerHeight + 1 || layout.bodyHeight > layout.innerHeight + 1 || layout.stageHeight > layout.innerHeight + 1;
    const allowsVerticalScroll = layout.bodyOverflowY === "scroll" || layout.bodyOverflowY === "auto" || layout.stageOverflowY === "scroll" || layout.stageOverflowY === "auto";
    const isInsideCanvas = (bounds) => !bounds || !layout.canvasBounds || (
      bounds.top >= layout.canvasBounds.top &&
      bounds.right <= layout.canvasBounds.right &&
      bounds.bottom <= layout.canvasBounds.bottom &&
      bounds.left >= layout.canvasBounds.left
    );
    const goalIsVisible = !layout.goalTitleBounds || (isInsideCanvas(layout.goalTitleBounds) && isInsideCanvas(layout.goalValueBounds) && isInsideCanvas(layout.goalMessageBounds));
    const pixIsVisible = !layout.pixTitleBounds || (isInsideCanvas(layout.pixTitleBounds) && isInsideCanvas(layout.pixCaptionBounds) && isInsideCanvas(layout.pixQrBounds) && isInsideCanvas(layout.pixCountdownBounds));
    const pixConfirmationIsVisible = name !== "pix-confirmado" || layout.pixConfirmed;
    const promotionIsVisible = !layout.promotionBounds || (
      isInsideCanvas(layout.promotionBounds) &&
      isInsideCanvas(layout.rewardBounds) &&
      layout.rewardCopyBounds?.top >= layout.rewardBounds.top &&
      layout.rewardCopyBounds?.bottom <= layout.rewardBounds.bottom
    );
    const welcomeIsVisible = !layout.welcomeCardBounds || isInsideCanvas(layout.welcomeCardBounds);
    const sponsorRotates = name !== "promocao" || (Boolean(layout.sponsorBefore) && layout.sponsorBefore !== layout.sponsorAfter);
    const hasThreeSponsors = name !== "promocao" || layout.sponsorTileCount === 3;
    const sponsorsWithoutCrop = name !== "promocao" || layout.sponsorImageFits;
    const sponsorColorsApplied = name !== "promocao" || layout.sponsorBackgrounds.every(color => color !== "rgba(0, 0, 0, 0)");
    const sponsorTransitionApplied = name !== "promocao" || layout.sponsorGroupAnimation.includes("sponsor-group-in");
    const sponsorDurationApplied = name !== "promocao" || layout.sponsorTransitionDuration === "0.56s";
    const sponsorRotationApplied = name !== "promocao" || layout.sponsorRotationMs === 2240;
    if (exceedsViewport || allowsVerticalScroll || !goalIsVisible || !pixIsVisible || !pixConfirmationIsVisible || !promotionIsVisible || !welcomeIsVisible || !sponsorRotates || !hasThreeSponsors || !sponsorsWithoutCrop || !sponsorColorsApplied || !sponsorTransitionApplied || !sponsorDurationApplied || !sponsorRotationApplied) {
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
