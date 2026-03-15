import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  getKey: vi.fn(),
}));

vi.mock("../lib/apiKeyStore", () => ({
  getKey: mocked.getKey,
}));

import { _resetForTest, queryGoogle } from "../services/places/providers/google";

describe("queryGoogle budget guard", () => {
  const originalBudget = process.env.GOOGLE_DAILY_BUDGET_USD;
  const originalFetch = global.fetch;

  beforeEach(() => {
    _resetForTest();
    mocked.getKey.mockReset();
    mocked.getKey.mockReturnValue("test-key");
    process.env.GOOGLE_DAILY_BUDGET_USD = "0";
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env.GOOGLE_DAILY_BUDGET_USD = originalBudget;
    global.fetch = originalFetch;
    _resetForTest();
  });

  it("returns empty and does not call fetch when budget is exhausted", async () => {
    const results = await queryGoogle(13.7563, 100.5018, 1000);
    expect(results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
