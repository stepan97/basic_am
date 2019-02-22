const winston = require("winston");

const options = {
    fileErrors: {
        level: "error",
        filename: "./logs/error_logs.log",
        maxsize: 5242880, // 5 mb
        maxFiles: 5
    },
    dbErrors: {
        level: "info",
        filename: "./logs/db_connections.log",
        maxsize: 5242880,
        maxFiles: 10
    }
};

const logger = winston.createLogger({
    transports: [
        new winston.transports.File(options.fileErrors)
    ]
});

const dbLogger = winston.createLogger({
    transports: [
        new winston.transports.File(options.dbErrors)
    ]
});

module.exports.logger = logger;
module.exports.DBLogger = dbLogger;