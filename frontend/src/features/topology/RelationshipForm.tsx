import { useState, useEffect, useMemo, type FormEvent } from "react";
import { type Device, type Relationship, type RelationshipPayload } from "../../api/client";
import { deviceLabel, blankToNull } from "../../utils/format";
import { compareGroupLabels, groupRepresentativeDeviceId } from "../../utils/sort";
import { parseRelationshipVisualEndpoints, stripRelationshipMetadata, composeRelationshipNotes } from "../../utils/relationship";
import { Modal } from "../../components/Modal";

export function RelationshipEditForm({
  busy,
  devices,
  relationship,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  devices: Device[];
  relationship: Relationship;
  onCancel: () => void;
  onSubmit: (payload: {
    source_device_id: number;
    target_device_id: number;
    relationship_type: string;
    allow_outbound: boolean;
    allow_inbound: boolean;
    notes: string | null;
  }) => Promise<void>;
}) {
  const formId = "relationship-edit-form";
  const groupNames = useMemo(
    () =>
      [...new Set(devices.map((device) => device.topology_group))]
        .filter(Boolean)
        .sort(compareGroupLabels),
    [devices],
  );
  const endpointOptions = useMemo(() => {
    const deviceOptions = devices.map((device) => ({
      value: `device:${device.id}`,
      label: deviceLabel(device),
    }));
    const groupOptions = groupNames.map((group) => ({
      value: `group:${group}`,
      label: group,
    }));
    return {
      deviceOptions,
      groupOptions,
      all: [...groupOptions, ...deviceOptions],
    };
  }, [devices, groupNames]);
  const visualEndpoints = parseRelationshipVisualEndpoints(relationship.notes);
  const [sourceEndpoint, setSourceEndpoint] = useState(visualEndpoints?.source ?? `device:${relationship.source_device_id}`);
  const [targetEndpoint, setTargetEndpoint] = useState(visualEndpoints?.target ?? `device:${relationship.target_device_id}`);
  const [relationshipType, setRelationshipType] = useState(relationship.relationship_type);
  const [allowOutbound, setAllowOutbound] = useState(relationship.allow_outbound !== false);
  const [allowInbound, setAllowInbound] = useState(relationship.allow_inbound !== false);
  const [notes, setNotes] = useState(stripRelationshipMetadata(relationship.notes));
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!endpointOptions.all.some((option) => option.value === sourceEndpoint)) {
      setSourceEndpoint(`device:${relationship.source_device_id}`);
    }
    if (!endpointOptions.all.some((option) => option.value === targetEndpoint)) {
      setTargetEndpoint(`device:${relationship.target_device_id}`);
    }
  }, [endpointOptions, relationship.source_device_id, relationship.target_device_id, sourceEndpoint, targetEndpoint]);

  function resolveEndpoint(endpoint: string): { deviceId: number; type: "device" | "group" } | null {
    if (endpoint.startsWith("device:")) {
      const deviceId = Number(endpoint.replace("device:", ""));
      const device = devices.find((row) => row.id === deviceId);
      if (!device) {
        return null;
      }
      return {
        deviceId,
        type: "device",
      };
    }
    if (endpoint.startsWith("group:")) {
      const groupName = endpoint.replace("group:", "");
      const representativeDeviceId = groupRepresentativeDeviceId(devices, groupName);
      if (representativeDeviceId === null) {
        return null;
      }
      return {
        deviceId: representativeDeviceId,
        type: "group",
      };
    }
    return null;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const normalizedType = relationshipType.trim();
    if (!normalizedType) {
      setFormError("Link name is required");
      return;
    }
    const source = resolveEndpoint(sourceEndpoint);
    const target = resolveEndpoint(targetEndpoint);
    if (!source || !target) {
      setFormError("Select valid source and target endpoints");
      return;
    }
    if (source.deviceId === target.deviceId) {
      setFormError("Source and target resolve to the same device");
      return;
    }
    void onSubmit({
      source_device_id: source.deviceId,
      target_device_id: target.deviceId,
      relationship_type: normalizedType,
      allow_outbound: allowOutbound,
      allow_inbound: allowInbound,
      notes: composeRelationshipNotes(sourceEndpoint, targetEndpoint, blankToNull(notes) ?? null),
    });
  }

  return (
    <Modal
      title="Edit link"
      onCancel={onCancel}
    >
      <form id={formId} className="modal-form relationship-form" onSubmit={submit}>
        <label>
          Source
          <select value={sourceEndpoint} onChange={(event) => setSourceEndpoint(event.target.value)}>
            <optgroup label="Groups (VLAN / subnet zones)">
              {endpointOptions.groupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Devices">
              {endpointOptions.deviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label>
          Target
          <select value={targetEndpoint} onChange={(event) => setTargetEndpoint(event.target.value)}>
            <optgroup label="Groups (VLAN / subnet zones)">
              {endpointOptions.groupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Devices">
              {endpointOptions.deviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label>
          Link name
          <input required value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)} />
        </label>
        <label>
          <span className="inline-toggle">
            <input
              type="checkbox"
              checked={allowOutbound}
              onChange={(event) => setAllowOutbound(event.target.checked)}
            />
            Allow traffic source → target
          </span>
        </label>
        <label>
          <span className="inline-toggle">
            <input
              type="checkbox"
              checked={allowInbound}
              onChange={(event) => setAllowInbound(event.target.checked)}
            />
            Allow traffic target → source
          </span>
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        {formError && <div className="form-error">{formError}</div>}
        <div className="modal-actions">
          <button type="button" className="ipam-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="ipam-btn ipam-btn--primary" disabled={busy}>
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function RelationshipForm({
  busy,
  devices,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  devices: Device[];
  onCancel: () => void;
  onSubmit: (payload: RelationshipPayload) => Promise<void>;
}) {
  const groupNames = useMemo(
    () =>
      [...new Set(devices.map((device) => device.topology_group))]
        .filter(Boolean)
        .sort(compareGroupLabels),
    [devices],
  );
  const endpointOptions = useMemo(() => {
    const deviceOptions = devices.map((device) => ({
      value: `device:${device.id}`,
      label: deviceLabel(device),
    }));
    const groupOptions = groupNames.map((group) => ({
      value: `group:${group}`,
      label: group,
    }));
    return {
      deviceOptions,
      groupOptions,
      all: [...groupOptions, ...deviceOptions],
    };
  }, [devices, groupNames]);
  const [sourceEndpoint, setSourceEndpoint] = useState(endpointOptions.all[0]?.value ?? "");
  const [targetEndpoint, setTargetEndpoint] = useState(
    endpointOptions.all[1]?.value ?? endpointOptions.all[0]?.value ?? "",
  );
  const [relationshipType, setRelationshipType] = useState("link");
  const [allowOutbound, setAllowOutbound] = useState(true);
  const [allowInbound, setAllowInbound] = useState(true);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!endpointOptions.all.some((option) => option.value === sourceEndpoint)) {
      setSourceEndpoint(endpointOptions.all[0]?.value ?? "");
    }
    if (!endpointOptions.all.some((option) => option.value === targetEndpoint)) {
      setTargetEndpoint(endpointOptions.all[1]?.value ?? endpointOptions.all[0]?.value ?? "");
    }
  }, [endpointOptions, sourceEndpoint, targetEndpoint]);

  function resolveEndpoint(endpoint: string): { deviceId: number; description: string; type: "device" | "group" } | null {
    if (endpoint.startsWith("device:")) {
      const deviceId = Number(endpoint.replace("device:", ""));
      const device = devices.find((row) => row.id === deviceId);
      if (!device) {
        return null;
      }
      return {
        deviceId,
        description: deviceLabel(device),
        type: "device",
      };
    }
    if (endpoint.startsWith("group:")) {
      const groupName = endpoint.replace("group:", "");
      const representativeDeviceId = groupRepresentativeDeviceId(devices, groupName);
      if (representativeDeviceId === null) {
        return null;
      }
      return {
        deviceId: representativeDeviceId,
        description: groupName,
        type: "group",
      };
    }
    return null;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const source = resolveEndpoint(sourceEndpoint);
    const target = resolveEndpoint(targetEndpoint);
    if (!source || !target) {
      setFormError("Select valid source and target endpoints");
      return;
    }
    if (source.deviceId === target.deviceId) {
      setFormError("Source and target resolve to the same device");
      return;
    }
    onSubmit({
      source_device_id: source.deviceId,
      target_device_id: target.deviceId,
      relationship_type: relationshipType,
      allow_outbound: allowOutbound,
      allow_inbound: allowInbound,
      notes: composeRelationshipNotes(sourceEndpoint, targetEndpoint, blankToNull(notes) ?? null),
    });
  }

  return (
    <Modal title="Add relationship" onCancel={onCancel}>
      <form className="modal-form" onSubmit={submit}>
        <label>
          Source
          <select value={sourceEndpoint} onChange={(event) => setSourceEndpoint(event.target.value)}>
            <optgroup label="Groups (VLAN / subnet zones)">
              {endpointOptions.groupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Devices">
              {endpointOptions.deviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label>
          Target
          <select value={targetEndpoint} onChange={(event) => setTargetEndpoint(event.target.value)}>
            <optgroup label="Groups (VLAN / subnet zones)">
              {endpointOptions.groupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Devices">
              {endpointOptions.deviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label>
          Type
          <input required value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)} />
        </label>
        <label>
          <span className="inline-toggle">
            <input
              type="checkbox"
              checked={allowOutbound}
              onChange={(event) => setAllowOutbound(event.target.checked)}
            />
            Allow traffic source → target
          </span>
        </label>
        <label>
          <span className="inline-toggle">
            <input
              type="checkbox"
              checked={allowInbound}
              onChange={(event) => setAllowInbound(event.target.checked)}
            />
            Allow traffic target → source
          </span>
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        {formError && <div className="form-error">{formError}</div>}
        <div className="modal-actions">
          <button type="button" className="ipam-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="ipam-btn ipam-btn--primary" disabled={busy || sourceEndpoint.length === 0 || targetEndpoint.length === 0}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
