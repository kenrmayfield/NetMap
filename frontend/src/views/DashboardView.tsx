import { useState } from "react";
import {
  type User, type TopologyGraph, type DashboardSummary, type Device, type VersionInfo,
} from "../api/client";
import { type AppRoute } from "../routes";
import { type IconPack } from "../icons";
import { OverviewWorkspace } from "../features/overview/OverviewWorkspace";
import { SecurityWorkspace } from "../features/security/SecurityWorkspace";
import { ToolsWorkspace } from "../features/tools/ToolsWorkspace";
import { ExportsWorkspace } from "../features/exports/ExportsWorkspace";
import { AdminWorkspace } from "../features/admin/AdminWorkspace";
import { TopologyWorkspace } from "../features/topology/TopologyWorkspace";
import { InventoryWorkspace } from "../features/inventory/InventoryWorkspace";
import { VlanWorkspace } from "../features/vlans/VlanWorkspace";
import { LocationsWorkspace } from "../features/locations/LocationsWorkspace";
import { ProfileWorkspace } from "../features/profile/ProfileWorkspace";
import { IpamWorkspace } from "../features/ipam/IpamWorkspace";
import { MonitoringWorkspace } from "../features/monitoring/MonitoringWorkspace";

export function DashboardView({
  accessToken,
  currentRoute,
  graph,
  livePingEnabled,
  onGraphChange,
  onDeviceChange,
  onDevicesRemove,
  onNavigate,
  onUserUpdate,
  theme,
  user,
  summary,
  activeIconPackId,
  iconPackLoading,
  iconPacks,
  localIconPacks,
  iconPackError,
  onSelectIconPack,
  onAddLocalIconPack,
  onRemoveLocalIconPack,
  versionInfo,
}: {
  accessToken: string | null;
  currentRoute: AppRoute;
  graph: TopologyGraph;
  livePingEnabled: boolean;
  onGraphChange: () => Promise<void>;
  onDeviceChange: (device: Device) => void;
  onDevicesRemove: (deviceIds: number[]) => void;
  onNavigate: (route: AppRoute) => void;
  onUserUpdate: (user: User) => void;
  theme: "light" | "dark";
  user: User;
  summary: DashboardSummary | null;
  activeIconPackId: string;
  iconPackLoading: boolean;
  iconPacks: IconPack[];
  localIconPacks: IconPack[];
  iconPackError: string | null;
  onSelectIconPack: (packId: string) => void;
  onAddLocalIconPack: (pack: IconPack) => void;
  onRemoveLocalIconPack: (packId: string) => void;
  versionInfo: VersionInfo | null;
}) {
  const canWrite = user.role === "SuperAdmin" || user.role === "NetworkAdmin";
  const canViewSecurity = user.role === "SuperAdmin" || user.role === "NetworkAdmin" || user.role === "SecurityAnalyst";
  const [jumpTarget, setJumpTarget] = useState<{ deviceId: number; token: number } | null>(null);
  const [selectedTopologyDevice, setSelectedTopologyDevice] = useState<Device | null>(null);

  function jumpToTopologyDevice(deviceId: number) {
    setJumpTarget({ deviceId, token: Date.now() });
    onNavigate("/topology");
  }

  return (
    <>
      {currentRoute === "/overview" && (
        <OverviewWorkspace
          accessToken={accessToken}
          graph={graph}
          onNavigate={onNavigate}
          summary={summary}
          user={user}
        />
      )}
      {currentRoute === "/topology" && (
        <TopologyWorkspace
          accessToken={accessToken}
          activeIconPackId={activeIconPackId}
          canViewSecurity={canViewSecurity}
          canWrite={canWrite}
          graph={graph}
          onGraphChange={onGraphChange}
          jumpTarget={jumpTarget}
          livePingEnabled={livePingEnabled}
          onSelectedDeviceChange={setSelectedTopologyDevice}
          theme={theme}
          userId={user.id}
        />
      )}
      {currentRoute === "/inventory" && accessToken && (
        <InventoryWorkspace
          accessToken={accessToken}
          canViewSecurity={canViewSecurity}
          canWrite={canWrite}
          graph={graph}
          onDeviceChange={onDeviceChange}
          onDevicesRemove={onDevicesRemove}
          onGraphChange={onGraphChange}
          livePingEnabled={livePingEnabled}
        />
      )}
      {currentRoute === "/vlans" && accessToken && (
        <VlanWorkspace accessToken={accessToken} canWrite={canWrite} graph={graph} onGraphChange={onGraphChange} />
      )}
      {currentRoute === "/locations" && accessToken && (
        <LocationsWorkspace accessToken={accessToken} canWrite={canWrite} graph={graph} onGraphChange={onGraphChange} />
      )}
      {currentRoute === "/monitoring" && accessToken && (
        <MonitoringWorkspace accessToken={accessToken} canWrite={canWrite} userRole={user.role} />
      )}
      {currentRoute === "/ipam" && accessToken && (
        <IpamWorkspace accessToken={accessToken} canWrite={canWrite} />
      )}
      {currentRoute === "/tools" && accessToken && (
        <ToolsWorkspace
          accessToken={accessToken}
          graph={graph}
          selectedDevice={selectedTopologyDevice}
          userRole={user.role}
        />
      )}
      {currentRoute === "/exports" && accessToken && user.role !== "Viewer" && (
        <ExportsWorkspace accessToken={accessToken} user={user} />
      )}
      {currentRoute === "/security" && canViewSecurity && (
        <SecurityWorkspace
          accessToken={accessToken}
          graph={graph}
          onJumpToTopologyDevice={jumpToTopologyDevice}
        />
      )}
      {currentRoute === "/admin" && user.role === "SuperAdmin" && accessToken && (
        <AdminWorkspace
          accessToken={accessToken}
          graph={graph}
          summary={summary}
          activeIconPackId={activeIconPackId}
          iconPackLoading={iconPackLoading}
          iconPacks={iconPacks}
          localIconPacks={localIconPacks}
          iconPackError={iconPackError}
          onSelectIconPack={onSelectIconPack}
          onAddLocalIconPack={onAddLocalIconPack}
          onRemoveLocalIconPack={onRemoveLocalIconPack}
          versionInfo={versionInfo}
        />
      )}
      {currentRoute === "/profile" && accessToken && (
        <ProfileWorkspace accessToken={accessToken} user={user} onUserUpdate={onUserUpdate} />
      )}
    </>
  );
}
