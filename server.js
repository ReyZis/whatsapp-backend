// importing
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Rooms from "./dbRooms.js";
import Pusher from "pusher";
import cors from "cors";

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
app.use(cors());

// DB config
const connection_url =
    "mongodb+srv://admin:YASoNldXC1ZmznVW@cluster0.db5pt.mongodb.net/whatsapp_db?retryWrites=true&w=majority";

mongoose.connect(connection_url, {
    userCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;

db.once("open", () => {
    console.log("db connected");

    const roomCollection = db.collection("rooms");
    const roomChangeStream = roomCollection.watch();
    console.log("rooms connected");

    roomChangeStream.on("change", (change) => {
        console.log("a room change occured:", change);

        if (change.operationType === "insert") {
            const roomDetails = change.fullDocument;
            pusher.trigger("rooms", "inserted", {
                name: roomDetails.name,
                photo: roomDetails.photo,
                lastMessage: roomDetails.lastMessage,
            });
        } else {
            console.log("error triggering pusher");
        }
    });

    const msgCollection = db.collection("messagecontents");
    const msgChangeStream = msgCollection.watch();
    console.log("messagecontents connected");

    msgChangeStream.on("change", (change) => {
        console.log("a message change occured:", change);

        if (change.operationType === "insert") {
            const messageDetails = change.fullDocument;
            pusher.trigger("messages", "inserted", {
                name: messageDetails.name,
                message: messageDetails.message,
                timestamp: messageDetails.timestamp,
                received: messageDetails.received,
            });
        } else {
            console.log("error triggering pusher");
        }
    });
});

// api routes
app.get("/", (req, res) => res.status(200).send("hello world"));

app.get("/rooms/sync", (req, res) => {
    Rooms.find((err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.get("/messages/sync", (req, res) => {
    Messages.find((err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.post("/rooms/new", (req, res) => {
    const roomDetails = req.body;
    console.log(roomDetails);
    Rooms.create(roomDetails, (err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(201).send(data);
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
