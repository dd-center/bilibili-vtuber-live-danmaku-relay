const http = require('http')
const fs = require('fs').promises

const Server = require('socket.io')
const LRU = require('lru-cache')

http.createServer(async (request, response) => {
  if (!Number.isNaN(Number(request.url.split('/')[1]))) {
    fs.readFile(`.${request.url}`)
      .then(buf => {
        response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        response.end(String(buf), 'utf-8')
      })
      .catch(() => {
        response.writeHead(404)
        response.end()
      })
  } else {
    response.writeHead(404)
    response.end()
  }
}).listen(8012)

module.exports = api => {
  const io = new Server(9002, { serveClient: false })
  let cache = new LRU({ max: 1000, maxAge: 1000 * 15 })
  io.on('connection', socket => {
    socket.on('rooms', async (data, arc) => {
      if (typeof arc === 'function') {
        let hit = cache.get('rooms')
        if (!hit) {
          hit = await api.rooms()
          cache.set('rooms', hit)
        }
        arc(hit)
      }
    })
    socket.on('records', async (data, arc) => {
      if (typeof arc === 'function') {
        let key = `records_${data[0]}`
        let hit = cache.get(key)
        if (!hit) {
          hit = await api.records(data[0])
          cache.set(key, hit)
        }
        arc(hit)
      }
    })
    socket.on('roomsRecords', async (data, arc) => {
      if (typeof arc === 'function') {
        let hit = cache.get('roomsRecords')
        if (!hit) {
          hit = await api.roomsRecords()
          cache.set('roomsRecords', hit)
        }
        arc(hit)
      }
    })
    socket.on('read', async (data, arc) => {
      if (typeof arc === 'function') {
        let key = `read_${data[0]}_${data[1]}_${data[2]}`
        let hit = cache.get(key)
        if (!hit) {
          hit = await api.read(data[0], data[1], data[2])
          cache.set(key, hit)
        }
        arc(hit)
      }
    })
  })
}

// const nodejieba = require('nodejieba')

// nodejieba.load({
//   userDict: 'dictionary/userdict.txt',
// })

// io.on('connection', socket => {
//   socket.on('wow', console.log)
// })
// ;
// (async () => {
//   let day = String(await fs.readFile('12235923/2019-5-11.txt'))
//     .split('\n')
//     .filter(w => !(w.includes('TIME') && w.includes('ONLINE') || w.includes('SPEAKERNUM')))
//     .join('\n')
//   nodejieba.extract(day, 250).forEach(w => console.log(`${w.word};${Math.round(w.weight)}`))
//   // nodejieba.extract(day, 100).forEach(w => console.log(w))
// })()


// (async () => {
//   let day = String(await fs.readFile('12235923/2019-5-11.txt'))
//     .split('\n')
//     .filter(w => !(w.includes('TIME') && w.includes('ONLINE') || w.includes('SPEAKERNUM')))
//     .join('\n')
//   let k = ''
//   nodejieba.extract(day, 250).forEach(w => {
//     for (let i = 0; i < Math.round(w.weight); i++) {
//       k += `${w.word} `
//     }
//     // console.log(`${w.word};${Math.round(w.weight)}`)
//   })
//   console.log(k)
//   // nodejieba.extract(day, 100).forEach(w => console.log(w))
// })()
