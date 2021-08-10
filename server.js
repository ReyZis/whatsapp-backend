// importing
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Pusher from "pusher";

//app config
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
    appId: "1247802",
    key: "b9cd2c6dddef57e9452d",
    secret: "e474f660add30373934e",
    cluster: "eu",
    useTLS: true,
});

//middleware
app.use(express.json());

// DB config
const connection_url =
    "mongodb+srv://admin:hsAVCnIy2r1MRFeT@cluster0.db5pt.mongodb.net/whatsapp_db?retryWrites=true&w=majority";

mongoose.connect(connection_url, {
    userCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;

db.once("open", () => {
    console.log("db connected");

    const msgCollection = db.collection("messagecontents");
    const changeStream = msgCollection.watch();

    changeStream.on("change", (change) => {
        console.log(change);
    });
});

// api routes
app.get("/", (req, res) => res.status(200).send("hello world"));

app.get("/messages/sync", (req, res) => {
    Messages.find((err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.post("/messages/new", (req, res) => {
    const dbMessage = req.body;
    Messages.create(dbMessage, (err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(201).send(data);
        }
    });
});

// listener
app.listen(port, () => console.log(`Lestining on localhost:${port}`));
