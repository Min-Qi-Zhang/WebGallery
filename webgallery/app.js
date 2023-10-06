const bcrypt = require('bcrypt');
const express = require('express');
const app = express();

const http = require('http');
const path = require('path');
const PORT = 3000;

const fs = require('fs');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const cookie = require('cookie');
const session = require('express-session');
app.use(session({
  secret: 'please change this secret',
  resave: false,
  saveUninitialized: true,
}));

app.use(express.static('frontend'));

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

app.use(function (req, res, next){
  req.username = (req.session.username) ? req.session.username : null;
  console.log("HTTP request", req.username, req.method, req.url, req.body);
  next();
});


var multer  = require('multer');
var upload = multer({ dest: path.join(__dirname, 'uploads') });

var Image = (function(){
  return function item(image, username, file){
      this.title = image.title;
      this.author = username;
      this.file = file;
  };
}());

var Comment = (function(){
  return function item(comment, username){
    this.imageId = comment.imageId;
    this.author = username;
    this.content = comment.content;
  };
}());

var Datastore = require('nedb'),
    users = new Datastore({ filename: 'db/users.db', autoload: true }),
    images = new Datastore({ filename: 'db/images.db', autoload: true, timestampData: true }),
    comments = new Datastore({ filename: 'db/comments.db', autoload: true, timestampData: true });

var isAuthenticated = function (req, res, next) {
  if (!req.username) return res.status(401).end("access denied");
  next();
};

// Sign up / Sign in / Sign out

// curl -H "Content-Type: application/json" -X POST -d '{"username":"alice","password":"alice"}' -c cookie.txt localhost:3000/signup/
app.post('/signup/', function (req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  const saltRounds = 10;
  users.findOne({_id: username}, function(err, user){
      if (err) return res.status(500).end(err);
      if (user) return res.status(409).end("username " + username + " already exists");
      bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) return res.status(500).end(err);
        users.update({_id: username},{_id: username, hash}, {upsert: true}, function(err){
          if (err) return res.status(500).end(err);
          // initialize cookie
          res.setHeader(
            "Set-Cookie",
            cookie.serialize("username", username, {
              path: "/",
              maxAge: 60 * 60 * 24 * 7,
            })
          );
          // start a session
          req.session.username = username;
          return res.json(username);
        });
      });
  });
});

// curl -H "Content-Type: application/json" -X POST -d '{"username":"alice","password":"alice"}' -c cookie.txt localhost:3000/signin/
app.post('/signin/', function (req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  // retrieve user from the database
  users.findOne({_id: username}, function(err, user){
      if (err) return res.status(500).end(err);
      if (!user) return res.status(401).end("access denied");
      bcrypt.compare(password, user.hash, (err, result) => {
        if (err) return res.status(500).end(err);
        if (!result) return res.status(401).end("access denied");
        // initialize cookie
        res.setHeader(
          "Set-Cookie",
          cookie.serialize("username", username, {
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          })
        );
        // start a session
        req.session.username = username;
        return res.json(username);
      });
  });
});

// curl -b cookie.txt -c cookie.txt localhost:3000/signout/
app.get('/signout/', isAuthenticated, function (req, res, next) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("username", "", {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
    })
  );
  req.session.destroy();
  res.json("Signed out.");
});

// Create

app.post('/api/images/', isAuthenticated, upload.single('file'), (req, res) => {
  let image = new Image(req.body, req.username, req.file);
  images.insert(image, (err, img) => {
    if (err) return res.status(500).end(err);
    return res.json(img);
  });
});

app.post('/api/comments/', isAuthenticated, (req, res) => {
  images.findOne({ _id: req.body.imageId }, (err, img) => {
    if (err) return res.status(500).end(err);
    if (!img) return res.status(404).end("Image id: " + req.body.imageId + " does not exists");
    let comment = new Comment(req.body, req.username);
    comments.insert(comment, (err, cmt) => {
      if (err) return res.status(500).end(err);
      return res.json(cmt);
    });
  });
});

// Get

app.get('/api/images/:index/:username/info/', isAuthenticated, (req, res) => {
  let index = parseInt(req.params.index);
  let username = req.params.username;
  images.find({author: username}).sort({createdAt: -1}).exec((err, allImages) => {
    if (err) return res.status(500).end(err);
    if (index >= allImages.length) return res.json(null);
    let img = allImages[index];
    return res.json({title: img.title, author: img.author, imageId: img._id});
  });
});

app.get('/api/images/:id/', isAuthenticated, (req, res) => {
  images.findOne({ _id: req.params.id }, (err, img) => {
    if (err) return res.status(500).end(err);
    if (img) {
      res.setHeader('Content-Type', img.file.mimetype);
      res.sendFile(img.file.path);
    }
  });
});

app.get('/api/comments/', isAuthenticated, (req, res) => {
  let imageId = req.query.imageId;
  let page = parseInt(req.query.page);
  comments.find({ imageId }).sort({createdAt: -1}).exec((err, filteredComments) => {
    if (err) return res.status(500).end(err);
    let endIndex = Math.min(filteredComments.length, 10 * (page + 1));
    return res.json(filteredComments.slice(10 * page, endIndex) || []);
  });
});

app.get('/api/users/', isAuthenticated, (req, res) => {
  let page = parseInt(req.query.page);
  users.find({}).sort({_id: 1}).exec((err, allUsers) => {
    if (err) return res.status(500).end(err);
    let usernames = allUsers.map(user => user._id);
    let endIndex = Math.min(usernames.length, 5 * (page + 1));
    res.json(usernames.slice(5 * page, endIndex) || []);
  });
});

// Delete

app.delete('/api/images/:id/', isAuthenticated, (req, res) => {
  images.findOne({ _id: req.params.id }, (err, img) => {
    if (err) return res.status(500).end(err);
    if (!img) return res.status(404).end("Image id: " + req.params.id + " does not exists");
    if (img.author !== req.username) return res.status(403).end("forbidden");
    images.remove({ _id: req.params.id }, {}, (err) => {
      if (err) return res.status(500).end(err);
      fs.unlink(img.file.path, (err) => {
        if (err) return res.status(500).end(err);
        comments.remove({ imageId: req.params.id }, {}, (err) => {
          if (err) return res.status(500).end(err);
          return res.json(img);
        });
      });
    });
  });
});

app.delete('/api/comments/:id/', isAuthenticated, (req, res) => {
  comments.findOne({ _id: req.params.id }, (err, cmt) => {
    if (err) return res.status(500).end(err);
    if (!cmt) return res.status(404).end("Comment id: " + req.params.id + " does not exists");
    images.findOne({ _id: cmt.imageId }, (err, img) => {
      if (err) return res.status(500).end(err);
      if (!img) return res.status(404).end("Image id: " + cmt.imageId + " does not exists");
      if (cmt.author !== req.username && img.author !== req.username) return res.status(403).end("forbidden");
      comments.remove({ _id: req.params.id }, {}, (err) => {
        if (err) return res.status(500).end(err);
        return res.json(cmt);
      });
    });
  });
});


http.createServer(app).listen(PORT, function (err) {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});