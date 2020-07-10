#!/usr/bin/env node

'use strict'

const fs = require('fs')
const path = require('path')
const YAML = require('yaml')
const yargs = require('yargs')
const supervisord = require('./supervisord')
const config = require('./config')

function generate() {
  const argv = yargs
    .usage(
      `
    Livepeer Monitoring Supercontainer

    Options my also be provided as LP_ prefixed environment variables, e.g. LP_MODE=standalone is the same as --mode=standalone.
    `
    )
    .env('LP_')
    .help()
    .exitProcess(false)
    .options({
      mode: {
        describe: 'environment in which to monitor livepeer containers',
        default: 'standalone',
        demandOption: true,
        type: 'string',
        choices: ['standalone', 'docker-compose', 'kubernetes']
      },
      nodes: {
        describe: "`--nodes`: a comma separated list of the livepeer nodes and their `cli` port we'd like to monitor, example: `--nodes=localhost:7935,localhost:7936`, this isn't required in the kubernetes deployments since discovery is done automatically using the `prometheus.io/scrape` labels.",
        type: 'string',
        default: 'localhost:7935'
      },
      'kube-namespaces': {
        describe: 'comma separated list of namespaces to monitoring in the `kubernetes` deployment, this is needed for certain special deployments, it defaults to an empty array.',
        type: 'string'
      },
      'kube-longterm': {
        describe: 'enables longterm storage via PostgreSQL, note that the pg_prometheus, and the postgresql adapter are not included in this bundle',
        type: 'boolean'
      },
      'prometheus-storagePath': {
        describe: 'the path to the TSDB folder',
        default: '/data/promtheus',
        type: 'string'
      },
      'prometheus-prefix': {
        describe: 'useful for running prometheus GUI as a subpath , example: /prometheus',
        default: '/',
        type: 'string'
      },
      'prometheus-externalUrl': {
        describe: 'external URL for the promtheus service',
        default: 'http://localhost:9090',
        type: 'string'
      },
      'prometheus-kube-scrape': {
        describe: 'annotation for scraping Kubernetes pods',
        default: 'scrape',
        type: 'string'
      },
      'cadvisor-port': {
        describe: '[docker compose mode only] the port defined for cadvisor',
        default: 8080,
        type: 'number'
      },
      'kube-cadvisor': {
        describe: 'enables kubernetes-cadvisor prometheus job',
        type: 'boolean'
      },
      'node-exporter-port': {
        describe: '[docker compose mode only] the port defined for node-exporter',
        default: 9100,
        type: 'number'
      },
      'pagerduty-service-key': {
        descibe: 'pagerduty service key for alertmanager to send alerts',
        default: '',
        type: 'string'
      }
    }).argv

  if (argv.help || argv.version) {
    process.exit(1)
  }

  console.log(argv)

  const promConfig = prometheusConfig(argv)
  console.log('prom JSON: ', JSON.stringify(promConfig))
  const supervisordConfig = supervisord.generate(argv)
  saveYaml('/etc/prometheus', 'alertmanager.yml', getAlertManagerConfig(argv))
  saveYaml('/etc/prometheus', 'rules.yml', getRules())
  saveYaml('/etc/prometheus', 'prometheus.yml', promConfig)
  fs.writeFileSync(
    path.join('/etc/supervisor.d', 'supervisord.conf'),
    supervisordConfig
  )
}

function saveYaml(outputFolder, name, content) {
  // console.log(`===== saving ${name} into ${outputFolder}`)
  // console.log(content)
  fs.writeFileSync(path.join(outputFolder, name), YAML.stringify(content))
}

generate()

function prometheusConfig(params) {
  let obj = {
    global: {
      scrape_interval: '5s',
      scrape_timeout: '5s',
      evaluation_interval: '5s'
    },
    scrape_configs: [],
    rule_files: ['rules.yml'],
    alerting: {
      alertmanagers: [{
        static_configs: [{
          targets: ['localhost:9093']
        }]
      }]
    }
  }

  if (params && params.mode) {
    switch (params.mode) {
      case 'standalone':
        obj.scrape_configs.push({
          job_name: 'livepeer-nodes',
          static_configs: [{
            targets: params.nodes.split(',')
          }]
        })
        break
      case 'docker-compose':
        obj.scrape_configs.push({
          job_name: 'livepeer-nodes',
          static_configs: [{
            targets: params.nodes.split(',')
          }]
        })

        if (params.cadvisorPort) {
          obj.scrape_configs.push({
            job_name: 'cadvisor',
            dns_sd_configs: [{
              names: ['tasks.cadvisor'],
              type: 'A',
              port: params.cadvisorPort
            }]
          })
        }

        if (params.nodeExporterPort) {
          obj.scrape_configs.push({
            job_name: 'node-exporter',
            dns_sd_configs: [{
              names: ['tasks.node-exporter'],
              type: 'A',
              port: params.nodeExporterPort
            }]
          })
        }

        break
      case 'kubernetes':
        const namespaces = params.kubeNamespaces ?
          params.kubeNamespaces.split(',') :
          null
        obj.scrape_configs = getPromKubeJobs(
          namespaces,
          params.prometheusKubeScrape
        )
        if (params.kubeLongterm) {
          obj['remote_read'] = [{
            url: 'http://localhost:9201/read',
            remote_timeout: '30s'
          }]

          obj['remote_write'] = [{
            url: 'http://localhost:9201/write',
            remote_timeout: '30s'
          }]
        }

        if (params.kubeCadvisor) {
          obj.scrape_configs.push({
            job_name: 'kubernetes-cadvisor',
            scheme: 'https',
            kubernetes_sd_configs: [{
              api_server: null,
              role: 'node',
              namespaces: {
                names: namespaces
              },
              bearer_token_file: '/var/run/secrets/kubernetes.io/serviceaccount/token',
              tls_config: {
                ca_file: '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
                insecure_skip_verify: false
              },
              relabel_configs: [{
                  separator: ';',
                  regex: '__meta_kubernetes_node_label_(.+)',
                  replacement: '$1',
                  action: 'labelmap'
                },
                {
                  separator: ';',
                  regex: '(.*)',
                  target_label: '__address__',
                  replacement: 'kubernetes.default.svc:443',
                  action: 'replace'
                },
                {
                  source_labels: '[__meta_kubernetes_node_name]',
                  separator: ';',
                  regex: '(.+)',
                  target_label: '__metrics_path__',
                  replacement: '/api/v1/nodes/${1}/proxy/metrics/cadvisor',
                  action: 'replace'
                }
              ]
            }]
          })
        }

        break
      default:
        throw new Error(
          `mode ${params.mode} does not have a defined prometheus.yml config`
        )
        break
    }
  } else {}

  return obj
}

function getPromKubeJobs(namespaces, promKubeScrape) {
  return [{
      job_name: 'kubernetes-apiservers',
      scrape_interval: '5s',
      scrape_timeout: '5s',
      metrics_path: '/metrics',
      scheme: 'https',
      kubernetes_sd_configs: [{
        api_server: null,
        role: 'endpoints',
        namespaces: {
          names: namespaces
        }
      }],
      bearer_token_file: '/var/run/secrets/kubernetes.io/serviceaccount/token',
      tls_config: {
        ca_file: '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
        insecure_skip_verify: false
      },
      relabel_configs: [{
        source_labels: [
          '__meta_kubernetes_namespace',
          '__meta_kubernetes_service_name',
          '__meta_kubernetes_endpoint_port_name'
        ],
        separator: ';',
        regex: 'default;kubernetes;https',
        replacement: '$1',
        action: 'keep'
      }]
    },
    {
      job_name: 'kubernetes-nodes',
      scrape_interval: '5s',
      scrape_timeout: '5s',
      metrics_path: '/metrics',
      scheme: 'https',
      kubernetes_sd_configs: [{
        api_server: null,
        role: 'node',
        namespaces: {
          names: namespaces
        }
      }],
      bearer_token_file: '/var/run/secrets/kubernetes.io/serviceaccount/token',
      tls_config: {
        ca_file: '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
        insecure_skip_verify: false
      },
      relabel_configs: [{
          separator: ';',
          regex: '__meta_kubernetes_node_label_(.+)',
          replacement: '$1',
          action: 'labelmap'
        },
        {
          separator: ';',
          regex: '(.*)',
          target_label: '__address__',
          replacement: 'kubernetes.default.svc:443',
          action: 'replace'
        },
        {
          source_labels: ['__meta_kubernetes_node_name'],
          separator: ';',
          regex: '(.+)',
          target_label: '__metrics_path__',
          replacement: '/api/v1/nodes/${1}/proxy/metrics',
          action: 'replace'
        }
      ]
    },
    {
      job_name: 'kubernetes-pods',
      scrape_interval: '5s',
      scrape_timeout: '5s',
      metrics_path: '/metrics',
      scheme: 'http',
      kubernetes_sd_configs: [{
        api_server: null,
        role: 'pod',
        namespaces: {
          names: namespaces
        }
      }],
      relabel_configs: [{
          source_labels: [
            `__meta_kubernetes_pod_annotation_prometheus_io_${promKubeScrape}`
          ],
          separator: ';',
          regex: 'true',
          replacement: '$1',
          action: 'keep'
        },
        {
          source_labels: [
            '__meta_kubernetes_pod_annotation_prometheus_io_path'
          ],
          separator: ';',
          regex: '(.+)',
          target_label: '__metrics_path__',
          replacement: '$1',
          action: 'replace'
        },
        {
          source_labels: [
            '__address__',
            '__meta_kubernetes_pod_annotation_prometheus_io_port'
          ],
          separator: ';',
          regex: '([^:]+)(?::\\d+)?;(\\d+)',
          target_label: '__address__',
          replacement: '$1:$2',
          action: 'replace'
        },
        {
          separator: ';',
          regex: '__meta_kubernetes_pod_label_(.+)',
          replacement: '$1',
          action: 'labelmap'
        },
        {
          source_labels: ['__meta_kubernetes_namespace'],
          separator: ';',
          regex: '(.*)',
          target_label: 'kubernetes_namespace',
          replacement: '$1',
          action: 'replace'
        },
        {
          source_labels: ['__meta_kubernetes_pod_name'],
          separator: ';',
          regex: '(.*)',
          target_label: 'kubernetes_pod_name',
          replacement: '$1',
          action: 'replace'
        }
      ]
    },
    {
      job_name: 'kubernetes-cadvisor',
      scrape_interval: '5s',
      scrape_timeout: '5s',
      metrics_path: '/metrics',
      scheme: 'https',
      kubernetes_sd_configs: [{
        api_server: null,
        role: 'node',
        namespaces: {
          names: namespaces
        }
      }],
      bearer_token_file: '/var/run/secrets/kubernetes.io/serviceaccount/token',
      tls_config: {
        ca_file: '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
        insecure_skip_verify: false
      },
      relabel_configs: [{
          separator: ';',
          regex: '__meta_kubernetes_node_label_(.+)',
          replacement: '$1',
          action: 'labelmap'
        },
        {
          separator: ';',
          regex: '(.*)',
          target_label: '__address__',
          replacement: 'kubernetes.default.svc:443',
          action: 'replace'
        },
        {
          source_labels: ['__meta_kubernetes_node_name'],
          separator: ';',
          regex: '(.+)',
          target_label: '__metrics_path__',
          replacement: '/api/v1/nodes/${1}/proxy/metrics/cadvisor',
          action: 'replace'
        }
      ]
    },
    {
      job_name: 'kubernetes-service-endpoints',
      scrape_interval: '5s',
      scrape_timeout: '5s',
      metrics_path: '/metrics',
      scheme: 'http',
      kubernetes_sd_configs: [{
        api_server: null,
        role: 'endpoints',
        namespaces: {
          names: namespaces
        }
      }],
      relabel_configs: [{
          source_labels: [
            `__meta_kubernetes_service_annotation_prometheus_io_${promKubeScrape}`
          ],
          separator: ';',
          regex: 'true',
          replacement: '$1',
          action: 'keep'
        },
        {
          source_labels: [
            '__meta_kubernetes_service_annotation_prometheus_io_scheme'
          ],
          separator: ';',
          regex: '(https?)',
          target_label: '__scheme__',
          replacement: '$1',
          action: 'replace'
        },
        {
          source_labels: [
            '__meta_kubernetes_service_annotation_prometheus_io_path'
          ],
          separator: ';',
          regex: '(.+)',
          target_label: '__metrics_path__',
          replacement: '$1',
          action: 'replace'
        },
        {
          source_labels: [
            '__address__',
            '__meta_kubernetes_service_annotation_prometheus_io_port'
          ],
          separator: ';',
          regex: '([^:]+)(?::\\d+)?;(\\d+)',
          target_label: '__address__',
          replacement: '$1:$2',
          action: 'replace'
        },
        {
          separator: ';',
          regex: '__meta_kubernetes_service_label_(.+)',
          replacement: '$1',
          action: 'labelmap'
        },
        {
          source_labels: ['__meta_kubernetes_namespace'],
          separator: ';',
          regex: '(.*)',
          target_label: 'kubernetes_namespace',
          replacement: '$1',
          action: 'replace'
        },
        {
          source_labels: ['__meta_kubernetes_service_name'],
          separator: ';',
          regex: '(.*)',
          target_label: 'kubernetes_name',
          replacement: '$1',
          action: 'replace'
        },
        {
          source_labels: ['__meta_kubernetes_service_name'],
          separator: ';',
          regex: '(.*)',
          target_label: 'livepeer_node_type',
          replacement: '$1',
          action: 'replace'
        }
      ]
    }
  ]
}

function getAlertManagerConfig(params) {
  // global configuration
  let global = {}

  // The root route on which each incoming alert enters.
  let route = {
    group_by: ['alertname'],
    group_wait: '2m',
    group_interval: '30m',
    // primary receiver
    receiver: 'pagerduty',
    // child routes
    // can be used to send different severity notifications to different receivers
    routes: []
  }

  let receivers = []

  // Inhibition rules allow to mute a set of alerts given that another alert is firing
  let inhibit_rules = []

  inhibit_rules.push({
    source_match: {
      serverity: 'high'
    },
    target_match: {
      severity: 'page'
    },
    equal: ['instance']
  }, {
    source_match: {
      severity: 'critical'
    },
    target_match: {
      severity: 'page'
    },
    equal: ['instance']
  }, {
    source_match: {
      severity: 'critical'
    },
    target_match: {
      severity: 'high'
    },
    equal: ['instance']
  })

  // Add receiver configs
  if (params && params['pagerduty-service-key']) {
    global['pagerduty_url'] = config.PAGERDUTY_URL
    receivers.push({
      name: 'pagerduty',
      pagerduty_configs: [{
        service_key: params['pagerduty-service-key']
      }]
    })
  } else {
    return {}
  }

  return {
    global,
    route,
    inhibit_rules,
    receivers
  }
}

function getRules() {
  let groups = []

  let broadcastingFunds = {
    name: 'broadcasting-funds',
    rules: [{
        alert: 'deposit-low',
        expr: 'livepeer_broadcaster_deposit < 200000000',
        for: '1m',
        annotations: {
          title: 'Broadcasting deposit below 0.2 ETH',
          description: 'The current broadcasting deposit has fallen below 0.2 ETH'
        },
        labels: {
          severity: 'page'
        }
      },
      {
        alert: 'deposit-very-low',
        expr: 'livepeer_broadcaster_deposit < 50000000',
        for: '1m',
        annotations: {
          title: 'Broadcasting deposit below 0.05 ETH',
          description: 'The deposit is critically low and is now below 0.5 ETH, replenish your balance or your reserve will be used soon'
        },
        labels: {
          severity: 'high'
        }
      },
      {
        alert: 'reserve-used',
        expr: 'livepeer_broadcaster_reserve < livepeer_broadcaster_reserve offset 1m',
        for: '1m',
        annotations: {
          title: 'Broadcasting reserve has been used',
          description: 'Deposit has been depleted, winning tickets are now being redeemed from your reserve. Replenish your broadcasting funds if you wish to continue transcoding'
        },
        labels: {
          severity: 'critical'
        }
      }
    ]
  }

  groups.push(broadcastingFunds)

  return {
    groups
  }
}