#!/usr/bin/env bash
# Copy production Postgres *data* (public schema) into local Supabase for migration testing.
#
# Prerequisites:
#   - Supabase CLI (`supabase`)
#   - Local stack running: `supabase start` (from repo root)
#   - Production connection string (Database settings in the Supabase dashboard)
#
# Usage:
#   Prefer the Session pooler URI from Dashboard → Connect (direct `db.*` is often
#   labeled "Not IPv4 compatible"; pooler works on typical IPv4 networks and for pg_dump).
#   export PROD_DB_URL='postgresql://postgres.[REF]:PASSWORD@aws-0-....pooler.supabase.com:6543/postgres'
#   ./scripts/sync-prod-public-data-to-local.sh
#
# Optional:
#   DUMP_FILE=/path/to/dump.sql ./scripts/sync-prod-public-data-to-local.sh
#
# Password special characters must be URL-encoded in PROD_DB_URL (e.g. @ → %40).
# Direct `db.*.supabase.co` is IPv6-only; `hostaddr` then stays IPv6 and pg_dump-in-Docker still
# fails on many networks. Use the **Session pooler** URI from Dashboard → Connect instead.
# `PROD_DB_FORCE_IPV4=1` only helps when DNS yields an IPv4 (e.g. pooler host), not for direct db.*.
#
# This dumps only the `public` schema (guest_submissions, processed_emails, gmail_listener_state, etc.).
# It does NOT copy Storage objects — URLs in rows still point at prod buckets unless you sync files separately.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DUMP_FILE="${DUMP_FILE:-$ROOT/supabase/.temp/prod_public_data.sql}"
CONTAINER="${LOCAL_DB_CONTAINER:-supabase_db_guest-form-management}"

if [[ -z "${PROD_DB_URL:-}" ]]; then
  echo "ERROR: Set PROD_DB_URL to your prod Postgres URI (Settings → Database → URI)."
  echo "Example: postgresql://postgres:secret@db.abcdefgh.supabase.co:5432/postgres"
  exit 1
fi

if [[ "${PROD_DB_URL}" == *$'\n'* ]] || [[ "${PROD_DB_URL}" == *$'\r'* ]]; then
  echo "ERROR: PROD_DB_URL must be a single line (your shell broke the URL across lines)."
  echo "Use: export PROD_DB_URL='postgresql://postgres:PASSWORD@host:5432/postgres'"
  exit 1
fi

if [[ "${PROD_DB_URL}" != postgresql://* ]] && [[ "${PROD_DB_URL}" != postgres://* ]]; then
  echo "ERROR: PROD_DB_URL should start with postgresql:// or postgres://"
  exit 1
fi

mkdir -p "$(dirname "$DUMP_FILE")"

# Append hostaddr=<IPv4> so pg_dump inside Docker uses IPv4 when AAAA/IPv6 is broken (common on some networks).
prod_db_url_with_ipv4() {
  PROD_DB_URL="$1" python3 - <<'PY'
import ipaddress
import os
import shutil
import socket
import subprocess
import sys
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

url = os.environ["PROD_DB_URL"]
p = urlparse(url)
host = (p.hostname or "").strip()
if not host:
    print("could not parse host from PROD_DB_URL", file=sys.stderr)
    sys.exit(1)
port = p.port or 5432


def pick_hostaddr() -> Optional[str]:
    try:
        resolved = socket.getaddrinfo(host, str(port), type=socket.SOCK_STREAM)
    except socket.gaierror:
        resolved = []
    v4 = [a[4][0] for a in resolved if a[0] == socket.AF_INET]
    if v4:
        return v4[0]
    v6 = [a[4][0] for a in resolved if a[0] == socket.AF_INET6]
    if v6:
        return v6[0]

    dig = shutil.which("dig")
    if not dig:
        return None

    def dig_ips(qtype: str) -> list[str]:
        r = subprocess.run(
            [dig, "+short", host, qtype],
            capture_output=True,
            text=True,
            timeout=20,
        )
        if r.returncode != 0:
            return []
        out: list[str] = []
        for line in r.stdout.splitlines():
            s = line.strip().rstrip(".")
            if not s or s.startswith(";"):
                continue
            try:
                ipaddress.ip_address(s)
                out.append(s)
            except ValueError:
                continue
        return out

    v4 = dig_ips("A")
    if v4:
        return v4[0]
    v6 = dig_ips("AAAA")
    if v6:
        return v6[0]
    return None


addr = pick_hostaddr()
if not addr:
    print(
        f"Could not resolve {host!r} (Python DNS and `dig` both failed or returned no IPs).\n"
        "  • Copy the URI again from Supabase Dashboard → Database → Connect.\n"
        "  • Prefer the Session pooler string (…pooler.supabase.com) — it usually has IPv4.\n"
        "  • Check VPN/DNS: run  dig +short HOST AAAA",
        file=sys.stderr,
    )
    sys.exit(1)


def is_direct_supabase_db(h: str) -> bool:
    return h.startswith("db.") and h.endswith(".supabase.co")


try:
    ip_obj = ipaddress.ip_address(addr)
except ValueError:
    ip_obj = None

if (
    ip_obj
    and isinstance(ip_obj, ipaddress.IPv6Address)
    and is_direct_supabase_db(host)
):
    print(
        "ERROR: Host "
        + repr(host)
        + " only resolves to IPv6. pg_dump (inside Docker) still hits that path and gets "
        "'Connection refused' on typical IPv4-only networks.\n\n"
        "Use the Session pooler URI from Supabase Dashboard → Connect (labeled for IPv4 networks).\n"
        "Example shape: postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres\n"
        "Then set PROD_DB_URL to that string and unset PROD_DB_FORCE_IPV4.",
        file=sys.stderr,
    )
    sys.exit(1)

q = dict(parse_qsl(p.query, keep_blank_values=True))
q.setdefault("sslmode", "require")
q["hostaddr"] = addr
print(urlunparse((p.scheme, p.netloc, p.path, p.params, urlencode(q), p.fragment)), end="")
PY
}

run_dump() {
  local dburl="$1"
  if command -v npx >/dev/null 2>&1; then
    npx --yes supabase@latest db dump \
      --db-url "$dburl" \
      --data-only \
      --schema public \
      -f "$DUMP_FILE"
  else
    supabase db dump \
      --db-url "$dburl" \
      --data-only \
      --schema public \
      -f "$DUMP_FILE"
  fi
}

echo "==> Dumping production public schema (data only) → $DUMP_FILE"
DUMP_LOG="$(mktemp)"
trap 'rm -f "$DUMP_LOG"' EXIT

if [[ "${PROD_DB_FORCE_IPV4:-}" == "1" ]]; then
  echo "==> PROD_DB_FORCE_IPV4=1: using IPv4 hostaddr"
  IPV4_URL="$(prod_db_url_with_ipv4 "$PROD_DB_URL")"
  run_dump "$IPV4_URL"
else
  if ! run_dump "$PROD_DB_URL" 2> >(tee "$DUMP_LOG" >&2); then
    if grep -qE 'Connection refused|Network is unreachable' "$DUMP_LOG" 2>/dev/null && command -v python3 >/dev/null 2>&1; then
      echo "==> Retrying dump with IPv4 hostaddr (IPv6/pg_dump in Docker often fails on some networks)..."
      IPV4_URL="$(prod_db_url_with_ipv4 "$PROD_DB_URL")"
      run_dump "$IPV4_URL"
    else
      exit 1
    fi
  fi
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "ERROR: Local DB container '${CONTAINER}' is not running. Run: supabase start"
  exit 1
fi

echo "==> Truncating local public app tables (CASCADE also clears processed_emails → guest_submissions)"
docker exec "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "TRUNCATE TABLE guest_submissions_backup_20260501, gmail_listener_state, guest_submissions RESTART IDENTITY CASCADE;"

echo "==> Drop CHECK constraints that prod rows may violate (legacy status, bad date order, etc.)"
docker exec "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "ALTER TABLE guest_submissions DROP CONSTRAINT IF EXISTS guest_submissions_status_check;
   ALTER TABLE guest_submissions DROP CONSTRAINT IF EXISTS valid_dates;
   ALTER TABLE guest_submissions DROP CONSTRAINT IF EXISTS valid_times;"

echo "==> Restoring dump into local Postgres"
docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <"$DUMP_FILE"

AFTER_RESTORE_SQL="$ROOT/scripts/sql/after-prod-data-restore.sql"
if [[ ! -f "$AFTER_RESTORE_SQL" ]]; then
  echo "ERROR: Missing $AFTER_RESTORE_SQL"
  exit 1
fi
echo "==> Normalizing legacy status values + re-adding CHECK (see scripts/sql/after-prod-data-restore.sql)"
docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <"$AFTER_RESTORE_SQL"

echo "==> Ensure gmail_listener_state singleton (migration seed is not re-run after TRUNCATE)"
docker exec "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "INSERT INTO gmail_listener_state (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;"

echo "==> Done. Quick counts:"
docker exec "$CONTAINER" psql -U postgres -d postgres -c \
  "SELECT 'guest_submissions' AS tbl, count(*) FROM guest_submissions
   UNION ALL SELECT 'processed_emails', count(*) FROM processed_emails
   UNION ALL SELECT 'gmail_listener_state', count(*) FROM gmail_listener_state;"
