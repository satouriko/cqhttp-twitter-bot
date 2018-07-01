import * as log4js from 'log4js';
import * as webshot from 'webshot';
import * as read from 'read-all-stream';
import {PNG} from 'pngjs';

const logger = log4js.getLogger('webshot');
logger.level = 'info';

function renderWebshot(url: string, height: number): Promise<string> {
  let promise = new Promise<{ data: string, boundary: null | number }>(resolve => {
    const options = {
      windowSize: {
        width: 1080,
        height: height,
      },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      renderDelay: 5000,
      quality: 100,
      customCSS: 'html{zoom:2}header{display:none!important}',
    };
    logger.info(`shooting ${options.windowSize.width}*${height} webshot for ${url}`);
    webshot(url, options).pipe(new PNG({
      filterType: 4
    }))
      .on('parsed', function () {
        let boundary = null;
        for (let y = 0; y < this.height; y++) {
          const x = 0;
          let idx = (this.width * y + x) << 2;
          if (this.data[idx] !== 255) {
            boundary = y;
            break;
          }
        }
        if (boundary != null) {
          logger.info(`found boundary at ${boundary}, cropping image`);
          this.data = this.data.slice(0, (this.width * boundary) << 2);
          this.height = boundary;
          read(this.pack(), 'base64').then(data => {
            logger.info(`finished webshot for ${url}`);
            resolve({ data, boundary });
          });
        } else {
          logger.warn(`unable to found boundary, try shooting a larger image`);
          resolve({ data: '', boundary });
        }
      });
  });
  return promise.then(data => {
    if (data.boundary != null) return renderWebshot(url, height * 2);
    else return data.data;
  })
}

/*function fetchImage(): Promise<string> {

}*/

export default function (twitter, callback) {
  twitter.forEach(twi => {
    const url = `https://mobile.twitter.com/${twi.user.screen_name}/status/${twi.id_str}`;
    renderWebshot(url, 1920)
      .then(base64Webshot => {
        console.log(base64Webshot);
      })
  });
}
