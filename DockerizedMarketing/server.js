require('rootpath')();
var express = require('express');
var app = express();
var session = require('express-session');
var bodyParser = require('body-parser');
var expressJwt = require('express-jwt');
var config = require('config.json');
var mongoose = require(‘mongoose’);

var mongoOps = require('./server/MongoOperations.js');





mongoose.connect(“mongodb://localhost/moviesDb”);
var db = mongoose.connection;

var movieSchema = mongoose.Schema({
    name: String,
    released: Boolean,
    watched: Boolean
});
var MovieModel = mongoose.model('movie', movieSchema);

db.on('error', console.error.bind(console, "connection error"));
db.once('open', function () {
    console.log("moviesDb is open...");
    
    MovieModel.find().exec(function (error, results) {
        if (results.length === 0) {
            MovieModel.create({ name: "The Amazing Spider-Man 2", released: true, watched: false });
            MovieModel.create({ name: "The Other Woman", released: true, watched: true });
            MovieModel.create({ name: "Shaadi ke Side Effects", released: false, watched: false });
            MovieModel.create({ name: "Walk of Shame", released: true, watched: false });
            MovieModel.create({ name: "Lucky Kabootar", released: false, watched: false });
        }
    });
});




app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ secret: config.secret, resave: false, saveUninitialized: true }));

// use JWT auth to secure the api
app.use('/api', expressJwt({ secret: config.secret }).unless({ path: ['/api/users/authenticate', '/api/users/register'] }));

app.use(express.static(path.join(__dirname, 'public')));

// routes
app.use('/login', require('./controllers/login.controller'));
app.use('/register', require('./controllers/register.controller'));
app.use('/app', require('./controllers/app.controller'));
app.use('/api/users', require('./controllers/api/users.controller'));




app.get('/', function (request, response) {
    response.sendfile("views/MoviesList.html");
});


app.get('/api/list', function (request, response) {
    response.send(
        { "movieId": 1, "name": "The Pacific Rim" },
        { "movieId": 2, "name": "Yeh Jawani Hai Deewani" });
});




// make '/app' default route
app.get('/', function (req, res) {
    return res.redirect('/app');
});

app.get('/api/movies', mongoOps.fetch);

app.post('/api/movies', mongoOps.add);

app.put('/api/movies/:movieId', mongoOps.modify);



exports.fetch = function (request, response) {
    MovieModel.find().exec(function (err, res) {
        if (err) {
            response.send(500, { error: err });
        }
        else {
            response.send(res);
        }
    });
};

exports.add = function (request, response) {
    var newMovie = { name: request.body.name, released: false, watched: false };
    MovieModel.create(newMovie, function (addError, addedMovie) {
        if (addError) {
            response.send(500, { error: addError });
        }
        else {
            response.send({ success: true, movie: addedMovie });
        }
    });
};


exports.modify = function (request, response) {
    var movieId = request.params.movieId;
    MovieModel.update({ _id: movieId }, { released: request.body.released, watched: request.body.watched }, { multi: false },
        function (error, rowsAffected) {
        if (error) {
            response.send(500, { error: error });
        }
        else if (rowsAffected == 0) {
            response.send(500, { error: "No rows affected" });
        }
        else {
            response.send(200);
        }
    }
    );
};






// start server
var server = app.listen(3000, function () {
    console.log('Server listening at http://' + server.address().address + ':' + server.address().port);
});