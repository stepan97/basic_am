const {allowedMimeTypes} = require("../constants") ;

module.exports = function(type){
    if(!allowedMimeTypes.includes(type)){
        // console.log("allowedMimeTypes does not include " + type);
        let types = "";
        for(const key of allowedMimeTypes)
            types += " " + key;
        const err = new Error("Invalid image type. Need to be one of these:" + types);
        err.status = 400;
        return err;
    }

    return undefined;
};