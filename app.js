
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 4000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
//app.use(express.bodyParser()); set off to enable http-proxy
app.use(express.methodOverride());
app.use(app.router);
app.use(require('less-middleware')(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//back-end server requests are proxied
var httpProxy = require('http-proxy');
var target = 'http://localhost:9090';
var proxy = new httpProxy.createProxyServer({});
proxy.on('error', function(err){
	console.error(err.stack);
}).on('proxyRes', function(res){
	console.log(res);
});

app.get('/test', function(req, res){
	console.log(req.params);
	res.render('index', {title: 'test'});
});

// for POS
app.all('/ws/*', function(req, res) {
	proxy.web(req, res, {target: target});	
});

app.all('/webapps/*', function(req, res) {
	proxy.web(req, res, {target: target});
});

// for DW
app.all('/dispatcher/*', function(req, res) {
	proxy.web(req, res, {target: target});
});

app.all('/webfile', function(req, res) {	
	proxy.web(req, res, {target: target});
});

app.all('/Image', function(req, res) {
	proxy.web(req, res, {target: target});
});

app.all('/Login', function(req, res) {	
	proxy.web(req, res, {target: target});
});

// group-ordering 
app.all('/groupOrderInvite', function(req, res) {	
	proxy.web(req, res, {target: target});
});
app.all('/groupOrder.action', function(req, res) {	
	proxy.web(req, res, {target: target});
});

app.all('/generated.css', function(req, res) {	
	proxy.web(req, res, {target: target});
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
