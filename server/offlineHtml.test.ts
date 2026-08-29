import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");

describe("entrada offline", () => {
  it("não carrega analytics com placeholders de ambiente", () => {
    expect(html).not.toContain("%VITE_ANALYTICS_ENDPOINT%");
    expect(html).not.toContain("%VITE_ANALYTICS_WEBSITE_ID%");
  });
});
