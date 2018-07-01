"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log4js = require("log4js");
const logger = log4js.getLogger('twitter');
logger.level = 'info';
function work(lock) {
    if (lock.feed.length === 0) {
        setTimeout(() => {
            work(lock);
        }, 60000);
        return;
    }
    if (lock.workon >= lock.feed.length)
        lock.workon = 0;
    if (!lock.threads[lock.feed[lock.workon]] ||
        !lock.threads[lock.feed[lock.workon]].subscribers ||
        lock.threads[lock.feed[lock.workon]].subscribers.length === 0) {
        logger.error(`nobody subscribes thread ${lock.feed[lock.workon]}, removing from feed`);
        lock.feed.splice(lock.workon, 1);
        work(lock);
        return;
    }
    // TODO: Work on lock.feed[lock.workon]
    lock.workon++;
    setTimeout(() => {
        work(lock);
    }, 60000);
}
exports.default = work;
