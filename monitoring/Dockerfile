ARG ARCH="amd64"
ARG OS="linux"

FROM prom/prometheus:latest as t1
FROM grafana/grafana:latest as c1

FROM alpine:latest as t2
ARG ARCH="amd64"
ARG OS="linux"
COPY --from=t1  /bin/prometheus           /bin/prometheus
COPY --from=t1  /bin/promtool           /bin/promtool
COPY --from=t1  /etc/prometheus/prometheus.yml            /etc/prometheus/prometheus.yml
COPY --from=t1  /usr/share/prometheus/console_libraries/            /usr/share/prometheus/console_libraries/
COPY --from=t1  /usr/share/prometheus/consoles/           /usr/share/prometheus/consoles/
COPY --from=t1  /LICENSE            /LICENSE
COPY --from=t1  /NOTICE           /NOTICE
COPY --from=t1  /npm_licenses.tar.bz2           /npm_licenses.tar.bz2

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





ARG GF_UID="472"
ARG GF_GID="472"

ENV PATH="/usr/share/grafana/bin:$PATH" \
    GF_PATHS_CONFIG="/etc/grafana/grafana.ini" \
    GF_PATHS_DATA="/var/lib/grafana" \
    GF_PATHS_HOME="/usr/share/grafana" \
    GF_PATHS_LOGS="/var/log/grafana" \
    GF_PATHS_PLUGINS="/var/lib/grafana/plugins" \
    GF_PATHS_PROVISIONING="/etc/grafana/provisioning"

WORKDIR $GF_PATHS_HOME

RUN apk add --no-cache ca-certificates bash tzdata && \
    apk add --no-cache --upgrade --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main openssl musl-utils

COPY --from=c1 $GF_PATHS_HOME/conf $GF_PATHS_HOME/conf

RUN mkdir -p "$GF_PATHS_HOME/.aws" && \
    addgroup -S -g $GF_GID grafana && \
    adduser -S -u $GF_UID -G grafana grafana && \
    mkdir -p "$GF_PATHS_PROVISIONING/datasources" \
             "$GF_PATHS_PROVISIONING/dashboards" \
             "$GF_PATHS_PROVISIONING/notifiers" \
             "$GF_PATHS_LOGS" \
             "$GF_PATHS_PLUGINS" \
             "$GF_PATHS_DATA" && \
    cp "$GF_PATHS_HOME/conf/sample.ini" "$GF_PATHS_CONFIG" && \
    cp "$GF_PATHS_HOME/conf/ldap.toml" /etc/grafana/ldap.toml && \
    chown -R grafana:grafana "$GF_PATHS_DATA" "$GF_PATHS_HOME/.aws" "$GF_PATHS_LOGS" "$GF_PATHS_PLUGINS" "$GF_PATHS_PROVISIONING" && \
    chmod -R 777 "$GF_PATHS_DATA" "$GF_PATHS_HOME/.aws" "$GF_PATHS_LOGS" "$GF_PATHS_PLUGINS" "$GF_PATHS_PROVISIONING"

# PhantomJS
COPY --from=c1 /lib /lib
COPY --from=c1 /lib64 /lib64
COPY --from=c1 /usr/lib/x86_64-linux-gnu /usr/lib/x86_64-linux-gnu
COPY --from=c1 /usr/share /usr/share
COPY --from=c1 /etc/fonts /etc/fonts
COPY --from=c1 /usr/local/bin /usr/local/bin

COPY --from=c1 $GF_PATHS_HOME/bin/grafana-cli $GF_PATHS_HOME/bin/grafana-cli
COPY --from=c1 $GF_PATHS_HOME/public $GF_PATHS_HOME/public
COPY --from=c1 $GF_PATHS_HOME/tools $GF_PATHS_HOME/tools
COPY --from=c1 $GF_PATHS_HOME/tools/phantomjs/render.js $GF_PATHS_HOME/tools/phantomjs/render.js

EXPOSE 3000

COPY --from=c1 /run.sh /run.sh

USER grafana
ENTRYPOINT [ "/run.sh" ]