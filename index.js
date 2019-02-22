require("express-async-errors");
const express = require("express");
const app =  express();
const logger = require("./startup/logger").logger;
const morgan = require("morgan");

app.use(morgan("short"));

require("./startup/routes")(app);
require("./startup/db")();
require("./startup/joiValidation")();
// require("./startup/config")();

app.set("view engine", "ejs");

process.on("unhandledRejection", (ex) => {
    logger.log("error", ex.message, ex);
    process.exit(1);
});

process.on("uncaughtExceptions", (ex) => {
    logger.log("error", ex.message, ex);
    process.exit(1);
});

const port = process.env.PORT  || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));