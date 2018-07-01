import * as CQWebsocket from 'cq-websocket';
import * as log4js from 'log4js';

import command from './helper';

const logger = log4js.getLogger('cq-websocket');
logger.level = 'info';

interface IQQProps {
  access_token: string;
  host: string;
  port: number;
  list(chat: IChat, args: string[]): string;
  sub(chat: IChat, args: string[]): string;
  unsub(chat: IChat, args: string[]): string;
}

export default class {

  private botInfo: IQQProps;
  public bot: CQWebsocket;
  private retryInterval = 1000;

  private initWebsocket = () => {
    this.bot = new CQWebsocket({
      access_token: this.botInfo.access_token,
      enableAPI: true,
      enableEvent: true,
      host: this.botInfo.host,
      port: this.botInfo.port,
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
      const chat: IChat = {
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
      const cmdObj = command(context.raw_message);
      switch (cmdObj.cmd) {
        case 'twitter_sub':
        case 'twitter_subscribe':
          return this.botInfo.sub(chat, cmdObj.args);
        case 'twitter_unsub':
        case 'twitter_unsubscribe':
          return this.botInfo.unsub(chat, cmdObj.args);
        case 'ping':
        case 'twitter':
          return this.botInfo.list(chat, cmdObj.args);
        case 'help':
          return `推特搬运机器人：
/twitter - 查询当前聊天中的订阅
/twitter_subscribe [链接] - 订阅 Twitter 搬运
/twitter_unsubscribe [链接] - 退订 Twitter 搬运`;
      }
    });

    this.bot.on('api.send.pre', (type, apiRequest) => {
      logger.info(`sending request ${type}: ${JSON.stringify(apiRequest)}`);
    });

    this.bot.on('api.send.post', (type) => {
      logger.info(`sent request ${type}`);
    });
}

  public connect = () => {
    this.initWebsocket();
    logger.warn('connecting to websocket...');
    this.bot.connect();
  }

  private reconnect = () => {
    this.retryInterval *= 2;
    if (this.retryInterval > 300000) this.retryInterval = 300000;
    logger.info(`retrying in ${this.retryInterval / 1000}s...`);
    setTimeout(() => {
      logger.warn('reconnecting to websocket...');
      this.connect();
    }, this.retryInterval);
  }

  constructor(opt: IQQProps) {
    logger.info(`init cqwebsocket for ${opt.host}:${opt.port}, with access_token ${opt.access_token}`);
    this.botInfo = opt;
  }
}
