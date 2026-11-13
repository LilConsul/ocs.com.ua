#!/usr/bin/env bash
# Launch day: switches ocs.com.ua from WordPress to the new site. Run as root.
#
# 1. Checks that a deployed release is live on the Node server (deploy-prod.yml ran).
# 2. Includes the OCS proxy fragment in the ocs.com.ua vhost (both :80 and :443).
# 3. Moves WordPress aside (public_html -> public_html.wordpress) and points public_html at the
#    live release.
# 4. Reloads Apache and checks the new site through it (home, Node server, llms.txt, an old
#    WordPress address, indexable). If configtest or any check fails, WordPress is put back.
# restore-wordpress.sh undoes all of it.
#
#   ssh root@<server> 'bash -s' < application/infra/server/launch-prod.sh
set -euo pipefail

DOMAIN_DIR=/home/ocs/domains/ocs.com.ua
VHOST=/etc/apache2/sites-available/ocs.com.ua.conf
DOCROOT=/home/ocs/public_html
WORDPRESS=/home/ocs/public_html.wordpress
INCLUDE="    Include $DOMAIN_DIR/ocs-apache.conf"
PORT=4322

test -L "$DOMAIN_DIR/app" || { echo "No release deployed yet (run deploy-prod.yml first)"; exit 1; }
test -s "$DOMAIN_DIR/app/dist/client/ua/index.html" || { echo "The live release has no site"; exit 1; }
curl -fsS -o /dev/null "http://127.0.0.1:$PORT/admin/config.yml" || { echo "ocs-prod is not answering on $PORT"; exit 1; }
[ -L "$DOCROOT" ] && { echo "Already launched: $DOCROOT -> $(readlink "$DOCROOT")"; exit 0; }
[ -e "$WORDPRESS" ] && { echo "$WORDPRESS exists already, refusing to overwrite it"; exit 1; }

BACKUP="$VHOST.pre-launch-$(date +%Y%m%d-%H%M%S)"
cp "$VHOST" "$BACKUP"
echo "vhost backup: $BACKUP"

rollback() {
	echo "Rolling back"
	cp "$BACKUP" "$VHOST"
	if [ -L "$DOCROOT" ] && [ -d "$WORDPRESS" ]; then rm "$DOCROOT" && mv "$WORDPRESS" "$DOCROOT"; fi
	apache2ctl configtest && systemctl reload apache2
}
trap 'rollback' ERR

if ! grep -qF "$INCLUDE" "$VHOST"; then
	# Before each closing </VirtualHost>, like the dev vhost
	sed -i "s#^</VirtualHost>#$INCLUDE\n</VirtualHost>#" "$VHOST"
fi
test "$(grep -cF "$INCLUDE" "$VHOST")" -ge 2

mv "$DOCROOT" "$WORDPRESS"
ln -s "$DOMAIN_DIR/app/dist/client" "$DOCROOT"
chown -h ocs:ocs "$DOCROOT"

apache2ctl configtest
systemctl reload apache2

# The switch counts only if Apache now serves the new site and reaches the Node server for
# ocs.com.ua; any failure here triggers the rollback to WordPress above
sleep 2
check() {
	local code
	code=$(curl -sS -o /dev/null -w '%{http_code}' --resolve ocs.com.ua:443:127.0.0.1 "https://ocs.com.ua$1" || echo 000)
	echo "https://ocs.com.ua$1 -> $code"
	[ "$code" = "$2" ]
}
check /ua/ 200
check /admin/config.yml 200
check /llms.txt 200
check /kontakty/ 301
# Read the whole page first: `curl | grep -q` would close the pipe at the first match, and
# pipefail would turn curl's write error into a failed launch
PAGE=$(curl -fsS --resolve ocs.com.ua:443:127.0.0.1 https://ocs.com.ua/ua/)
grep -q 'content="index, follow"' <<<"$PAGE"
echo "https://ocs.com.ua/ua/ is indexable"
trap - ERR

echo "ocs.com.ua now serves $(readlink -f "$DOCROOT")"
echo "WordPress files are in $WORDPRESS. Next: set the PROD_LIVE repository variable to true."
