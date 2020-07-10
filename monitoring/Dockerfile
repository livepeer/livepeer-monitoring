ARG ARCH="amd64"
ARG OS="linux"

FROM prom/prometheus:latest as t1
FROM grafana/grafana:6.7.3 as c1
FROM prom/alertmanager:latest as a1

FROM node:alpine as t2

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



ARG GF_UID="472"
# ARG GF_GID="472"

ENV PATH="/usr/share/grafana/bin:$PATH" \
    GF_PATHS_CONFIG="/etc/grafana/grafana.ini" \
    GF_PATHS_DATA="/data/grafana" \
    GF_PATHS_HOME="/usr/share/grafana" \
    GF_PATHS_LOGS="/var/log/grafana" \
    GF_PATHS_PLUGINS="/data/grafana/plugins" \
    GF_PATHS_PROVISIONING="/etc/grafana/provisioning" \
    LP_PROMETHEUS_ENDPOINT="http://localhost:9090" \
    LP_NODES="localhost:7935"

WORKDIR $GF_PATHS_HOME

RUN apk add --no-cache ca-certificates bash tzdata && \
    apk add --no-cache --upgrade --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main openssl musl-utils

COPY --from=c1 $GF_PATHS_HOME/conf $GF_PATHS_HOME/conf

RUN mkdir -p "$GF_PATHS_HOME/.aws" && \
    addgroup -S -g $GF_UID grafana && \
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
# COPY --from=c1 /lib /lib
# COPY --from=c1 /lib64 /lib64
COPY --from=c1 /usr/lib/x86_64-linux-gnu /usr/lib/x86_64-linux-gnu
COPY --from=c1 /usr/share/grafana /usr/share/grafana
COPY --from=c1 /etc/fonts /etc/fonts
# COPY --from=c1 /usr/local/bin /usr/local/bin

COPY --from=c1 $GF_PATHS_HOME/bin/grafana-cli $GF_PATHS_HOME/bin/grafana-cli
COPY --from=c1 $GF_PATHS_HOME/public $GF_PATHS_HOME/public
COPY --from=c1 $GF_PATHS_HOME/tools $GF_PATHS_HOME/tools
COPY --from=c1 $GF_PATHS_HOME/tools/phantomjs/render.js $GF_PATHS_HOME/tools/phantomjs/render.js

COPY ./grafana/grafanaDatasources.yml $GF_PATHS_PROVISIONING/datasources/datasources.yml
COPY ./grafana/grafanaDashboards.yml $GF_PATHS_PROVISIONING/dashboards/dashboards.yml
COPY ./grafana/1.json $GF_PATHS_DATA/dashboards/1.json
COPY ./grafana/2.json $GF_PATHS_DATA/dashboards/2.json
COPY ./grafana/3.json $GF_PATHS_DATA/dashboards/3.json
COPY ./grafana/livepeer_overview.json $GF_PATHS_DATA/dashboards/livepeer_overview.json
COPY ./grafana/livepeer_payments_overview.json $GF_PATHS_DATA/dashboards/livepeer_payments_overview.json
COPY ./grafana/nvidia-gpu.json $GF_PATHS_DATA/dashboards/nvidia-gpu.json


EXPOSE 3000

COPY --from=c1 /run.sh /run.sh

RUN apk add supervisor
COPY supervisord.conf /etc/supervisor.d/supervisord.conf
# RUN /usr/bin/supervisord -c /etc/supervisor.d/supervisord.conf

RUN mkdir -p "/config-generator"
COPY config-generator/package.json /config-generator/package.json
# CMD ["node", "/config-generator/src/generate.js"]
RUN cd /config-generator && npm install
COPY config-generator /config-generator
RUN node /config-generator/src/generate.js

VOLUME [ "/data/grafana" ]

# CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor.d/supervisord.conf", "-e", "debug"]
COPY start.sh /start.sh
ENTRYPOINT [ "/start.sh" ]
CMD ["/start.sh"]

# build
# sudo docker build -t super-container:latest -f Dockerfile .
# to run 
# sudo docker run --net=host --env LP_MODE=standalone --env LP_NODES=localhost:9735,localhost:7936 super-container:latest
