#!/usr/bin/env node
const commandLineUsage = require('command-line-usage');
const log4js = require('log4js');
const path = require('path');
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
console.log(config);
