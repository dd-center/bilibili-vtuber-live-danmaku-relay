# bilibili-vtuber-live-danmaku-relay
哔哩哔哩直播事件转发程序

艺能:

* Socket.io 监听本地8001端口

  * 根据传来的`info`打开对应的Bilibili直播间wss连接
  * 如果想要在本地跑且不想打开`api.vtbs.moe`, 可以把 https://github.com/bilibili-dd-center/bilibili-vtuber-live-danmaku-relay/blob/master/index.js#L2 的 `http://0.0.0.0:8001` 改成`https://api.vtbs.moe`

* Socket.io 打开9003端口, 转发以下事件

  * `LIVE`: 开播

    `{ roomid, mid }`

    * roomid: 房间号
    * mid: 主播数字ID

  * `PREPARING`: 下播

    `{ roomid, mid }`

    * 同上

  * `ROUND`: 轮播

    `{ roomid, mid }`

    - 同上

  * `online`: 人气刷新

    `{ roomid, mid, online }`

    - 同上
    - online: 人气值

  * `title`: 直播标题改变

    `{ roomid, mid, title}`

    * 同上
    * title: 新标题
  
  * `danmaku`: 弹幕

    `{ message, roomid, mid, uname }`

    * 同上
  * message: 弹幕消息
    * uname: 发送者昵称
    
  * `gift`: 礼物
  
    `{ roomid, mid, giftId, totalCoin, coinType, uname }`
  
  * 同上
    * mid: 发送者数字ID
  * uname: 发送者昵称
    * giftId: 礼物ID
  * totalCoin
    * coinType: 金币还是银币呢→_→?
  
  * `guard`: 新舰长
  
    `{ roomid, mid, uname, num, price, giftId, level }`
  
    * 同上
    * mid: 新舰长数字id
    * uname: 昵称
    * num: 数量
    * price: 价格 (如198000)
    * giftId: 礼物ID
    * level: 舰长/提督/总督 应该是(3/2/1)
    
## Deploy Using Docker

Run using:

`docker run -d -p 2151:8001 -p 2152:9003 afanyiyu/bilibili-vtuber-live-danmaku-relay`

Internal build using:

`docker build -t dd-center/bilibili-vtuber-live-danmaku-relay github.com/dd-center/bilibili-vtuber-live-danmaku-relay`
