import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    name: String,
    email: String,
    photo: String,
    rooms: [String],
});

export default mongoose.model("users", userSchema);