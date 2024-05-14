const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const connectMongo = require('connect-mongo');
const app = express();
require('dotenv').config();
const Joi = require("joi");
const bcrypt = require('bcrypt');
const port = process.env.PORT || 3000;

const node_session_secret = process.env.NODE_SESSION_SECRET;

const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_dt_user = process.env.MONGODB_DATABASE_USER;
const mongodb_dt_sessions = process.env.MONGODB_DATABASE_SESSION;

const expireTime = 1 * 60 * 60 * 1000;

const MongoURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_dt_user}`;
const MongoDBSessionURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_dt_sessions}`;

const userModel = require("./user.js");

mongoose.connect(MongoURI, {
})
    .then(res => {
        console.log('MongoDB Connected');
    })
    
app.set('view engine', 'ejs');

const mongoStore = connectMongo.create({
    mongoUrl: MongoDBSessionURI,
    crypto: {
        secret: mongodb_session_secret
    }
});

app.use(express.urlencoded({ extended: false }));

app.use(
    session({
        secret: node_session_secret,
        saveUninitialized: false,
        resave: true,
        store: mongoStore,
        cookie: {
            maxAge: expireTime
        }
    }
    ));

function isValidSession(req) {
    if (!req.session.authenticated) {
        return false;
    }
    return true;
};

function sessionValidation(req, res, next) {
    console.log("Is this a valid session?", isValidSession(req));
    var validSession = isValidSession(req);
    if (validSession) {
        next();
    }
    else {
        res.redirect('/login');
    }
};

app.get('/login', (req, res) => {
    res.render('login');
    }
);

app.get('/signup', (req, res) => {
    res.render('signup');
    }
);

// app.use('/');
app.get('/', (req, res) => {
    res.render('/');
    } 
);

app.post('/signupSubmit', async (req, res) => {
    const { name, email, password } = req.body;

    const schema = Joi.object({
        name: Joi.string().max(40).required(),
        email: Joi.string().max(40).email().required(),
        password: Joi.string().max(40).required()
    });

    const validationResult = schema.validate({ name, email, password });
    console.log('all good');
    if (validationResult.error != null) {
        res.render("submitSignUp", { name: name, email: email, password: password });
        /* html += `
        <form action='/signup' method='get'>
            <button>Try Again</button>
        </form>`;
        res.send(html);
        return; */

    } else {

        let user = await userModel.findOne({ email });

        if (user) {
            res.redirect('/signup');
            return;
        }

        const hashedPass = await bcrypt.hash(password, 12);

        user = new userModel({
            name,
            email,
            password: hashedPass,
        });

        await user.save();
        req.session.authenticated = true;
        req.session.email = email;
        req.session.name = user.name;
        req.session.cookie.maxAge = expireTime;
        res.redirect('/login');
        return;
    }

});

app.post('/loginSubmit', async (req, res) => {
    const { email, password } = req.body;

    const schema = Joi.string().max(30).required();
    const validationResult = schema.validate(email, password);
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.render("loginSubmit", { errorMessage: "Invalid email/password combination" });
        return;
    }
    const result = await userModel.find({ email: email }).exec();

    console.log(result);
    if (result.length != 1) {
        console.log("user not found");
        res.render("loginSubmit", { errorMessage: "No User Detected" });
        return;
    }

    if (await bcrypt.compare(password, result[0].password)) {
        console.log("correct password");
        req.session.authenticated = true;
        req.session.email = result[0].email;
        req.session.name = result[0].name;
        req.session.cookie.maxAge = expireTime;
        req.session.skills = result[0].skills;
        console.log("Result:", result[0].skills);
        // console.log(req.session);
        res.redirect('/');
        return;
    }
    else {
        console.log("incorrect password");
        res.render("loginSubmit", { errorMessage: "Incorrect Password" });
        return;
    }

});

app.listen(port, () => {
    console.log('Server is running on port ${port}');
});