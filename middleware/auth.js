const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = function (req, res, next) {
    const token = req.header("x-auth-token");
    if (!token) {
        const err = new Error("Access denied. No token provided.");
        err.status = 401;
        return next(err);
    }

    try {
        const decoded = jwt.verify(token, config.get("basicItCenterJwtPrivateKey"));
        req.user = decoded;
        next();
    }
    catch (ex) {
        const err = new Error("Invalid token.");
        err.status = 400;
        next(err);
    }
    // next();
};