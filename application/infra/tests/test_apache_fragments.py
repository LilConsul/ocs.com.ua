"""The dev and prod Apache fragments must proxy the same routes, each to its own Node port."""
import pathlib
import re

APACHE = pathlib.Path(__file__).parents[1] / "apache"
DEV = APACHE / "dev.ocs.com.ua.ocs.conf"
PROD = APACHE / "ocs.com.ua.ocs.conf"


def routes(path: pathlib.Path) -> dict[str, str]:
    """ProxyPass path -> backend port."""
    found = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"ProxyPass\s+(\S+)\s+http://127\.0\.0\.1:(\d+)(\S*)$", line.strip())
        if m:
            assert m.group(1) == m.group(3), f"{path.name}: {m.group(1)} proxied to {m.group(3)}"
            found[m.group(1)] = m.group(2)
    return found


def test_both_sites_proxy_the_same_routes():
    assert routes(DEV).keys() == routes(PROD).keys()
    assert len(routes(DEV)) > 0


def test_each_site_uses_its_own_node_port():
    assert set(routes(DEV).values()) == {"4321"}
    assert set(routes(PROD).values()) == {"4322"}


def test_every_proxypass_has_a_reverse_rule():
    for path in (DEV, PROD):
        text = path.read_text(encoding="utf-8")
        for route in routes(path):
            assert re.search(rf"ProxyPassReverse\s+{re.escape(route)}\s", text), f"{path.name}: {route}"
