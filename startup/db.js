const mongoose = require("mongoose");
const logger = require("../startup/logger").DBLogger;
const config = require("config");

module.exports = function(){
    mongoose.connect(config.get("dbConnectionString"), {useNewUrlParser: true, useFindAndModify: false})
        .then(
            () => logger.log("info", "connected to db...", new Date()), 
            (reason) => logger.log("error", "could not connect to mongodb. reason: ", reason)
        )
        .catch(err => logger.log("error", "could not connect to db. err: ", err));

    mongoose.connection.on("disconnected", () => {
        const date = new Date();
        const msg = "Lost connection to db: " + 
            date.getDate() + "-" +
            date.getMonth() + "-" +
            date.getFullYear() + " " +
            date.getHours() + ":" +
            date.getMinutes() + ":" +
            date.getSeconds();
        logger.log("error", msg);
    });

    mongoose.connection.on("reconnected", () => {
        const date = new Date();
        const msg = "Re-connected to db: " + 
            date.getDate() + "-" +
            date.getMonth() + "-" +
            date.getFullYear() + " " +
            date.getHours() + ":" +
            date.getMinutes() + ":" +
            date.getSeconds();
        logger.log("info", msg);
    });
};