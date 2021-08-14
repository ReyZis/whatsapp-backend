import mongoose from "mongoose";

const roomSchema = mongoose.Schema({
    name: String,
    photo: String,
    lastMessage: String,
});

export default mongoose.model("rooms", roomSchema);
