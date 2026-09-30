#!/bin/sh
# Container start-up on Vercel.
set -e

# Writable Laravel storage (see LARAVEL_STORAGE_PATH in Dockerfile.vercel).
mkdir -p /tmp/storage/app /tmp/storage/logs \
         /tmp/storage/framework/cache/data /tmp/storage/framework/views /tmp/storage/framework/sessions

# Vercel has no "pre-deploy" hook, so schema changes are applied when an instance starts.
# Both commands are safe to repeat: migrate skips what is done, and the seeder only creates
# the admin / default settings if they are missing. Set RUN_MIGRATIONS=false to turn this off
# and run them yourself instead (php artisan migrate --force against the production DB).
if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
  php artisan migrate --force --no-interaction
  php artisan db:seed --force --no-interaction
fi

exec frankenphp run --config /etc/caddy/Caddyfile
