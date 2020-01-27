#!/bin/bash
set -e

node /config-generator/src/generate.js
exec /usr/bin/supervisord -c /etc/supervisor.d/supervisord.conf -e debug