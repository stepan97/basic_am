const express = require("express");
const courses = require("../routes/courses");
const instructors = require("../routes/instructors");
const home = require("../routes/home");
const admins = require("../routes/admins");
const error = require("../middleware/error");

module.exports = function (app) {
    // express body parser
    app.use(express.json());

    // allow cors
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    // use public folder
    app.use("/static", express.static("public"));

    // using routes
    app.use("/api/v1/", home);
    app.use("/api/v1/courses", courses);
    app.use("/api/v1/instructors", instructors);
    app.use("/api/v1/admins", admins);

    // 404 not found
    app.use("*", (req, res) => {
        res.status(404).send({
            message: "not found",
            error: "invalid url",
            data: null,
            status: 404
        });
    });

    app.use(error);
};