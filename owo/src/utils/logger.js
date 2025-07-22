import winston from "winston";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import { t } from "./locales.js";
const LOG_DIR = "logs";
const LOG_FILE = path.join(LOG_DIR, "console.log");
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}
const { combine, printf, timestamp, errors, uncolorize } = winston.format;
const getLevelFormat = (level) => {
    const translatedLevel = t(`system.logger.levels.${level}`);
    const levelFormats = {
        alert: (text) => chalk.redBright.bold(`[${text}]`),
        error: (text) => chalk.redBright.bold(`[${text}]`),
        runtime: (text) => chalk.blue.bold(`[${text}]`),
        warn: (text) => chalk.yellowBright.bold(`[${text}]`),
        info: (text) => chalk.cyanBright.bold(`[${text}]`),
        data: (text) => chalk.blackBright.bold(`[${text}]`),
        sent: (text) => chalk.greenBright.bold(`[${text}]`),
        debug: (text) => chalk.magentaBright.bold(`[${text}]`),
    };
    return levelFormats[level]?.(translatedLevel) || chalk.whiteBright.bold(`[${translatedLevel.toUpperCase()}]`);
};
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
    const formattedLevel = getLevelFormat(level);
    const formattedTimestamp = chalk.bgYellow.whiteBright(timestamp);
    if (stack) {
        return util.format("%s %s %s\n%s", formattedTimestamp, formattedLevel, message, chalk.redBright(stack));
    }
    return util.format("%s %s %s", formattedTimestamp, formattedLevel, level === "debug" ? chalk.gray(message) : message);
});
class WinstonLogger {
    logger;
    static instance;
    constructor() {
        this.logger = winston.createLogger({
            levels: {
                alert: 0,
                error: 1,
                runtime: 2,
                warn: 3,
                info: 4,
                data: 5,
                sent: 6,
                debug: 7,
            },
            transports: [
                new winston.transports.Console({
                    format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), errors({ stack: true }), consoleFormat),
                    level: "sent"
                }),
                new winston.transports.File({
                    filename: LOG_FILE,
                    level: "debug",
                    maxsize: 5 * 1024 * 1024, // 5 MB
                    maxFiles: 5,
                    format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), errors({ stack: true }), consoleFormat, uncolorize()),
                }),
            ],
            exitOnError: false,
            handleExceptions: true,
            handleRejections: true,
        });
    }
    static getInstance() {
        if (!WinstonLogger.instance) {
            WinstonLogger.instance = new WinstonLogger();
        }
        return WinstonLogger.instance;
    }
    setLevel(level) {
        this.logger.level = level;
        this.logger.transports.find(t => t instanceof winston.transports.Console).level = level;
    }
    log(level, message) {
        if (message instanceof Error) {
            this.logger.log(level, message.message, { stack: message.stack });
        }
        else {
            this.logger.log(level, message);
        }
    }
    alert(message) {
        return this.log("alert", message);
    }
    error(message) {
        return this.log("error", message);
    }
    runtime(message) {
        return this.log("runtime", message);
    }
    warn(message) {
        return this.log("warn", message);
    }
    info(message) {
        return this.log("info", message);
    }
    data(message) {
        return this.log("data", message);
    }
    sent(message) {
        return this.log("sent", message);
    }
    debug(message) {
        return this.log("debug", message);
    }
}
export const logger = WinstonLogger.getInstance();
