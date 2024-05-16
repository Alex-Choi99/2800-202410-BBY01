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

const mailjet = require('node-mailjet').apiConnect(
    process.env.MJ_APIKEY_PUBLIC,
    process.env.MJ_APIKEY_PRIVATE
);

const expireTime = 1 * 60 * 60 * 1000;

const MongoURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_dt_user}`;
const MongoDBSessionURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_dt_sessions}`;

const userModel = require("./user.js");

mongoose.connect(MongoURI, {}).then(res => {
        console.log('MongoDB Connected');
})

app.set('view engine', 'ejs');

const mongoStore = connectMongo.create({
    mongoUrl: MongoDBSessionURI,
    crypto: {
        secret: mongodb_session_secret
    }
});

app.use(express.static(__dirname + "/public"));

app.use(express.urlencoded({ extended: false }));

app.use(session({
        secret: node_session_secret,
        saveUninitialized: false,
        resave: true,
        store: mongoStore,
        cookie: {
            maxAge: expireTime
        }
}));

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

function generateRandomPassword(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?';
    let password = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        password += chars[randomIndex];
    }
    return password;
};

app.get('/', async (req, res) => {
    const result = await userModel.find();
    console.log(result);
    res.render('index', {users: result, user: isValidSession(req)});
});

app.get('/login', (req, res) => {
    var forgor = req.query.type || 'know';
    console.log('forgor type' + forgor);
    res.render('login', { forgor });
});

app.post('/resetConfirm', async (req, res) => {
    try {
        const email = req.body.email;
        const forgor = req.query.type;
        const schema = Joi.string().email().max(30).required();
        const validationResult = schema.validate(email);
        if (validationResult.error != null) {
            console.log(validationResult.error);
            res.render('login', { forgor, errorMessage: "Invalid email." });
            return;
        }

        const result = await userModel.findOne({ email });
        const oldCode = result.tempCode;
        console.log('User info from db'+ result);
        if (!result) {
            console.log("user not found");
            res.render('login', { forgor, errorMessage: 'No user detected.' });
            return;
        }

        // var emailName = ''
        // let i = 0
        // while (i < result.email.length) {
        //     if (result.email[i] == '@') {
        //         break;
        //     }
        //     emailName += result.email[i];
        //     i++
        // }

        var tempCode = generateRandomPassword(10);
        result.tempCode = tempCode;
        await result.save();
        // const vari = 
        //     {
        //         link: `https://2800-202410-bby01.onrender.com/newPassword?${emailName}`,
        //         newPW: newPW,
        //     };
        // const saltRounds = 10;
        // const hashedPassword = await bcrypt.hash(newPW, saltRounds);
        await userModel.updateOne({ email: result.email }, { $set: { tempCode: tempCode } });

        console.log('New tempCode' + tempCode)
        const request = mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: 'bby01.290124@gmail.com',
                        Name: 'LearnXchange',
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
                    // TemplateID: 5969125,
                    // Variables: vari
                },
            ],
        });
        request.then((result) => {
            console.log('Email sent successfully:', JSON.stringify(result.body, null, 2));
        }).catch((err) => {
            console.error('Error sending email:', JSON.stringify(err, null, 2));
        });
        // sendEmail(
        //     result.email,
        //     result.name,
        //     5969125,

        // );
        res.render('resetConfirm');
    } catch (error) {
        console.error('Error in resetConfirm:', error);
        res.render('login', { forgor: 'forgor', errorMessage: 'An error occurred while processing your request.' });
    }    
});

app.get('/newPW', async (req,res) => {
    res.render('newPW');
});

app.post('/newPWSubmit', async (req, res) => {
    const tempCode = req.body.tempCode;
    const newPW = req.body.newPW;
    const confirmPW = req.body.confirmPW;

    const schema = Joi.string().max(30).required();
    const validationResult = schema.validate(tempCode, newPW, confirmPW);
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.render("newPW", { errorMessage: "Password cannot be more than 30." });
        return;
    }

    const findCode = await userModel.findOne({ tempCode });
    if (!findCode){
        res.render("newPW", {errorMessage: "Non existing temporary code."});
        return;
    }

    if (newPW != confirmPW) {
        res.render("newPW", {errorMessage: "new password and confirmation are not matching."});
        return;
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPW, saltRounds);
    await userModel.updateOne({ tempCode: tempCode }, { $set: { password: hashedPassword } });
    res.render('login', { forgor: 'know' });
})

app.get('/signup', (req, res) => {
    res.render('signup');
}
);

app.get('/profile', (req, res) => {
  res.render('profile');
});

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

    console.log('User info from DB' + result);
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

// async function sendEmail(name, email, subject, message) {
//     const data = JSON.stringify({
//       "Messages": [{
//         "From": {"Email": "bby01.290124@gmail.com", "Name": "LearnXchange"},
//         "To": [{"Email": email, "Name": name}],
//         "Subject": subject,
//         "TextPart": message
//       }]
//     });

//     const config = {
//       method: 'post',
//       url: 'https://api.mailjet.com/v3.1/send',
//       data: data,
//       headers: {'Content-Type': 'application/json'},
//       auth: {username: process.env.MJ_APIKEY_PUBLIC , password: process.env.MJ_APIKEY_PRIVATE},
//     };

//     return axios(config)
//       .then(function (response) {
//         console.log(JSON.stringify(response.data));
//       })
//       .catch(function (error) {
//         console.log(error);
//       });

//   }

// define your own email api which points to your server.
app.post('/api/sendemail/', function (req, res) {
    const { name, email, subject, message } = req.body;
    //implement your spam protection or checks.
    sendEmail(name, email, subject, message);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});