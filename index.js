const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcrypt");
const expressLayouts = require('express-ejs-layouts');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const session = require("express-session");


//--------models-----------
const User = require("./models/user");
const Blog = require("./models/blog");

const app = express();

// ----- database ----------
mongoose.connect('mongodb://localhost:27017/bloggersite', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => {
    console.log("✅ MongoDB Connected");
});

// -------------------- MIDDLEWARE --------------------
app.use(flash());
app.use(methodOverride('_method'));
app.use(expressLayouts);
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // optional: for serving static files

// -------------------- VIEW ENGINE SETUP --------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/boilerplate');

function isLoggedIn(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login'); // or send 401 if it's an API
    }
    next();
}

app.use(session({
    secret: 'thisshouldbeabettersecret',  // change in production
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/bloggersite',
        touchAfter: 24 * 3600 // session only updates once a day
    }),
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24  // 1 day
    }
}));


app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.session.userId ? req.session.userId : null;
  next();
});

app.use(async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            res.locals.currentUser = user;
        } catch (err) {
            console.error("Error finding user in middleware:", err);
            res.locals.currentUser = null;
        }
    } else {
        res.locals.currentUser = null;
    }
    next();
});

app.get('/', (req,res) => {
    res.redirect('/home');
});

app.get('/home', (req,res) => {
    res.render('home');
});

//------ authentication --------

app.get('/user', (req,res) => {
    res.render('login/register');
});

app.post('/user', async(req,res) =>{

    const { email, password } = req.body.user;

    if (!email || !password) {
       req.flash('error', 'Email and password required');
       return res.redirect('/user');
    }

    
    const newUser = await new User({ email, password });
    await newUser.save();
    req.flash('success', 'Registered successfully!');
    res.redirect('/home');
});

app.get('/login', (req,res) => {
    res.render('login/login');
})

app.post('/login', async(req,res) =>{
    const { email, password } = req.body.user;

    const foundUser = await User.findOne({ email });

    if (!foundUser) {
        return res.status(400).send("❌ Email not registered");
    }

    const isMatch = await foundUser.comparePassword(password);

    if (isMatch) {
        req.session.userId = foundUser._id; 
        // req.session.userId = 1; 
        res.redirect('/home');
        } else {
        res.status(401).send("❌ Incorrect password");
    }
    
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/home');
});


//------blogs-------

// 📋 Show All blogs
app.get('/blog', isLoggedIn, async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    const allBlogs = await Blog.find({ user: req.session.userId });
    res.render('blog', { allBlogs});
});

// ➕ Create Task
app.post('/blog', isLoggedIn, async (req, res) => {
    if (!req.session.userId) {
            return res.redirect('/login');
        }
    const { title, content } = req.body.blog;
    const newBlog = new Blog({
        title,
        content,
        user: req.session.userId
    });
    await newBlog.save();
    res.redirect('/');
});

// ✏️ Edit Task Form
app.get('/blog/:id/edit', async (req, res) => {
    const blog = await Blog.findById(req.params.id);

    if (!blog || blog.user.toString() !== req.session.userId) {
        req.flash('error', 'Access denied');
        return res.redirect('/blog');
    }

    res.render('blogEdit', { editBlog: blog });
});

// 💾 Update Task
app.put('/blog/:id/edit', async (req, res) => {
    const id = req.params.id;
    const { title, content } = req.body.blog;
    await Blog.findByIdAndUpdate(id, {
        title,
        content
    });
    res.redirect('/blog');
});

// ❌ Delete Task
app.delete('/blog/:id', async (req, res) => {
    const id = req.params.id;
    await Blog.findByIdAndDelete(id);
    res.redirect('/blog');
});


app.listen(3000, () => {
    console.log("Server Started");
})