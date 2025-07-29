const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");


const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true, // no duplicate usernames
        lowercase: true, // auto converts to lowercase
        trim: true 
    },
    password: {
        type: String,
        required: true
    }
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next(); // skip if password not modified
    const salt = await bcrypt.genSalt(12); // generate salt (12 rounds)
    this.password = await bcrypt.hash(this.password, salt); // hash + salt
    next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
