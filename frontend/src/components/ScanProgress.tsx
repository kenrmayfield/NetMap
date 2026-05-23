import type { DiscoveryScanType } from "../api/client";

export function ScanProgress({ scanType }: { scanType: DiscoveryScanType }) {
  return (
    <div className="scan-progress" role="status">
      <div className="scan-progress-pulse" />
      <div>
        <strong>Scanning network</strong>
        <span>
          Validating target, running {scanType === "ping" ? "ping sweep" : "basic port detection"}, parsing results.
        </span>
      </div>
    </div>
  );
}
