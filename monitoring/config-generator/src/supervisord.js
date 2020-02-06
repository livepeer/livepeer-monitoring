'use strict'

const fs = require('fs')
const ini = require('js-ini')

function generate (params, defaults = '/etc/supervisor.d/supervisord.conf') {
  let obj = ini.parse(fs.readFileSync(defaults, 'utf-8'))

  console.log('ini obj: ', obj)

  // prometheus args
  if(params) {
    obj['program:prometheus'].command = `/bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=${ params.prometheusStoragePath || '/data/prometheus'} --web.route-prefix=${params.prometheusPrefix || '/'} --web.external-url=${params.prometheusExternalUrl || 'http://localhost:9090/prometheus'} --web.console.libraries=/usr/share/prometheus/console_libraries --web.console.templates=/usr/share/prometheus/consoles`
  }

  return ini.stringify(obj)
}

module.exports = { generate }