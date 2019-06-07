const Influx = require('influx');
require('dotenv').config({ path:'./src/.env' })

const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  schemas: [{
      measurement: 'danmaku',
      tags: ['lid', 'uid'],
      fields: {
        content: Influx.FieldType.STRING
      }
    }, {
      measurement: 'watcher',
      tags: ['lid'],
      fields: {
        count: Influx.FieldType.INTEGER
      }
    },
    {
      measurement: 'status',
      tags: ['lid'],
      fields: {
        status: Influx.FieldType.INTEGER
      }
    },
    {
      measurement: 'title',
      tags: ['lid'],
      fields: {
        count: Influx.FieldType.STRING
      }
    },
    {
      measurement: 'gift',
      tags: ['lid'],
      fields: {
        uid: Influx.FieldType.INTEGER,
        giftId: Influx.FieldType.INTEGER,
        coinType: Influx.FieldType.INTEGER,
        totalCoin: Influx.FieldType.INTEGER
      }
    }
  ]
}

const db = new Influx.InfluxDB(config)

exports.recorder = {
  record(lid, uid, content) {
    db.writePoints([{
      measurement: 'danmaku',
      tags: {
        lid,
        uid
      },
      fields: {
        content
      }
    }]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
  },
  recordWatcher(lid, watcher) {
    db.writePoints([{
      measurement: 'watcher',
      tags: {
        lid
      },
      fields: {
        watcher
      }
    }]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
  },
  recordStatus(lid, status) {
    db.writePoints([{
      measurement: 'status',
      tags: {
        lid
      },
      fields: {
        status
      }
    }]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
  },
  recordTitle(lid, title) {
    if (title == undefined) return
    db.writePoints([{
      measurement: 'title',
      tags: {
        lid
      },
      fields: {
        title
      }
    }]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
  },
  recordGift(lid, uid, giftId, coinType, totalCoin) {
    db.writePoints([{
      measurement: 'gift',
      tags: {
        lid
      },
      fields: {
        uid, giftId, coinType, totalCoin
      }
    }]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
  }
}