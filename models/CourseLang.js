const mongoose = require("mongoose");
const Joi = require("joi");
Joi.ObjectId = require("joi-objectid")(Joi);
const {DEFAULT_COURSE_IMAGE_URL, DEFAULT_COURSE_ICON_URL} = require("../constants");

const courseSchema = new mongoose.Schema({
    routeUrl: {type: String, required: true},
    imageUrl: {type: String, required: false, default: DEFAULT_COURSE_IMAGE_URL},
    iconUrl: {type: String, required: false, default: DEFAULT_COURSE_ICON_URL},
    isPrimary: {type: Boolean, default: true},
    instructors: [{type: mongoose.Schema.Types.ObjectId, required: true, ref: "InstructorLang"}],
    connectedCoursesIds: [{type: mongoose.Schema.Types.ObjectId, required: false}],
    duration: {type: Number, required: false},
    price: {type: Number, required: false},
    startTime: {type: Date, required: false, default: (Date.now() + (1000 * 60 * 60 * 24 * 30))},
    hy: {
        name: {type: String, required: true},
        description: {type: String, required: false},
        detailedDescription: {type: [String], required: false},
        category: {type: String},
        status: {type: String, required: false},
        language: {type: String, required: true},
        whatWillLearn: {type:[String], required: false},
        whoCanAttend: {type: [String], required: false},
        phases: [{
            title: {type: String, required: true},
            description: {type: String, required: true},
            phaseOrder: {type: Number, required: true},
            themes: {type: [String], required: true}
        }]
    },
    ru: {
        name: {type: String, required: true},
        description: {type: String, required: false},
        detailedDescription: {type: [String], required: false},
        category: {type: String},
        status: {type: String, required: false},
        language: {type: String, required: true},
        whatWillLearn: {type:[String], required: false},
        whoCanAttend: {type: [String], required: false},
        phases: [{
            title: {type: String, required: true},
            description: {type: String, required: true},
            phaseOrder: {type: Number, required: true},
            themes: {type: [String], required: true}
        }]
    },
    en: {
        name: {type: String, required: true},
        description: {type: String, required: false},
        detailedDescription: {type: [String], required: false},
        category: {type: String},
        status: {type: String, required: false},
        language: {type: String, required: true},
        whatWillLearn: {type:[String], required: false},
        whoCanAttend: {type: [String], required: false},
        phases: [{
            title: {type: String, required: true},
            description: {type: String, required: true},
            phaseOrder: {type: Number, required: true},
            themes: {type: [String], required: true}
        }]
    }
}); // , {strict: false});

function validateCourse(course){
    const nestedPhasesSchema = Joi.object().keys({
        title: Joi.string().required(),
        description: Joi.string().required(),
        phaseOrder: Joi.number().required(),
        themes: Joi.array().items(Joi.string()).required()
    });

    // const courseSchema = {
    //     name: Joi.string().required(),
    //     description: Joi.string(),
    //     detailedDescription: Joi.array().items(Joi.string()),
    //     category: Joi.string(),
    //     status: Joi.string(),
    //     language: Joi.string().required(),
    //     whatWillLearn: Joi.array().items(Joi.string()),
    //     whoCanAttend: Joi.array().items(Joi.string()),
    //     phases: Joi.array().items(nestedPhasesSchema).min(1)
    // };

    const courseSchema = Joi.object().keys({
        name: Joi.string().required(),
        description: Joi.string(),
        detailedDescription: Joi.array().items(Joi.string()),
        category: Joi.string(),
        status: Joi.string(),
        language: Joi.string().required(),
        whatWillLearn: Joi.array().items(Joi.string()),
        whoCanAttend: Joi.array().items(Joi.string()),
        phases: Joi.array().items(nestedPhasesSchema).min(1)
    });

    const courseLangSchema = {
        hy: courseSchema.required(),
        ru: courseSchema.required(),
        en: courseSchema.required(),
        // imageUrl: Joi.string().default("aef"),
        // iconUrl: Joi.string().default("asd"),
        isPrimary: Joi.boolean().default(true).required(),
        instructors: Joi.array().items(Joi.ObjectId()).min(1).required(),
        connectedCoursesIds: Joi.array().items(Joi.ObjectId()).min(0),
        duration: Joi.number(),
        price: Joi.number(),
        routeUrl: Joi.string().required(),
        startTime: Joi.date().default(Date.now() + (1000 * 60 * 60 * 24 * 30))
    };

    // var result;

    // try{
    //     result = Joi.validate(course, courseLangSchema);
    // }catch(ex){
    //     console.error(ex);
    //     result = {
    //         error: "My error"
    //     };
    // }

    // return result;

    return Joi.validate(course, courseLangSchema);
}

module.exports.validateCourse = validateCourse;
module.exports.Course = mongoose.model("CourseLang", courseSchema);