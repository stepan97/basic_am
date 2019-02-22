const router = require("express").Router();
const auth = require("../middleware/auth");
const {Course, validateCourse} = require("../models/CourseLang");
const multer = require("multer");
const uploadCourseImage = multer({dest: "public/images/courses/images"});
const uploadCourseIcon = multer({dest: "public/images/courses/icons"});
const path = require("path");
const fs = require("fs");
const {
    DEFAULT_COURSE_IMAGE_URL,
    DEFAULT_COURSE_ICON_URL,
    DEFAULT_INSTRUCTOR_IMAGE_URL,
    availableLanguages,
    basicEmailAddress } = require("../constants");
const validateObjectId = require("../middleware/validateObjectId");
const mongooseObjectId = require("mongoose").Types.ObjectId;
const logger = require("../startup/logger");
const {sendEmail} = require("../utils/email");


// list courses in all languages
router.get("/full", auth, async (req, res) => {
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

router.get("/full/:id", validateObjectId, auth, async (req, res, next) => {
    const course = await Course.findById(req.params.id);

    if(!course) {
        const err = new Error("Course with given id was not found.");
        err.status = 400;
        return next(err);
    }

    res.send({
        data: course,
        error: null,
        message: "Course with id " + course._id,
        status: 200
    });
});

router.get("/:id", validateObjectId, async (req, res, next) => {
    let lang = "hy";
    if(availableLanguages.includes(req.header("language")))
        lang = req.header("language");
    // const lang = req.header("language") || "hy";
    const id = new mongooseObjectId(req.params.id);

    const courses = await Course.aggregate()
        .match({_id : id})
        .project({
            routeUrl: "$routeUrl",
            isPrimary: "$isPrimary",
            startTime: "$startTime",
            price: "$price",
            instructors: "$instructors",
            connectedCourses: "$connectedCoursesIds",
            imageUrl: "$imageUrl",
            iconUrl: "$iconUrl",
            course: {
                detailedDescription: `$${lang}.detailedDescription`,
                whatWillLearn: `$${lang}.whatWillLearn`,
                whoCanAttend: `$${lang}.whatWillLearn`,
                name: `$${lang}.name`,
                description: `$${lang}.description`,
                category: `$${lang}.category`,
                status: `$${lang}.status`,
                language: `$${lang}.language`,
                phases: `$${lang}.phases`
            }
        });

    // const x = await Course.populate(courses, {
    //     model: "CourseLang",
    //     path: "connectedCourses",
    //     select: `_id ${lang}.name iconUrl`
    // });
    // return res.send(x);

    if(!courses[0]){
        const err = new Error("Course with given id was not found.");
        err.status = 400;
        return next(err);
    }

    // if(!courses[0].course.name){
    //     const err = new Error("No data available in this language. Try 'hy' as language.");
    //     err.status = 400;
    //     return next(err);
    // }

    res.send({
        error: null,
        data: courses,
        status: 200,
        message: "Course with id " + req.params.id
    });
});

router.get("/", async (req, res) => {
    let lang = "hy";
    if(availableLanguages.includes(req.header("language")))
        lang = req.header("language");
    // const lang = req.header("language") || "hy";

    const courses = await Course.aggregate()
        .project({
            _id: "$_id",
            name: `$${lang}.name`,
            iconUrl: "$iconUrl",
            isPrimary: "$isPrimary"
        });

    res.send({
        error: null,
        message: "All courses.",
        data: courses,
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
router.put("/:id", validateObjectId, auth, async (req, res, next) => {
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
router.put("/uploadImage/:id", auth, validateObjectId, uploadCourseImage.single("courseImage"), async (req, res, next) => {
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
                    message: "Please delete this image from server:\n"+course.imageUrl
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
router.put("/uploadIcon/:id", auth, validateObjectId, uploadCourseIcon.single("courseIcon"), async (req, res, next) => {
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
                    message: "Please delete this image from server:\n"+course.imageUrl
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

// delete a course
router.delete("/:id", auth, validateObjectId, async (req, res, next) => {
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

// deletes a file if it's not a default image
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

module.exports = router;