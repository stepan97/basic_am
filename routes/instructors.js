const router= require("express").Router();
const {Instructor, validateInstructor} = require("../models/InstructorLang");
const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const mongooseObjectId = require("mongoose").Types.ObjectId;
const multer = require("multer");
const upload = multer({dest: "public/images/instructors"});
const path = require("path");
const fs = require("fs");
const {DEFAULT_INSTRUCTOR_IMAGE_URL} = require("../constants");
// const {Course} = require("../models/CourseLang");
const {availableLanguages} = require("../constants");

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

router.post("/", auth, async (req, res, next) => {

    // console.log(req.body);

    try{

        const {error} = validateInstructor(req.body);
        if(error) {
            // console.log(error.details[0]);
            return next(error.details[0].message);
        }

        const instructor = new Instructor({
            hy: req.body.hy,
            ru: req.body.ru,
            en: req.body.en
        });


        await instructor.save();

        res.send({
            error: null,
            message: "New instructor added.",
            data: instructor,
            status: 200
        });
    }catch(ex){
        console.error(ex);
    }
});

// update an instructor's data (except for the image)
router.put("/:id", auth, validateObjectId, async (req, res, next) => {
    const {error} = validateInstructor(req.body) ;
    if(error) return next(error.details[0].message);

    const instructor = Instructor.findByIdAndUpdate(req.params.id,
        {
            name: req.body.name,
            category: req.body.category,
            description: req.body.description,
            imageUrl: DEFAULT_INSTRUCTOR_IMAGE_URL
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

// TODO: edit/change
router.put("/uploadImage/:id", auth, upload.single("instructorImage"), async (req, res, next) => {
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

    if(instructor.imageUrl && instructor.imageUrl !== DEFAULT_INSTRUCTOR_IMAGE_URL){
        fs.unlink("public/images/instructors/" + instructor.imageUrl, function(err){
            // log error
            console.log(err);
            console.log("Inform admin to manually delete this image.");
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

// TODO: edit/change
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

    
    const deleteError = await deleteImage(instructor.imageUrl);
    if(deleteError) return next(deleteError);

    res.send({
        message: "Instructor has been deleted.",
        error: null,
        data: instructor,
        status: 200
    });
});

// delete instructor image if it's not default one
function deleteImage(path){
    return new Promise((resolve, reject) => {
        if(path === DEFAULT_INSTRUCTOR_IMAGE_URL)
            return resolve(undefined);

        fs.unlink(path, err => {
            if(err) {
                if(!err.message) err.message = "Could not delete course image at path " + path;
                err.status = err.status || 500;
                console.log(err.message);
                return resolve(err);
            }

            resolve(undefined);
        });
    });
}

module.exports = router;