import * as log4js from 'log4js';
import * as webshot from 'webshot';
import * as read from 'read-all-stream';

const logger = log4js.getLogger('webshot');
logger.level = 'info';

function renderWebshot(url: string, height: number): Promise<string> {
  let promise = new Promise<string>(resolve => {
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
    const renderStream = webshot(url, options);
    read(renderStream, 'base64').then(data => {
      resolve(data);
    });
  });
  return promise.then(data => {
    if (height < 2048) return renderWebshot(url, height * 2);
    else return data;
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
