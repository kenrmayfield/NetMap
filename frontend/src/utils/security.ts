import type { FirewallEvent, CorrelatedFirewallEvent, FirewallEventSearchParams, Device } from "../api/client";
import type { SecurityFilters } from "../types";
import { blankToUndefined, toOptionalPort, dateTimeLocalToIso } from "./format";
import { compareDevices } from "./sort";

export function buildFirewallEventsWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/v1/syslog/events/live`;
}

export function buildSearchParams(
  filters: SecurityFilters,
  offset: number,
  limit: number,
  sortBy: string,
  sortDir: "asc" | "desc",
): FirewallEventSearchParams {
  return {
    q: blankToUndefined(filters.q),
    src_ip: blankToUndefined(filters.src_ip),
    dst_ip: blankToUndefined(filters.dst_ip),
    src_port: toOptionalPort(filters.src_port),
    dst_port: toOptionalPort(filters.dst_port),
    action: blankToUndefined(filters.action.toLowerCase()),
    protocol: blankToUndefined(filters.protocol.toLowerCase()),
    interface: blankToUndefined(filters.interface),
    start_time: dateTimeLocalToIso(filters.start_time),
    end_time: dateTimeLocalToIso(filters.end_time),
    limit,
    offset,
    sort_by: sortBy,
    sort_dir: sortDir,
  };
}

export function eventMatchesFilters(event: FirewallEvent, filters: SecurityFilters) {
  const comparisons: Array<[string, string | number | null]> = [
    [filters.src_ip, event.src_ip],
    [filters.dst_ip, event.dst_ip],
    [filters.src_port, event.src_port],
    [filters.dst_port, event.dst_port],
    [filters.action, event.action],
    [filters.protocol, event.protocol],
    [filters.interface, event.interface],
  ];
  if (comparisons.some(([filter, value]) => filter && String(value ?? "").toLowerCase() !== filter.toLowerCase())) {
    return false;
  }
  if (filters.q) {
    const haystack = [event.raw_log, event.src_ip, event.dst_ip, event.source_host, event.rule_id, event.reason]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) return false;
  }
  const eventTime = new Date(event.received_at).getTime();
  const startTime = filters.start_time ? new Date(filters.start_time).getTime() : null;
  const endTime = filters.end_time ? new Date(filters.end_time).getTime() : null;
  return (!startTime || eventTime >= startTime) && (!endTime || eventTime <= endTime);
}

export function relatedDevicesForEvent(
  event: FirewallEvent | CorrelatedFirewallEvent,
  devicesByIp: Map<string, Device[]>,
): Device[] {
  const results = new Map<number, Device>();
  if (event.src_ip) (devicesByIp.get(event.src_ip.trim()) ?? []).forEach((device) => results.set(device.id, device));
  if (event.dst_ip) (devicesByIp.get(event.dst_ip.trim()) ?? []).forEach((device) => results.set(device.id, device));
  return [...results.values()].sort(compareDevices);
}
