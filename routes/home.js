const router = require("express").Router();
const emailUtils = require("../utils/email");
const {basicEmailAddress} = require("../constants");

router.post("/contact", async (req, res, next) => {
    req.body.to = basicEmailAddress;
    const {error} = await emailUtils.validateEmail(req.body);
    if(error) {
        const err = new Error(error.details[0].message);
        err.status = 400;
        return next(err);
    }

    const emailError = await emailUtils.sendEmail(req.body);
    if(emailError){
        const err = new Error("Could not send email.");
        err.status = 500;
        return next(err);
    }

    res.send({
        message: "Email sent.",
        data: null,
        error: null,
        status: 200
    });
});

module.exports = router;