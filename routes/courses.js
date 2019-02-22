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
    availableLanguages,
    basicEmailAddress} = require("../constants");
const validateObjectId = require("../middleware/validateObjectId");
const mongooseObjectId = require("mongoose").Types.ObjectId;
const logger = require("../startup/logger").logger;
const {sendEmail} = require("../utils/email");
const validateMimeType = require("../utils/validateImageMimeType");

// list courses in all languages
router.get("/full", auth, async (req, res) => {
    const courses = await Course.find();
    // .populate("instructors")
    // .populate("connectedCoursesIds");

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
router.post("/", auth, async (req, res, next) => {
    let {error} = validateCourse(req.body);
    if(error){
        const err = new Error(error.details[0].message);
        err.status = 400;
        return next(err);
    }

    // let connectedCourses = [];
    // if(req.body.connectedCoursesIds && req.body.connectedCoursesIds.length > 0)
    //     connectedCourses = req.body.connectedCoursesIds;

    const course = new Course({
        routeUrl: req.body.routeUrl,
        hy: req.body.hy,
        ru: req.body.ru,
        en: req.body.en,
        imageUrl: DEFAULT_COURSE_IMAGE_URL,
        iconUrl: DEFAULT_COURSE_ICON_URL,
        isPrimary: req.body.isPrimary,
        instructors: req.body.instructors,
        connectedCoursesIds: req.body.connectedCoursesIds, //connectedCourses,
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
        }, {new: true})
        .select("-__v");

    if(!course){
        const err = new Error("Course with given id was not found.");
        err.status = 404;
        return next(err);
    }

    return res.send({
        message: "Course " + course.name + " updated.",
        error: null,
        data: course,
        status: 200
    });
});

// edit a course image
router.put("/uploadImage/:id", auth, validateObjectId, uploadCourseImage.single("courseImage"), async (req, res, next) => {
    if(!req.file){
        const err = new Error("No file uploaded.");
        err.status = 400;
        return next(err);
    }
    
    const mimeTypeErr = validateMimeType(req.file.mimetype);
    if(mimeTypeErr) return next(mimeTypeErr);
    
    let course = await Course.findById(req.params.id);
    if(!course){
        const err = new Error("Course with given id was not found.");
        err.status = 404;
        return next(err);
    }

    const tempPath = req.file.path;
    const dateStr = Date.now();
    const imageName = dateStr + "_BasicItCenter_" + req.file.originalname;

    const targetPath = path.join("./public/images/courses/images", imageName);

    // deletes course's previous image if it has one and it's not the default image
    if(course.imageUrl && course.imageUrl !== DEFAULT_COURSE_IMAGE_URL){
        const url = course.imageUrl.substring(course.imageUrl.lastIndexOf("/"));

        const deleteError = await deleteAnImage(`./public/images/courses/images/${url}`);
        if(deleteError) {
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
        }
    }

    fs.rename(tempPath, targetPath, async (error) => {
        if(error){
            return next(error);
        }
    });

    // course.imageUrl = targetPath;

    course = await Course.findByIdAndUpdate(req.params.id, {
        $set: {
            imageUrl: `/static/images/courses/images/${imageName}`
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
            message: "Image uploaded for " + course.hy.name,
            error: null,
            data: course,
            status: 200
        });
    }
});

// edit a course icon
router.put("/uploadIcon/:id", auth, validateObjectId, uploadCourseIcon.single("courseIcon"), async (req, res, next) => {
    if(!req.file){
        const err = new Error("No file uploaded.");
        err.status = 400;
        return next(err);
    }
    
    const mimeTypeErr = validateMimeType(req.file.mimetype);
    if(mimeTypeErr) return next(mimeTypeErr);
    
    let course = await Course.findById(req.params.id);
    if(!course){
        const err = new Error("Course with given id was not found.");
        err.status = 404;
        return next(err);
    }

    const tempPath = req.file.path;
    const dateStr = Date.now();
    const imageName = dateStr + "_BasicItCenter_" + req.file.originalname;

    const targetPath = path.join("./public/images/courses/icons", imageName);

    if(course.iconUrl && course.iconUrl !== DEFAULT_COURSE_ICON_URL){
        const url = course.iconUrl.substring(course.iconUrl.lastIndexOf("/"));
        const deleteError = await deleteAnImage(`./public/images/courses/icons/${url}`);
        if(deleteError){
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
        }
    }

    fs.rename(tempPath, targetPath, async (error) => {
        if(error){
            return next(error);
        }
    });

    // course.iconUrl = targetPath;

    course = await Course.findByIdAndUpdate(req.params.id, {
        $set: {
            iconUrl: `/static/images/courses/icons/${imageName}`
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
            message: "Icon uploaded for " + course.hy.name,
            error: null,
            data: course,
            status: 200
        });
    }
});

// delete a course
router.delete("/:id", auth, validateObjectId, async (req, res, next) => {
    const course = await Course.findByIdAndDelete(req.params.id);
    if(!course) {
        const err = new Error("Course with given id was not found.");
        err.status = 400;
        return next(err);
    }

    let errorMessage = undefined;

    let imageUrl = course.imageUrl.substring(course.imageUrl.lastIndexOf("/"));
    imageUrl = `./public/images/courses/images/${imageUrl}`;
    let iconUrl = course.iconUrl.substring(course.iconUrl.lastIndexOf("/"));
    iconUrl = `./public/images/courses/icons/${iconUrl}`;

    const imageError = await deleteAnImage(imageUrl);
    if(imageError){
        errorMessage = "image to delete: " + imageUrl;
        logger.log("error", "Could not delete course image. ", imageError);
    }
    const iconError = await deleteAnImage(iconUrl);
    if(iconError) {
        const msg = "icon to delete: " + iconUrl;
        errorMessage == undefined ? errorMessage = msg : errorMessage = "\n" + msg;
        logger.log("error", "Could not delete course icon. ", iconError);
    }

    if(errorMessage){
        const emailErr = await sendEmail({
            message: {
                to: basicEmailAddress
            },
            locals: {
                name: "SERVER",
                email: "no email",
                phone: "no phone",
                message: "Please delete this image from server:\n"+errorMessage
            }
        });

        if(emailErr){
            logger.log("error", "Could not send email for upload course image error.", emailErr);
        }
    }

    res.send({
        message: "Course has been deleted.",
        error: null,
        data: course,
        status: 200
    });
});

// deletes a file if it's not the default image or icon
function deleteAnImage(path){
    return new Promise((resolve) => {
        if(path === DEFAULT_COURSE_IMAGE_URL || path === DEFAULT_COURSE_ICON_URL)
            return resolve(undefined);

        // delete image
        fs.unlink(path, err => {
            if(err) {
                if(err.code === "ENOENT") return resolve(undefined);

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