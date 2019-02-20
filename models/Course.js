const mongoose = require("mongoose");
const Joi = require("joi");
Joi.ObjectId = require("joi-objectid")(Joi);
const {DEFAULT_COURSE_IMAGE_URL, DEFAULT_COURSE_ICON_URL} = require("../constants");

const courseSchema = new mongoose.Schema({
    name: {type: String, required: true},
    description: {type: String, required: false},
    detailedDescription: {type: [String], required: false},
    category: {type: String},
    imageUrl: {type: String, default: DEFAULT_COURSE_IMAGE_URL},
    iconUrl: {type: String, required: true, default: DEFAULT_COURSE_ICON_URL},
    isPrimary: {type: Boolean, default: true},
    courseInformation: {
        status: {type: String, required: false},
        duration: {type: Number, required: false},
        language: {type: String, required: true},
        price: {type: Number, required: false},
        startTime: {type: Date, required: false, default: (Date.now() + (1000 * 60 * 60 * 24 * 30))}
    },
    whatWillLearn: {type:[String], required: false},
    whoCanAttend: {type: [String], required: false},
    instructors: [{type: mongoose.Schema.Types.ObjectId, required: true, ref: "Instructor"}],
    phases: [{
        title: {type: String, required: true},
        description: {type: String, required: true},
        phaseOrder: {type: Number, required: true},
        themes: {type: [String], required: true}
    }],
    connectedCoursesIds: [{type: mongoose.Schema.Types.ObjectId, required: false}]
});

/**
 * @returns current mongoose object in pure json version, removing conenctedCoursesIds
 */
courseSchema.methods.toJson = function(){
    return {
        name: this.name,
        description: this.description,
        category: this.category,
        imageUrl: this.imageUrl,
        isPrimary: this.isPrimary,
        courseInformation: this.courseInformation,
        whatWillLearn: this.whatWillLearn,
        whoCanAttend: this.whoCanAttend,
        instructors: this.instructors,
        phases: this.phases
    };
};

function validateCourse(course){

    const nestedCourseInformationSchema = Joi.object().keys({
        status: Joi.string().optional(),
        duration: Joi.number().optional(),
        language: Joi.string().required(),
        price: Joi.number().optional(),
        startTime: Joi.date().default(Date.now() + (1000 * 60 * 60 * 24 * 30)).optional()
    });

    const nestedPhasesSchema = Joi.object().keys({
        title: Joi.string().required(),
        description: Joi.string().required(),
        phaseOrder: Joi.number().required(),
        themes: Joi.array().items(Joi.string()).required()
    });

    const schema = {
        name: Joi.string().required(),
        description: Joi.string().optional(),
        detailedDescription: Joi.string().optional(),
        category: Joi.string().optional(),
        imageUrl: Joi.string().optional().default(DEFAULT_COURSE_IMAGE_URL),
        iconUrl: Joi.string().required().default(DEFAULT_COURSE_ICON_URL),
        isPrimary: Joi.boolean().default(true).required(),
        courseInformation: nestedCourseInformationSchema,
        whatWillLearn: Joi.array().items(Joi.string()).optional(),
        whoCanAttend: Joi.array().items(Joi.string()).optional(),
        instructors: Joi.array().items(Joi.ObjectId()).min(1).required(),
        phases: Joi.array().items(nestedPhasesSchema).min(1),
        connectedCourses: Joi.array().items(Joi.ObjectId()).optional()
    };

    return Joi.validate(course, schema);
}

module.exports.validateCourse = validateCourse;
module.exports.Course = mongoose.model("Course", courseSchema);