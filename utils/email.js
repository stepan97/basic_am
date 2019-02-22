const Email = require("email-templates");
const Joi = require("joi");

const email = new Email({
    message: {
        from: "contacts@basic.am"
    },
    // uncomment below to send emails in development/test env:
    send: true,
    preview: false,
    transport: {
        secure: true,
        host: "smtp.gmail.com",
        port: 465,
        auth: {
            user: "n.stepan.97@gmail.com",
            pass: "SVANKOD97"
        }
    },
    views: {
        options: {
            extension: "ejs"
        }
    }
});

function validate(data){
    const schema = {
        to: Joi.string(),
        name: Joi.string().min(3).required(),
        email: Joi.string().min(3).email().required(),
        phone: Joi.string().required(),
        message: Joi.string().min(3).required()
    };

    return Joi.validate(data, schema);

    // return "ok";
}

function sendEmail(data){
    return new Promise((resolve) => {
        email
            .send({
                template: "contact_us",
                message: {
                    to: data.to
                },
                locals: {
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    message: data.message
                }
            })
            .then(resolve(undefined))
            .catch(err => resolve(err));
    });
}

function forgotPasswordEmail(data){
    return new Promise((resolve) => {
        email
            .send({
                template: "forgot_password",
                message: {
                    to: data.to
                },
                locals: {
                    username: data.username,
                    url: data.url,
                    password: data.password
                }
            })
            .then(resolve(undefined))
            .catch(err => resolve(err));
    });
}

module.exports.sendEmail = sendEmail;
module.exports.validateEmail = validate;
module.exports.forgotPasswordEmail = forgotPasswordEmail;