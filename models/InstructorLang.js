const mongoose = require("mongoose");
const Joi = require("joi");
const {DEFAULT_INSTRUCTOR_IMAGE_URL} = require("../constants");

const instructorSchema = new mongoose.Schema({
    hy: {
        name: {type: String},
        category: {type: String},
        description: {type: String}
    },
    ru: {
        name: {type: String},
        category: {type: String},
        description: {type: String}
    },
    en: {
        name: {type: String},
        category: {type: String},
        description: {type: String}
    },
    imageUrl: {type: String, default: DEFAULT_INSTRUCTOR_IMAGE_URL}
});

function validateInstructor(instructor){
    const schema = {
        name: Joi.string(),
        category: Joi.string(),
        description: Joi.string()
    };

    const instructorLangSchema = {
        hy: Joi.object(schema).required(), //schema,
        ru: Joi.object(schema).required(), //schema,
        en: Joi.object(schema).required() //schema,
        // imageUrl: Joi.string().default(DEFAULT_INSTRUCTOR_IMAGE_URL)
    };

    return Joi.validate(instructor, instructorLangSchema);
}

module.exports.validateInstructor = validateInstructor;
module.exports.Instructor = mongoose.model("InstructorLang", instructorSchema);