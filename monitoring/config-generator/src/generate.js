'use strict'

const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

function generate () {
  console.log(process.env)

  const promConfig = prometheusConfig(process.env)
  console.log('prom JSON: ', JSON.stringify(promConfig))

  saveYaml('/etc/prometheus', 'prometheus.yml', promConfig)
}


function saveYaml (outputFolder, name, content) {
  // console.log(`===== saving ${name} into ${outputFolder}`)
  // console.log(content)
  fs.writeFileSync(path.join(outputFolder, name), YAML.stringify(content))
}

generate()


function prometheusConfig (env) {
  let obj = {
    global: {
      scrape_interval: '5s',
      scrape_timeout: '5s',  
      evaluation_interval: '5s',
    },
    scrape_configs: []
  }

  if (env && env['LP_MODE']) {
    switch (env['LP_MODE']) {
      case 'standalone':
        obj.scrape_configs.push({
          job_name: 'livepeer-nodes',
          static_configs: [{
            targets: env['LP_NODES'].split(',')
          }]
        })
        break
      case 'docker-compose':
        obj.scrape_configs.push({
          job_name: 'livepeer-nodes',
          static_configs: [{
            targets: env['LP_NODES'].split(',')
          }]
        })
      case 'kubernetes':
        const namespaces = (env['LP_KUBE_NAMESPACES']) ? env['LP_KUBE_NAMESPACES'].split(',') : null
        obj.scrape_configs = getPromKubeJobs(namespaces)
        console.log('obj.scrap_configs: ', JSON.stringify(obj.scrape_configs))
      default:
        break
    }
  } else {

  }
  
  return obj
}

function getPromKubeJobs (namespaces) {
  return [
    {
      "job_name": "kubernetes-apiservers",
      "scrape_interval": "5s",
      "scrape_timeout": "5s",
      "metrics_path": "/metrics",
      "scheme": "https",
      "kubernetes_sd_configs": [
        {
          "api_server": null,
          "role": "endpoints",
          "namespaces": {
            "names": namespaces
          }
        }
      ],
      "bearer_token_file": "/var/run/secrets/kubernetes.io/serviceaccount/token",
      "tls_config": {
        "ca_file": "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt",
        "insecure_skip_verify": false
      },
      "relabel_configs": [
        {
          "source_labels": [
            "__meta_kubernetes_namespace",
            "__meta_kubernetes_service_name",
            "__meta_kubernetes_endpoint_port_name"
          ],
          "separator": ";",
          "regex": "default;kubernetes;https",
          "replacement": "$1",
          "action": "keep"
        }
      ]
    },
    {
      "job_name": "kubernetes-nodes",
      "scrape_interval": "5s",
      "scrape_timeout": "5s",
      "metrics_path": "/metrics",
      "scheme": "https",
      "kubernetes_sd_configs": [
        {
          "api_server": null,
          "role": "node",
          "namespaces": {
            "names": namespaces
          }
        }
      ],
      "bearer_token_file": "/var/run/secrets/kubernetes.io/serviceaccount/token",
      "tls_config": {
        "ca_file": "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt",
        "insecure_skip_verify": false
      },
      "relabel_configs": [
        {
          "separator": ";",
          "regex": "__meta_kubernetes_node_label_(.+)",
          "replacement": "$1",
          "action": "labelmap"
        },
        {
          "separator": ";",
          "regex": "(.*)",
          "target_label": "__address__",
          "replacement": "kubernetes.default.svc:443",
          "action": "replace"
        },
        {
          "source_labels": [
            "__meta_kubernetes_node_name"
          ],
          "separator": ";",
          "regex": "(.+)",
          "target_label": "__metrics_path__",
          "replacement": "/api/v1/nodes/${1}/proxy/metrics",
          "action": "replace"
        }
      ]
    },
    {
      "job_name": "kubernetes-pods",
      "scrape_interval": "5s",
      "scrape_timeout": "5s",
      "metrics_path": "/metrics",
      "scheme": "http",
      "kubernetes_sd_configs": [
        {
          "api_server": null,
          "role": "pod",
          "namespaces": {
            "names": namespaces
          }
        }
      ],
      "relabel_configs": [
        {
          "source_labels": [
            "__meta_kubernetes_pod_annotation_prometheus_io_scrape"
          ],
          "separator": ";",
          "regex": "true",
          "replacement": "$1",
          "action": "keep"
        },
        {
          "source_labels": [
            "__meta_kubernetes_pod_annotation_prometheus_io_path"
          ],
          "separator": ";",
          "regex": "(.+)",
          "target_label": "__metrics_path__",
          "replacement": "$1",
          "action": "replace"
        },
        {
          "source_labels": [
            "__address__",
            "__meta_kubernetes_pod_annotation_prometheus_io_port"
          ],
          "separator": ";",
          "regex": "([^:]+)(?::\\d+)?;(\\d+)",
          "target_label": "__address__",
          "replacement": "$1:$2",
          "action": "replace"
        },
        {
          "separator": ";",
          "regex": "__meta_kubernetes_pod_label_(.+)",
          "replacement": "$1",
          "action": "labelmap"
        },
        {
          "source_labels": [
            "__meta_kubernetes_namespace"
          ],
          "separator": ";",
          "regex": "(.*)",
          "target_label": "kubernetes_namespace",
          "replacement": "$1",
          "action": "replace"
        },
        {
          "source_labels": [
            "__meta_kubernetes_pod_name"
          ],
          "separator": ";",
          "regex": "(.*)",
          "target_label": "kubernetes_pod_name",
          "replacement": "$1",
          "action": "replace"
        }
      ]
    },
    {
      "job_name": "kubernetes-cadvisor",
      "scrape_interval": "5s",
      "scrape_timeout": "5s",
      "metrics_path": "/metrics",
      "scheme": "https",
      "kubernetes_sd_configs": [
        {
          "api_server": null,
          "role": "node",
          "namespaces": {
            "names": namespaces
          }
        }
      ],
      "bearer_token_file": "/var/run/secrets/kubernetes.io/serviceaccount/token",
      "tls_config": {
        "ca_file": "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt",
        "insecure_skip_verify": false
      },
      "relabel_configs": [
        {
          "separator": ";",
          "regex": "__meta_kubernetes_node_label_(.+)",
          "replacement": "$1",
          "action": "labelmap"
        },
        {
          "separator": ";",
          "regex": "(.*)",
          "target_label": "__address__",
          "replacement": "kubernetes.default.svc:443",
          "action": "replace"
        },
        {
          "source_labels": [
            "__meta_kubernetes_node_name"
          ],
          "separator": ";",
          "regex": "(.+)",
          "target_label": "__metrics_path__",
          "replacement": "/api/v1/nodes/${1}/proxy/metrics/cadvisor",
          "action": "replace"
        }
      ]
    },
    {
      "job_name": "kubernetes-service-endpoints",
      "scrape_interval": "5s",
      "scrape_timeout": "5s",
      "metrics_path": "/metrics",
      "scheme": "http",
      "kubernetes_sd_configs": [
        {
          "api_server": null,
          "role": "endpoints",
          "namespaces": {
            "names": namespaces
          }
        }
      ],
      "relabel_configs": [
        {
          "source_labels": [
            "__meta_kubernetes_service_annotation_prometheus_io_scrape"
          ],
          "separator": ";",
          "regex": "true",
          "replacement": "$1",
          "action": "keep"
        },
        {
          "source_labels": [
            "__meta_kubernetes_service_annotation_prometheus_io_scheme"
          ],
          "separator": ";",
          "regex": "(https?)",
          "target_label": "__scheme__",
          "replacement": "$1",
          "action": "replace"
        },
        {
          "source_labels": [
            "__meta_kubernetes_service_annotation_prometheus_io_path"
          ],
          "separator": ";",
          "regex": "(.+)",
          "target_label": "__metrics_path__",
          "replacement": "$1",
          "action": "replace"
        },
        {
          "source_labels": [
            "__address__",
            "__meta_kubernetes_service_annotation_prometheus_io_port"
          ],
          "separator": ";",
          "regex": "([^:]+)(?::\\d+)?;(\\d+)",
          "target_label": "__address__",
          "replacement": "$1:$2",
          "action": "replace"
        },
        {
          "separator": ";",
          "regex": "__meta_kubernetes_service_label_(.+)",
          "replacement": "$1",
          "action": "labelmap"
        },
        {
          "source_labels": [
            "__meta_kubernetes_namespace"
          ],
          "separator": ";",
          "regex": "(.*)",
          "target_label": "kubernetes_namespace",
          "replacement": "$1",
          "action": "replace"
        },
        {
          "source_labels": [
            "__meta_kubernetes_service_name"
          ],
          "separator": ";",
          "regex": "(.*)",
          "target_label": "kubernetes_name",
          "replacement": "$1",
          "action": "replace"
        },
        {
          "source_labels": [
            "__meta_kubernetes_service_name"
          ],
          "separator": ";",
          "regex": "(.*)",
          "target_label": "livepeer_node_type",
          "replacement": "$1",
          "action": "replace"
        }
      ]
    }
  ]
}