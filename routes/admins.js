const router = require("express").Router();
const {Course, validateCourse} = require("../models/CourseLang");
const {Instructor, validateInstructor} = require("../models/InstructorLang");
const validateObjectId = require("../middleware/validateObjectId");
const {
    DEFAULT_COURSE_IMAGE_URL,
    DEFAULT_COURSE_ICON_URL,
    DEFAULT_INSTRUCTOR_IMAGE_URL,
    basicEmailAddress } = require("../constants");
const multer = require("multer");
const uploadCourseImage = multer({dest: "public/images/courses/images"});
const uploadCourseIcon = multer({dest: "public/images/courses/icons"});
const uploadInstructorImage = multer({dest: "public/images/instructors"});
const fs = require("fs");
const logger = require("../startup/logger");
const {sendEmail} = require("../utils/email");
const path = require("path");
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

// list courses in all languages
router.get("/courses", auth, async (req, res) => {
    const courses = await Course.find()
        .populate("instructors")
        .populate("connectedCoursesIds");

    res.send({
        data: courses,
        error: null,
        message: "All courses in website.",
        status: 200
    });
});

// list all instructors
router.get("/instructors", auth, async (req, res) => {
    const instructors = await Instructor.find();
    res.send({
        data: instructors,
        error: null,
        message: "All instructors in website.",
        status: 200
    });
});

// add a course
router.post("/courses", auth, async (req, res, next) => {
    let {error} = validateCourse(req.body);
    if(error){
        const err = new Error(error.details[0].message);
        err.status = 400;
        return next(err);
    }

    let connectedCourses = [];
    if(req.body.connectedCoursesIds && req.body.connectedCoursesIds.length > 0)
        connectedCourses = req.body.connectedCoursesIds;

    const course = new Course({
        routeUrl: req.body.routeUrl,
        hy: req.body.hy,
        ru: req.body.ru,
        en: req.body.en,
        imageUrl: DEFAULT_COURSE_IMAGE_URL,
        iconUrl: DEFAULT_COURSE_ICON_URL,
        isPrimary: req.body.isPrimary,
        instructors: req.body.instructors,
        connectedCoursesIds: connectedCourses,
        status: req.body.status,
        startTime: req.body.startTime,
        price: req.body.price
    });

    await course.save();

    // const err = new Error(ex.message || "Could not save to database. Please try again later...");
    // err.status = 500;
    // return next(err);

    res.send({
        error: null,
        message: "Course have been added.",
        data: course,
        status: 200
    });
});

// edit a course data
router.put("/courses/:id", auth, validateObjectId, async (req, res, next) => {
    const {error} = validateCourse(req.body);
    if(error) {
        const err = new Error(error.details[0].message);
        err.status = 400;
        return next(err);
    }

    const index = req.body.connectedCoursesIds.indexOf(req.params._id);
    if (index > -1) {
        const err = new Error("A course cannot be connected with itself. Remove " + req.body.name + " from connected courses.");
        err.status = 400;
        return next(err);
    }
    
    // TODO: check image url. it must not change
    const course = await Course.findOneAndUpdate({_id: req.params.id},
        {
            routeUrl: req.body.routeUrl,
            hy: req.body.hy,
            ru: req.body.ru,
            en: req.body.en,
            // imageUrl: req.body.imageUrl || DEFAULT_COURSE_IMAGE_URL,
            // iconUrl: req.body.iconUrl || DEFAULT_COURSE_ICON_URL,
            isPrimary: req.body.isPrimary,
            instructors: req.body.instructors,
            connectedCoursesIds: req.bodyconnectedCoursesIds,
            status: req.body.status,
            startTime: req.body.startTime,
            price: req.body.price
        }, {new: true});

    if(!course){
        const err = new Error("Course with given id was not found.");
        err.status = 404;
        return next(err);
    }

    return res.send({
        message: "Course " + course.name + " updated.",
        error: null,
        data: course.select("-__v").populate("instructors"),
        status: 200
    });
});

// edit a course image
router.put("/courses/uploadImage/:id", auth, validateObjectId, uploadCourseImage.single("courseImage"), async (req, res, next) => {
    let course = await Course.findById(req.params.id);
    if(!course){
        const err = new Error("Course with given id was not found.");
        err.status = 404;
        return next(err);
    }

    const tempPath = req.file.path;
    const dateStr = new Date().toDateString();
    const imageName = dateStr + "_BasicItCenter_" + req.file.originalname;

    const targetPath = path.join("./public/images/courses/images", imageName);

    // deletes course's previous image if it has one and it's not the default image
    if(course.imageUrl && course.imageUrl !== DEFAULT_COURSE_IMAGE_URL){
        // TODO: check, i think i should remove string from below and leave only course.imageUrl
        fs.unlink("public/images/courses/images" + course.imageUrl, async function(err){
            // log error
            logger.log("error", err.message, err);
            // console.log("Inform admin to manually delete this image.");
            // send email to admin for deleting this image manually
            const emailErr = await sendEmail({
                message: {
                    to: basicEmailAddress
                },
                locals: {
                    name: "SERVER",
                    email: "no email",
                    phone: "no phone",
                    message: "Please delete this image from server:"+course.imageUrl
                }
            });

            if(emailErr){
                logger.log("error", "Could not send email for upload course image error.", emailErr);
            }
        });
    }

    fs.rename(tempPath, targetPath, async (error) => {
        if(error){
            return next(error);
        }
    });

    // course.imageUrl = targetPath;

    course = await Course.findByIdAndUpdate(req.params.id, {
        $set: {
            imageUrl: `static/images/courses/images/${imageName}`
        }
    }, {new: true});
   
    if(!course){
        fs.unlink(targetPath, (unlinkErr) => {
            if(unlinkErr) return next(unlinkErr);

            const updateErr = new Error("Could not upload course image. Please try again later.");
            updateErr.status = 505;
            return next(updateErr);
        });
    }else {
        res.send({
            message: "Image uploaded for " + course.name,
            error: null,
            data: course,
            status: 200
        });
    }
});

// edit a course icon
router.put("/courses/uploadIcon/:id", auth, validateObjectId, uploadCourseIcon.single("courseIcon"), async (req, res, next) => {
    let course = await Course.findById(req.params.id);
    if(!course){
        const err = new Error("Course with given id was not found.");
        err.status = 404;
        return next(err);
    }

    const tempPath = req.file.path;
    const dateStr = new Date().toDateString();
    const imageName = dateStr + "_BasicItCenter_" + req.file.originalname;

    const targetPath = path.join("./public/images/courses/icons", imageName);

    if(course.iconUrl && course.iconUrl !== DEFAULT_COURSE_ICON_URL){
        fs.unlink("public/images/courses/icons" + course.iconUrl, async function(err){
            // log error
            logger.log("error", err.message, err);
            // send email to admin for deleting this image manually
            const emailErr = await sendEmail({
                message: {
                    to: basicEmailAddress
                },
                locals: {
                    name: "SERVER",
                    email: "no email",
                    phone: "no phone",
                    message: "Please delete this image from server:"+course.imageUrl
                }
            });

            if(emailErr){
                logger.log("error", "Could not send email for upload course image error.", emailErr);
            }
        });
    }

    fs.rename(tempPath, targetPath, async (error) => {
        if(error){
            return next(error);
        }
    });

    // course.iconUrl = targetPath;

    course = await Course.findByIdAndUpdate(req.params.id, {
        $set: {
            iconUrl: `static/images/courses/icons/${imageName}`
        }
    }, {new: true});
   
    if(!course){
        fs.unlink(targetPath, (unlinkErr) => {
            if(unlinkErr) return next(unlinkErr);

            const updateErr = new Error("Could not upload course image. Please try again later.");
            updateErr.status = 505;
            return next(updateErr);
        });
    }else {
        res.send({
            message: "Image uploaded for " + course.name,
            error: null,
            data: course,
            status: 200
        });
    }
});

// post an instructor
router.post("/instructors/", async (req, res, next) => {
    const {error} = validateInstructor(req.body);
    if(error) {
        const err = new Error(error.details[0].message);
        err.status = 400;
        return next(err);
    }

    const instructor = new Instructor({
        hy: req.body.hy,
        ru: req.body.ru,
        en: req.body.en,
        imageUrl: DEFAULT_INSTRUCTOR_IMAGE_URL
    });

    await instructor.save();

    res.send({
        error: null,
        message: "New instructor added.",
        data: instructor,
        status: 200
    });
});

// edit an instructor data
router.put("/instructors/:id", auth, validateObjectId, async (req, res, next) => {
    const {error} = validateInstructor(req.body) ;
    if(error) return next(error.details[0].message);

    // TODO: ensure that imageUrl does not change after this update
    const instructor = Instructor.findByIdAndUpdate(req.params.id,
        {
            hy: req.body.hy,
            ru: req.body.ru,
            en: req.body.en
        }, { new: true});

    if(!instructor) {
        const err = new Error("Instructor with given id was not found.");
        err.status = 404;
        return next(err);
    }

    res.send({
        error: null,
        message: "Instructor updated.",
        data: instructor,
        status: 200
    });
});

// edit an instructor image
router.put("/instructors/uploadImage/:id", auth, validateObjectId, uploadInstructorImage.single("instructorImage"), async (req, res, next) => {
    let instructor = await Instructor.findById(req.params.id);
    if(!instructor) {
        const err = new Error("Instructor with given id was not found.");
        err.status = 404;
        return next(err);
    }

    const tempPath = req.file.path;
    const dateStr = new Date().toDateString();
    const imageName =  dateStr + "_BasicItCenter_" + req.file.originalname;

    const targetPath = path.join("./public/images/instructors/", imageName);

    // deletes instructor's previous image if it has one and it's not the default image
    if(instructor.imageUrl && instructor.imageUrl !== DEFAULT_INSTRUCTOR_IMAGE_URL){
        fs.unlink("public/images/instructors/" + instructor.imageUrl, async function(err){
            // log error
            logger.log("error", err.message, err);
            
            // inform admin to manually delete this image
            const emailErr = await sendEmail({
                message: {
                    to: basicEmailAddress
                },
                locals: {
                    name: "SERVER",
                    email: "no email",
                    phone: "no phone",
                    message: "Please delete this image from server: "+instructor.imageUrl
                }
            });

            if(emailErr){
                logger.log("error", "Could not send email for upload course image error.", emailErr);
            }
        });
    }

    fs.rename(tempPath, targetPath, async (error) => {
        if(error){
            return next(error);
        }

        instructor.imageUrl = targetPath;

        instructor = await Instructor.findByIdAndUpdate(req.params.id, instructor, {new: true});

        if(!instructor){
            fs.unlink(targetPath, (unlinkErr) => {
                if(unlinkErr) return next(unlinkErr);

                const updateErr = new Error("Could not upload image. Please try again later.");
                updateErr.status = 505;
                return next(updateErr);
            });
        }else {
            res.send({
                message: "Image uploaded for " + instructor.name,
                error: null,
                data: instructor,
                status: 200
            });
        }
    });
});

// delete a course
router.delete("/courses/:id", auth, validateObjectId, async (req, res, next) => {
    try{
        const course = await Course.findByIdAndDelete(req.params.id);
        if(!course) {
            const err = new Error("Course with given id was not found.");
            err.status = 400;
            return next(err);
        }

        const imageError = await deleteAnImage(course.imageUrl);
        if(imageError)return next(imageError);
        const iconError = await deleteAnImage(course.iconUrl);
        if(iconError) return next(iconError);

        res.send({
            message: "Course has been deleted.",
            error: null,
            data: course,
            status: 200
        });
    }catch(ex){
        let err = new Error("Course id is invalid.");
        err.status = 400;
        return next(err);
    }
});

// delete an instructor
router.delete("/instructors/:id", auth, validateObjectId, async (req, res, next) => {
    const instructor = await Instructor.findByIdAndDelete(req.params.id);
    if(!instructor){
        const err = new Error("Instructor with given id was not found.");
        err.status = 400;
        return next(err);
    }

    // remove this instructor id from all courses
    // await Course.find({
    //     instructors: {$in : [instructor._id]}
    // }, {
    //     $pull: {
    //         $arrayElemAt : instructor._id
    //     }
    // });

    
    const deleteError = await deleteAnImage(instructor.imageUrl);
    if(deleteError) return next(deleteError);

    res.send({
        message: "Instructor has been deleted.",
        error: null,
        data: instructor,
        status: 200
    });
});


function deleteAnImage(path){
    return new Promise((resolve) => {
        if(path === DEFAULT_COURSE_IMAGE_URL || path === DEFAULT_COURSE_ICON_URL || path === DEFAULT_INSTRUCTOR_IMAGE_URL)
            return resolve(undefined);

        // delete image
        fs.unlink(path, err => {
            if(err) {
                logger.log("error", "Could not delete image in /admins/deleteAnImage", err);
                if(!err.message) err.message = "Could not delete image at path " + path;
                err.status = err.status || 500;
                return resolve(err);
            }

            resolve(undefined);
        });
    });
}

function randomStringGenerator(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
}

module.exports = router;