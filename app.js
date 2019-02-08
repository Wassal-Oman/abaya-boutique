// import needed libraries
const express = require('express');

// routers
const dashboard = require('./routes/dashboard');

// initialize app and set port
const app = express();
const port = process.env.PORT | 3000;

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// set the view engine and views folder
app.set('view engine', 'ejs');
app.set('views', 'views');

// routes
app.use('/', dashboard);

// if route does not exist
app.use((req, res, next) => {
    res.render('404');
});

// run server
app.listen(port, () => console.log(`Listening on port ${port}`));