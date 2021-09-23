// this file is used to clean up the data base, run it to empty the data base

import mongoose from "mongoose";
import Rooms from "./roomsCollection.js";
import Users from "./userCollection.js";

const connection_url =
    "mongodb+srv://admin:<password>@cluster0.db5pt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

mongoose.connect(connection_url, {
    userCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;

console.log("deleting the users");
db.collection("users").deleteMany({});
console.log("deleteing the rooms");
db.collection("rooms").deleteMany({});
console.log("done");
