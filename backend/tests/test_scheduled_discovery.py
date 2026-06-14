from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base
from app.models.device import Device
from app.models.discovery import DiscoveryObservation, DiscoveryScan, DiscoverySchedule
from app.models.site import Site
from app.models.topology_group import TopologyGroup
from app.schemas.discovery import DiscoveryHost
from app.services.discovery.scheduled import create_observations_for_scan
from app.services.discovery.scanner import serialize_results


def _session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        engine,
        tables=[
            Site.__table__,
            TopologyGroup.__table__,
            Device.__table__,
            DiscoverySchedule.__table__,
            DiscoveryScan.__table__,
            DiscoveryObservation.__table__,
        ],
    )
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def _scan(*hosts: DiscoveryHost) -> DiscoveryScan:
    return DiscoveryScan(
        actor_user_id=1,
        target="192.168.1.0/24",
        scan_type="ping",
        status="completed",
        host_count=254,
        result_count=len(hosts),
        results_json=serialize_results(list(hosts)),
        completed_at=datetime.now(timezone.utc),
    )


def _schedule() -> DiscoverySchedule:
    now = datetime.now(timezone.utc)
    return DiscoverySchedule(
        owner_user_id=1,
        name="Daily LAN",
        target="192.168.1.0/24",
        scan_type="ping",
        interval_minutes=1440,
        confirm_large_scan=True,
        enabled=True,
        created_at=now,
        updated_at=now,
    )


def test_scheduled_discovery_records_new_and_ip_change_observations():
    db = _session()
    existing = Device(
        hostname="wifi-phone",
        ip_address="192.168.1.10",
        mac_address="aa:bb:cc:dd:ee:ff",
        vendor="PhoneVendor",
        status="online",
    )
    schedule = _schedule()
    scan = _scan(
        DiscoveryHost(ip_address="192.168.1.84", hostname="wifi-phone", mac_address="AA-BB-CC-DD-EE-FF"),
        DiscoveryHost(ip_address="192.168.1.50", hostname="new-host", mac_address="11:22:33:44:55:66"),
    )
    db.add_all([existing, schedule, scan])
    db.commit()
    db.refresh(schedule)
    db.refresh(scan)

    observations = create_observations_for_scan(db, schedule, scan, None)

    types = {observation.observation_type for observation in observations}
    assert types == {"ip_change", "new_device"}
    ip_change = next(observation for observation in observations if observation.observation_type == "ip_change")
    assert ip_change.device_id == existing.id
    assert ip_change.ip_address == "192.168.1.84"


def test_scheduled_discovery_records_disappeared_previous_host():
    db = _session()
    schedule = _schedule()
    previous = _scan(
        DiscoveryHost(ip_address="192.168.1.10", hostname="old-host", mac_address="aa:bb:cc:dd:ee:ff"),
        DiscoveryHost(ip_address="192.168.1.20", hostname="stable-host", mac_address="11:22:33:44:55:66"),
    )
    current = _scan(
        DiscoveryHost(ip_address="192.168.1.20", hostname="stable-host", mac_address="11:22:33:44:55:66"),
    )
    db.add_all([schedule, previous, current])
    db.commit()
    db.refresh(schedule)
    db.refresh(previous)
    db.refresh(current)

    observations = create_observations_for_scan(db, schedule, current, previous)

    disappeared = [observation for observation in observations if observation.observation_type == "disappeared"]
    assert len(disappeared) == 1
    assert disappeared[0].ip_address == "192.168.1.10"
