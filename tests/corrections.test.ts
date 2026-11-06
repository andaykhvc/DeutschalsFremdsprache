import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCorrection } from "../src/lib/corrections";
test("replaces exactly the selected occurrence and preserves surrounding text", () => {
  const body = "Heute ich lerne. Heute ich lerne.";
  const start = body.lastIndexOf("Heute ich lerne");
  assert.equal(
    applyCorrection(body, 2, {
      quote: "Heute ich lerne",
      replacement: "Heute lerne ich",
      start_offset: start,
      end_offset: start + 15,
      base_version: 2,
    }),
    "Heute ich lerne. Heute lerne ich.",
  );
});
test("rejects stale versions and mismatched anchors", () => {
  const c = {
    quote: "ich",
    replacement: "du",
    start_offset: 0,
    end_offset: 3,
    base_version: 1,
  };
  assert.throws(() => applyCorrection("ich lerne", 2, c), /inzwischen/);
  assert.throws(() => applyCorrection("wir lernen", 1, c), /überein/);
});
test("preserves UTF-16 selection offsets with emoji and umlauts", () => {
  assert.equal(
    applyCorrection("☕️ Grüße 👋 ich bin hier", 1, {
      quote: "ich bin",
      replacement: "ich war",
      start_offset: 12,
      end_offset: 19,
      base_version: 1,
    }),
    "☕️ Grüße 👋 ich war hier",
  );
});
