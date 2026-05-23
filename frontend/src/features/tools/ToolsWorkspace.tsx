import { useState, useEffect, type FormEvent } from "react";
import { Search, Network } from "lucide-react";
import { IconWifi, IconServer, IconWorld, IconLayoutDashboard } from "@tabler/icons-react";
import {
  api,
  type DnsRecordType, type DnsLookupResult, type ReverseDnsResult,
  type PingResult, type TracerouteResult, type TcpPortCheckResult,
  type SubnetCalculatorResult, type Device, type TopologyGraph, type User,
} from "../../api/client";
import { SUBNET_REF } from "../../constants";
import { deviceLabel, formatMs } from "../../utils/format";
import { prefixToMask, wildcardMask, ipClass, ipType } from "../../utils/ip";

export function ToolsWorkspace({
  accessToken,
  graph,
  selectedDevice,
  userRole,
}: {
  accessToken: string;
  graph: TopologyGraph;
  selectedDevice: Device | null;
  userRole: User["role"];
}) {
  const canRunActiveTools = userRole === "SuperAdmin" || userRole === "NetworkAdmin";
  const [dnsName, setDnsName] = useState("");
  const [dnsRecordType, setDnsRecordType] = useState<DnsRecordType>("A");
  const [dnsResult, setDnsResult] = useState<DnsLookupResult | null>(null);
  const [dnsError, setDnsError] = useState<string | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [reverseDnsIp, setReverseDnsIp] = useState("");
  const [reverseDnsResult, setReverseDnsResult] = useState<ReverseDnsResult | null>(null);
  const [reverseDnsError, setReverseDnsError] = useState<string | null>(null);
  const [reverseDnsLoading, setReverseDnsLoading] = useState(false);
  const [pingHostValue, setPingHostValue] = useState("");
  const [pingCount, setPingCount] = useState("4");
  const [pingTimeout, setPingTimeout] = useState("3");
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [tracerouteHostValue, setTracerouteHostValue] = useState("");
  const [tracerouteMaxHops, setTracerouteMaxHops] = useState("20");
  const [tracerouteTimeout, setTracerouteTimeout] = useState("3");
  const [tracerouteResult, setTracerouteResult] = useState<TracerouteResult | null>(null);
  const [tracerouteError, setTracerouteError] = useState<string | null>(null);
  const [tracerouteLoading, setTracerouteLoading] = useState(false);
  const [tcpHostValue, setTcpHostValue] = useState("");
  const [tcpPort, setTcpPort] = useState("443");
  const [tcpTimeout, setTcpTimeout] = useState("3");
  const [tcpResult, setTcpResult] = useState<TcpPortCheckResult | null>(null);
  const [tcpError, setTcpError] = useState<string | null>(null);
  const [tcpLoading, setTcpLoading] = useState(false);
  const [subnetIp, setSubnetIp] = useState("");
  const [subnetPrefix, setSubnetPrefix] = useState(24);
  const [subnetSubmittedIp, setSubnetSubmittedIp] = useState("");
  const [subnetResult, setSubnetResult] = useState<SubnetCalculatorResult | null>(null);
  const [subnetError, setSubnetError] = useState<string | null>(null);
  const [subnetLoading, setSubnetLoading] = useState(false);

  const activeTarget = selectedDevice?.ip_address ?? "";
  const [activeTool, setActiveTool] = useState("dns");

  useEffect(() => {
    if (!selectedDevice) {
      return;
    }
    const ip = selectedDevice.ip_address ?? "";
    setReverseDnsIp(ip);
    setPingHostValue((current) => current || ip);
    setTracerouteHostValue((current) => current || ip);
    setTcpHostValue((current) => current || ip);
    if (selectedDevice.subnet) {
      const parts = selectedDevice.subnet.split("/");
      setSubnetIp(parts[0]);
      if (parts.length === 2) setSubnetPrefix(Number(parts[1]) || 24);
    } else {
      setSubnetIp((cur) => cur || selectedDevice.ip_address || "");
    }
  }, [selectedDevice]);

  async function runDnsLookup(event: FormEvent) {
    event.preventDefault();
    setDnsLoading(true);
    setDnsError(null);
    try {
      setDnsResult(await api.dnsLookup(accessToken, { name: dnsName, record_type: dnsRecordType }));
    } catch (err) {
      setDnsError(err instanceof Error ? err.message : "DNS lookup failed");
    } finally {
      setDnsLoading(false);
    }
  }

  async function runReverseDns(event: FormEvent) {
    event.preventDefault();
    setReverseDnsLoading(true);
    setReverseDnsError(null);
    try {
      setReverseDnsResult(await api.reverseDns(accessToken, { ip_address: reverseDnsIp }));
    } catch (err) {
      setReverseDnsError(err instanceof Error ? err.message : "Reverse DNS lookup failed");
    } finally {
      setReverseDnsLoading(false);
    }
  }

  async function runPing(event: FormEvent) {
    event.preventDefault();
    if (!canRunActiveTools) {
      return;
    }
    setPingLoading(true);
    setPingError(null);
    try {
      setPingResult(
        await api.ping(accessToken, {
          host: pingHostValue,
          count: Number(pingCount),
          timeout_seconds: Number(pingTimeout),
        }),
      );
    } catch (err) {
      setPingError(err instanceof Error ? err.message : "Ping failed");
    } finally {
      setPingLoading(false);
    }
  }

  async function runTraceroute(event: FormEvent) {
    event.preventDefault();
    if (!canRunActiveTools) {
      return;
    }
    setTracerouteLoading(true);
    setTracerouteError(null);
    try {
      setTracerouteResult(
        await api.traceroute(accessToken, {
          host: tracerouteHostValue,
          max_hops: Number(tracerouteMaxHops),
          timeout_seconds: Number(tracerouteTimeout),
        }),
      );
    } catch (err) {
      setTracerouteError(err instanceof Error ? err.message : "Traceroute failed");
    } finally {
      setTracerouteLoading(false);
    }
  }

  async function runTcpCheck(event: FormEvent) {
    event.preventDefault();
    if (!canRunActiveTools) {
      return;
    }
    setTcpLoading(true);
    setTcpError(null);
    try {
      setTcpResult(
        await api.tcpCheck(accessToken, {
          host: tcpHostValue,
          port: Number(tcpPort),
          timeout_seconds: Number(tcpTimeout),
        }),
      );
    } catch (err) {
      setTcpError(err instanceof Error ? err.message : "TCP check failed");
    } finally {
      setTcpLoading(false);
    }
  }

  async function runSubnetCalculation(event: FormEvent) {
    event.preventDefault();
    setSubnetLoading(true);
    setSubnetError(null);
    setSubnetSubmittedIp(subnetIp.trim());
    try {
      setSubnetResult(await api.subnetCalculate(accessToken, { cidr: `${subnetIp.trim()}/${subnetPrefix}` }));
    } catch (err) {
      setSubnetError(err instanceof Error ? err.message : "Subnet calculation failed");
    } finally {
      setSubnetLoading(false);
    }
  }

  function applySelectedDevice() {
    if (!selectedDevice) {
      return;
    }
    const ip = selectedDevice.ip_address ?? "";
    setReverseDnsIp(ip);
    setPingHostValue(ip);
    setTracerouteHostValue(ip);
    setTcpHostValue(ip);
    if (selectedDevice.subnet) {
      const parts = selectedDevice.subnet.split("/");
      setSubnetIp(parts[0]);
      if (parts.length === 2) setSubnetPrefix(Number(parts[1]) || 24);
    }
  }

  return (
    <section className="tools-layout" id="tools">
      {selectedDevice && (
        <div className="tool-target-strip tools-target-row">
          <span>Selected topology device</span>
          <strong>{deviceLabel(selectedDevice)}</strong>
          <button type="button" onClick={applySelectedDevice}>
            Use in forms
          </button>
        </div>
      )}
      <div className="tools-content">
        <nav className="tools-nav">
          {([
            { id: "dns",         label: "DNS Lookup",        Icon: Search,               passive: true  },
            { id: "reverse-dns", label: "Reverse DNS",       Icon: IconWorld,             passive: true  },
            { id: "ping",        label: "Ping Test",         Icon: IconWifi,              passive: false },
            { id: "traceroute",  label: "Traceroute",        Icon: Network,               passive: false },
            { id: "tcp",         label: "TCP Port Check",    Icon: IconServer,            passive: false },
            { id: "subnet",      label: "Subnet Calculator", Icon: IconLayoutDashboard,   passive: true  },
          ] as const).map(({ id, label, Icon, passive }) => {
            const available = passive || canRunActiveTools;
            return (
              <button
                key={id}
                type="button"
                className={`tools-nav-item${activeTool === id ? " tools-nav-item--active" : ""}${!available ? " tools-nav-item--locked" : ""}`}
                onClick={() => setActiveTool(id)}
              >
                <Icon size={15} />
                <span className="tools-nav-label">{label}</span>
              </button>
            );
          })}
        </nav>
        <div className="tools-main">
          <div className="tools-main-inner">
          {activeTool === "dns" && <section className="tool-card">
            <div className="tool-card-header">
              <h3>DNS lookup</h3>
              <span className="tool-badge">Passive</span>
            </div>
            <form className="tool-form" onSubmit={runDnsLookup}>
              <label>
                Name
                <input required value={dnsName} onChange={(event) => setDnsName(event.target.value)} />
              </label>
              <label>
                Record type
                <select value={dnsRecordType} onChange={(event) => setDnsRecordType(event.target.value as DnsRecordType)}>
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="MX">MX</option>
                  <option value="TXT">TXT</option>
                  <option value="NS">NS</option>
                  <option value="CNAME">CNAME</option>
                </select>
              </label>
              <div className="tool-form-actions">
                <button type="submit" disabled={dnsLoading}>
                  {dnsLoading ? "Running..." : "Lookup"}
                </button>
              </div>
            </form>
            {dnsError && <div className="form-error">{dnsError}</div>}
            {dnsResult && (
              <div className="tool-result">
                <div className="tool-result-meta">
                  <span>{dnsResult.source}</span>
                  <span>{dnsResult.duration_ms} ms</span>
                </div>
                {dnsResult.records.length === 0 ? (
                  <p className="tool-result-empty">No records returned.</p>
                ) : (
                  <ul className="tool-result-list">
                    {dnsResult.records.map((record) => (
                      <li key={`${dnsResult.record_type}-${record.value}`}>{record.value}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>}

          {activeTool === "reverse-dns" && <section className="tool-card">
            <div className="tool-card-header">
              <h3>Reverse DNS</h3>
              <span className="tool-badge">Passive</span>
            </div>
            <form className="tool-form" onSubmit={runReverseDns}>
              <label>
                IP address
                <input required value={reverseDnsIp} onChange={(event) => setReverseDnsIp(event.target.value)} />
              </label>
              <div className="tool-form-actions">
                <button type="submit" disabled={reverseDnsLoading}>
                  {reverseDnsLoading ? "Running..." : "Lookup"}
                </button>
              </div>
            </form>
            {reverseDnsError && <div className="form-error">{reverseDnsError}</div>}
            {reverseDnsResult && (
              <div className="tool-result">
                <div className="tool-result-meta">
                  <span>{reverseDnsResult.source}</span>
                  <span>{reverseDnsResult.duration_ms} ms</span>
                </div>
                {reverseDnsResult.ptr_records.length === 0 ? (
                  <p className="tool-result-empty">No PTR records returned.</p>
                ) : (
                  <ul className="tool-result-list">
                    {reverseDnsResult.ptr_records.map((record) => (
                      <li key={record}>{record}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>}

          {activeTool === "ping" && <section className="tool-card">
            <div className="tool-card-header">
              <h3>Ping test</h3>
              <span className={`tool-badge ${canRunActiveTools ? "active" : "locked"}`}>
                {canRunActiveTools ? "Active" : "Restricted"}
              </span>
            </div>
            <form className="tool-form" onSubmit={runPing}>
              <label>
                Host
                <input required disabled={!canRunActiveTools} value={pingHostValue} onChange={(event) => setPingHostValue(event.target.value)} />
              </label>
              <div className="tool-form-grid">
                <label>
                  Count
                  <input
                    min={1}
                    max={10}
                    required
                    type="number"
                    disabled={!canRunActiveTools}
                    value={pingCount}
                    onChange={(event) => setPingCount(event.target.value)}
                  />
                </label>
                <label>
                  Timeout
                  <input
                    min={1}
                    max={30}
                    required
                    type="number"
                    disabled={!canRunActiveTools}
                    value={pingTimeout}
                    onChange={(event) => setPingTimeout(event.target.value)}
                  />
                </label>
              </div>
              <div className="tool-form-actions">
                <button type="submit" disabled={pingLoading || !canRunActiveTools}>
                  {pingLoading ? "Running..." : "Ping"}
                </button>
              </div>
            </form>
            {!canRunActiveTools && <p className="tool-note">Active tools are disabled for this role.</p>}
            {pingError && <div className="form-error">{pingError}</div>}
            {pingResult && (
              <div className="tool-result">
                <div className="tool-result-meta">
                  <span>{pingResult.host}</span>
                  <span>{pingResult.duration_ms} ms</span>
                </div>
                <dl className="tool-result-pairs">
                  <dt>Packets</dt>
                  <dd>{`${pingResult.received ?? 0}/${pingResult.transmitted ?? 0}`}</dd>
                  <dt>Loss</dt>
                  <dd>{pingResult.packet_loss !== null ? `${pingResult.packet_loss}%` : "-"}</dd>
                  <dt>Avg RTT</dt>
                  <dd>{formatMs(pingResult.average_ms)}</dd>
                </dl>
                <pre className="tool-output">{pingResult.raw_output}</pre>
              </div>
            )}
          </section>}

          {activeTool === "traceroute" && <section className="tool-card">
            <div className="tool-card-header">
              <h3>Traceroute</h3>
              <span className={`tool-badge ${canRunActiveTools ? "active" : "locked"}`}>
                {canRunActiveTools ? "Active" : "Restricted"}
              </span>
            </div>
            <form className="tool-form" onSubmit={runTraceroute}>
              <label>
                Host
                <input required disabled={!canRunActiveTools} value={tracerouteHostValue} onChange={(event) => setTracerouteHostValue(event.target.value)} />
              </label>
              <div className="tool-form-grid">
                <label>
                  Max hops
                  <input
                    min={1}
                    max={64}
                    required
                    type="number"
                    disabled={!canRunActiveTools}
                    value={tracerouteMaxHops}
                    onChange={(event) => setTracerouteMaxHops(event.target.value)}
                  />
                </label>
                <label>
                  Timeout
                  <input
                    min={1}
                    max={60}
                    required
                    type="number"
                    disabled={!canRunActiveTools}
                    value={tracerouteTimeout}
                    onChange={(event) => setTracerouteTimeout(event.target.value)}
                  />
                </label>
              </div>
              <div className="tool-form-actions">
                <button type="submit" disabled={tracerouteLoading || !canRunActiveTools}>
                  {tracerouteLoading ? "Running..." : "Trace route"}
                </button>
              </div>
            </form>
            {!canRunActiveTools && <p className="tool-note">Active tools are disabled for this role.</p>}
            {tracerouteError && <div className="form-error">{tracerouteError}</div>}
            {tracerouteResult && (
              <div className="tool-result">
                <div className="tool-result-meta">
                  <span>{tracerouteResult.host}</span>
                  <span>{tracerouteResult.duration_ms} ms</span>
                </div>
                {tracerouteResult.hops.length === 0 ? (
                  <p className="tool-result-empty">No hops parsed from traceroute output.</p>
                ) : (
                  <div className="tool-hop-list">
                    {tracerouteResult.hops.map((hop) => (
                      <div className="tool-hop-row" key={`${hop.hop}-${hop.address || "unknown"}`}>
                        <span>Hop {hop.hop}</span>
                        <span>{hop.address || hop.host || "*"}</span>
                        <span>{formatMs(hop.rtt_ms)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>}

          {activeTool === "tcp" && <section className="tool-card">
            <div className="tool-card-header">
              <h3>TCP port check</h3>
              <span className={`tool-badge ${canRunActiveTools ? "active" : "locked"}`}>
                {canRunActiveTools ? "Active" : "Restricted"}
              </span>
            </div>
            <form className="tool-form" onSubmit={runTcpCheck}>
              <label>
                Host
                <input required disabled={!canRunActiveTools} value={tcpHostValue} onChange={(event) => setTcpHostValue(event.target.value)} />
              </label>
              <div className="tool-form-grid">
                <label>
                  Port
                  <input
                    min={1}
                    max={65535}
                    required
                    type="number"
                    disabled={!canRunActiveTools}
                    value={tcpPort}
                    onChange={(event) => setTcpPort(event.target.value)}
                  />
                </label>
                <label>
                  Timeout
                  <input
                    min={1}
                    max={30}
                    required
                    type="number"
                    disabled={!canRunActiveTools}
                    value={tcpTimeout}
                    onChange={(event) => setTcpTimeout(event.target.value)}
                  />
                </label>
              </div>
              <div className="tool-form-actions">
                <button type="submit" disabled={tcpLoading || !canRunActiveTools}>
                  {tcpLoading ? "Running..." : "Check port"}
                </button>
              </div>
            </form>
            {!canRunActiveTools && <p className="tool-note">Active tools are disabled for this role.</p>}
            {tcpError && <div className="form-error">{tcpError}</div>}
            {tcpResult && (
              <div className="tool-result">
                <div className="tool-result-meta">
                  <span>{`${tcpResult.host}:${tcpResult.port}`}</span>
                  <span>{tcpResult.duration_ms} ms</span>
                </div>
                <p className={tcpResult.reachable ? "tool-status success" : "tool-status danger"}>
                  {tcpResult.reachable ? "Reachable" : "Unreachable"}
                </p>
                <p className="tool-note">{tcpResult.detail}</p>
              </div>
            )}
          </section>}

          {activeTool === "subnet" && <section className="tool-card">
            <div className="tool-card-header">
              <h3>Subnet calculator</h3>
              <span className="tool-badge">Passive</span>
            </div>
            <form className="tool-form" onSubmit={runSubnetCalculation}>
              <div className="subnet-input-row">
                <label className="subnet-ip-label">
                  IP Address
                  <input required placeholder="192.168.1.0" value={subnetIp} onChange={(e) => setSubnetIp(e.target.value)} />
                </label>
                <label className="subnet-prefix-label">
                  Prefix / Mask
                  <select value={subnetPrefix} onChange={(e) => setSubnetPrefix(Number(e.target.value))}>
                    {Array.from({ length: 32 }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>{`/${p} — ${prefixToMask(p)}`}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="tool-form-actions">
                <button type="submit" disabled={subnetLoading}>
                  {subnetLoading ? "Calculating…" : "Calculate"}
                </button>
              </div>
            </form>
            {subnetError && <div className="form-error">{subnetError}</div>}
            {subnetResult && (
              <div className="tool-result">
                <dl className="subnet-result-dl">
                  <div className="subnet-row subnet-row--highlight">
                    <dt>Usable host range</dt>
                    <dd>
                      {subnetResult.first_host && subnetResult.last_host
                        ? `${subnetResult.first_host} – ${subnetResult.last_host}`
                        : "N/A (host address)"}
                    </dd>
                  </div>
                  <div className="subnet-row">
                    <dt>Network address</dt>
                    <dd>{subnetResult.network}/{subnetResult.prefix_length}</dd>
                  </div>
                  {subnetResult.broadcast && (
                    <div className="subnet-row">
                      <dt>Broadcast address</dt>
                      <dd>{subnetResult.broadcast}</dd>
                    </div>
                  )}
                  <div className="subnet-row">
                    <dt>Subnet mask</dt>
                    <dd>{subnetResult.netmask}</dd>
                  </div>
                  <div className="subnet-row">
                    <dt>Wildcard mask</dt>
                    <dd>{wildcardMask(subnetResult.netmask)}</dd>
                  </div>
                  <div className="subnet-row">
                    <dt>Total hosts</dt>
                    <dd>{subnetResult.total_addresses.toLocaleString()}</dd>
                  </div>
                  <div className="subnet-row">
                    <dt>Usable hosts</dt>
                    <dd>{subnetResult.usable_hosts.toLocaleString()}</dd>
                  </div>
                  {subnetResult.version === 4 && subnetSubmittedIp && (
                    <>
                      <div className="subnet-row">
                        <dt>IP class</dt>
                        <dd>Class {ipClass(subnetSubmittedIp)}</dd>
                      </div>
                      <div className="subnet-row">
                        <dt>IP type</dt>
                        <dd>{ipType(subnetSubmittedIp)}</dd>
                      </div>
                    </>
                  )}
                </dl>
                <div className="subnet-ref">
                  <div className="subnet-ref-title">Common subnet reference</div>
                  <table className="subnet-ref-table">
                    <thead>
                      <tr>
                        <th>Prefix</th>
                        <th>Subnet mask</th>
                        <th>Usable hosts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SUBNET_REF.map((row) => (
                        <tr key={row.prefix} className={row.prefix === subnetResult.prefix_length ? "subnet-ref-current" : ""}>
                          <td>/{row.prefix}</td>
                          <td>{row.mask}</td>
                          <td>{row.hosts.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>}

          </div>
        </div>
      </div>
    </section>
  );
}
