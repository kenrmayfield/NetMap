# Changelog

## [1.1.0] - 2026-05-23

### Inventory
- Redesigned header: icon-box stat chips, merged filter/bulk-edit row, quick status-filter dropdown
- Pagination with per-page selector (persists via `localStorage`)
- DeviceTypeIcon in table, bulk-edit type dropdown, and device details panel
- VLAN and Location cells show small coloured icons

### IPAM
- Removed Conflicts stat chip; conflicts banner is now full-width
- Subnets table fills page width (removed grid wrapper)
- Reservations panel: subnet filter dropdown, delete button on existing reservations, table header icons
- Free-address hover changed from purple to teal; added "click to reserve" hint text

### UI / General
- Light mode panel headers softened to `#edf3f7` across overview, monitoring, and IPAM
- Cancel button styling fixed consistently across all modal and popup contexts
- Topology toolbar dark mode polish

### Frontend (internal)
- `main.tsx` (12,790 lines) fully split into ~55 focused modules
- `src/utils/` — IP math, formatters, sort, topology, relationships, security, CSV, monitoring, download
- `src/components/` — 13 atom components (Modal, DashStat, HealthDonut, IpGrid, HeartbeatBar, etc.)
- `src/features/` — auth views, device/topology/IPAM forms and panels, all 12 workspace pages
- `src/App.tsx`, `src/Sidebar.tsx`, `src/views/` — shell extracted; `main.tsx` is now a 10-line entry point

---

## [1.0.5] - 2026-05-20

- Separate `firewall.db` to isolate syslog flood writes from main app
- SQLite WAL mode + `busy_timeout=5000` on both databases
- nmap discovery runs via `sudo` inside the container
- CSRF cookie `path` fixed to `"/"` so the SPA can read it on all routes
- Syslog blank-entry filter (skips events where all parsed fields are None)
- Firewall logs UI rework: action pills, quick filter buttons, dark mode variants
- Version display reads `/app/VERSION` file; version checker uses GitHub tags API
- Timezone support added to container
- Firewall live-tail fix
- Discovery scan auto-populates group IP range
- UI consistency pass across pages
