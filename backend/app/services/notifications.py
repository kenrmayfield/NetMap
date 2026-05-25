import ipaddress
import json
import logging
import smtplib
import socket
import ssl
import urllib.error
import urllib.request
from email.mime.text import MIMEText
from email.utils import formataddr
from urllib.parse import urlparse, urlunparse
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


NOTIFICATION_DEFAULTS: dict[str, str] = {
    "ntfy_url": "",
    "ntfy_token": "",
    "telegram_bot_token": "",
    "telegram_chat_id": "",
    "signal_url": "",
    "signal_number": "",
    "signal_recipient": "",
    "smtp_host": "",
    "smtp_port": "587",
    "smtp_user": "",
    "smtp_password": "",
    "smtp_from": "",
    "smtp_to": "",
    "smtp_tls": "true",
}

# Fields whose values are encrypted at rest and redacted in API responses.
_SECRET_FIELDS = frozenset({"ntfy_token", "telegram_bot_token", "smtp_password"})
_REDACTED = "__redacted__"
_ENC_PREFIX = "enc:"

_PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def _is_private_hostname(hostname: str) -> bool:
    try:
        addr = socket.getaddrinfo(hostname, None)[0][4][0]
        ip = ipaddress.ip_address(addr)
        return any(ip in net for net in _PRIVATE_NETWORKS)
    except (socket.gaierror, ValueError, OSError):
        return True  # fail closed — treat unresolvable as private


def _validate_outbound_url(url: str) -> None:
    from app.core.config import settings as app_settings
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Notification URL scheme must be http or https (got {parsed.scheme!r})")
    if not parsed.hostname:
        raise ValueError("Notification URL has no hostname")
    if app_settings.notification_block_private_targets and _is_private_hostname(parsed.hostname):
        raise ValueError(
            f"Outbound requests to private/loopback addresses are blocked "
            f"(NOTIFICATION_BLOCK_PRIVATE_TARGETS=true)"
        )


def _validate_smtp_host(host: str) -> None:
    from app.core.config import settings as app_settings
    if app_settings.notification_block_private_targets and _is_private_hostname(host):
        raise ValueError(
            f"SMTP connections to private/loopback addresses are blocked "
            f"(NOTIFICATION_BLOCK_PRIVATE_TARGETS=true)"
        )


def _encrypt(value: str) -> str:
    from app.core.secrets import encrypt_secret
    return _ENC_PREFIX + encrypt_secret(value)


def _decrypt(value: str) -> str:
    if value.startswith(_ENC_PREFIX):
        from app.core.secrets import decrypt_secret
        return decrypt_secret(value[len(_ENC_PREFIX):])
    return value


def load_notification_settings(db: Session) -> dict[str, str]:
    """Load and decrypt notification settings for internal use (sending notifications)."""
    from app.models.system_setting import SystemSetting
    rows = db.scalars(select(SystemSetting)).all()
    result = dict(NOTIFICATION_DEFAULTS)
    for row in rows:
        if row.key in result:
            result[row.key] = _decrypt(row.value) if row.key in _SECRET_FIELDS else row.value
    return result


def load_notification_settings_redacted(db: Session) -> dict[str, str]:
    """Load notification settings for API responses — secrets are redacted."""
    from app.models.system_setting import SystemSetting
    rows = db.scalars(select(SystemSetting)).all()
    result = dict(NOTIFICATION_DEFAULTS)
    stored: dict[str, str] = {}
    for row in rows:
        if row.key in result:
            stored[row.key] = row.value
    for key in result:
        raw = stored.get(key, "")
        if key in _SECRET_FIELDS:
            result[key] = _REDACTED if raw else ""
        else:
            result[key] = raw
    return result


def save_notification_setting(db: Session, key: str, value: str) -> None:
    """Encrypt secret fields before persisting."""
    from datetime import datetime, timezone
    from app.models.system_setting import SystemSetting
    stored_value = _encrypt(value) if key in _SECRET_FIELDS and value and value != _REDACTED else value
    now = datetime.now(timezone.utc)
    existing = db.get(SystemSetting, key)
    if existing:
        existing.value = stored_value
        existing.updated_at = now
    else:
        db.add(SystemSetting(key=key, value=stored_value, updated_at=now))


def send_notification(channel: str, message: str, settings: dict[str, str]) -> str:
    try:
        if channel == "ntfy":
            return _send_ntfy(message, settings)
        elif channel == "telegram":
            return _send_telegram(message, settings)
        elif channel == "signal":
            return _send_signal(message, settings)
        elif channel == "smtp":
            return _send_smtp(message, settings)
        return f"Unknown channel: {channel}"
    except urllib.error.HTTPError as exc:
        logger.warning("Notification delivery failed for channel %s with HTTP %s", channel, exc.code, exc_info=True)
        return f"HTTP {exc.code}: delivery failed"
    except Exception as exc:
        logger.warning("Notification delivery failed for channel %s", channel, exc_info=True)
        return "Error: delivery failed"


def send_password_reset_email(
    db: Session,
    *,
    username: str,
    display_name: str | None,
    email: str,
    reset_link: str,
    app_name: str = "NetMap",
) -> None:
    s = load_notification_settings(db)
    if not s.get("smtp_host") or not email:
        return
    name = display_name or username
    body = (
        f"Hi {name},\n\n"
        f"Your password for your {app_name} account has been reset by an administrator.\n\n"
        f"Username: {username}\n\n"
        f"Use the link below to set a new password (valid for 1 hour):\n\n"
        f"{reset_link}\n\n"
        f"If you did not expect this, please contact your administrator.\n\n"
        f"— {app_name}"
    )
    _send_smtp(body, {**s, "smtp_to": email}, subject=f"{app_name} — Your password has been reset")


def send_self_service_password_reset_email(
    db: Session,
    *,
    username: str,
    display_name: str | None,
    email: str,
    reset_link: str,
    app_name: str = "NetMap",
) -> None:
    s = load_notification_settings(db)
    if not s.get("smtp_host") or not email:
        raise ValueError("SMTP is not configured or user has no email address")
    name = display_name or username
    body = (
        f"Hi {name},\n\n"
        f"We received a request to reset the password for your {app_name} account.\n\n"
        f"Click the link below to set a new password (valid for 1 hour):\n\n"
        f"{reset_link}\n\n"
        f"If you did not request a password reset, you can safely ignore this email.\n\n"
        f"— {app_name}"
    )
    _send_smtp(body, {**s, "smtp_to": email}, subject=f"{app_name} — Password reset request")


def send_welcome_email(
    db: Session,
    *,
    username: str,
    display_name: str | None,
    email: str,
    role: str,
    app_name: str = "NetMap",
) -> None:
    s = load_notification_settings(db)
    if not s.get("smtp_host") or not email:
        return
    name = display_name or username
    body = (
        f"Hi {name},\n\n"
        f"A {app_name} account has been created for you.\n\n"
        f"Username: {username}\n"
        f"Role: {role}\n\n"
        f"Please contact your administrator to obtain your initial credentials.\n\n"
        f"— {app_name}"
    )
    _send_smtp(body, {**s, "smtp_to": email}, subject=f"{app_name} — Your account has been created")


def _send_ntfy(message: str, s: dict[str, str]) -> str:
    import base64

    url = s.get("ntfy_url", "").strip()
    if not url:
        return "ntfy URL is not configured"

    # Strip credentials embedded in the URL (https://user:pass@host/topic)
    parsed = urlparse(url)
    url_creds: str | None = None
    if parsed.username:
        creds = f"{parsed.username}:{parsed.password or ''}"
        url_creds = creds
        netloc = parsed.hostname + (f":{parsed.port}" if parsed.port else "")
        url = urlunparse(parsed._replace(netloc=netloc))

    _validate_outbound_url(url)

    token = s.get("ntfy_token", "").strip()
    headers: dict[str, str] = {
        "Title": "NetMap",
        "Content-Type": "text/plain",
        "User-Agent": "NetMap/1.0",
    }
    auth = token or url_creds
    if auth:
        if ":" in auth:
            headers["Authorization"] = "Basic " + base64.b64encode(auth.encode()).decode()
        else:
            headers["Authorization"] = f"Bearer {auth}"

    req = urllib.request.Request(url, data=message.encode(), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return "ok" if resp.status == 200 else f"HTTP {resp.status}"


def _send_telegram(message: str, s: dict[str, str]) -> str:
    bot_token = s.get("telegram_bot_token", "").strip()
    chat_id = s.get("telegram_chat_id", "").strip()
    if not bot_token or not chat_id:
        return "Telegram bot token and chat ID are required"
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    # Telegram API is always HTTPS to a known domain — no SSRF risk
    payload = json.dumps({"chat_id": chat_id, "text": message}).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return "ok" if resp.status == 200 else f"HTTP {resp.status}"


def _send_signal(message: str, s: dict[str, str]) -> str:
    url = s.get("signal_url", "").strip()
    number = s.get("signal_number", "").strip()
    recipient = s.get("signal_recipient", "").strip()
    if not url or not number or not recipient:
        return "Signal REST URL, sender number, and recipient are required"
    _validate_outbound_url(url)
    endpoint = f"{url.rstrip('/')}/v2/send"
    payload = json.dumps({"message": message, "number": number, "recipients": [recipient]}).encode()
    req = urllib.request.Request(endpoint, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return "ok" if resp.status in (200, 201) else f"HTTP {resp.status}"


def _send_smtp(message: str, s: dict[str, str], *, subject: str = "NetMap Notification") -> str:
    host = s.get("smtp_host", "").strip()
    to_addr = s.get("smtp_to", "").strip()
    if not host or not to_addr:
        return "SMTP host and recipient address are required"
    _validate_smtp_host(host)
    port = int(s.get("smtp_port", "587").strip() or "587")
    user = s.get("smtp_user", "").strip()
    password = s.get("smtp_password", "").strip()
    from_addr = s.get("smtp_from", "").strip() or user or "netmap@localhost"
    tls = s.get("smtp_tls", "true").strip().lower() == "true"
    msg = MIMEText(message)
    msg["Subject"] = subject
    msg["From"] = formataddr(("NetMap", from_addr))
    msg["To"] = to_addr
    if tls:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls(context=ctx)
            if user and password:
                smtp.login(user, password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            if user and password:
                smtp.login(user, password)
            smtp.send_message(msg)
    return "ok"
