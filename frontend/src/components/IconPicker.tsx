import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  allRuntimePacks,
  deviceIconPath,
  iconLabel,
  type IconGlyphDefinition,
} from "../icons";

function IconPickerGlyph({
  def,
  active,
  strokeColor,
}: {
  def: IconGlyphDefinition;
  active: boolean;
  strokeColor: string;
}) {
  if (def.url) {
    return <img src={def.url} width={32} height={32} alt={def.label} className="icon-picker-img" />;
  }
  return (
    <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke={active ? strokeColor : "#5b7c91"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <g dangerouslySetInnerHTML={{ __html: def.path ?? "" }} />
    </svg>
  );
}

function IconPickerModal({
  value,
  strokeColor = "#3b7cc9",
  onSelect,
  onClose,
}: {
  value: string;
  strokeColor?: string;
  onSelect: (icon: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const packs = allRuntimePacks;
  const showTabs = packs.length > 1;

  const allIcons = useMemo<IconGlyphDefinition[]>(() => {
    const seen = new Set<string>();
    const out: IconGlyphDefinition[] = [];
    for (const pack of packs) {
      for (const icon of pack.icons) {
        if (!seen.has(icon.value)) {
          seen.add(icon.value);
          out.push(icon);
        }
      }
    }
    return out;
  }, [packs]);

  const tabIcons = useMemo<IconGlyphDefinition[]>(() => {
    if (activeTab === "all") return allIcons;
    return packs.find((p) => p.id === activeTab)?.icons ?? [];
  }, [activeTab, allIcons, packs]);

  const q = search.trim().toLowerCase();
  const filtered = q ? tabIcons.filter((o) => o.label.toLowerCase().includes(q)) : tabIcons;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="icon-picker-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="icon-picker-modal" role="dialog" aria-label="Choose icon">
        <div className="icon-picker-header">
          <span className="icon-picker-title">Choose icon</span>
          <button type="button" className="icon-picker-close" onClick={onClose}>✕</button>
        </div>
        <div className="icon-picker-search-row">
          <input
            autoFocus
            className="icon-picker-search"
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {showTabs && (
          <div className="icon-picker-tabs">
            <button
              type="button"
              className={`icon-picker-tab${activeTab === "all" ? " active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All
            </button>
            {packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className={`icon-picker-tab${activeTab === pack.id ? " active" : ""}`}
                onClick={() => setActiveTab(pack.id)}
              >
                {pack.name}
              </button>
            ))}
          </div>
        )}
        <div className="icon-picker-grid">
          {filtered.map((def) => {
            const active = def.value === value;
            return (
              <button
                key={def.value}
                type="button"
                className={`icon-picker-item${active ? " selected" : ""}`}
                title={def.label}
                onClick={() => { onSelect(def.value); onClose(); }}
              >
                <IconPickerGlyph def={def} active={active} strokeColor={strokeColor} />
                <span>{def.label}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="icon-picker-empty">
              {q ? `No icons match "${search}"` : "No icons in this pack"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function DeviceTypeIconPicker({
  currentIcon,
  onSelect,
}: {
  currentIcon: string;
  onSelect: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dtype-icon-picker">
      <button
        type="button"
        className="dtype-icon-current"
        title="Click to change icon"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#3b7cc9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <g dangerouslySetInnerHTML={{ __html: deviceIconPath(currentIcon) }} />
        </svg>
        <span>{iconLabel(currentIcon)}</span>
        <ChevronDown size={10} />
      </button>
      {open && (
        <IconPickerModal
          value={currentIcon}
          onSelect={onSelect}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export function IconPickerTrigger({
  value,
  color,
  onChange,
}: {
  value: string;
  color?: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const strokeColor = color || "#3b7cc9";
  return (
    <div className="icon-picker-trigger-wrap">
      <button
        type="button"
        className="icon-picker-trigger-btn"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <g dangerouslySetInnerHTML={{ __html: deviceIconPath(value) }} />
        </svg>
        <div className="icon-picker-trigger-text">
          <span className="icon-picker-trigger-name">{iconLabel(value)}</span>
          <span className="icon-picker-trigger-hint">Click to change</span>
        </div>
        <ChevronDown size={13} className="icon-picker-trigger-chevron" />
      </button>
      {open && (
        <IconPickerModal
          value={value}
          strokeColor={strokeColor}
          onSelect={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
