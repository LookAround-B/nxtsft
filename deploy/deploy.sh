#!/usr/bin/env bash
# Build-then-switch deploy for the VPS. Each deploy is a fresh clone in
# releases/<timestamp>-<sha>; `current` only flips to it after the build
# succeeds, so a failed build never touches the running app. Rollback =
# point `current` at the previous release and `pm2 reload nxtsft-web`.
#
# Usage (on the VPS, as the deploy user):  /var/www/nxtsft/deploy.sh [branch]
set -euo pipefail

APP_DIR=/var/www/nxtsft
REPO=git@github.com:LookAround-B/nxtsft.git
BRANCH=${1:-main}
KEEP=3
# Non-interactive (GitHub Actions) runs must not stall on corepack's
# "download pnpm?" prompt.
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

SHA=$(git ls-remote "$REPO" "refs/heads/$BRANCH" | cut -c1-7)
REL="$APP_DIR/releases/$(date +%Y%m%d%H%M%S)-$SHA"

echo "==> Cloning $BRANCH@$SHA into $REL"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$REL"
# Root .env holds every secret; next.config.ts and packages/db load it from
# the monorepo root, so one shared file serves both build and runtime.
ln -s "$APP_DIR/shared/.env" "$REL/.env"

cd "$REL"
echo "==> Installing"
pnpm install --frozen-lockfile
echo "==> Building"
NODE_OPTIONS=--max-old-space-size=3072 pnpm --filter @nxtsft/web build

echo "==> Switching current -> $REL"
ln -sfn "$REL" "$APP_DIR/current"
pm2 startOrReload "$APP_DIR/current/deploy/ecosystem.config.cjs" --update-env
pm2 save

echo "==> Health check"
# /api/health/db is gated on the cron bearer (same as deploy/cron.sh).
SECRET=$(grep -E '^CRON_SECRET=' "$APP_DIR/shared/.env" | cut -d= -f2- | tr -d '"')
for i in $(seq 1 20); do
  if curl -fsS -H "Authorization: Bearer $SECRET" http://127.0.0.1:3000/api/health/db >/dev/null; then
    echo "OK"
    break
  fi
  [ "$i" = 20 ] && { echo "Health check failed — check: pm2 logs nxtsft-web"; exit 1; }
  sleep 3
done

echo "==> Pruning old releases (keeping $KEEP)"
ls -1dt "$APP_DIR"/releases/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf
