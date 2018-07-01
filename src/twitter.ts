import * as fs from 'fs';
import * as log4js from 'log4js';
import * as path from 'path';

interface IWorkerOption {
  lock: ILock;
  lockfile: string;
  workInterval: number;
}

const logger = log4js.getLogger('twitter');
logger.level = 'info';

function work(opt: IWorkerOption) {
  const lock = opt.lock;
  if (opt.workInterval < 1) opt.workInterval = 1;
  if (lock.feed.length === 0) {
    setTimeout(() => {
      work(opt);
    }, opt.workInterval * 1000);
    return;
  }
  if (lock.workon >= lock.feed.length) lock.workon = 0;
  if (!lock.threads[lock.feed[lock.workon]] ||
    !lock.threads[lock.feed[lock.workon]].subscribers ||
    lock.threads[lock.feed[lock.workon]].subscribers.length === 0) {
    logger.error(`nobody subscribes thread ${lock.feed[lock.workon]}, removing from feed`);
    lock.feed.splice(lock.workon, 1);
    fs.writeFileSync(path.resolve(opt.lockfile), JSON.stringify(lock));
    work(opt);
    return;
  }

  // TODO: Work on lock.feed[lock.workon]

  lock.workon++;
  let timeout = opt.workInterval * 1000 / lock.feed.length;
  if (timeout < 1000) timeout = 1000;
  fs.writeFileSync(path.resolve(opt.lockfile), JSON.stringify(lock));
  setTimeout(() => {
    work(opt);
  }, timeout);
}

export default work;
