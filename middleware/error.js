// const winston = require('winston');
const logger = require("../startup/logger").logger;

module.exports = function(err, req, res, next){
    const error = {
        status: err.status || 500,
        message: err.message || "Something failed.",
        data: null,
        error: err.message || "Internal server error."
    };

    if(error.status >= 500)
        logger.log("error", error.error, err);

    res.status(error.status).send(error);
};