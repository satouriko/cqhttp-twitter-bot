import * as CallableInstance from 'callable-instance';
import * as https from 'https';
import * as log4js from 'log4js';
import { PNG } from 'pngjs';
import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import * as read from 'read-all-stream';

const logger = log4js.getLogger('webshot');
logger.level = (global as any).loglevel;

class Webshot extends CallableInstance {

  private browser: Browser;

  constructor(onready?: () => any) {
    super('webshot');
    puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN,zh']})
      .then(browser => this.browser = browser)
      .then(() => {
        logger.info('launched puppeteer browser');
        if (onready) onready();
      });
  }

  private renderWebshot = (url: string, height: number, webshotDelay: number): Promise<string> => {
    const promise = new Promise<{ data: string, boundary: null | number }>(resolve => {
      const width = 1080;
      logger.info(`shooting ${width}*${height} webshot for ${url}`);
      this.browser.newPage()
        .then(page => {
          page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36')
            .then(() => page.setViewport({
              width,
              height,
              isMobile: true,
            }))
            .then(() => page.setBypassCSP(true))
            .then(() => page.goto(url))
            .then(() => page.addStyleTag({
              content: 'html{zoom:2}header{display:none!important}path[d=\'M20.207 7.043a1 1 0 0 0-1.414 0L12 13.836 5.207 7.043a1 1 0 0 0-1.414 1.414l7.5 7.5a.996.996 0 0 0 1.414 0l7.5-7.5a1 1 0 0 0 0-1.414z\'],div[role=\'button\']{display: none;}',
            }))
            .then(() => page.waitFor(webshotDelay))
            .then(() => page.addScriptTag({
              content: 'document.documentElement.scrollTop=0;',
            }))
            .then(() => page.screenshot())
            .then(screenshot => {
              new PNG({
                filterType: 4,
              }).on('parsed', function () {
                let boundary = null;
                let x = 0;
                for (let y = 0; y < this.height; y++) {
                  const idx = (this.width * y + x) << 2;
                  if (this.data[idx] !== 255) {
                    boundary = y;
                    break;
                  }
                }
                if (boundary !== null) {
                  logger.info(`found boundary at ${boundary}, cropping image`);
                  this.data = this.data.slice(0, (this.width * boundary) << 2);
                  this.height = boundary;

                  boundary = null;
                  x = Math.floor(this.width / 2);
                  let flag = false;
                  let cnt = 0;
                  for (let y = this.height - 1; y >= 0; y--) {
                    const idx = (this.width * y + x) << 2;
                    if (this.data[idx] !== 255) {
                      if (!flag) cnt++;
                      flag = true;
                    } else {
                      if (flag) cnt++;
                      flag = false;
                    }
                    if (cnt === 3) {
                      boundary = y;
                      break;
                    }
                  }
                  if (boundary != null) {
                    logger.info(`found boundary at ${boundary}, trimming image`);
                    this.data = this.data.slice(0, (this.width * boundary) << 2);
                    this.height = boundary;
                  }

                  read(this.pack(), 'base64').then(data => {
                    logger.info(`finished webshot for ${url}`);
                    resolve({data, boundary});
                  });
                } else if (height >= 8 * 1920) {
                  logger.warn('too large, consider as a bug, returning');
                  read(this.pack(), 'base64').then(data => {
                    logger.info(`finished webshot for ${url}`);
                    resolve({data, boundary: 0});
                  });
                } else {
                  logger.info('unable to found boundary, try shooting a larger image');
                  resolve({data: '', boundary});
                }
              }).parse(screenshot);
            })
            .then(() => page.close());
        });
    });
    return promise.then(data => {
      if (data.boundary === null) return this.renderWebshot(url, height + 1920, webshotDelay);
      else return data.data;
    });
  }

  private fetchImage = (url: string): Promise<string> =>
    new Promise<string>(resolve => {
      logger.info(`fetching ${url}`);
      https.get(url, res => {
        if (res.statusCode === 200) {
          read(res, 'base64').then(data => {
            logger.info(`successfully fetched ${url}`);
            resolve(data);
          });
        } else {
          logger.error(`failed to fetch ${url}: ${res.statusCode}`);
          resolve();
        }
      }).on('error', (err) => {
        logger.error(`failed to fetch ${url}: ${err.message}`);
        resolve();
      });
    })

  public webshot(tweets, callback, webshotDelay: number): Promise<void> {
    let promise = new Promise<void>(resolve => {
      resolve();
    });
    tweets.forEach(twi => {
      let cqstr = '';
      const url = `https://mobile.twitter.com/${twi.user.screen_name}/status/${twi.id_str}`;
      promise = promise.then(() => this.renderWebshot(url, 1920, webshotDelay))
        .then(base64Webshot => {
          if (base64Webshot) cqstr += `[CQ:image,file=base64://${base64Webshot}]`;
        });
      if (twi.extended_entities) {
        twi.extended_entities.media.forEach(media => {
          promise = promise.then(() => this.fetchImage(media.media_url_https))
            .then(base64Image => {
              if (base64Image) cqstr += `[CQ:image,file=base64://${base64Image}]`;
            });
        });
      }
      if (twi.entities && twi.entities.urls && twi.entities.urls.length) {
        promise = promise.then(() => {
          const urls = twi.entities.urls
            .filter(urlObj => urlObj.indices[0] < twi.display_text_range[1])
            .map(urlObj => urlObj.expanded_url);
          if (urls.length) {
            cqstr += '\n';
            cqstr += urls.join('\n');
          }
        });
      }
      promise.then(() => callback(cqstr));
    });
    return promise;
  }

}

export default Webshot;
