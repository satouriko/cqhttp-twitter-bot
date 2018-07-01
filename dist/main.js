#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandLineUsage = require("command-line-usage");
const fs = require("fs");
const log4js = require("log4js");
const path = require("path");
const command_1 = require("./command");
const qq_1 = require("./qq");
const twitter_1 = require("./twitter");
const logger = log4js.getLogger();
logger.level = 'info';
const sections = [
    {
        header: 'CQHTTP Twitter Bot',
        content: 'The QQ Bot that forwards twitters.',
    },
    {
        header: 'Synopsis',
        content: [
            '$ cqhttp-twitter-bot {underline config.json}',
            '$ cqhttp-twitter-bot {bold --help}',
        ],
    },
    {
        header: 'Documentation',
        content: [
            'Project home: {underline https://github.com/rikakomoe/cqhttp-twitter-bot}',
            'Example config: {underline https://qwqq.pw/b96yt}',
        ],
    },
];
const usage = commandLineUsage(sections);
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === 'help' || args[0] === '-h' || args[0] === '--help') {
    console.log(usage);
    process.exit(0);
}
const configPath = args[0];
let config;
try {
    config = require(path.resolve(configPath));
}
catch (e) {
    console.log('Failed to parse config file: ', configPath);
    console.log(usage);
    process.exit(1);
}
if (config.cq_ws_host === undefined) {
    config.cq_ws_host = '127.0.0.1';
    logger.warn('cq_ws_host is undefined, use 127.0.0.1 as default');
}
if (config.cq_ws_port === undefined) {
    config.cq_ws_port = 6700;
    logger.warn('cq_ws_port is undefined, use 6700 as default');
}
if (config.cq_access_token === undefined) {
    config.cq_access_token = '';
    logger.warn('cq_access_token is undefined, use empty string as default');
}
if (config.lockfile === undefined) {
    config.lockfile = 'subscriber.lock';
}
let lock;
if (fs.existsSync(path.resolve(config.lockfile))) {
    try {
        lock = JSON.parse(fs.readFileSync(path.resolve(config.lockfile), 'utf8'));
    }
    catch (err) {
        logger.error(`Failed to parse lockfile ${config.lockfile}: `, err);
        lock = {
            workon: 0,
            feed: [],
            threads: {},
        };
    }
    fs.access(path.resolve(config.lockfile), fs.constants.W_OK, err => {
        if (err) {
            logger.fatal(`cannot write lockfile ${path.resolve(config.lockfile)}, permission denied`);
            process.exit(1);
        }
    });
}
else {
    lock = {
        workon: 0,
        feed: [],
        threads: {},
    };
    try {
        fs.writeFileSync(path.resolve(config.lockfile), JSON.stringify(lock));
    }
    catch (err) {
        logger.fatal(`cannot write lockfile ${path.resolve(config.lockfile)}, permission denied`);
        process.exit(1);
    }
}
const qq = new qq_1.default({
    access_token: config.cq_access_token,
    host: config.cq_ws_host,
    port: config.cq_ws_port,
    list: (c, a) => command_1.list(c, a, lock),
    sub: (c, a) => command_1.sub(c, a, lock, config.lockfile),
    unsub: (c, a) => command_1.unsub(c, a, lock, config.lockfile),
});
setTimeout(() => {
    twitter_1.default(lock, config.lockfile);
}, 60000);
qq.connect();
