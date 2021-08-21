import mongoose from "mongoose";

const messageSchema = mongoose.Schema(
    {
        message: String,
        name: String,
    },
    {
        timestamps: true,
    }
);

const roomSchema = mongoose.Schema({
    userOne: String,
    userTwo: String,
    messages: [messageSchema],
    lastMessage: String,
});

export default mongoose.model("rooms", roomSchema);
