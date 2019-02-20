const mongoose = require("mongoose");

module.exports = function(){
    mongoose.connect("mongodb://127.0.0.1:27017/basic_am", {useNewUrlParser: true, useFindAndModify: false})
        .then(
            () => console.log("connected to db..."), 
            (reason) => console.log("could not connect to mongodb. reason: " + reason)
        )
        .catch(err => console.log("could not connect to db. err: " + err));
};