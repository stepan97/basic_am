const mongoose = require("mongoose");
const Joi = require("joi");

const languages = new mongoose.Schema({
    am: {type: String, required: true},
    ru: {type: String, required: true},
    en: {type: String, required: true}
});

const courseSchema = new mongoose.Schema({
    title: {
        type: languages,
        required: true
    },
    level: {
        type: languages,
        required: true
    },
    whoCanAttend: [{
        type: languages,
        required: true
    }]
});

const course = {
    title: {
        am: "Հայկական անուն",
        ru: "Русское имя",
        en: "English title"
    },
    category: {
        am: "",
        ru: "",
        en: ""
    },
    level: {
        am: "",
        ru: "",
        en: ""
    },
    duration: Date.now(),
    language: {
        am: "",
        ru: "",
        en: ""
    },
    price: 40.000,
    startTime: "date set by admin",
    courseDescription: "String",
    courseImage: "an image",
    whoCanAttend: [{
        am: "",
        ru: "",
        en: ""
    }],
    whatWillLearn: [{
        am: "",
        ru: "",
        en: ""
    }],
    phases: [{
        title: "String",
        description: {
            am: "",
            ru: "",
            en: ""
        },
        themes: [{
            am: "",
            ru: "",
            en: ""
        }]
    }],
    bottomDescription: [{
        am: "",
        ru: "",
        en: ""
    }],
    connectedCourses: ["Object id"],
    instructors: ["Object id"]
};

function validate(course){
    const languagesSchema = {
        am: Joi.string().required(),
        ru: Joi.string().required(),
        en: Joi.string().required()
    };

    const schema = {
        title: languagesSchema,
        level: languagesSchema,
        whoCanAttend: Joi.array().items(languagesSchema).min(1).required()
    };

    return Joi.validate(course, schema);
}

module.exports.Course = mongoose.model("MyCourse", courseSchema);
module.exports.validate = validate;