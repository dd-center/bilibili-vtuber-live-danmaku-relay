const writer = require("./rec.js").recorder

const io = require('socket.io-client')
const socket = io('http://0.0.0.0:8001')

const LiveWS = require('bilibili-live-ws')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

let rooms = {}

const request = require('request-promise')
async function getLiveInfo(roomid) {
  res = await request({
    url: "https://live.bilibili.com/" + roomid,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
      //'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8,en;q=0.7'
    },
  }).catch((exc) => {
    console.error(exc)
  })
  startMark = 'window.__NEPTUNE_IS_MY_WAIFU__='
  pos = res.lastIndexOf(startMark) + startMark.length
  if (pos >= res.length)
    throw (new Error("bad response content:" + res))
  endpos = res.indexOf("</script>", pos)
  //console.log(body.substring(pos, endpos))
  content = JSON.parse(res.substring(pos, endpos))
  return {
    status: content.roomInitRes.data.live_status,
    title: content.baseInfoRes.data.title
  }
}

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
  /*getLiveInfo(roomid).then((initinfo) => {
    writer.recordStatus(roomid, initinfo.status, false)
    writer.recordTitle(roomid, initinfo.title)
  })*/
  ws.on('DANMU_MSG', async ({ info }) => {
    if (!info[0][9]) {
      let message = info[1]
      if (!message.includes('TIME') || !message.includes('ONLINE')) {
        let mid = info[2][0]
        let timestamp = info[0][4]
        writer.record(roomid, mid, message)
      }
    }
  })
  ws.on('heartbeat', async online => {
    writer.recordWatcher(roomid, online)
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
  ws.on('LIVE', async () => {
    writer.recordStatus(roomid, 1, true)
  })
  ws.on('PREPARING', async () => {
    writer.recordStatus(roomid, 0, true)
    info = getLiveInfo(roomid)
    writer.recordTitle(roomid, info.title)
  })
  ws.on('ROUND', async () => {
    writer.recordStatus(roomid, 2, true)
    info = getLiveInfo(roomid)
    writer.recordTitle(roomid, info.title)
  })
  ws.on('SEND_GIFT', async (payload) => {
    let coinType = payload.data.coin_type == 'silver' ? 0 : 1
    writer.recordGift(roomid, payload.data.uid, payload.data.giftId, coinType, payload.data.total_coin)
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
  info.map(({ roomid }) => roomid)
    .filter(roomid => roomid)
    .forEach(async roomid => {
      if (!rooms[roomid]) {
        rooms[roomid] = true
        watch(roomid)
      }
    })
  console.log('REFRESH')
})
