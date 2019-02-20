const mongoose = require("mongoose");
const Joi = require("joi");

const contactsSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    phoneNumber: {type: String, required: false},
    message: {type: String, required: true}
});

function validateContacts(contacts){
    const schema = {
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        phoneNumber: Joi.string().optional(),
        message: Joi.string().required()
    };

    return Joi.validate(contacts, schema);
}

module.exports.Contact = mongoose.model("Contact", contactsSchema);
module.exports.validateContact = validateContacts;
