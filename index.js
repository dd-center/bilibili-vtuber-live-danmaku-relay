const io = require('socket.io-client')
const socket = io('http://0.0.0.0:8001')
// dev use next line, comment out above
// const socket = io('https://api.vtbs.moe')

const Server = require('socket.io')
const dispatch = new Server(9003, { serveClient: false })

const { KeepLiveWS } = require('bilibili-live-ws')
const { getConf: getConfW } = require('bilibili-live-ws/extra')
const no = require('./env')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const rooms = new Set()

const waiting = []

const processWaiting = async () => {
  console.log('processWaiting')
  while (waiting.length) {
    while (opened.size - lived.size > 8) {
      await wait(1000)
    }
    await wait(1800)
    const { f, resolve, roomid } = waiting.shift()
    f().then(resolve).catch(() => {
      console.error('redo', roomid)
      waiting.push({ f, resolve, roomid })
      if (waiting.length === 1) {
        processWaiting()
      }
    })
  }
}

const getConf = roomid => {
  const p = new Promise(resolve => {
    waiting.push({ resolve, f: () => getConfW(roomid), roomid })
  })
  if (waiting.length === 1) {
    processWaiting()
  }
  return p
}

const opened = new Set()
const lived = new Set()
const printStatus = () => {
  console.log(`living/opening: ${lived.size}/${opened.size}`)
}

const openRoom = async ({ roomid, mid }) => {
  const { address, key } = await getConf(roomid)
  console.log(`OPEN: ${roomid}`)
  opened.add(roomid)
  printStatus()
  const live = new KeepLiveWS(roomid, { address, key })
  live.on('live', () => {
    console.log(`LIVE: ${roomid}`)
    lived.add(roomid)
    printStatus()
  })
  live.on('LIVE', () => dispatch.emit('LIVE', { roomid, mid }))
  live.on('PREPARING', () => dispatch.emit('PREPARING', { roomid, mid }))
  live.on('ROUND', () => dispatch.emit('ROUND', { roomid, mid }))
  live.on('heartbeat', online => dispatch.emit('online', { roomid, mid, online }))
  live.on('ROOM_CHANGE', ({ data: { title } }) => dispatch.emit('title', { roomid, mid, title }))
  live.on('DANMU_MSG', async ({ info }) => {
    if (!info[0][9]) {
      const message = info[1]
      const mid = info[2][0]
      const uname = info[2][1]
      const timestamp = info[0][4]
      dispatch.emit('danmaku', { message, roomid, mid, uname, timestamp })
    }
  })
  live.on('SEND_GIFT', payload => {
    const coinType = payload.data.coin_type
    const mid = payload.data.uid
    const giftId = payload.data.giftId
    const totalCoin = payload.data.total_coin
    const uname = payload.data.uname
    dispatch.emit('gift', { roomid, mid, giftId, totalCoin, coinType, uname })
  })
  live.on('GUARD_BUY', payload => {
    const mid = payload.data.uid
    const uname = payload.data.username
    const num = payload.data.num
    const price = payload.data.price
    const giftId = payload.data.gift_id
    const level = payload.data.guard_level
    dispatch.emit('guard', { roomid, mid, uname, num, price, giftId, level })
  })
  live.on('error', () => {
    console.log(`ERROR: ${roomid}`)
    lived.delete(roomid)
    printStatus()
  })
  live.on('close', async () => {
    console.log(`CLOSE: ${roomid}`)
    lived.delete(roomid)
    printStatus()
    const { address, key } = await getConf(roomid)
    live.params[1] = { key, address }
  })
}

const watch = ({ roomid, mid }) => {
  if (!rooms.has(roomid)) {
    rooms.add(roomid)
    console.log(`WATCH: ${roomid}`)
    openRoom({ roomid, mid })
  }
}

socket.on('info', async info => {
  info
    .filter(({ roomid }) => roomid)
    .filter(({ roomid }) => !no.includes(roomid))
    .forEach(({ roomid, mid }) => watch({ roomid, mid }))
  console.log('REFRESH')
})
