const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require("./user");

const blogSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    content:{
        type: String,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to User model
        required: true
    }
});

module.exports = mongoose.model("Blog", blogSchema);