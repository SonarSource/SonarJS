import vitest from "vitest";
import { test, expect } from "@playwright/test";
import { expect as playwrightExpect } from "@playwright/test";
import {functionWithAssertion, functionWithoutAssertion, functionWithInnerAssertion} from "./a.js"

describe("tests", () => {
  it("should traverse functions with assertions", () => { // Compliant
    functionWithAssertion();
  });

  it("should traverse functions with inner assertions", () => { // Compliant
    functionWithInnerAssertion();
  });

  it("should traverse functions and identify missing assertions", () => { // Noncompliant {{Add at least one assertion to this test case.}}
    functionWithoutAssertion();
  });

  it("recognizes vitest.expect via the type-checker path", () => { // Compliant
    vitest.expect(1).toEqual(2);
  });

  // Stopgap: in the type-aware path, `expect.extend(...)` is a compile-time check on
  // its typed argument, so a typecheck test that only configures matchers is not
  // reported as assertion-less.
  it("treats expect.extend as a compile-time check under the type-checker", () => { // Compliant
    vitest.expect.extend({ toBeFoo: () => ({ pass: true, message: () => "" }) });
  });

  test("recognizes test.expect via the type-checker path", async ({ page }) => { // Compliant
    await test.expect(page.locator("div").first()).toBeVisible();
  });

  test("recognizes test.expect.soft via the type-checker path", async ({ page }) => { // Compliant
    await test.expect.soft(page.locator("div").first()).toBeVisible();
  });

  test("recognizes test.expect.poll via the type-checker path", async () => { // Compliant
    await test.expect.poll(() => 1).toBe(1);
  });

  test("recognizes test.expect.configure via the type-checker path", async ({ page }) => { // Compliant
    await test.expect.configure({ timeout: 1000 })(page.locator("div").first()).toBeVisible();
  });

  test("recognizes expect.soft via the type-checker path", async ({ page }) => { // Compliant
    await expect.soft(page.locator("div").first()).toBeVisible();
  });

  test("recognizes expect.poll via the type-checker path", async () => { // Compliant
    await expect.poll(() => 1).toBe(1);
  });

  test("recognizes expect.configure via the type-checker path", async ({ page }) => { // Compliant
    await expect.configure({ timeout: 1000 })(page.locator("div").first()).toBeVisible();
  });

  test("recognizes aliased expect.soft via the type-checker path", async ({ page }) => { // Compliant
    await playwrightExpect.soft(page.locator("div").first()).toBeVisible();
  });

  test("recognizes aliased expect.poll via the type-checker path", async () => { // Compliant
    await playwrightExpect.poll(() => 1).toBe(1);
  });

  test("recognizes aliased expect.configure via the type-checker path", async ({ page }) => { // Compliant
    await playwrightExpect.configure({ timeout: 1000 })(page.locator("div").first()).toBeVisible();
  });
});
