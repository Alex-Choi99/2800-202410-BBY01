const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const connectMongo = require('connect-mongo');
const app = express();
require('dotenv').config();
const Joi = require("joi");
const bcrypt = require('bcrypt');
const port = process.env.PORT || 3000;
const cloudinary = require('cloudinary');
const {v4: uuid} = require('uuid');

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

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_CLOUD_KEY,
    api_secret: process.env.CLOUDINARY_CLOUD_SECRET
});

const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

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
}

// const sendEmail = (recipientEmail, recipientName, templateId, templateVariables) => {
//     const request = mailjet.post('send', { version: 'v3.1' }).request({
//         Messages: [
//             {
//                 From: {
//                     Email: 'bby01.290124@gmail.com',
//                     Name: 'LearnXchange',
//                 },
//                 To: [
//                     {
//                         Email: recipientEmail,
//                         Name: recipientName,
//                     },
//                 ],
//                 Subject: 'Test Email from Mailjet and Node.js',
//                 TemplateID: templateId,
//                 Variables: templateVariables,
//                 TemplateLanguage: true,
//             },
//         ],
//     });
//     request.then((result) => {
//         console.log('Email sent successfully:', JSON.stringify(result.body, null, 2));
//     }).catch((err) => {
//         console.error('Error sending email:', JSON.stringify(err, null, 2));
//     });
// };



// app.post('/login/:type', async (req, res) => {
//     const forgorType = req.params.type;
//     await 
//     res.redirect('/login', { forgorType });
// });

app.get('/', async (req, res) => {
    const result = await userModel.find();
    console.log(result);
    res.render('main', { users: result });
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
        console.log('User info from db' + result);
        if (!result) {
            console.log("user not found");
            res.render('login', { forgor, errorMessage: 'No user detected.' });
            return;
        }

        var emailName = ''
        let i = 0
        while (i < result.email.length) {
            if (result.email[i] == '@') {
                break;
            }
            emailName += result.email[i];
            i++
        }

        var newPW = generateRandomPassword(10);
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPW, saltRounds);

        const vari =
        {
            link: `https://2800-202410-bby01.onrender.com/newPassword?${emailName}`,
            newPW: newPW,
        };

        await userModel.updateOne({ email: email }, { $set: { password: hashedPassword } });
        console.log('hashed Password' + hashedPassword)
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
                    TextPart: `Your new password is ${newPW}
                    http://localhost:3025/newPW
                    `,
                    // TemplateID: 5969125,
                    Variables: vari
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
        res.render('login', { forgor, errorMessage: 'An error occurred while processing your request.' });
    }


});

app.get('/signup', (req, res) => {
    res.render('signup');
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
        req.session.image = result[0].image;
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

app.get('/profile', async (req, res) => {
    let email = req.session.email;
    var user = await userModel.findOne({email});
    res.render('profile', {user: user});
});

app.post('/setProfilePic', upload.single('image'), (req, res, next) => {
    let image_uuid = uuid();
    let email = req.session.email;
    let user = userModel.findOne({email});
    let buf64 = req.file.buffer.toString('base64');
    stream = cloudinary.uploader.upload("data:image/png;base64," + buf64, function (result) {
        console.log(result);
    });

});
// app.post('/picUpload', upload.single('image'), (req, res, next) => {
//     console.log('Request received for /picUpload');
//     let buf64 = req.file.buffer.toString('base64');
//     stream = cloudinary.uploader.upload("data:image/png;base64," + buf64, function (result) {
//         console.log(result);
//         // res.send('Done:<br/> <img src="' + result.url + '"/><br/>' +
//         //     cloudinary.image(result.public_id, { format: "png", width: 100, height: 130, crop: "fit" }));
//     }, { public_id: req.body.title });     
     
//     console.log(req.body);
//     console.log(req.file);
// });

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});