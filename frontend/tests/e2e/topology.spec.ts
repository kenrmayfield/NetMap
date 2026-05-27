import { test, expect } from "@playwright/test";
import {
  setupCoreMocks,
  setupTopologyMocks,
  mockDevice,
  mockRelationship,
} from "./helpers/api-mocks";

test.describe("Topology workspace", () => {
  test.beforeEach(async ({ page }) => {
    const devices = [
      mockDevice({ id: 1, hostname: "router-01", ip_address: "192.168.1.1", topology_group: "Core" }),
      mockDevice({ id: 2, hostname: "switch-01", ip_address: "192.168.1.2", topology_group: "Core" }),
    ];
    const relationships = [
      mockRelationship({ id: 1, source_device_id: 1, target_device_id: 2, relationship_type: "uplink" }),
    ];

    await setupCoreMocks(page);
    await setupTopologyMocks(page, devices, relationships);
    await page.goto("/topology");
  });

  test("renders the topology canvas and overlay layer", async ({ page }) => {
    await expect(page.locator(".graph-canvas")).toBeVisible();
    await expect(page.locator(".topology-overlay-layer")).toBeVisible();
  });

  test("overlay device nodes are present for each device", async ({ page }) => {
    const overlayNodes = page.locator(".topology-overlay-node");
    await expect(overlayNodes).toHaveCount(2, { timeout: 8000 });
  });

  test("clicking a device node position opens the details panel", async ({ page }) => {
    const firstNode = page.locator(".topology-overlay-node").first();
    await firstNode.waitFor({ state: "visible", timeout: 8000 });
    // Overlay has pointer-events: none; click the canvas at the node's screen position
    const box = await firstNode.boundingBox();
    if (box) {
      await page.locator(".graph-canvas").click({ position: { x: box.x + box.width / 2, y: box.y + box.height / 2 }, force: true });
    }
    await expect(page.locator(".details-panel")).toBeVisible({ timeout: 4000 });
  });

  test("clicking a device node position marks it as selected", async ({ page }) => {
    const firstNode = page.locator(".topology-overlay-node").first();
    await firstNode.waitFor({ state: "visible", timeout: 8000 });
    const box = await firstNode.boundingBox();
    if (box) {
      await page.locator(".graph-canvas").click({ position: { x: box.x + box.width / 2, y: box.y + box.height / 2 }, force: true });
    }
    await expect(firstNode).toHaveClass(/selected/, { timeout: 4000 });
  });

  test("clicking a second device position changes selection", async ({ page }) => {
    const nodes = page.locator(".topology-overlay-node");
    await nodes.first().waitFor({ state: "visible", timeout: 8000 });
    const canvas = page.locator(".graph-canvas");

    const box1 = await nodes.first().boundingBox();
    if (box1) await canvas.click({ position: { x: box1.x + box1.width / 2, y: box1.y + box1.height / 2 }, force: true });
    await expect(nodes.first()).toHaveClass(/selected/, { timeout: 4000 });

    const box2 = await nodes.last().boundingBox();
    if (box2) await canvas.click({ position: { x: box2.x + box2.width / 2, y: box2.y + box2.height / 2 }, force: true });
    await expect(nodes.last()).toHaveClass(/selected/, { timeout: 4000 });
    await expect(nodes.first()).not.toHaveClass(/selected/);
  });

  test("overlay device node titles match hostnames", async ({ page }) => {
    const nodes = page.locator(".topology-overlay-node");
    await nodes.first().waitFor({ state: "visible", timeout: 8000 });

    const titles = await nodes.evaluateAll((els) =>
      els.map((el) => el.getAttribute("title"))
    );
    expect(titles).toContain("router-01");
    expect(titles).toContain("switch-01");
  });

  test("no overlay nodes rendered when graph is empty", async ({ page }) => {
    // Re-route topology/graph to return empty
    await page.route("**/api/v1/topology/graph", (route) =>
      route.fulfill({ json: { devices: [], relationships: [] } })
    );
    await page.reload();

    await expect(page.locator(".empty-graph")).toBeVisible({ timeout: 8000 });
    await expect(page.locator(".topology-overlay-node")).toHaveCount(0);
  });
});
