import { type Page } from "@playwright/test";

export const mockUser = {
  id: 1,
  username: "admin",
  email: "admin@example.com",
  role: "SuperAdmin",
  is_active: true,
};

export const mockTokenPair = {
  access_token: "mock-access-token",
  token_type: "bearer",
};

export function mockDevice(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    hostname: "router-01",
    ip_address: "192.168.1.1",
    status: "active",
    monitor_status: "online",
    topology_group: "Ungrouped",
    color: null,
    icon: null,
    notes: "",
    site_id: null,
    is_favourite: false,
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockRelationship(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    source_device_id: 1,
    target_device_id: 2,
    relationship_type: "uplink",
    notes: "",
    allow_outbound: true,
    allow_inbound: true,
    ...overrides,
  };
}

// Sets up the auth bootstrap mocks so the app reaches the dashboard.
// Route order matters: register before page.goto().
export async function setupCoreMocks(page: Page) {
  await page.route("**/api/v1/admin/public-settings", (route) =>
    route.fulfill({
      json: { app_name: "NetMap", idle_timeout_minutes: 15, announcement: null },
    })
  );
  await page.route("**/api/v1/auth/setup-required", (route) =>
    route.fulfill({ json: { needs_setup: false } })
  );
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({ json: mockTokenPair })
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: mockUser })
  );
  await page.route("**/api/v1/system/version", (route) =>
    route.fulfill({ json: { version: "1.2.4", latest: "1.2.4", update_available: false } })
  );
  await page.route("**/api/v1/icon-packs", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/v1/devices/favourites", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/v1/dashboard/summary", (route) =>
    route.fulfill({ json: { device_count: 0, online_count: 0, offline_count: 0, subnet_count: 0 } })
  );
}

export async function setupTopologyMocks(
  page: Page,
  devices: ReturnType<typeof mockDevice>[] = [],
  relationships: ReturnType<typeof mockRelationship>[] = []
) {
  await page.route("**/api/v1/topology/graph", (route) =>
    route.fulfill({ json: { devices, relationships } })
  );
  await page.route("**/api/v1/topology/layouts*", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/v1/topology/groups*", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/v1/sites*", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/v1/topology/live-statuses", (route) =>
    route.fulfill({ json: { statuses: [] } })
  );
  await page.route("**/api/v1/security/device-event-counts*", (route) =>
    route.fulfill({ json: [] })
  );
}

export async function setupInventoryMocks(
  page: Page,
  devices: ReturnType<typeof mockDevice>[] = []
) {
  await page.route("**/api/v1/devices*", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ json: { devices, total: devices.length } });
    } else {
      route.continue();
    }
  });
  await page.route("**/api/v1/topology/groups*", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/v1/sites*", (route) =>
    route.fulfill({ json: [] })
  );
}
