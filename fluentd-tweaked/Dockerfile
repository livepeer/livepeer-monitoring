FROM fluent/fluentd-kubernetes-daemonset:v1-debian-papertrail

ENV LOKI_URL ""
ADD kubernetes.conf /fluentd/etc/kubernetes.conf
COPY plugins /fluentd/plugins/
