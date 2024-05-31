// Defining the constants
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const connectMongo = require("connect-mongo");
const app = express();
require("dotenv").config();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const port = process.env.PORT || 3000;
const cloudinary = require("cloudinary");
const { v4: uuid } = require("uuid");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const bodyParser = require("body-parser");
const Notification = require("./public/js/notifications.js");
const Chat = require("./public/js/chat.js");
const path = require("path");
var isChat = false;
const socketIO = require("socket.io");
app.use(express.static(path.join(__dirname, "public")));

// Defining expressServer to be used with socketIO
const expressServer = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Defining the io variable to be used with socketIO
const io = socketIO(expressServer, {
    cors: {
        origin: (process.env.NODE_ENV === "production" ? false :

            // Socket.io is running on both localhost and on our hosted web server
            ["http://localhost:3025", "https://two800-202410-bby01.onrender.com/"])
    }
});

// Defining all of the environment variables.
const node_session_secret = process.env.NODE_SESSION_SECRET;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_dt_user = process.env.MONGODB_DATABASE_USER;
const mongodb_dt_sessions = process.env.MONGODB_DATABASE_SESSION;
const mongodb_dt_skills = process.env.MONGODB_DATABSE_SKILLS;

// Defining the mailjet variables with their API keys.
const mailjet = require("node-mailjet").apiConnect(
    process.env.MJ_APIKEY_PUBLIC,
    process.env.MJ_APIKEY_PRIVATE
);

// Configuring cloudinary with their API keys.
cloudinary.config({
    api_key: process.env.CLOUDINARY_CLOUD_KEY,
    api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME
});

// Defining the expire time of the session (1 hour)
const expireTime = 1 * 60 * 60 * 1000;

// Building the URI's for the session and the database.
const MongoURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_dt_user}`;
const MongoDBSessionURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true&w=majority&appName=Cluster0/${mongodb_dt_sessions}`;

// Requiring the user model.
const userModel = require("./public/js/user.js");

// Connecting to MongoDB 
mongoose.connect(MongoURI, {}).then(res => {
    console.log("MongoDB Connected");
});

// Allowing for ejs to be rendered.
app.set("view engine", "ejs");

// Defining the mongoStore const and encrypting the session
const mongoStore = connectMongo.create({
    mongoUrl: MongoDBSessionURI,
    crypto: {
        secret: mongodb_session_secret
    }
});

// Allowing for req.body to be used.
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: true }));

// Using the session middleware.
app.use(session({
    secret: node_session_secret,
    saveUninitialized: false,
    resave: true,
    store: mongoStore,
    cookie: {
        maxAge: expireTime
    }
}));

// Function to check if there is a valid session, and returns a boolean.
function isValidSession(req) {
    if (!req.session.authenticated) {
        return false;
    }
    return true;
};

// Function that uses the isValidSession function to either redirect 
// to the login page if there is not session, or let the user continue.
function sessionValidation(req, res, next) {
    var validSession = isValidSession(req);
    if (validSession) {
        next();
    }
    else {
        res.redirect("/login");
    }
};

// Function that generates a random password of a given length.
function generateRandomPassword(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?";
    let password = "";

    // Building the random password.
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        password += chars[randomIndex];
    }
    return password;
};

// Defining what happens when socket.io is connected.
io.on("connection", (socket) => {
    console.log(`user ${socket.id} connected`);

    // Join room function that allows a user to join a specific chat room.
    socket.on("joinRoom", (chatId) => {
        console.log(`user ${socket.id} joining room: ${chatId}`);
        socket.join(chatId);
    });

    // Send message function that allows a user to send a message to a 
    // specific chat room.
    socket.on("sendMessage", async (data) => {
        console.log("inside send message");
        const timestamp = new Date();
        const { chatId, message, senderName } = data;

        console.log(data);
        console.log(senderName);
        console.log(chatId);

        // Updates the chat document with the message
        await Chat.updateOne({ _id: chatId }, {
            $push: { messages: { sender: senderName, message, timestamp } }
        });

        // Calls the recieveMessage function inside of chat.ejs
        io.to(chatId).emit("receiveMessage", { sender: senderName, message, timestamp });
    });

    // Reconnect function 
    socket.on("reconnect", async (email) => {
        console.log(`line 138: ` + email);
        const chat = await Chat.findOne({ participants: email });
        if (chat) {
            const chatId = chat._id.toString();
            socket.emit("chatId", chatId);
        } else {
            console.log("Chat not found");
        }
    });

    // Disconnect function.
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });
});

/*
    - Global variable to check within ejs if there is a valid session.
    - Global incoming Notifications variable to check if the user has any notifications.
    This is used for the notifications icon.
    - Global boolean to check if the user is on chat.ejs, so that we can remove the logout button.
*/
app.use("/", async (req, res, next) => {
    app.locals.user = isValidSession(req);
    app.locals.incomingNotifications = await Notification.find({ recipientEmail: req.session.email });
    app.locals.isChat = false;
    next();
});

//Home page
app.get("/", async (req, res) => {
    isChat = false;
    // Get the user's email from the session
    const userEmail = req.session.email;

    // Find the chats where the user is a participant
    const chat = await Chat.find({ participants: userEmail })
    const notifications = await Notification.find({ senderEmail: userEmail });
    var notificationList = [];
    notifications.forEach(notification => {
        if (notification.senderEmail == userEmail) {
            notificationList.push(notification.recipientEmail);
        }
    });

    // Define the filters and the skillsArray
    const filters = {};
    var skillsArray = [];

    // create a list of users based on skill filters
    if (req.query.skills) {
        if (Array.isArray(req.query.skills)) {
            skillsArray = req.query.skills;
        } else if (typeof req.query.skills === "string") {
            skillsArray = req.query.skills.split(",");
        } else {
            skillsArray = [];
        }
        filters.skills = { $in: skillsArray };
    }

    // Find users based on filters
    const result = await userModel.find(filters);

    // If the user is logged in, build the matchedUsers array
    if (isValidSession(req)) {

        var user = await userModel.findOne({ email: req.session.email });
        var matchedUsers = [];

        for (let i = 0; i < result.length; i++) {
            let connectedUser = user.connected;
            connectedUser.forEach(usr => {
                if (usr.email == result[i].email) {
                    matchedUsers.push(result[i]);
                }
            });
        }
    }

    // Pass variables into index.ejs based on if the user is authenticated.
    if (!isValidSession(req)) {
        res.render("index", { users: result, isChat });
    } else {
        res.render("index", { users: result, isChat, connectedArray: user.connected, chat, matchedUsers, sessionEmail: req.session.email, user, selectedSkills: skillsArray, notificationList: notificationList, notifications });
    }
});

//about us page
app.get("/aboutus", (req, res) => {
    isChat = false;
    res.render("about", { isChat });
});


//easteregg page
app.get("/circle", (req, res) => {
    isChat = false;
    res.render("circle", { isChat });
});

//login page
app.get("/login", (req, res) => {
    isChat = false;

    // Variable to check if the user remembers their info.
    var forgor = req.query.type;
    res.render("login", { forgor, isChat, errorMessage: "", user: isValidSession(req) });
});

//login post
app.post("/loginSubmit", async (req, res) => {
    isChat = false;
    const { loginID, password } = req.body;

    //Joi schema to validate the login Id and password
    const schema = Joi.object({
        loginID: Joi.string().max(30).required(),
        password: Joi.string().max(30).required()
    })

    // Validate the login ID and password based on the schema
    const validationResult = schema.validate({ loginID, password });

    // If there is a validation error, return the error message.
    if (validationResult.error != null) {
        res.render("login", { forgor: "know", isChat, errorMessage: "Input must be less than 30 characters." });
        return;
    }

    // Find the user either with the email or the user ID
    const result = await userModel.findOne({
        $or: [
            { email: loginID },
            { userId: loginID }
        ]
    }).exec();

    // If the user is not found return the error message.
    if (!result) {
        res.render("login", { forgor: "know", isChat, errorMessage: "No User Detected" });
        return;
    }

    // Compare the password to check if it is correct,
    // create a session and redirect the user to the home page.
    if (await bcrypt.compare(password, result.password)) {
        req.session.authenticated = true;
        req.session.name = result.name;
        req.session.email = result.email;
        req.session.userId = result.userId;
        req.session.image_id = result.image_id;
        req.session.cookie.maxAge = expireTime;
        req.session.image = result.image;
        res.redirect("/");
        return;
    }
    else {
        res.render("login", { forgor: "know", isChat, errorMessage: "Incorrect Password" });
        return;
    }
});

// Reset password page
app.post("/resetConfirm", async (req, res) => {
    isChat = false;
    // Find a user with their submitted email
    const email = req.body.email;
    const forgor = req.query.type;
    const schema = Joi.string().email().max(30).required();
    const validationResult = schema.validate(email);

    // If there is a validation error, return invalid email.
    if (validationResult.error != null) {
        res.render("login", { forgor, isChat, errorMessage: "Invalid email." });
        return;
    }

    // If there is no user with the submitted email, return no user detected.
    const result = await userModel.findOne({ email });
    if (!result) {
        res.render("login", { forgor, isChat, errorMessage: "No user detected." });
        return;
    }

    // Generate a random password
    var tempCode = generateRandomPassword(10);
    result.tempCode = tempCode;
    await result.save();
    await userModel.updateOne({ email: result.email }, { $set: { tempCode: tempCode } });

    // Using mailjet, send an email to the user with the temporary code.
    const request = mailjet.post("send", { version: "v3.1" }).request({
        Messages: [
            {
                From: {
                    Email: "bby01.290124@gmail.com",
                    Name: "LearnXchange",
                },
                To: [
                    {
                        Email: result.email,
                        Name: result.name,
                    },
                ],
                Subject: `Password reset`,
                TextPart: `Your new temporary code is ${tempCode}
                http://localhost:3025/newPW
                `,
                TemplateID: 6005138
            },
        ],
    });

    res.render("login", { forgor: "", isChat, errorMessage: "" });
});

// Create new password page
app.get("/newPW", async (req, res) => {
    isChat = false;
    res.render("newPW", { isChat });
});

// Post new password
app.post("/newPWSubmit", async (req, res) => {
    isChat = false;

    // Gets the temporary code, new password, and confirmation of the new password.
    const tempCode = req.body.tempCode;
    const newPW = req.body.newPW;
    const confirmPW = req.body.confirmPW;

    // Joi validation
    const schema = Joi.string().max(30).required();
    const validationResult = schema.validate(tempCode, newPW, confirmPW);

    // If there is a validation error, return the error message.
    if (validationResult.error != null) {
        res.render("newPW", { isChat, errorMessage: "Password cannot be more than 30." });
        return;
    }

    // Find the user with the temporary code
    const findCode = await userModel.findOne({ tempCode });
    if (!findCode) {
        res.render("newPW", { isChat, errorMessage: "Non existing temporary code." });
        return;
    }

    // Check if the new password and confirmation of the new password are matching
    if (newPW != confirmPW) {
        res.render("newPW", { isChat, errorMessage: "new password and confirmation are not matching." });
        return;
    }

    // Hash the new password and save it to the database
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPW, saltRounds);
    await userModel.updateOne({ tempCode: tempCode }, { $set: { password: hashedPassword } });
    
    res.render("login", { isChat, forgor: "know" });
});

// Sign up page
app.get("/signup", (req, res) => {
    isChat = false;
    res.render("signup", { isChat });
});

// Sign up post
app.post("/signupSubmit", async (req, res) => {
    isChat = false;
    const { name, userId, email, password } = req.body;
    const date = new Date();

    // Define the current date.
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let currentDate = `${day}-${month}-${year}`;

    // Joi schema
    const schema = Joi.object({
        name: Joi.string().max(40).required(),
        userId: Joi.string().max(40).required(),
        email: Joi.string().max(40).email().required(),
        password: Joi.string().max(40).required()
    });

    // Validate the name, user ID, email, and password based on the schema.
    const validationResult = schema.validate({ name, userId, email, password });

    // If there is a validation error, return the error message.
    if (validationResult.error != null) {
        res.render("signup", { isChat, errorMessage: "Please input valid info." });
    } else {

        // Check whether the user already exists in the database
        let user = await userModel.findOne({ email });
        if (user) {
            res.render("signup", { isChat, errorMessage: "user with that email already exists in our record." });
            return;
        }

        // Hash the password
        const hashedPass = await bcrypt.hash(password, 12);
        user = new userModel({
            name,
            userId,
            email,
            password: hashedPass,
            joinDate: currentDate
        });

        // Save the user to the database and set the session's info
        await user.save();

        req.session.authenticated = true;
        req.session.email = user.email;
        req.session.name = user.name;
        req.session.userId = user.userId;
        req.session.cookie.maxAge = expireTime;

        res.redirect("selectSkills");
        return;
    }
});

// selectSkills page
app.use("/selectSkills", sessionValidation);
app.get("/selectSkills", (req, res) => {
    isChat = false;
    res.render("selectSkills", { isChat });
});

// selectSkills post
app.post("/setTags", async (req, res) => {
    isChat = false;

    // Find a user with the session email
    const user = await userModel.findOne({ email: req.session.email });

    // Extract tags from the request body
    const { skill1, skill2, skill3, skill4, skill5, skill6 } = req.body;

    // Create an array of selected skills
    const selectedSkills = [skill1, skill2, skill3, skill4, skill5, skill6].filter(skill => skill);

    // Update user's skills
    user.skills = selectedSkills;
    await user.save();

    res.redirect("/");
});

// Profile page
app.use("/profile", sessionValidation);
app.get("/profile", async (req, res) => {
    isChat = false;
    req.session.cookie.maxAge = expireTime;

    var email = req.session.email;
    var user = await userModel.findOne({ email });

    // Apply transformation to the user's profile picture.
    // Checks if the user has a profile picture.
    if (user && user.image_id) {
        const imageUrl = cloudinary.url(user.image_id, {
            transformation: [
                { aspect_ratio: "1:1", gravity: "auto", width: 120, crop: "fill" },
                { radius: "max", border: "5px_solid_grey" }
            ]
        });

        user.imageUrl = imageUrl;
    }

    res.render("profile", { user, isChat, skills: user.skills });
});

// Profile picture post
app.post("/setProfilePic", upload.single("image"), async (req, res, next) => {
    isChat = false;
    // Generate a random UUID for the image.
    let image_uuid = uuid();
    let email = req.session.email;
    let doc = await userModel.findOne({ email });

    // If there is no file uploaded.
    if (!req.file) {
        res.redirect("profile");
        return;
    }

    // Upload the image to cloudinary
    // buf64 gets the binary of the image file uploaded (req.file.buffer)
    let buf64 = req.file.buffer.toString("base64");
    stream = cloudinary.uploader.upload("data:image/octet-stream;base64," + buf64, async function (result) {
        
    // Update the user's image_id in the database.
    const success = await userModel.updateOne({ email: email }, { $set: { image_id: image_uuid } });
    if (!success) {
    } else {
        req.session.image = image_uuid;
        res.redirect("profile");
    }
// Setting the public id of the image in cloudinary to the iamge_uuid
    }, { public_id: image_uuid }
    );
});

// Set user's skills pst
app.post("/setSkill", async (req, res) => {
    isChat = false;
    // Find a user with the session email and update the user's skills
    let email = req.session.email;
    const newSkills = req.body.setSkill.split(",").map(skill => skill.trim());
    const success = await userModel.updateOne({ email: email }, { $set: { skills: newSkills } });
    
    if (!success) {
        console.log("Error uploading to MongoDB");
    } else {
        res.redirect("profile");
    }
});

// Update user's description post
app.post("/editDescription", async (req, res) => {
    isChat = false;
    const newDesc = req.body.newDesc;
    const user = await userModel.findOne({ email: req.session.email });

    // If the user exists, update the user's description and save it to the database.
    if (user) {
        user.description = newDesc;
        await user.save();
        res.redirect("/profile");
    } else {
        res.status(404).send("User not found");
    }
});

// Update user's name post
app.post("/editName", async (req, res) => {
    isChat = false;
    const newName = req.body.newName;
    const user = await userModel.findOne({ email: req.session.email });

    // If the user exists, update the user's name and save it to the database.
    if (user) {
        user.name = newName;
        await user.save();
        res.redirect("/profile");
    } else {
        res.status(404).send("User not found");
    }
});

// Send match request post
app.post("/requestSent", async (req, res) => {
    isChat = false;
    const recipientEmail = req.body.recipientEmail; 
    const senderEmail = req.session.email;

    // Create a notification using the model
    const notification = new Notification({
        recipientEmail,
        senderEmail,
        message: ` has sent you a match request.`
    });

    // Save the notification to the database
    await notification.save();

    // Send an email notification to the recipient's email
    const request = mailjet.post("send", { version: "v3.1" }).request({
        Messages: [
            {
                From: {
                    Email: "bby01.290124@gmail.com",
                    Name: "LearnXchange",
                },
                To: [
                    {
                        Email: recipientEmail,
                        Name: recipientEmail, // You can customize the recipient's name if available
                    },
                ],
                Subject: "New Match Request",
                TextPart: `You have received a new match request from ${senderEmail}.`,
                TemplateID: 6009357,
            },
        ],
    });

    // Do a status 202 because we dont want to redirect back to the same page.
    res.status(202);
});

// Notification page
app.use("/notifications", sessionValidation);
app.get("/notifications", async (req, res) => {
    isChat = false;
    const email = req.session.email;

    // Getting all of the notications of the user. 
    const notifications = await Notification.find({ recipientEmail: email, read: false });

    res.render("notifications", { isChat, notifications });
});

// Accept match request post
app.post("/acceptRequest", async (req, res) => {
    isChat = false;
    const { notificationId } = req.body;
    const recipientEmail = req.session.email; 
    
    // Get all of the variables required.
    const notification = await Notification.findById(notificationId);
    const senderEmail = notification.senderEmail;
    const recipient = await userModel.findOne({ email: recipientEmail });
    const sender = await userModel.findOne({ email: senderEmail });
    
    // Check if chat already exists between these users
    let chat = await Chat.findOne({
        participants: { $all: [notification.senderEmail, notification.recipientEmail] }
    });

    // If there is no notification, or if the notification doesn't belong to the user, return a 404 error. 
    if (!notification || notification.recipientEmail !== recipientEmail) {
        return res.render("404");
    }

    // If chat doesn't exist, create a new one
    if (!chat) {

        // Create a chat and save it to the database.
        chat = new Chat({
            participants: [notification.senderEmail, notification.recipientEmail],
            messages: []
        });
        await chat.save();

        // Update the connected users array in both the recipient and sender's document.
        await userModel.updateOne({ email: recipientEmail }, {
            $push:
                { connected: { name: sender.name, email: senderEmail, date: new Date(), chatID: chat.id } }
        });
        await userModel.updateOne({ email: senderEmail }, {
            $push: { connected: { name: recipient.name, email: recipientEmail, date: new Date(), chatID: chat.id } }
        });
    }

    // Delete the notification from the database
    await Notification.deleteOne({ _id: notificationId });

    res.redirect(`/chat/${chat._id}`);
});

// Deny match request post
app.post("/denyRequest", async (req, res) => {
    isChat = false;
    const notificationId = req.body.notificationId;

    // Delete the notification from the database.
    await Notification.deleteOne({ _id: notificationId });
    res.redirect("/notifications");
});

// Chat page
app.get("/chat/:id", async (req, res) => {
    // Set isChat variable to true to remove the logout button
    // (This is because logout button causes socket.io to break)
    isChat = true;

    // Define the required constants to find the chat
    const ID = req.params.id;
    const email = req.session.email;
    const user = await userModel.findOne({ email: email });
    const chat = await Chat.findById(ID);
    
    if (!chat) {
        return res.render("404");
    }
    res.render("chat", { isChat, chat, chatId: ID, user });
});

// Unmatch with a matched user post
app.post("/unmatch", async (req, res) => {
    isChat = false;
    const email = req.session.email;
    const unmatchedEmail = req.body.unmatch;

    // Remove the user from the connected array in both the sender and recipient's document.
    await userModel.updateOne({ email: email }, {
        $pull: { connected: { email: unmatchedEmail } }
    });
    await userModel.updateOne({ email: unmatchedEmail }, {
        $pull: { connected: { email: email } }
    });

    // Delete the chat from the database.
    await Chat.deleteOne({ participants: { $all: [email, unmatchedEmail] } });
    res.redirect("/");
});

// Rate page
app.get("/rate/:email", async (req, res) => {
    isChat = false;
    const ratedUserEmail = req.params.email;
    const user = await userModel.findOne({ email: ratedUserEmail });
    res.render("rate", { isChat, user });
});

// Rate a user post
app.post("/rateSubmit", async (req, res) => {
    isChat = false;
    const currentUser = req.session.email;
    const rateValue = req.body.rateValue;
    const feedback = req.body.feedback;
    const ratedUserEmail = req.body.ratedUserEmail;
    const ratedUser = await userModel.findOne({ email: ratedUserEmail });

    // If the user exists, update the user's rating and save it to the database.
    if (ratedUser) {
        ratedUser.rate.push({
            email: currentUser,
            rating: rateValue,
            date: new Date(),
            feedback: feedback
        });
        await ratedUser.save();

        const filters = {};

        // If the user has a skill filter, add it to the filters.
        if (req.query.skills) {
            filters.skills = { $in: req.query.skills.split(",") };
        }
        res.redirect("/");
    } else {
        res.status(404).send("User not found");
    }
});

// Logout post
app.post("/logout", (req, res) => {
    isChat = false;
    req.session.destroy((err) => {
        if (err) {
            throw err;
        }
        res.redirect("/");
    });
});

// 404 page
app.get("*", (req, res) => {
    isChat = false;
    res.render("404", { isChat });
});