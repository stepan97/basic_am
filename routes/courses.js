const router = require("express").Router();
const auth = require("../middleware/auth");
const {Course, validateCourse} = require("../models/CourseLang");
const multer = require("multer");
const uploadImage = multer({dest: "public/images/courses/images"});
const uploadIcon = multer({dest: "public/images/courses/icons"});
const path = require("path");
const fs = require("fs");
const {DEFAULT_COURSE_IMAGE_URL, DEFAULT_COURSE_ICON_URL} = require("../constants");
const validateObjectId = require("../middleware/validateObjectId");
const mongooseObjectId = require("mongoose").Types.ObjectId;
const {availableLanguages} = require("../constants");

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
        // .lookup({
        //     from: "courselangs",
        //     // localField: "connectedCourses",
        //     // foreignField: "_id",
        //     pipeline: [{
        //         "$project": {
        //             course: {
        //                 name: `$${lang}.name`,
        //             }
        //         }
        //     }],
        //     as: "hoparinio"
        // });

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

router.post("/", async (req, res, next) => {
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
        imageUrl: req.body.imageUrl || DEFAULT_COURSE_IMAGE_URL,
        iconUrl: req.body.iconUrl || DEFAULT_COURSE_ICON_URL,
        isPrimary: req.body.isPrimary,
        instructors: req.body.instructors,
        connectedCoursesIds: connectedCourses,
        status: req.body.status,
        startTime: req.body.startTime,
        price: req.body.price
    });

    try{
        await course.save();
    }catch(ex){
        const err = new Error(ex.message || "Could not save to database. Please try again later...");
        err.status = 500;
        return next(err);
    }

    res.send({
        error: null,
        message: "Course have been added.",
        data: course,
        status: 200
    });
});

// TODO: edit/change
router.put("/uploadImage/:id", auth,  validateObjectId, uploadImage.single("courseImage"), async (req, res, next) => {
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

    if(course.imageUrl && course.imageUrl !== DEFAULT_COURSE_IMAGE_URL){
        fs.unlink("public/images/courses/images" + course.imageUrl, function(err){
            // log error
            console.log(err);
            console.log("Inform admin to manually delete this image.");
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
            imageUrl: targetPath
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

// TODO: edit/change
router.put("/uploadIcon/:id", auth,  validateObjectId, uploadIcon.single("courseIcon"), async (req, res, next) => {
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
        fs.unlink("public/images/courses/icons" + course.iconUrl, function(err){
            // log error
            console.log(err);
            console.log("Inform admin to manually delete this image.");
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
            iconUrl: targetPath
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

router.put("/:id", auth,  validateObjectId, async (req, res, next) => {
    try{
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
            // course.connectedCourses.splice(index, 1);
        }

        const course = await Course.findOneAndUpdate({_id: req.params.id},
            {
                routeUrl: req.body.routeUrl,
                name: req.body.name,
                description: req.body.description,
                detailedDescription: req.body.detailedDescription,
                category: req.body.category,
                imageUrl: req.body.imageUrl,
                isPrimary: req.body.isPrimary,
                courseInformation: req.body.courseInformation,
                whatWillLearn: req.body.whatWillLearn,
                whoCanAttend: req.body.whoCanAttend,
                instructors: req.body.instructors,
                phases: req.body.phases,
                connectedCoursesIds: req.body.connectedCoursesIds
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
    }catch(ex){
        const err = new Error("Course id is invalid.");
        err.status = 400;
        return next(err);
    }
});

// TODO: edit/change
router.delete("/:id", auth, validateObjectId, async (req, res, next) => {
    try{
        const course = await Course.findByIdAndDelete(req.params.id);
        if(!course) {
            const err = new Error("Course with given id was not found.");
            err.status = 400;
            return next(err);
        }

        const imageError = await deleteFile(course.imageUrl);
        if(imageError)return next(imageError);
        const iconError = await deleteFile(course.iconUrl);
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

function deleteFile(path){
    return new Promise((resolve, reject) => {
        if(path === DEFAULT_COURSE_IMAGE_URL || path === DEFAULT_COURSE_ICON_URL)
            return resolve(undefined);

        // delete image
        fs.unlink(path, err => {
            if(err) {
                if(!err.message) err.message = "Could not delete course image at path " + path;
                err.status = err.status || 500;
                return resolve(err);
            }

            resolve(undefined);
        });
    });
}

module.exports = router;