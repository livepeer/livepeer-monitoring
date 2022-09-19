ARG ARCH="amd64"
ARG OS="linux"

FROM prom/prometheus:v2.30.1 as t1
FROM grafana/grafana:9.1.5 as c1
FROM prom/alertmanager:latest as a1
FROM grafana/loki:2.4.1 as loki

FROM node:alpine3.15 as t2

ARG ARCH="amd64"
ARG OS="linux"
COPY --from=t1  /bin/prometheus           /bin/prometheus
COPY --from=t1  /bin/promtool           /bin/promtool
COPY --from=t1  /etc/prometheus/prometheus.yml            /etc/prometheus/prometheus.yml
COPY --from=t1  /usr/share/prometheus/console_libraries/            /usr/share/prometheus/console_libraries/
COPY --from=t1  /usr/share/prometheus/consoles/           /usr/share/prometheus/consoles/
# COPY --from=t1  /LICENSE            /LICENSE
# COPY --from=t1  /NOTICE           /NOTICE
# COPY --from=t1  /npm_licenses.tar.bz2           /npm_licenses.tar.bz2

# RUN ln -s /usr/share/prometheus/console_libraries /usr/share/prometheus/consoles/ /etc/prometheus/
COPY --from=t1 /prometheus /prometheus

# USER       nobody
EXPOSE     9090
VOLUME     [ "/prometheus" ]
WORKDIR    /prometheus
# ENTRYPOINT [ "/bin/prometheus" ]
# CMD        [ "--config.file=/etc/prometheus/prometheus.yml", \
#              "--storage.tsdb.path=/prometheus", \
#              "--web.console.libraries=/usr/share/prometheus/console_libraries", \
#              "--web.console.templates=/usr/share/prometheus/consoles" ]


COPY --from=a1 /bin/alertmanager /bin/alertmanager
EXPOSE 9093



ARG GF_UID="0"
# ARG GF_GID="472"

ENV PATH="/usr/share/grafana/bin:$PATH" \
    GF_PATHS_CONFIG="/etc/grafana/grafana.ini" \
    GF_PATHS_DATA="/data/grafana" \
    GF_PATHS_HOME="/usr/share/grafana" \
    GF_PATHS_LOGS="/var/log/grafana" \
    GF_PATHS_PLUGINS="/data/grafana/plugins" \
    GF_PATHS_PROVISIONING="/etc/grafana/provisioning" \
    LP_PROMETHEUS_ENDPOINT="http://localhost:9090" \
    LP_LOKI_ENDPOINT="http://localhost:3100" \
    LP_NODES="localhost:7935"

WORKDIR $GF_PATHS_HOME

RUN apk add --no-cache ca-certificates bash tzdata && \
    apk add --no-cache --upgrade --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main openssl musl-utils

COPY --from=c1 $GF_PATHS_HOME/conf $GF_PATHS_HOME/conf

RUN mkdir -p "$GF_PATHS_HOME/.aws" && \
    mkdir -p "$GF_PATHS_PROVISIONING/datasources" \
    "$GF_PATHS_PROVISIONING/dashboards" \
    "$GF_PATHS_PROVISIONING/notifiers" \
    "$GF_PATHS_PROVISIONING/plugins" \
    "$GF_PATHS_LOGS" \
    "$GF_PATHS_PLUGINS" \
    "$GF_PATHS_DATA" && \
    cp "$GF_PATHS_HOME/conf/sample.ini" "$GF_PATHS_CONFIG" && \
    cp "$GF_PATHS_HOME/conf/ldap.toml" /etc/grafana/ldap.toml && \
    chmod -R 777 "$GF_PATHS_DATA" "$GF_PATHS_HOME/.aws" "$GF_PATHS_LOGS" "$GF_PATHS_PLUGINS" "$GF_PATHS_PROVISIONING"

COPY --from=c1 /usr/share/grafana /usr/share/grafana
COPY --from=c1 $GF_PATHS_HOME/bin/grafana-cli $GF_PATHS_HOME/bin/grafana-cli
COPY --from=c1 $GF_PATHS_HOME/public $GF_PATHS_HOME/public

# Chromium dependencies from https://github.com/grafana/grafana/blob/2916b483ebed3e1f5667a858b251d42d844d6f6a/packaging/docker/Dockerfile#L35
RUN if [ `arch` = "x86_64" ]; then \
        wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.35-r0/glibc-2.35-r0.apk \
            -O /tmp/glibc-2.35-r0.apk && \
        wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.35-r0/glibc-bin-2.35-r0.apk \
            -O /tmp/glibc-bin-2.35-r0.apk && \
        apk add --no-cache --allow-untrusted /tmp/glibc-2.35-r0.apk /tmp/glibc-bin-2.35-r0.apk && \
        rm -f /lib64/ld-linux-x86-64.so.2 && \
        ln -s /usr/glibc-compat/lib64/ld-linux-x86-64.so.2 /lib64/ld-linux-x86-64.so.2 && \
        rm -f /tmp/glibc-2.35-r0.apk && \
        rm -f /tmp/glibc-bin-2.35-r0.apk && \
        rm -f /lib/ld-linux-x86-64.so.2 && \
        rm -f /etc/ld.so.cache; \
    fi
# Grafana image rendering from https://github.com/grafana/grafana/blob/e0db19e74116db30d5e6b7666a2888238b4cb416/packaging/docker/custom/Dockerfile#L15
RUN if [[ $(uname -m) == "x86_64" ]]; then \
    apk add --no-cache udev ttf-opensans chromium && \
    rm -rf /tmp/* && \
    rm -rf /usr/share/grafana/tools/phantomjs && \
    grafana-cli \
        --pluginsDir "$GF_PATHS_PLUGINS" \
        --pluginUrl https://github.com/grafana/grafana-image-renderer/releases/download/v3.6.1/plugin-linux-x64-glibc.zip \
        plugins install grafana-image-renderer; \
    fi
ENV GF_PLUGIN_RENDERING_CHROME_BIN="/usr/bin/chromium-browser"

COPY ./grafana/datasources $GF_PATHS_PROVISIONING/datasources
COPY ./grafana/dashboards $GF_PATHS_PROVISIONING/dashboards

EXPOSE 3000

COPY --from=c1 /run.sh /run.sh

# LOKI 
EXPOSE 3100
COPY --from=loki /usr/bin/loki /usr/bin/loki
COPY  ./config/loki.yaml /etc/loki/loki.yaml
# CMD ["/usr/bin/loki", "-config.file=/etc/loki/local-config.yaml"]

RUN apk add supervisor
COPY supervisord.conf /etc/supervisor.d/supervisord.conf

RUN mkdir -p "/config-generator"
COPY config-generator/package.json /config-generator/package.json
RUN cd /config-generator && npm install
COPY config-generator /config-generator
RUN node /config-generator/src/generate.js

VOLUME [ "/data/grafana" ]

COPY start.sh /start.sh
ENTRYPOINT [ "/start.sh" ]
CMD ["/start.sh"]

# build
# sudo docker build -t super-container:latest -f Dockerfile .
# to run
# sudo docker run --net=host --env LP_MODE=standalone --env LP_NODES=localhost:9735,localhost:7936 super-container:latest
