import io
import urllib.error
from unittest.mock import patch

from app.services.notifications import send_notification


def test_send_notification_does_not_return_http_error_body() -> None:
    error = urllib.error.HTTPError(
        url="https://example.invalid/hook",
        code=500,
        msg="Internal Server Error",
        hdrs=None,
        fp=io.BytesIO(b"/srv/app/internal.py traceback details"),
    )

    with patch("app.services.notifications._send_ntfy", side_effect=error):
        result = send_notification("ntfy", "test", {"ntfy_url": "https://example.invalid/hook"})

    assert result == "HTTP 500: delivery failed"
    assert "internal.py" not in result
    assert "traceback" not in result


def test_send_notification_does_not_return_exception_detail() -> None:
    with patch("app.services.notifications._send_smtp", side_effect=RuntimeError("/srv/app/secret.py failed")):
        result = send_notification("smtp", "test", {"smtp_host": "smtp.example.com", "smtp_to": "admin@example.com"})

    assert result == "Error: delivery failed"
    assert "secret.py" not in result
