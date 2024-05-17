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
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const node_session_secret = process.env.NODE_SESSION_SECRET;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_dt_user = process.env.MONGODB_DATABASE_USER;
const mongodb_dt_sessions = process.env.MONGODB_DATABASE_SESSION;
const mongodb_dt_skills = process.env.MONGODB_DATABSE_SKILLS;

const mailjet = require('node-mailjet').apiConnect(
    process.env.MJ_APIKEY_PUBLIC,
    process.env.MJ_APIKEY_PRIVATE
);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_CLOUD_KEY,
    api_secret: process.env.CLOUDINARY_CLOUD_SECRET
});

const expireTime = 1 * 60 * 60 * 1000;

const MongoURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_dt_user}`;
const MongoDBSessionURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_dt_sessions}`;
const MongoDBSkillsURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_dt_skills}`;

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

app.get('/aboutus', (req, res) => {
    res.render('about');
});

app.get('/login', (req, res) => {
    var forgor = req.query.type;
    console.log('forgor type' + forgor);
    res.render('login', { forgor, errorMessage: '' });
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
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signupSubmit', async (req, res) => {
    const { name, id, email, password } = req.body;

    const schema = Joi.object({
        name: Joi.string().max(40).required(),
        id: Joi.string().max(40).required(),
        email: Joi.string().max(40).email().required(),
        password: Joi.string().max(40).required()
    });

    const validationResult = schema.validate({ name, id, email, password });
    console.log('all good');
    if (validationResult.error != null) {
        //{ name: name, email: email, id: id, password: password }
        res.render("signup", { errorMessage: 'user with that email already exists in our record.'});
        /* html += `
        <form action='/signup' method='get'>
            <button>Try Again</button>
        </form>`;
        res.send(html);
        return; */
    } else {
        let user = await userModel.findOne({ email });
        if (user) {
            res.render('signup', { errorMessage: 'user with that email already exists in our record.'});
            return;
        }

        const hashedPass = await bcrypt.hash(password, 12);
        user = new userModel({
            name,
            id,
            email,
            password: hashedPass,
        });

        await user.save();
        req.session.authenticated = true;
        req.session.email = user.email;
        req.session.name = user.name;
        req.session.id = user.id;
        req.session.cookie.maxAge = expireTime;
        res.redirect('selectSkills');
        return;
    }
});

app.post('/loginSubmit', async (req, res) => {
    const { loginID, password } = req.body;
    console.log(loginID + password);

    const schema = Joi.object({
        loginID: Joi.string().max(30).required(),
        password: Joi.string().max(30).required()
    })
    const validationResult = schema.validate({loginID, password});
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.render("login", { forgor: 'know', errorMessage: "Input must be less than 30 characters." });
        return;
    }
    const result = await userModel.findOne({
        $or: [
            { email: loginID },
            { id: loginID }
        ]
    }).exec();

    console.log('User info from DB:', result);
    if (!result) {
        console.log("user not found");
        res.render("login", { forgor: 'know', errorMessage: "No User Detected" });
        return;
    }

    if (await bcrypt.compare(password, result.password)) {
        console.log("correct password");
        req.session.authenticated = true;
        req.session.email = result.email;
        req.session.name = result.name;
        req.session.cookie.maxAge = expireTime;
        req.session.skills = result.skills;
        console.log("Result:", result.skills);
        req.session.skills = result.skills;
        req.session.image = result.image;
        console.log("Result:", result.skills);
        // console.log(req.session);
        res.redirect('/');
        return;
    }
    else {
        console.log("incorrect password");
        res.render("login", { forgor: 'know', errorMessage: "Incorrect Password" });
        return;
    }
});

// define your own email api which points to your server.
app.post('/api/sendemail/', function (req, res) {
    const { name, email, subject, message } = req.body;
    //implement your spam protection or checks.
    sendEmail(name, email, subject, message);
});

app.use('/selectSkills', sessionValidation);
app.get('/selectSkills', (req, res) => {
    res.render('selectSkills');
});

app.post('/setTags', async (req, res) => {
    // var userSkill = await userModel.skills;

    // for(let i = 0; i < skills[0].length; i++){

    // }
    /* const user = await userModel.findOne({email: req.session.email});
    const {skill1, skill2, skill3, skill4, skill5, skill6} = req.body;
    const tags = [skill1, skill2, skill3, skill4, skill5, skill6];
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].checked) {
            await userModel.updateOne({email: req.session.email}, {$set : {user.skills: tags[i]}});
        }

    } */
    const user = await userModel.findOne({ email: req.session.email });
        
        // Extract tags from the request body
        const { skill1, skill2, skill3, skill4, skill5, skill6 } = req.body;

        // Create an array of selected skills
        const selectedSkills = [skill1, skill2, skill3, skill4, skill5, skill6].filter(skill => skill);

        // Update user's skills
        user.skills = selectedSkills;
        await user.save();

        res.redirect('/');

});

app.use('/profile', sessionValidation);
app.get('/profile', async (req, res) => {
    let email = req.session.email;
    var user = await userModel.findOne({email});
    res.render('profile', {user: user});
});

app.post('/setProfilePic', upload.single('image'), async (req, res, next) => {
    let image_uuid = uuid();
    let email = req.session.email;
    let doc = await userModel.findOne({email});
    let buf64 = req.file.buffer.toString('base64');
    stream = cloudinary.uploader.upload("data:image/octet-stream;base64," + buf64, async function (result) {
        try {
            console.log(result);
            const success = await userModel.updateOne({email: email}, {$set : {image_id: image_uuid}});
            if (!success) {
                console.log("Error uploading to MongoDB");
            } 
            else{
                console.log("USER DOCUMENT " + doc);
                req.session.image = image_uuid;
                console.log(doc.image_id);
                console.log("IMAGE UUID: " + req.session.image);
                res.redirect("profile");
            }
        }
        catch(ex) {
            console.log("Error connecting to MongoDB");
			console.log(ex);
        }
    }, { public_id: image_uuid }
);

});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            throw err;
        }
        res.redirect('/');
    });
});

app.get('/404', (req, res) => {
    res.render('404');
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});