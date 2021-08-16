// importing
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Rooms from "./roomsCollection.js";
import Users from "./userCollection.js";
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

    const usersCollection = db.collection("users");
    const usersChangeStream = usersCollection.watch();
    console.log("users connected");

    const roomCollection = db.collection("rooms");
    const roomChangeStream = roomCollection.watch();
    console.log("rooms connected");

    roomChangeStream.on("change", (change) => {
        // console.log("a room change occured:", change);

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

app.post("/rooms/sync", (req, res) => {
    const user = req.body;
    console.log("searching for rooms for this email", req.body.email);
    Rooms.find(
        { $or: [{ userOne: user.email }, { userTwo: user.email }] },
        (err, data) => {
            if (err) {
                res.status(500).send(err);
            } else {
                console.log(data);
                res.status(200).send(data);
            }
        }
    );
});

app.post("/rooms/new", (req, res) => {
    const roomDetails = req.body;
    Rooms.findOne(
        {
            userOne: roomDetails.userOne,
            userTwo: roomDetails.userTwo,
        },
        (err, foundRoom) => {
            if (err) {
                console.log(err);
            } else {
                console.log("figuring if the room already exist", roomDetails);
                if (!foundRoom) {
                    Rooms.create(roomDetails, (err, newRoom) => {
                        if (err) {
                            res.status(500).send(err);
                        } else {
                            db.collection("users").updateMany(
                                {
                                    $or: [
                                        { email: roomDetails.userOne },
                                        { email: roomDetails.userTwo },
                                    ],
                                },
                                {
                                    $addToSet: {
                                        rooms: newRoom._id.toString(),
                                    },
                                }
                            );
                            res.status(201).send(newRoom);
                        }
                    });
                } else {
                    res.send("this room already exist");
                }
            }
        }
    );
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

app.post("/users/new", (req, res) => {
    const userDetails = req.body;
    Users.findOne({ email: userDetails.email }, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (!foundUser) {
                Users.create(userDetails, (err, data) => {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        console.log("a new user has been inserted", data);
                        res.status(201).send(data);
                    }
                });
            } else {
                res.send("this user already exist");
            }
        }
    });
});

app.post("/users/sync", (req, res) => {
    const user = req.body;
    Users.findOne({ email: user.email }, (err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            console.log(data);
            res.status(200).send(data);
        }
    });
});

// listener
app.listen(port, () => console.log(`Lestining on localhost:${port}`));
