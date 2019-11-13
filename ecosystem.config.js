module.exports = {
  apps: [{
    name: 'vd-relay',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false
  }]
}
