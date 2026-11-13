#!/usr/bin/env bash
# Undoes launch-prod.sh: ocs.com.ua serves WordPress again. Run as root.
# The new site's releases stay on the server, so launch-prod.sh can switch back later.
#
#   ssh root@<server> 'bash -s' < application/infra/server/restore-wordpress.sh
set -euo pipefail

DOMAIN_DIR=/home/ocs/domains/ocs.com.ua
VHOST=/etc/apache2/sites-available/ocs.com.ua.conf
DOCROOT=/home/ocs/public_html
WORDPRESS=/home/ocs/public_html.wordpress
INCLUDE="    Include $DOMAIN_DIR/ocs-apache.conf"

[ -L "$DOCROOT" ] || { echo "$DOCROOT is not the new site, nothing to undo"; exit 0; }
[ -d "$WORDPRESS" ] || { echo "$WORDPRESS is missing, cannot restore WordPress"; exit 1; }

cp "$VHOST" "$VHOST.pre-restore-$(date +%Y%m%d-%H%M%S)"
grep -vF "$INCLUDE" "$VHOST" > "$VHOST.tmp" && mv "$VHOST.tmp" "$VHOST"
rm "$DOCROOT"
mv "$WORDPRESS" "$DOCROOT"

apache2ctl configtest
systemctl reload apache2
echo "ocs.com.ua serves WordPress again. Set the PROD_LIVE repository variable to false."
