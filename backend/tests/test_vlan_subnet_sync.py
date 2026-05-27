from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.v1.topology import update_topology_group
from app.db.session import Base
from app.models.audit_log import AuditLog
from app.models.device import Device
from app.models.site import Site
from app.models.subnet import Subnet
from app.models.topology_group import TopologyGroup
from app.models.user import User, UserRole
from app.schemas.group import TopologyGroupUpdate


def _session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        engine,
        tables=[
            User.__table__,
            AuditLog.__table__,
            Site.__table__,
            TopologyGroup.__table__,
            Device.__table__,
            Subnet.__table__,
        ],
    )
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def test_vlan_dns_update_does_not_rewrite_multiple_subnets_to_same_cidr():
    db = _session()
    admin = User(username="admin", password_hash="x", role=UserRole.SUPER_ADMIN.value)
    group = TopologyGroup(
        name="vlan1",
        vlan_id="1",
        ip_range="192.168.69.0/24",
        gateway="192.168.69.1",
    )
    cidr_subnet = Subnet(
        name="existing cidr",
        cidr="192.168.69.0/24",
        vlan_id=None,
        gateway="192.168.69.1",
    )
    vlan_subnet = Subnet(
        name="existing vlan",
        cidr="192.168.68.0/24",
        vlan_id="1",
    )
    db.add_all([admin, group, cidr_subnet, vlan_subnet])
    db.commit()

    result = update_topology_group(
        group_id=group.id,
        payload=TopologyGroupUpdate(dns_servers="192.168.69.2"),
        current_user=admin,
        db=db,
    )

    assert result.dns_servers == "192.168.69.2"
    rows = db.scalars(select(Subnet).order_by(Subnet.id)).all()
    assert [row.cidr for row in rows] == ["192.168.69.0/24", "192.168.68.0/24"]
    assert rows[0].dns_servers == "192.168.69.2"
    assert rows[0].vlan_id == "1"
