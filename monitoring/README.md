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

### ENVs

these env variables cannot be passed as a arg, this is because we use them in the simple docker templating for stuff like
grafana datasource
- `LP_PROMETHEUS_ENDPOINT` : a full url of the prometheus endpoint, this defaults to `http://localhost:9090` , but in our kubernetes deployments and docker-compose, this need to be changed


## Usage examples

```bash
# simple standalone setup example using envs
$ sudo docker run --net=host --env LP_MODE=standalone --env LP_NODES=localhost:9735,localhost:7936 livepeer/monitoring:latest

# using args
$ sudo docker run --net=host livepeer/monitoring:latest --mode standalone --nodes=localhost:9735,localhost:7936

```


dashboards are available at the usual `3000` port for grafana and `9090` for prometheus. you can change that using the docker port forwarding `-p` flag
