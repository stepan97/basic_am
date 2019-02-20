const mongoose = require("mongoose");
const Joi = require("joi");

const instructorSchema = new mongoose.Schema({
    name: {type: String, required: true},
    category: {type: [String]},
    description: {type: String},
    imageUrl: {type: String}
});

function validateInstructor(instructor){
    const schema = {
        name: Joi.string().required(),
        category: Joi.array().items(Joi.string()),
        description: Joi.string(),
        imageUrl: Joi.string()
    };

    return Joi.validate(instructor, schema);
}

module.exports.validateInstructor = validateInstructor;
module.exports.Instructor = mongoose.model("Instructor", instructorSchema);