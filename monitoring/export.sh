#!/bin/bash

# Usage:
#
# export_grafana_dashboards.sh https://admin:REDACTED@grafana.dedevsecops.com

set -euo pipefail

full_url=$1
username=$(echo "${full_url}" | cut -d/ -f 3 | cut -d: -f 1)
base_url=$(echo "${full_url}" | cut -d@ -f 2)
folder="grafana/dashboards"

find $folder -type f | grep json | xargs rm
mkdir -p "${folder}" 
for db_search_json in $(curl --fail -s "${full_url}/api/search" | jq -cr '.[] | @base64'); do
  db_uid=$(echo "${db_search_json}" | base64 -d | jq -r .uid)
  db_folder=$(echo "${db_search_json}" | base64 -d | jq -r .folderTitle)
  if [[ "$db_folder" == "null" ]]; then
    db_folder=""
  fi
  db_json=$(curl --fail -s "${full_url}/api/dashboards/uid/${db_uid}")
  db_slug=$(echo "${db_json}" | jq -r .meta.slug)
  db_title=$(echo "${db_json}" | jq -r .dashboard.title)
  filename="${folder}/${db_folder}/${db_slug}.json"
  mkdir -p "$(dirname $filename)"
  echo "Exporting \"${db_title}\" to \"${filename}\"..." 
  echo "${db_json}" | jq -r '.dashboard' > "${filename}"
done
echo "Done"
