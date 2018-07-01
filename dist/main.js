#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandLineUsage = require("command-line-usage");
const log4js = require("log4js");
const path = require("path");
const qq_1 = require("./qq");
const logger = log4js.getLogger();
logger.level = 'info';
const sections = [
    {
        header: 'CQHTTP Twitter Bot',
        content: 'The QQ Bot that forwards twitters.'
    },
    {
        header: 'Synopsis',
        content: [
            '$ cqhttp-twitter-bot {underline config.json}',
            '$ cqhttp-twitter-bot {bold --help}'
        ]
    },
    {
        header: 'Documentation',
        content: [
            'Project home: {underline https://github.com/rikakomoe/cqhttp-twitter-bot}',
            'Example config: {underline https://qwqq.pw/b96yt}'
        ]
    }
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
    console.log("Failed to parse config file: ", configPath);
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
function handler(chat, args, bot) {
    const config = {
        message_type: chat.chatType,
        user_id: chat.chatID,
        group_id: chat.chatID,
        discuss_id: chat.chatID,
        message: JSON.stringify(args),
    };
    bot('send_msg', config);
}
const qq = new qq_1.default({
    access_token: config.cq_access_token,
    host: config.cq_ws_host,
    port: config.cq_ws_port,
    list: handler,
    sub: handler,
    unsub: handler,
});
qq.bot.connect();
