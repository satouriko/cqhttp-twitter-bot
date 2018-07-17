import * as fs from 'fs';
import * as log4js from 'log4js';
import * as path from 'path';
import * as redis from 'redis';
import { RedisClient } from 'redis';
import * as sha1 from 'sha1';
import * as Twitter from 'twitter';

import QQBot from './cqhttp';
import Webshot from './webshot';

interface IWorkerOption {
  lock: ILock;
  lockfile: string;
  bot: QQBot;
  workInterval: number;
  webshotDelay: number;
  consumer_key: string;
  consumer_secret: string;
  access_token_key: string;
  access_token_secret: string;
  redis: IRedisConfig;
  mode: number;
}

const logger = log4js.getLogger('twitter');
logger.level = (global as any).loglevel;

export default class {

  private client;
  private lock: ILock;
  private lockfile: string;
  private workInterval: number;
  private bot: QQBot;
  private webshotDelay: number;
  private webshot: Webshot;
  private redisConfig: IRedisConfig;
  private redisClient: RedisClient;
  private mode: number;

  constructor(opt: IWorkerOption) {
    this.client = new Twitter({
      consumer_key: opt.consumer_key,
      consumer_secret: opt.consumer_secret,
      access_token_key: opt.access_token_key,
      access_token_secret: opt.access_token_secret,
    });
    this.lockfile = opt.lockfile;
    this.lock = opt.lock;
    this.workInterval = opt.workInterval;
    this.bot = opt.bot;
    this.webshotDelay = opt.webshotDelay;
    this.redisConfig = opt.redis;
    this.mode = opt.mode;
  }

  public launch = () => {
    if (this.redisConfig) {
      this.redisClient = redis.createClient({
        host: this.redisConfig.redisHost,
        port: this.redisConfig.redisPort,
      });
    }
    this.webshot = new Webshot(() => setTimeout(this.work, this.workInterval * 1000));
  }

  public work = () => {
    const lock = this.lock;
    if (this.workInterval < 1) this.workInterval = 1;
    if (lock.feed.length === 0) {
      setTimeout(() => {
        this.work();
      }, this.workInterval * 1000);
      return;
    }
    if (lock.workon >= lock.feed.length) lock.workon = 0;
    if (!lock.threads[lock.feed[lock.workon]] ||
      !lock.threads[lock.feed[lock.workon]].subscribers ||
      lock.threads[lock.feed[lock.workon]].subscribers.length === 0) {
      logger.warn(`nobody subscribes thread ${lock.feed[lock.workon]}, removing from feed`);
      delete lock.threads[lock.feed[lock.workon]];
      lock.feed.splice(lock.workon, 1);
      fs.writeFileSync(path.resolve(this.lockfile), JSON.stringify(lock));
      this.work();
      return;
    }

    logger.debug(`pulling feed ${lock.feed[lock.workon]}`);

    const promise = new Promise(resolve => {
      let match = lock.feed[lock.workon].match(/https:\/\/twitter.com\/([^\/]+)\/lists\/([^\/]+)/);
      let config: any;
      let endpoint: string;
      if (match) {
        config = {
          owner_screen_name: match[1],
          slug: match[2],
          tweet_mode: 'extended',
        };
        endpoint = 'lists/statuses';
      } else {
        match = lock.feed[lock.workon].match(/https:\/\/twitter.com\/([^\/]+)/);
        if (match) {
          config = {
            screen_name: match[1],
            exclude_replies: false,
            tweet_mode: 'extended',
          };
          endpoint = 'statuses/user_timeline';
        }
      }

      if (endpoint) {
        const offset = lock.threads[lock.feed[lock.workon]].offset;
        if (offset > 0) config.since_id = offset;
        this.client.get(endpoint, config, (error, tweets, response) => {
          if (error) {
            if (error instanceof Array && error.length > 0 && error[0].code === 34) {
              logger.warn(`error on fetching tweets for ${lock.feed[lock.workon]}: ${JSON.stringify(error)}`);
              lock.threads[lock.feed[lock.workon]].subscribers.forEach(subscriber => {
                logger.info(`sending notfound message of ${lock.feed[lock.workon]} to ${JSON.stringify(subscriber)}`);
                this.bot.bot('send_msg', {
                  message_type: subscriber.chatType,
                  user_id: subscriber.chatID,
                  group_id: subscriber.chatID,
                  discuss_id: subscriber.chatID,
                  message: `链接 ${lock.feed[lock.workon]} 指向的用户或列表不存在，请退订。`,
                });
              });
            } else {
              logger.error(`unhandled error on fetching tweets for ${lock.feed[lock.workon]}: ${JSON.stringify(error)}`);
            }
            resolve();
          } else resolve(tweets);
        });
      }
    });

    promise.then((tweets: any) => {
      logger.debug(`api returned ${JSON.stringify(tweets)} for feed ${lock.feed[lock.workon]}`);
      if (!tweets || tweets.length === 0) {
        lock.threads[lock.feed[lock.workon]].updatedAt = new Date().toString();
        return;
      }
      if (lock.threads[lock.feed[lock.workon]].offset === -1) {
        lock.threads[lock.feed[lock.workon]].offset = tweets[0].id_str;
        return;
      }
      if (lock.threads[lock.feed[lock.workon]].offset === 0) tweets.splice(1);
      return (this.webshot as any)(this.mode, tweets, (msg, text, author) => {
        lock.threads[lock.feed[lock.workon]].subscribers.forEach(subscriber => {
          logger.info(`pushing data of thread ${lock.feed[lock.workon]} to ${JSON.stringify(subscriber)}`);
          let hash = JSON.stringify(subscriber) + text.replace(/\s+/gm, '');
          logger.debug(hash);
          hash = sha1(hash);
          logger.debug(hash);
          const send = () => {
            this.bot.bot('send_msg', {
              message_type: subscriber.chatType,
              user_id: subscriber.chatID,
              group_id: subscriber.chatID,
              discuss_id: subscriber.chatID,
              message: this.mode === 0 ? msg : author + text,
            });
          };
          if (this.redisClient) {
            this.redisClient.exists(hash, (err, res) => {
              logger.debug('redis: ', res);
              if (err) {
                logger.error('redis error: ', err);
              } else if (res) {
                logger.info('key hash exists, skip this subscriber');
                return;
              }
              send();
              this.redisClient.set(hash, 'true', 'EX', this.redisConfig.redisExpireTime, (setErr, setRes) => {
                logger.debug('redis: ', setRes);
                if (setErr) {
                  logger.error('redis error: ', setErr);
                }
              });
            });
          } else send();
        });
      }, this.webshotDelay)
        .then(() => {
          lock.threads[lock.feed[lock.workon]].offset = tweets[0].id_str;
          lock.threads[lock.feed[lock.workon]].updatedAt = new Date().toString();
        });

    })
      .then(() => {
        lock.workon++;
        let timeout = this.workInterval * 1000 / lock.feed.length;
        if (timeout < 1000) timeout = 1000;
        fs.writeFileSync(path.resolve(this.lockfile), JSON.stringify(lock));
        setTimeout(() => {
          this.work();
        }, timeout);
      });

  }
}
