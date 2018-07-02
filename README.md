# CQHTTP Twitter Bot

[![npm](https://img.shields.io/npm/v/cqhttp-twitter-bot.svg)](https://www.npmjs.com/package/cqhttp-twitter-bot)
[![npm](https://img.shields.io/npm/dt/cqhttp-twitter-bot.svg)](https://www.npmjs.com/package/cqhttp-twitter-bot)
[![GitHub issues](https://img.shields.io/github/issues/rikakomoe/cqhttp-twitter-bot.svg)](https://github.com/rikakomoe/cqhttp-twitter-bot/issues)
[![npm](https://img.shields.io/npm/l/cqhttp-twitter-bot.svg)](https://www.npmjs.com/package/cqhttp-twitter-bot)

是一个可以订阅 Twitter 并转发到 QQ 的 Bot。

## 安装

```bash
npm i -g cqhttp-twitter-bot
```

当然还需要配合 [coolq-http-api](https://github.com/richardchien/coolq-http-api) 和 [酷Q](https://cqp.cc/) 才能工作。  
它们是什么？  
观察它们的文档：[https://cqhttp.cc/](https://cqhttp.cc/) [https://cqp.cc/t/15124](https://cqp.cc/t/15124)

## 食用

```bash
$ cqhttp-twitter-bot config.json
```

## 配置

它会从命令传入的 JSON 配置文件里读取配置，配置说明如下

| 配置项 | 说明 | 默认 |
| --- | --- | --- |
| cq_ws_host | CQHTTP Websocket 服务端地址 | 127.0.0.1 |
| cq_ws_port | CQHTTP Websocket 服务端口 | 6700 |
| cq_access_token | CQHTTP access_token | （空） |
| twitter_consumer_key | Twitter App consumer_key | （必填） |
| twitter_consumer_secret |  Twitter App consumer_secret | （必填） |
| twitter_access_token_key | Twitter App access_token_key | （必填） |
| twitter_access_token_secret | Twitter App access_token_secret | （必填） |
| work_interval | 对单个订阅两次拉取更新的最少间隔时间（秒） | 60 |
| webshot_delay | 抓取网页截图时等待网页加载的延迟时长（毫秒） | 5000 |
| lockfile | 本地保存订阅信息以便下次启动时恢复 | subscriber.lock |
| loglevel | 日志调试等级 | info |

示例文件在 `config.example.json`

## 命令

Bot 启动了以后就可以在 QQ 里用命令了。命令有：

- /twitter - 列出当前会话的订阅
- /twitter_subscribe [链接] - 订阅
- /twitter_unsubscribe [链接] - 退订

链接可以是一个个人的时间轴或者是列表， 例如：

个人：https://twitter.com/Saito_Shuka  
列表：https://twitter.com/rikakomoe/lists/lovelive

必须是这个模式才行 qvq

## 其他说明

1. Twitter 这两个（时间轴和列表） API 对单个应用的限制是 900次/15min，
也就是最快可以 1s 一次。这个 Bot 的工作方式是轮流拉取，即：
每次从队首拿出任务，完成后放到队尾。在不达到 1s 一次的前提下，
总体请求速度会随着订阅量的增加而加快：例如当 work_interval 设置为 60 时，
如果只有 1 个订阅，那么每分钟只有 1 个请求。如果有 2 个订阅，每分钟则有 2 个请求。
如果有 70 个订阅，每分钟仍然只有 60 个请求。

2. 上面说的每分钟之类指的是休眠的时长，工作时间不算在内。因此实际的 API 调用
频率要比这个低。

3. webshot_delay 如果设成 0 的话肯定不行的，会出现正在加载的界面。这个具体多
少最合适可以自己试，5 秒应该是比较保险了。

4. 如果在同一个聊天里的会话有重复，不会被去重。例如在某聊天中同时订阅了特朗普和
包含特朗普的列表 A，那么每次特朗普发推你都会收到两条一样的推送。这个是因为 API 的构造
本身决定的，要是给你去重的话还得存给你推过哪些，很麻烦，懒得做，意义不大，就注意不要
这样就好了。

5. 列表中是没有回复的。实际上你看 Twitter 的列表本来也没有回复。个人的时间轴会显示
回复。

