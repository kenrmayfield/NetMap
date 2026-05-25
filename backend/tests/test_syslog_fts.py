from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.v1.syslog import apply_event_filters
from app.db.firewall_session import FirewallBase, setup_firewall_fts
from app.models.firewall_event import FirewallEvent


def test_firewall_event_search_uses_fts_for_raw_log_matches():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    FirewallBase.metadata.create_all(bind=engine, tables=[FirewallEvent.__table__])
    with engine.begin() as conn:
        setup_firewall_fts(conn)

    with Session(engine) as db:
        db.add_all(
            [
                FirewallEvent(raw_log="pf block tcp from 10.0.0.5 to 10.0.0.10", action="block"),
                FirewallEvent(raw_log="pf pass udp from 10.0.0.6 to 10.0.0.11", action="pass"),
            ]
        )
        db.commit()

        query = apply_event_filters(
            select(FirewallEvent),
            q="block tcp",
            src_ip=None,
            dst_ip=None,
            src_port=None,
            dst_port=None,
            action=None,
            protocol=None,
            interface=None,
            start_time=None,
            end_time=None,
        )
        events = db.scalars(query).all()

        count_query = apply_event_filters(
            select(func.count()).select_from(FirewallEvent),
            q="block tcp",
            src_ip=None,
            dst_ip=None,
            src_port=None,
            dst_port=None,
            action=None,
            protocol=None,
            interface=None,
            start_time=None,
            end_time=None,
        )

        assert [event.raw_log for event in events] == ["pf block tcp from 10.0.0.5 to 10.0.0.10"]
        assert db.scalar(count_query) == 1


def test_firewall_fts_setup_recovers_from_malformed_index():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    FirewallBase.metadata.create_all(bind=engine, tables=[FirewallEvent.__table__])
    with engine.begin() as conn:
        setup_firewall_fts(conn)
        conn.execute(
            FirewallEvent.__table__.insert(),
            [{"raw_log": "pf block tcp from 10.0.0.5 to 10.0.0.10", "action": "block"}],
        )

    with engine.begin() as conn:
        conn.exec_driver_sql("DROP TABLE firewall_events_fts_data")
        setup_firewall_fts(conn)

    with Session(engine) as db:
        query = apply_event_filters(
            select(FirewallEvent),
            q="block tcp",
            src_ip=None,
            dst_ip=None,
            src_port=None,
            dst_port=None,
            action=None,
            protocol=None,
            interface=None,
            start_time=None,
            end_time=None,
        )

        assert [event.raw_log for event in db.scalars(query).all()] == [
            "pf block tcp from 10.0.0.5 to 10.0.0.10"
        ]
