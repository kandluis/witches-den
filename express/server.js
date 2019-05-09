process.env.PWD = process.cwd()

var express = require('express'),
    path = require('path'),
    morgan = require('morgan'),
    favicon = require('serve-favicon'),
    app = express();

var env;
if(!process.env.NODE_ENV) {
    env = require('dotenv').load();
} else {
    env = process.env;
}

app.use(morgan('dev'));

var angularPath = path.join(env.PWD + "/../app");
console.log("angular static path: " + angularPath);
app.use(express.static(angularPath));

var routesPath = path.join(env.PWD, '/routes.js');
console.log("routes path: " + routesPath);
require(routesPath)(app, angularPath, env);

var faviconPath = path.join(env.PWD, "favicon.png");
console.log("favicon path: " + faviconPath);
app.use(favicon(faviconPath));

var port = env.PORT || 3001;

app.listen(port);

console.log('Listening on port ' + port + '...');
