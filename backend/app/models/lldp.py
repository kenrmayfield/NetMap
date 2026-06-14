from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class LldpNeighbour(Base):
    __tablename__ = "lldp_neighbours"
    __table_args__ = (
        UniqueConstraint(
            "source_device_id", "local_port_index", "remote_chassis_id",
            name="uq_lldp_neighbour",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id", ondelete="CASCADE"), index=True, nullable=False,
    )
    local_port_index: Mapped[int] = mapped_column(Integer, nullable=False)
    local_port_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    local_port_desc: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remote_chassis_id: Mapped[str] = mapped_column(String(64), nullable=False)
    remote_port_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remote_port_desc: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remote_sys_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remote_mgmt_addr: Mapped[str | None] = mapped_column(String(64), nullable=True)
    matched_device_id: Mapped[int | None] = mapped_column(
        ForeignKey("devices.id", ondelete="SET NULL"), nullable=True,
    )
    dismissed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
