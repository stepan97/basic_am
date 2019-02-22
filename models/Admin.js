const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");
const Joi = require("joi");

const adminSchema = new mongoose.Schema({
    username: {type: String, required: true},
    password: {type: String, required: true},
    isAdmin: {type: Boolean, default: false},
    forgotPassword: {
        type: String,
        required: false
    }
});

adminSchema.methods.generateAuthToken = function(){
    const token = jwt.sign(
        { _id: this._id, username: this.username},
        config.get("basicItCenterJwtPrivateKey")
    );
    
    return token;
};

function validateAdmin(admin){
    const schema = {
        username: Joi.string().min(3).required(),
        password: Joi.string().min(3).required()
    };

    return Joi.validate(admin, schema);
}

module.exports.Admin = mongoose.model("Admin", adminSchema);
module.exports.validateAdmin = validateAdmin;