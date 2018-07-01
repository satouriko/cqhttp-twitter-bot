"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CQWebsocket = require("cq-websocket");
const log4js = require("log4js");
const helper_1 = require("./helper");
const logger = log4js.getLogger('cq-websocket');
logger.level = 'info';
class default_1 {
    constructor(opt) {
        this.retryInterval = 1000;
        this.connect = () => {
            logger.warn('connecting to websocket...');
            this.bot.connect();
        };
        this.reconnect = () => {
            this.retryInterval *= 2;
            if (this.retryInterval > 300000)
                this.retryInterval = 300000;
            logger.info(`retrying in ${this.retryInterval / 1000}s...`);
            setTimeout(() => {
                logger.warn('reconnecting to websocket...');
                this.connect();
            }, this.retryInterval);
        };
        logger.info(`init cqwebsocket for ${opt.host}:${opt.port}, with access_token ${opt.access_token}`);
        this.bot = new CQWebsocket({
            access_token: opt.access_token,
            enableAPI: true,
            enableEvent: true,
            host: opt.host,
            port: opt.port,
        });
        this.bot.on('socket.connect', () => {
            logger.info('websocket connected');
            this.retryInterval = 1000;
        });
        this.bot.on('socket.close', () => {
            logger.error('websocket closed');
            this.reconnect();
        });
        this.bot.on('socket.error', () => {
            logger.error('websocket connect error');
            this.reconnect();
        });
        this.bot.on('message', (e, context) => {
            e.cancel();
            const chat = {
                chatType: context.message_type,
                chatID: 0,
            };
            switch (context.message_type) {
                case ChatType.Private:
                    chat.chatID = context.user_id;
                    break;
                case ChatType.Group:
                    chat.chatID = context.group_id;
                    break;
                case ChatType.Discuss:
                    chat.chatID = context.discuss_id;
            }
            const cmdObj = helper_1.default(context.raw_message);
            switch (cmdObj.cmd) {
                case 'twitter_sub':
                case 'twitter_subscribe':
                    return opt.sub(chat, cmdObj.args);
                case 'twitter_unsub':
                case 'twitter_unsubscribe':
                    return opt.unsub(chat, cmdObj.args);
                case 'ping':
                case 'twitter':
                    return opt.list(chat, cmdObj.args);
                case 'help':
                    return `推特搬运机器人：
/twitter - 查询当前聊天中的订阅
/twitter_subscribe [链接] - 订阅 Twitter 搬运
/twitter_unsubscribe [链接] - 退订 Twitter 搬运`;
            }
        });
    }
}
exports.default = default_1;
