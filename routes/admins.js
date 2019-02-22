const router = require("express").Router();
const { basicEmailAddress } = require("../constants");
const logger = require("../startup/logger").logger;
const {sendEmail} = require("../utils/email");
const {Admin, validateAdmin} = require("../models/Admin");
const bcrypt = require("bcrypt");
const auth = require("../middleware/auth");

router.post("/signin", async (req, res, next) => {
    const {error} = validateAdmin(req.bodu);
    if(error){
        const err = new Error(error.details[0].message);
        err.status = 400;
        return next(err);
    }

    let admin = await Admin.findOne({username: req.body.username});
    if(!admin) {
        const err = new Error("Invalid username or password.");
        err.status = 400;
        return next(err);
    }

    const isValid = await bcrypt.compare(req.body.password, admin.password);
    if(!isValid){
        const err = new Error("Invalid username or password.");
        err.status = 400;
        return next(err);
    }

    const token = admin.generateAuthToken();

    res.send({
        data: token,
        message: "Sign in success.",
        error: null,
        status: 200
    });
});

router.post("/signup", async (req, res, next) => {
    const {error} = validateAdmin(req.body);
    if(error){
        const err = new Error(error.details[0].message);
        err.status = 400;
        return next(err);
    }

    if(req.body.username !== "emma"){
        const err = new Error("Only Emma can sign up on this website.");
        err.status = 403;
        return next(err);
    }

    let admin = await Admin.findOne({ username: req.body.username });
    if(admin){
        const err = new Error("User with this username already registered.");
        err.status = 400;
        return next(err);
    }

    admin = new Admin({
        username: req.body.username,
        password: req.body.password
    });

    const salt = await bcrypt.genSalt(10);

    admin.password = await bcrypt.hash(admin.password, salt);

    await admin.save();

    const token = admin.generateAuthToken();

    res.send({
        data: token,
        message: "Sign up success.",
        error: null,
        status: 200
    });
});

router.get("/forgot/:username", async (req, res, next) => {
    if(!req.params.username){
        const err = new Error("Expected route parameter username.");
        err.status = 400;
        return next(400);
    }

    const admin = await Admin.findOne({username: req.body.username});
    if(admin){
        const err = new Error("Invalid username.");
        err.status = 400;
        return next(err);
    }

    const random = randomStringGenerator(16) + admin.username;
    const url = "https://www.basic.am/api/v1/admins/forgotRedirect/" + random;

    const updated = await Admin.findOneAndUpdate({
        $set: {
            forgotPassword: random
        }
    }, {new: true});

    if(!updated) {
        const err = new Error("Could not save to db. Please try again later.");
        err.status = 500;
        return next(err);
    }

    const emailErr = await sendEmail({
        message: {
            to: basicEmailAddress
        },
        locals: {
            username: admin.username,
            url: url,
            password: undefined
        }
    });
    if(emailErr){
        const err = new Error("Could not send email. Please try again later.");
        err.status = 500;
        return next(err);
    }

    res.send({
        data: null,
        error: null,
        message: "Please check Your email.",
        status: 200
    });
});

router.get("/forgotRedirect/:url", async (req, res, next) => {
    const pwd = randomStringGenerator(6);
    const salt = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash(pwd, salt);
    const admin = await Admin.findOneAndUpdate({forgotPassword: req.params.url},
        {
            $set: {
                password: hashedPwd
            }
        }, {new: true});
    if(!admin) {
        const err = new Error("Invalid route parameter url.");
        err.status = 400;
        return next(err);
    }

    const emailErr = await sendEmail({
        message: {
            to: basicEmailAddress
        },
        locals: {
            username: admin.username,
            url: undefined,
            password: pwd
        }
    });
    if(emailErr){
        logger.log("error", "Could not send email for password forget.", emailErr);
        emailErr.status = 500;
        return next(emailErr);
    }

    res.send({
        data: null,
        error: null,
        message: "Check your email for new password.",
        status: 200
    });
});

router.post("/changePassword", auth, async (req, res, next) => {
    let password = req.body.password;
    if(!password) {
        const err = new Error("password is required.");
        err.status = 400;
        return next(err);
    }
    const salt = await bcrypt.genSalt(10);
    password = await bcrypt.hash(password, salt);

    const admin = await Admin.findOneAndUpdate({_id: req.user._id},
        {
            $set: {
                password: password
            }
        }, {new: true});

    if(!admin){
        const err = new Error("User with given id was not found.");
        err.status = 400;
        return next(err);
    }

    const token = admin.generateAuthToken();

    res.send({
        data: token,
        error: null,
        message: "Password changed.",
        status: 200
    });
});

function randomStringGenerator(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
}

module.exports = router;