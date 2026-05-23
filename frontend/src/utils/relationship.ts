import type { Relationship, Device } from "../api/client";
import { blankToNull, deviceLabel } from "./format";
import { groupId } from "./topology";

export function parseRelationshipVisualEndpoints(notes: string | null) {
  if (!notes || !notes.startsWith("__visual_endpoints__:")) return null;
  const [header] = notes.split("\n", 1);
  const payload = header.replace("__visual_endpoints__:", "");
  const [sourceRaw, targetRaw] = payload.split("|", 2);
  if (!sourceRaw || !targetRaw) return null;
  try {
    return { source: decodeURIComponent(sourceRaw), target: decodeURIComponent(targetRaw) };
  } catch {
    return null;
  }
}

export function stripRelationshipMetadata(notes: string | null) {
  if (!notes) return "";
  if (!notes.startsWith("__visual_endpoints__:")) return notes;
  const [, ...rest] = notes.split("\n");
  return rest.join("\n").trim();
}

export function composeRelationshipNotes(
  sourceEndpoint: string,
  targetEndpoint: string,
  notes: string | null,
) {
  const prefix = `__visual_endpoints__:${encodeURIComponent(sourceEndpoint)}|${encodeURIComponent(targetEndpoint)}`;
  const cleanNotes = blankToNull(notes ?? "");
  return cleanNotes ? `${prefix}\n${cleanNotes}` : prefix;
}

export function preserveRelationshipMetadata(existingNotes: string | null, newNotes: string | null) {
  if (!existingNotes || !existingNotes.startsWith("__visual_endpoints__:")) return newNotes;
  const [header] = existingNotes.split("\n", 1);
  const cleanNotes = blankToNull(newNotes ?? "");
  return cleanNotes ? `${header}\n${cleanNotes}` : header;
}

export function relationshipVisualSourceNodeId(relationship: Relationship) {
  const endpoints = parseRelationshipVisualEndpoints(relationship.notes);
  const source = endpoints?.source;
  if (source && source.startsWith("group:")) return groupId(source.replace("group:", ""));
  if (source && source.startsWith("device:")) return `device-${Number(source.replace("device:", ""))}`;
  return `device-${relationship.source_device_id}`;
}

export function relationshipVisualTargetNodeId(relationship: Relationship) {
  const endpoints = parseRelationshipVisualEndpoints(relationship.notes);
  const target = endpoints?.target;
  if (target && target.startsWith("group:")) return groupId(target.replace("group:", ""));
  if (target && target.startsWith("device:")) return `device-${Number(target.replace("device:", ""))}`;
  return `device-${relationship.target_device_id}`;
}

export function relationshipEndpointLabel(
  endpoint: string | undefined,
  devices: Device[],
  fallbackDevice: Device | undefined,
  fallbackId: number,
) {
  if (endpoint?.startsWith("group:")) return endpoint.replace("group:", "");
  if (endpoint?.startsWith("device:")) {
    const deviceId = Number(endpoint.replace("device:", ""));
    const device = devices.find((row) => row.id === deviceId);
    return device ? deviceLabel(device) : `Device ${deviceId}`;
  }
  return fallbackDevice ? deviceLabel(fallbackDevice) : `Device ${fallbackId}`;
}
