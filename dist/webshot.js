"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const log4js = require("log4js");
const pngjs_1 = require("pngjs");
const read = require("read-all-stream");
const webshot = require("webshot");
const logger = log4js.getLogger('webshot');
logger.level = 'info';
function renderWebshot(url, height, webshotDelay) {
    const promise = new Promise(resolve => {
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
        webshot(url, options).pipe(new pngjs_1.PNG({
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
                    resolve({ data, boundary });
                });
            }
            else if (height >= 8 * 1920) {
                logger.warn('too large, consider as a bug, returning');
                read(this.pack(), 'base64').then(data => {
                    logger.info(`finished webshot for ${url}`);
                    resolve({ data, boundary: 0 });
                });
            }
            else {
                logger.info('unable to found boundary, try shooting a larger image');
                resolve({ data: '', boundary });
            }
        });
    });
    return promise.then(data => {
        if (data.boundary === null)
            return renderWebshot(url, height + 1920, webshotDelay);
        else
            return data.data;
    });
}
function fetchImage(url) {
    return new Promise(resolve => {
        logger.info(`fetching ${url}`);
        http.get(url, res => {
            if (res.statusCode === 200) {
                read(res, 'base64').then(data => {
                    logger.info(`successfully fetched ${url}`);
                    return data;
                });
            }
        });
    });
}
function default_1(tweets, callback, webshotDelay) {
    let promise = new Promise(resolve => {
        resolve();
    });
    tweets.forEach(twi => {
        let cqstr = '';
        const url = `https://mobile.twitter.com/${twi.user.screen_name}/status/${twi.id_str}`;
        promise = promise.then(() => renderWebshot(url, 1920, webshotDelay))
            .then(base64Webshot => {
            if (base64Webshot)
                cqstr += `[CQ:image,file=base64://${base64Webshot}]`;
        });
        if (twi.extended_entities) {
            twi.extended_entities.media.forEach(media => {
                promise = promise.then(() => fetchImage(media.media_url_https))
                    .then(base64Image => {
                    if (base64Image)
                        cqstr += `[CQ:image,file=base64://${base64Image}]`;
                });
            });
        }
        // TODO: Translate
        promise.then(() => callback(cqstr));
    });
    return promise;
}
exports.default = default_1;
