import sqlite3

from sqlalchemy import create_engine
from sqlalchemy.exc import DatabaseError, OperationalError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.firewall_session import FirewallBase
from app.models.firewall_event import FirewallEvent
from app.services.syslog import storage
from app.services.syslog.parser import parse_syslog_line


def test_openwrt_kernel_firewall_log_parses_uppercase_iptables_fields():
    raw = (
        "<4>Jan  2 03:04:05 OpenWrt kern.warn kernel: [12345.678901] "
        "DROP IN=br-lan OUT=eth0 SRC=192.168.1.20 DST=8.8.8.8 LEN=60 "
        "PROTO=TCP SPT=53144 DPT=443"
    )

    parsed = parse_syslog_line(raw, "192.168.1.1")

    assert parsed.source_host == "OpenWrt"
    assert parsed.src_ip == "192.168.1.20"
    assert parsed.dst_ip == "8.8.8.8"
    assert parsed.src_port == 53144
    assert parsed.dst_port == 443
    assert parsed.protocol == "tcp"
    assert parsed.action == "drop"
    assert parsed.interface == "br-lan"
    assert parsed.direction == "in"


def test_openwrt_banip_prefix_parses_action_rule_and_reason():
    raw = (
        "<4>Jun  2 08:55:58 OpenWrt kernel: [4970621.188296] "
        "banIP/inp-wan/drp/firehol1v4: IN=eth0.2 OUT= "
        "MAC=9c:3d:cf:f1:4b:6b:80:ab:4d:7d:94:62:08:00:45:00:00:3c "
        "SRC=66.132.172.154 DST=203.0.113.10 LEN=60 TOS=0x00 PREC=0x00 TTL=53 "
        "ID=34698 PROTO=TCP SPT=32258 DPT=55720 WINDOW=42340 RES=0x00 SYN URGP=0"
    )

    parsed = parse_syslog_line(raw, "192.168.1.1")

    assert parsed.source_host == "OpenWrt"
    assert parsed.src_ip == "66.132.172.154"
    assert parsed.dst_ip == "203.0.113.10"
    assert parsed.src_port == 32258
    assert parsed.dst_port == 55720
    assert parsed.protocol == "tcp"
    assert parsed.interface == "eth0.2"
    assert parsed.direction == "in"
    assert parsed.action == "drop"
    assert parsed.tracker_id == "banIP"
    assert parsed.rule_id == "firehol1v4"
    assert parsed.reason == "banIP inp-wan"


def test_syslog_ingestion_counters_track_stored_and_unparsed(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    FirewallBase.metadata.create_all(bind=engine, tables=[FirewallEvent.__table__])
    monkeypatch.setattr(storage, "SessionLocal", sessionmaker(bind=engine, autoflush=False, autocommit=False))
    monkeypatch.setattr(storage.firewall_event_broadcaster, "publish", lambda _event: None)
    monkeypatch.setattr(storage, "_ingestion_status", storage.IngestionStatus())

    stored = storage.store_syslog_line(
        "DROP SRC=192.168.1.20 DST=8.8.8.8 PROTO=UDP SPT=12345 DPT=53",
        "192.168.1.1",
    )
    dropped = storage.store_syslog_line("OpenWrt logread started", "192.168.1.1")
    status = storage.get_ingestion_status()

    assert stored > 0
    assert dropped == 0
    assert status.received_packets == 2
    assert status.stored_events == 1
    assert status.dropped_unparsed == 1
    assert status.last_drop_raw == "OpenWrt logread started"


def test_retention_cleanup_recovers_malformed_firewall_db(monkeypatch):
    recovered = {"called": False}

    class BrokenSession:
        def __enter__(self):
            return self

        def __exit__(self, _exc_type, _exc, _tb):
            return False

        def execute(self, _statement):
            raise DatabaseError(
                "DELETE FROM firewall_events WHERE firewall_events.received_at < ?",
                {},
                sqlite3.DatabaseError("database disk image is malformed"),
            )

    monkeypatch.setattr(storage, "SessionLocal", lambda: BrokenSession())
    monkeypatch.setattr(storage, "reset_firewall_db_after_corruption", lambda: recovered.update(called=True))
    monkeypatch.setattr(storage, "_retention_status", storage.RetentionStatus(event_count=42))

    deleted = storage.cleanup_expired_events()
    status = storage.get_retention_status()

    assert deleted == 0
    assert recovered["called"] is True
    assert status.last_deleted == 0
    assert status.last_error == "firewall.db was corrupt during retention cleanup and was recreated; syslog history was lost"
    assert storage.count_events() == 0


def test_retention_cleanup_defers_locked_firewall_db(monkeypatch):
    class LockedSession:
        def __enter__(self):
            return self

        def __exit__(self, _exc_type, _exc, _tb):
            return False

        def execute(self, _statement):
            raise OperationalError(
                "DELETE FROM firewall_events WHERE firewall_events.received_at < ?",
                {},
                sqlite3.OperationalError("database is locked"),
            )

    monkeypatch.setattr(storage, "SessionLocal", lambda: LockedSession())
    monkeypatch.setattr(storage, "_retention_status", storage.RetentionStatus(event_count=42))

    deleted = storage.cleanup_expired_events()
    status = storage.get_retention_status()

    assert deleted == 0
    assert status.last_deleted == 0
    assert status.last_error == "firewall.db was locked during retention cleanup; cleanup will retry later"
    assert storage.count_events() == 42


def test_retention_cleanup_skips_when_cleanup_already_running(monkeypatch):
    assert storage._retention_cleanup_lock.acquire(blocking=False) is True
    try:
        monkeypatch.setattr(storage, "_retention_status", storage.RetentionStatus(event_count=42))

        deleted = storage.cleanup_expired_events()
        status = storage.get_retention_status()

        assert deleted == 0
        assert status.last_run_at is None
        assert storage.count_events() == 42
    finally:
        storage._retention_cleanup_lock.release()
