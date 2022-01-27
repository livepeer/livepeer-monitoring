#!/bin/bash
set -e

if [[ "${LP_SKIP_PROVISIONING:-}" == "true" ]]; then
  echo "LP_SKIP_PROVISIONING is set, not overwriting dashboards"
  rm -rf $GF_PATHS_PROVISIONING
fi
node /config-generator/src/generate.js "$@"
exec /usr/bin/supervisord -c /etc/supervisor.d/supervisord.conf -e debug