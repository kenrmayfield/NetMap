import pytest
from pydantic import ValidationError

from app.api.v1.topology import deserialize_layout_positions
from app.schemas.topology import TopologyLayoutCreate


def test_topology_layout_accepts_device_and_group_positions():
    payload = TopologyLayoutCreate(
        name="Office",
        positions={
            "device-1": {"x": 10, "y": 20},
            "group-office": {"x": 100, "y": 200},
        },
    )

    assert set(payload.positions) == {"device-1", "group-office"}


def test_topology_layout_rejects_non_topology_position_keys():
    with pytest.raises(ValidationError):
        TopologyLayoutCreate(
            name="Office",
            positions={"edge-1": {"x": 10, "y": 20}},
        )


def test_topology_layout_rejects_non_finite_coordinates():
    with pytest.raises(ValidationError):
        TopologyLayoutCreate(
            name="Office",
            positions={"device-1": {"x": float("inf"), "y": 20}},
        )


def test_deserialize_layout_positions_discards_invalid_saved_rows():
    positions = deserialize_layout_positions(
        """
        {
          "device-1": {"x": 10, "y": 20},
          "group-office": {"x": "100.5", "y": 200},
          "device-2": {"x": null, "y": 30},
          "group-bad": {"x": 1e999, "y": 30},
          "edge-1": {"x": 40, "y": 50}
        }
        """
    )

    assert positions == {
        "device-1": {"x": 10.0, "y": 20.0},
        "group-office": {"x": 100.5, "y": 200.0},
    }
