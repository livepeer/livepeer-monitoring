ARG ARCH="amd64"
ARG OS="linux"

FROM prom/prometheus:latest as t1

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
ENTRYPOINT [ "/bin/prometheus" ]
CMD        [ "--config.file=/etc/prometheus/prometheus.yml", \
             "--storage.tsdb.path=/prometheus", \
             "--web.console.libraries=/usr/share/prometheus/console_libraries", \
             "--web.console.templates=/usr/share/prometheus/consoles" ]