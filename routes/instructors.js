const router= require("express").Router();
const {Instructor, validateInstructor} = require("../models/InstructorLang");
const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const mongooseObjectId = require("mongoose").Types.ObjectId;
const multer = require("multer");
const uploadInstructorImage = multer({dest: "public/images/instructors"});
const path = require("path");
const fs = require("fs");
const {DEFAULT_INSTRUCTOR_IMAGE_URL, basicEmailAddress} = require("../constants");
// const {Course} = require("../models/CourseLang");
const {availableLanguages} = require("../constants");
const logger = require("../startup/logger");
const {sendEmail} = require("../utils/email");


router.get("/full", auth, async (req, res) => {
    const instructors = await Instructor.find();

    res.send({
        data: instructors,
        error: null,
        message: "All instructors in website.",
        status: 200
    });
});

router.get("/full/:id", auth, validateObjectId, async (req, res, next) => {
    const instructor = await Instructor.findById(req.params.id);

    if(!instructor){
        const err = new Error("Instructor with given id was not found.");
        err.status = 400;
        return next(err);
    }

    res.send({
        data: instructor,
        error: null,
        message: "Instructor with id " + instructor._id,
        status: 200
    });
});

router.get("/:id", validateObjectId, async (req, res, next) => {
    let lang = "hy";
    if(availableLanguages.includes(req.header("language")))
        lang = req.header("language");
    // const lang = req.header("language") || "hy";
    const id = new mongooseObjectId(req.params.id);

    const instructors = await Instructor.aggregate()
        .match({_id : id})
        .project({
            _id: "$_id",
            imageUrl: "$imageUrl",
            name: `$${lang}.name`,
            category: `$${lang}.category`,
            description: `$${lang}.description`
        });

    if(!instructors[0]){
        const error = new Error("Instructor with given id was not found.");
        error.status = 400;
        return next(error);
    }

    if(!instructors[0].name){
        const error = new Error("No data available in this language, please try 'hy'.");
        error.status = 400;
        return next(error);
    }

    res.send({
        error: null,
        data: instructors[0],
        status: 200,
        message: "Instructor with id " + req.params.id
    });
});

router.get("/", async (req, res) => {
    let lang = "hy";
    if(availableLanguages.includes(req.header("language")))
        lang = req.header("language");
    // const lang = req.header("language") || "hy";

    const instructors = await Instructor.aggregate()
        .project({
            _id: "$_id",
            imageUrl: "$imageUrl",
            name: `$${lang}.name`,
            category: `$${lang}.category`,
            description: `$${lang}.description`
        });

    res.send({
        error: null,
        data: instructors,
        message: "All instructors.",
        status: 200
    });
});

// post an instructor
router.post("/", auth, async (req, res, next) => {
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
router.put("/:id", auth, validateObjectId, async (req, res, next) => {
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
router.put("/uploadImage/:id", auth, validateObjectId, uploadInstructorImage.single("instructorImage"), async (req, res, next) => {
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
            logger.log("error", "Could not delete image for instructor in /instructors/uploadImage", err);
            // console.log(err);
            // Inform admin to manually delete this image.
            const emailErr = await sendEmail({
                message: {
                    to: basicEmailAddress
                },
                locals: {
                    name: "SERVER",
                    email: "no email",
                    phone: "no phone",
                    message: "Please delete this image from server:\n"+instructor.imageUrl
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

// delete an instructor
router.delete("/:id", auth, validateObjectId, async (req, res, next) => {
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

// deletes a file if it's not the default image
function deleteAnImage(path){
    return new Promise((resolve) => {
        if(path === DEFAULT_INSTRUCTOR_IMAGE_URL)
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