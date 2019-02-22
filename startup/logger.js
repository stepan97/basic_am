const winston = require("winston");

const options = {
    fileErrors: {
        level: "error",
        filename: "./logs/error_logs.log",
        maxsize: 5242880, // 5 mb
        maxFiles: 5
    }
};

const logger = winston.createLogger({
    transports: [
        new winston.transports.File(options.fileErrors)
    ]
});

module.exports = logger;