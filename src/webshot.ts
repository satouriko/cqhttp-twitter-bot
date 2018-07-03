import * as https from 'https';
import * as log4js from 'log4js';
import { PNG } from 'pngjs';
import * as read from 'read-all-stream';
import * as webshot from 'webshot';

const logger = log4js.getLogger('webshot');
logger.level = (global as any).loglevel;

function renderWebshot(url: string, height: number, webshotDelay: number): Promise<string> {
  const promise = new Promise<{ data: string, boundary: null | number }>(resolve => {
    const options = {
      windowSize: {
        width: 1080,
        height,
      },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      renderDelay: webshotDelay,
      quality: 100,
      customCSS: 'html{zoom:2}header{display:none!important}',
    };
    logger.info(`shooting ${options.windowSize.width}*${height} webshot for ${url}`);
    webshot(url, options).pipe(new PNG({
      filterType: 4,
    }))
      .on('parsed', function () {
        let boundary = null;
        for (let y = 0; y < this.height; y++) {
          const x = 0;
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
      });
  });
  return promise.then(data => {
    if (data.boundary === null) return renderWebshot(url, height + 1920, webshotDelay);
    else return data.data;
  });
}

function fetchImage(url: string): Promise<string> {
  return new Promise<string>(resolve => {
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
  });
}

export default function (tweets, callback, webshotDelay: number): Promise<void> {
  let promise = new Promise<void>(resolve => {
    resolve();
  });
  tweets.forEach(twi => {
    let cqstr = '';
    const url = `https://mobile.twitter.com/${twi.user.screen_name}/status/${twi.id_str}`;
    promise = promise.then(() => renderWebshot(url, 1920, webshotDelay))
      .then(base64Webshot => {
        if (base64Webshot) cqstr += `[CQ:image,file=base64://${base64Webshot}]`;
      });
    if (twi.extended_entities) {
      twi.extended_entities.media.forEach(media => {
        promise = promise.then(() => fetchImage(media.media_url_https))
          .then(base64Image => {
            if (base64Image) cqstr += `[CQ:image,file=base64://${base64Image}]`;
          });
      });
    }
    promise.then(() => callback(cqstr));
  });
  return promise;
}
