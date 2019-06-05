const fs = require('fs').promises

const io = require('socket.io-client')
const socket = io('http://0.0.0.0:8001')

const Server = require('socket.io')
const dispatch = new Server(9003, { serveClient: false })

const LiveWS = require('bilibili-live-ws')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

let rooms = {}

const openRoom = ({ roomid, speakers = {}, currentFilename = undefined }) => new Promise(resolve => {
  console.log(`OPEN: ${roomid}`)
  let ws = new LiveWS(roomid)
  rooms[roomid] = ws
  let lastTime = ''
  let lastHeartbeat = 0
  let autorestart = setTimeout(() => {
    console.log(`AUTORESTART: ${roomid}`)
    ws.close()
    resolve({ roomid, speakers, currentFilename })
  }, 1000 * 60 * 60 * 18)
  let timeout = setTimeout(() => {
    if (new Date().getTime() - lastHeartbeat > 1000 * 30) {
      console.log(`TIMEOUT: ${roomid}`)
      ws.close()
      clearTimeout(autorestart)
      clearTimeout(timeout)
      resolve({ roomid, speakers, currentFilename })
    }
  }, 1000 * 45)
  // let storm = []
  ws.once('live', () => {
    console.log(`READY: ${roomid}`)
  })
  ws.on('DANMU_MSG:4:0:2:2:2:0', async ({ info }) => {
    if (!info[0][9]) {
      let message = info[1]
      if (!message.includes('TIME') || !message.includes('ONLINE')) {
        let mid = info[2][0]
        let uname = info[2][1]
        let date = new Date()
        let filename = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}.txt`
        let time = `${date.getHours()}:${date.getMinutes()}`
        if (!currentFilename) {
          currentFilename = filename
        }
        if (currentFilename !== filename) {
          let speakerNum = Object.keys(speakers).length
          let lastFIleName = currentFilename
          currentFilename = filename
          if (speakerNum) {
            let allSpeaker = Object.keys(speakers)
              .map(key => `${key}:${speakers[key].uname}:${speakers[key].count}`)
              .join(',')
            speakers = {}
            await fs.appendFile(`${roomid}/${lastFIleName}`, `SPEAKERNUM${speakerNum};${allSpeaker}\nV1\n`)
          }
        }
        if (!speakers[mid]) {
          speakers[mid] = { count: 0, uname }
        }
        speakers[mid].count++
        if (lastTime !== time) {
          lastTime = time
          await fs.appendFile(`${roomid}/${filename}`, `TIME${lastTime}ONLINE${ws.online}\n`)
        }
        dispatch.emit('danmaku', { message, roomid, mid })
        await fs.appendFile(`${roomid}/${filename}`, `${mid}:${message}\n`)
      }
    }
  })
  ws.on('heartbeat', async () => {
    let date = new Date()
    let filename = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}.txt`
    if (!currentFilename) {
      currentFilename = filename
    }
    if (currentFilename !== filename) {
      let speakerNum = Object.keys(speakers).length
      let lastFIleName = currentFilename
      currentFilename = filename
      if (speakerNum) {
        let allSpeaker = Object.keys(speakers)
          .map(key => `${key}:${speakers[key].uname}:${speakers[key].count}`)
          .join(',')
        speakers = {}
        await fs.appendFile(`${roomid}/${lastFIleName}`, `SPEAKERNUM${speakerNum};${allSpeaker}\nV1\n`)
      }
    }
  })
  ws.on('heartbeat', async online => {
    if (online > 1) {
      let date = new Date()
      let time = `${date.getHours()}:${date.getMinutes()}`
      let filename = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}.txt`
      if (lastTime !== time) {
        lastTime = time
        await fs.appendFile(`${roomid}/${filename}`, `TIME${lastTime}ONLINE${online}\n`)
      }
    }
  })
  ws.on('heartbeat', () => {
    lastHeartbeat = new Date().getTime()
    timeout = setTimeout(() => {
      if (new Date().getTime() - lastHeartbeat > 1000 * 30) {
        console.log(`TIMEOUT: ${roomid}`)
        ws.close()
        clearTimeout(autorestart)
        clearTimeout(timeout)
        resolve({ roomid, speakers, currentFilename })
      }
    }, 1000 * 45)
  })
  ws.on('close', async () => {
    console.log(`CLOSE: ${roomid}`)
    clearTimeout(autorestart)
    clearTimeout(timeout)
    resolve({ roomid, speakers, currentFilename })
  })
  ws.on('error', async () => {
    console.log(`ERROR: ${roomid}`)
    ws.close()
    clearTimeout(autorestart)
    clearTimeout(timeout)
    resolve({ roomid, speakers, currentFilename })
  })
})

const watch = async roomid => {
  let object = { roomid }
  for (;;) {
    object = await openRoom(object)
    await wait(250)
    console.log(`REOPEN: ${roomid}`)
  }
}

socket.on('info', async info => {
  let folders = await fs.readdir('.')
  info.map(({ roomid }) => roomid)
    .filter(roomid => roomid)
    .forEach(async roomid => {
      if (!rooms[roomid]) {
        rooms[roomid] = true
        if (!folders.includes(String(roomid))) {
          await fs.mkdir(String(roomid))
        }
        watch(roomid)
      }
    })
  console.log('REFRESH')
})
