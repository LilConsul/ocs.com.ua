#!/usr/bin/env bash
# One-time server setup for ocs.com.ua, run as root. Safe to run again.
#
# Prepares everything deploy-prod.yml needs next to the WordPress site, without touching it:
# the directory for releases, the systemd unit of the Node server (port 4322), an empty Apache
# fragment and env file, and the sudo rule that lets the deploy user restart the service.
# ocs.com.ua keeps serving WordPress until launch-prod.sh runs.
#
#   ssh root@<server> 'bash -s' < application/infra/server/setup-prod.sh
set -euo pipefail

USER_NAME=ocs
DOMAIN_DIR=/home/ocs/domains/ocs.com.ua
SERVICE=ocs-prod
PORT=4322

install -d -o "$USER_NAME" -g "$USER_NAME" -m 755 "$DOMAIN_DIR" "$DOMAIN_DIR/releases"
[ -f "$DOMAIN_DIR/ocs-apache.conf" ] || install -o "$USER_NAME" -g "$USER_NAME" -m 644 /dev/null "$DOMAIN_DIR/ocs-apache.conf"
[ -f "$DOMAIN_DIR/$SERVICE.env" ] || install -o "$USER_NAME" -g "$USER_NAME" -m 600 /dev/null "$DOMAIN_DIR/$SERVICE.env"

cat > "/etc/systemd/system/$SERVICE.service" <<EOF
[Unit]
Description=OCS production site (Astro Node server)
After=network.target

[Service]
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$DOMAIN_DIR/app
EnvironmentFile=$DOMAIN_DIR/$SERVICE.env
Environment=HOST=127.0.0.1 PORT=$PORT NODE_ENV=production
ExecStart=/usr/bin/node dist/server/entry.mjs
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
# Enabled for boot; the first deploy starts it (there is no release before that)
systemctl enable "$SERVICE"

SUDOERS=/etc/sudoers.d/ocs-deploy-prod
TMP=$(mktemp)
echo "$USER_NAME ALL=(root) NOPASSWD: /usr/bin/systemctl restart $SERVICE" > "$TMP"
visudo -cf "$TMP"
install -o root -g root -m 440 "$TMP" "$SUDOERS"
rm -f "$TMP"

echo "Ready: $DOMAIN_DIR, $SERVICE.service (port $PORT), $SUDOERS"
