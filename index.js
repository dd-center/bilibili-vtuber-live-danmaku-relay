const io = require('socket.io-client')
const socket = io('http://0.0.0.0:8001')

const Server = require('socket.io')
const dispatch = new Server(9003, { serveClient: false })

const { KeepLiveWS } = require('bilibili-live-ws')
const no = require('./env')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const rooms = new Set()

const openRoom = ({ roomid, mid }) => {
  console.log(`OPEN: ${roomid}`)
  const live = new KeepLiveWS(roomid)
  live.once('live', () => console.log(`LIVE: ${roomid}`))
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
  live.on('error', e => {
    console.log(`ERROR: ${roomid}`, e)
  })
}

const watch = async ({ roomid, mid }) => {
  if (!rooms.has(roomid)) {
    rooms.add(roomid)
    console.log(`WATCH: ${roomid}`)
    while (true) {
      await openRoom({ roomid, mid })
      console.log(`CLOSE: ${roomid}`)
      await wait(50)
      console.log(`REOPEN: ${roomid}`)
    }
  }
}

socket.on('info', async info => {
  info
    .filter(({ roomid }) => roomid)
    .filter(({ roomid }) => !no.includes(roomid))
    .forEach(({ roomid, mid }) => watch({ roomid, mid }))
  console.log('REFRESH')
})
