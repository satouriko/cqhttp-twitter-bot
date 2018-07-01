import * as log4js from 'log4js';
import * as webshot from 'webshot';
import * as base64 from 'base64-stream';

const logger = log4js.getLogger('webshot');
logger.level = 'info';

export default function (twitter, callback) {
  twitter.forEach(twi => {
    const url = `https://mobile.twitter.com/${twi.user.screen_name}/status/${twi.id_str}`;
    const options = {
      windowSize: {
        width: 1080,
        height: 1920,
      },
      shotSize: {
        width: 'window',
        height: 'window',
      },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      renderDelay: 5000,
      quality: 100,
      customCSS: 'html{zoom:2}header{display:none!important}',
    };
    const renderStream = webshot(url, options).pipe(base64.encode());
    renderStream.on('data', data => {
      data = 'base64://' + data;
    });
  });
}
