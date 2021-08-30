// importing
import express from "express";
import mongoose from "mongoose";
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
        console.log("a room change occured:", change);

        if (change.operationType === "update") {
            const updatedField = change.updateDescription.updatedFields;
            const messageDetails = updatedField[Object.keys(updatedField)[0]];

            console.log("a new message came:", messageDetails);

            if (Array.isArray(messageDetails)) {
                pusher.trigger("rooms", "new message", {
                    name: messageDetails[0].name,
                    message: messageDetails[0].message,
                    createdAt: messageDetails[0].createdAt,
                    updatedAt: messageDetails[0].updatedAt,
                });
            } else {
                pusher.trigger("rooms", "new message", {
                    name: messageDetails.name,
                    message: messageDetails.message,
                    createdAt: messageDetails.createdAt,
                    updatedAt: messageDetails.updatedAt,
                });
            }
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

app.post("/messages/sync", (req, res) => {
    const _id = req.body._id;
    Rooms.findOne({ _id }, (err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            if (data) {
                console.log("this is the messages list", data.messages);
                res.status(200).send(data.messages);
            } else {
                console.log("messages list not found");
                res.status(404).send("not found");
            }
        }
    });
});

app.post("/messages/new", (req, res) => {
    const { _id, name, message } = req.body;
    Rooms.updateOne(
        { _id },
        {
            $push: {
                messages: {
                    name,
                    message,
                },
            },
        },
        (err, data) => {
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(201).send(data);
            }
        }
    );
});

app.post("/users/new", (req, res) => {
    const userDetails = req.body;
    Users.findOne({ email: userDetails.email }, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (!foundUser) {
                Users.create(userDetails, (error, data) => {
                    if (error) {
                        res.status(500).send(error);
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
