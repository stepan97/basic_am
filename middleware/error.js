// const winston = require('winston');

module.exports = function(err, req, res, next){
//   winston.error(err.message, err);

    // console.error("My error: " + err);

    const error = {
        status: err.status || 500,
        message: err.message || "Internal server error.",
        data: null,
        error: err.message || "Internal server error."
    };

    res.status(error.status).send(error);
    // res.status(500).send("Something failed.");
};