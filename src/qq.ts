import * as CQWebsocket from 'cq-websocket';
import * as log4js from 'log4js';
import command from './command';

const logger = log4js.getLogger('cq-websocket');
logger.level = 'info';

interface IQQProps {
  access_token: string;
  host: string;
  port: number;
  list: (chat: IChat, args: string[]) => void;
  sub: (chat: IChat, args: string[]) => void;
  unsub: (chat: IChat, args: string[]) => void;
}

interface IQQ {
  bot: CQWebsocket;
}

export default function (opt: IQQProps): IQQ {
  this.bot = new CQWebsocket({
    access_token: opt.access_token,
    enableAPI: true,
    enableEvent: true,
    host: opt.host,
    port: opt.port,
  });

  let retryInterval = 1000;

  this.bot.on('socket.connect', () => {
    logger.info('websocket connected');
    retryInterval = 1000;
  });

  const connect = () => {
    logger.warn('connecting to websocket...');
    this.bot.connect();
  };

  const reconnect = () => {
    retryInterval *= 2;
    if (retryInterval > 300000) retryInterval = 300000;
    logger.info(`retrying in ${retryInterval / 1000}s...`);
    setTimeout(() => {
      logger.warn('reconnecting to websocket...');
      connect();
    }, retryInterval);
  };

  this.bot.on('socket.close', () => {
    logger.error('websocket closed');
    reconnect();
  });

  this.bot.on('socket.error', () => {
    logger.error('websocket connect error');
    reconnect();
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
        break;
    }
    let cmdObj = command(context.raw_message);
    switch (cmdObj.cmd) {
      case 'twitter_sub':
      case 'twitter_subscribe':
        opt.sub(chat, cmdObj.args);
        return;
      case 'twitter_unsub':
      case 'twitter_unsubscribe':
        opt.unsub(chat, cmdObj.args);
        return;
      case 'ping':
      case 'twitter':
        opt.list(chat, cmdObj.args);
        return;
      case 'help':
        return `推特搬运机器人：
/twitter - 查询当前聊天中的订阅
/twitter_subscribe [链接] - 订阅 Twitter 搬运
/twitter_unsubscribe [链接] - 退订 Twitter 搬运`;
    }
  });

  return this;
};
