const config = require("config");

module.exports = function() {
    if (!config.get("basicItCenterJwtPrivateKey")) throw new Error("FATAL ERROR: jwtPrivateKey is not defined.");
    if(!config.get("mailer.host")) throw new Error("FATAL ERROR: Mail host is not defined.");
    if(!config.get("mailer.clientId")) throw new Error("FATAL ERROR: Mail client id is not defined.");
    if(!config.get("mailer.clientPassword")) throw new Error("FATAL ERROR: Mail client password is not defined.");
};