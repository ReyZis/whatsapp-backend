import mongoose from "mongoose";

const roomSchema = mongoose.Schema({
    userOne: String,
    userTwo: String,
    lastMessage: String,
});

export default mongoose.model("rooms", roomSchema);
