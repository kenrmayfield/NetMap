import React from "react";
import {
  IconBolt,
  IconCamera,
  IconCloud,
  IconDatabase,
  IconDeviceDesktop,
  IconPhone,
  IconPrinter,
  IconRoute,
  IconRouter,
  IconServer,
  IconShieldCheck,
  IconTopologyRing,
  IconWifi,
} from "@tabler/icons-react";

export function DeviceTypeIcon({ type, size = 13 }: { type: string | null | undefined; size?: number }) {
  const t = (type ?? "").toLowerCase();
  const props = { size, style: { flexShrink: 0 } as React.CSSProperties };
  if (t === "router") return <IconRouter {...props} />;
  if (t === "switch") return <IconTopologyRing {...props} />;
  if (t === "firewall") return <IconShieldCheck {...props} />;
  if (t === "server") return <IconServer {...props} />;
  if (t === "wireless") return <IconWifi {...props} />;
  if (t === "workstation") return <IconDeviceDesktop {...props} />;
  if (t === "database") return <IconDatabase {...props} />;
  if (t === "nas") return <IconServer {...props} />;
  if (t === "camera") return <IconCamera {...props} />;
  if (t === "printer") return <IconPrinter {...props} />;
  if (t === "iot") return <IconBolt {...props} />;
  if (t === "hypervisor") return <IconServer {...props} />;
  if (t === "phone") return <IconPhone {...props} />;
  if (t === "vpn") return <IconRoute {...props} />;
  if (t === "cloud") return <IconCloud {...props} />;
  return <IconDeviceDesktop {...props} />;
}
