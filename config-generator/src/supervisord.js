"use strict";

const fs = require("fs");
const ini = require("js-ini");

function generate(params, defaults = "/etc/supervisor.d/supervisord.ini") {
  let obj = ini.parse(fs.readFileSync(defaults, "utf-8"));

  console.log("ini obj: ", obj);

  // prometheus args
  if (params && !params["prometheus-disabled"]) {
    obj["program:prometheus"].command =
      `/usr/local/bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=${
        params.prometheusStoragePath || "/data/prometheus"
      } --storage.tsdb.retention.size=${
        params.prometheusRetentionSize || "0"
      } --web.route-prefix=${
        params.prometheusPrefix || "/"
      } --web.external-url=${
        params.prometheusExternalUrl || "http://localhost:9090/prometheus"
      } --web.console.libraries=/usr/share/prometheus/console_libraries --web.console.templates=/usr/share/prometheus/consoles`;
  }

  if (params && params["prometheus-disabled"]) {
    delete obj["program:prometheus"];
  }

  if (params && params["loki-enabled"] && params["loki-url"]) {
    obj["program:loki"].command =
      `/usr/local/bin/loki --config.file=/etc/loki/loki.yaml`;
  } else {
    delete obj["program:loki"];
  }

  return ini.stringify(obj);
}

module.exports = { generate };
