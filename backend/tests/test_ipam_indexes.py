from types import SimpleNamespace

from app.api.v1.ipam import _build_ipam_indexes, _subnet_stats_from_indexes


def test_subnet_stats_from_indexes_counts_without_double_counting_used_ips():
    subnet = SimpleNamespace(cidr="10.0.0.0/24", gateway="10.0.0.1")
    indexes = _build_ipam_indexes(
        device_ips={"10.0.0.10", "10.0.0.20", "192.168.1.50"},
        dhcp_ips={"10.0.0.10", "10.0.0.30"},
        reserved_ips={"10.0.0.40", "10.0.0.255"},
    )

    stats = _subnet_stats_from_indexes(subnet, indexes)

    assert stats.total_hosts == 254
    assert stats.device_count == 2
    assert stats.dhcp_count == 2
    assert stats.reservation_count == 1
    assert stats.used == 5
    assert stats.free == 249


def test_subnet_stats_from_indexes_does_not_double_count_gateway_already_used():
    subnet = SimpleNamespace(cidr="10.0.0.0/24", gateway="10.0.0.1")
    indexes = _build_ipam_indexes(
        device_ips={"10.0.0.1"},
        dhcp_ips=set(),
        reserved_ips=set(),
    )

    stats = _subnet_stats_from_indexes(subnet, indexes)

    assert stats.device_count == 1
    assert stats.used == 1
