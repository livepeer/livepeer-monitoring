# Livepeer Monitoring Supercontainer

a bundled prometheus/grafana container with a config templating for monitoring livepeer instances in different deployments

## Quick Installation

`docker pull livepeer/monitoring`

## Setup

### Args

**note** all Args can be passed as environment variables by adding the prefix `LP_` to the arg, for example `--nodes` would become `LP_NODES` if passed as an env variable.


- `--mode` : `standalone` for local bare metal deployments of livepeer
          or `docker-compose` mode for running as a part of a docker-compose manifest
          or `kuberenetes` mode for running as a part of a kube pod

- `--nodes`: a comma separated list of the livepeer nodes and their `cli` port we'd like to monitor, example: `--nodes=localhost:7935,localhost:7936`, this isn't required in the kubernetes deployments since discovery is done automatically using the `prometheus.io/scrape` labels.

- `--kube-namespaces` : comma separated list of namespaces to monitoring in the `kubernetes` deployment, this is needed for certain special deployments, it defaults to an empty array.

- `--prometheus-kube-scrape`: string annotation for scraping a kube pod. Ex. If the value for this flag is `scrape_this_pod` then all kube pods to be scraped should have the annotation `prometheus.io/scrape_this_pod`. The value for this flag must follow the Prometheus requirements for naming and match the regex `[a-zA-Z_][a-zA-Z0-9_]*` (ACII letters, numbers and underscores).

- `--pagerduty-service-key`: the [service key](https://support.pagerduty.com/docs/services-and-integrations) (not API key!) for the Prometheus integration on your Pagerduty service to receive alerts from Prometheus Alertmanager. 

### ENVs

these env variables cannot be passed as a arg, this is because we use them in the simple docker templating for stuff like
grafana datasource
- `LP_PROMETHEUS_ENDPOINT` : a full url of the prometheus endpoint, this defaults to `http://localhost:9090` , but in our kubernetes deployments and docker-compose, this need to be changed


### Grafana Envs

All `GF_` prefixed envs are passed to grafana , you can find out more details at the [official grafana docs](https://grafana.com/docs/grafana/latest/installation/configuration/#configure-with-environment-variables)


## Usage examples

```bash
# simple standalone setup example using envs
$ sudo docker run --net=host --env LP_MODE=standalone --env LP_NODES=localhost:9735,localhost:7936 livepeer/monitoring:latest

# using args
$ sudo docker run --net=host livepeer/monitoring:latest --mode standalone --nodes=localhost:9735,localhost:7936

```

**note** on OSX omit ``--net=host`  and use `host.docker.internal` instead of localhost for the `--nodes`. Port forwarding will using the `-p` flag is also required. 

```docker run livepeer/monitoring:latest --mode standalone --nodes=docker.host.internal:9735```

dashboards are available at the usual `3000` port for grafana and `9090` for prometheus. you can change that using the docker port forwarding `-p` flag
