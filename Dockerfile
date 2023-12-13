ARG	GRAFANA_ENV

FROM	prom/prometheus:v2.48.0	AS	prometheus

FROM	grafana/loki:2.8.7	AS	loki

FROM	prom/alertmanager:v0.26.0	AS	alertmanager

FROM	golang:1.20.4-alpine3.16	AS	nvidia-builder

WORKDIR	/src

COPY	nvidia_smi_exporter.go	./

RUN	go build nvidia_smi_exporter.go

FROM	scratch	AS	grafana-dashboard

ARG	GRAFANA_ENV

COPY	./grafana/${GRAFANA_ENV}/	/grafana

FROM	grafana/grafana-oss:10.2.2	AS	grafana

LABEL	maintainer="Amritanshu Varshney <amritanshu+github@livepeer.org>"

RUN	mkdir -p "$GF_PATHS_HOME/.aws" \
	"$GF_PATHS_PROVISIONING/datasources" \
	"$GF_PATHS_PROVISIONING/dashboards" \
	"$GF_PATHS_PROVISIONING/notifiers" \
	"$GF_PATHS_PROVISIONING/plugins" \
	"$GF_PATHS_LOGS" \
	"$GF_PATHS_PLUGINS" \
	"$GF_PATHS_DATA"

USER	root

RUN	apk add --no-cache ca-certificates bash tzdata supervisor yarn openssl musl-utils \
	# && apk add --no-cache --upgrade --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main openssl musl-utils \
	&& cp "$GF_PATHS_HOME/conf/sample.ini" "$GF_PATHS_CONFIG" \
	&& cp "$GF_PATHS_HOME/conf/ldap.toml" /etc/grafana/ldap.toml \
	&& chown -R grafana:root "$GF_PATHS_HOME" "$GF_PATHS_PROVISIONING" "$GF_PATHS_LOGS" "$GF_PATHS_LOGS" "$GF_PATHS_PLUGINS" "$GF_PATHS_DATA"

# Copy over from prometheus base image
COPY --from=prometheus --link	/bin/prometheus		/bin/promtool           /usr/local/bin/
COPY --from=prometheus --link	/etc/prometheus/prometheus.yml			/etc/prometheus/prometheus.yml
COPY --from=prometheus --link	/usr/share/prometheus/console_libraries/	/usr/share/prometheus/console_libraries/
COPY --from=prometheus --link	/usr/share/prometheus/consoles/			/usr/share/prometheus/consoles/
COPY --from=prometheus --link	/prometheus					/prometheus

# Copy over from loki base image
COPY --from=loki --link		/usr/bin/loki		/usr/local/bin/loki
COPY --chown=grafana:root	./config/loki.yaml	/etc/loki/loki.yaml

# Copy over from alertmanager base image
COPY --from=alertmanager --link	/bin/alertmanager	/bin/amtool	/usr/local/bin/

# Copy over from nvidia smi exporter layer
COPY --from=nvidia-builder --link	/src/nvidia_smi_exporter	/usr/local/bin/

ENV	LP_PROMETHEUS_ENDPOINT="http://localhost:9090" \
	LP_LOKI_ENDPOINT="http://localhost:3100" \
	LP_NODES="localhost:7935"

COPY --chown=grafana:root --from=grafana-dashboard	/grafana/	$GF_PATHS_PROVISIONING/

COPY	supervisord.ini	/etc/supervisor.d/supervisord.ini

WORKDIR	/config-generator

COPY	./config-generator/yarn.lock	./config-generator/package.json	./

RUN	yarn

COPY	config-generator	./

RUN	node /config-generator/src/generate.js

VOLUME	[ "/data/grafana", "/prometheus" ]

COPY	./start.sh	/

EXPOSE	3100	9090	9093	3000

WORKDIR	$GF_PATHS_HOME

ENTRYPOINT	[ "/start.sh" ]

CMD	[ "/start.sh" ]
