var http = require("http");
var express = require("express");
var app = express();

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function() {
	console.log('Server listening on port ' + server.address().port);
	server.setTimeout(1200000, function() {
        console.log('Timed out');
	});
});

// ---------- Shared globals ----------
g_printers = [];

var app_httpget = require('./app_httpget.js');
app.use('/httpget', app_httpget);

var app_ws = require('./app_ws.js');
app.use('/ws', app_ws);

// ---------- Default page: show usage ----------
app.get('/', function(req, res) {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-cache');
    var body = "<html><b>Common API from PC/service side:</b>"
    body += "<br>  There are " + g_printers.length + " printer(s) waiting to be notified.";
    body += "<br>  <a href='notify'>notify</a>";
    body += "<hr><b>API to wait for job using hanging HTTP method:</b>";
    body += "<br>  <a href='httpget/wait'>httpget/wait</a> (expect text response '.')";
    body += "<hr><b>API to wait for job using Websocket method:</b>";
    body += "<br>  <a href='ws:ws/wait'>ws/wait</a> (expect '.' character as response)";
    body += "</html>";
    res.end(body);
});

// ---------- Status and Notification APIs ----------
function DoNotify(req, res) {
    var httpStatus;
    var body;
	if (g_printers.length > 0) {
		body = "Notifying " + g_printers.length + " printers...";
        for (var i = 0; i < g_printers.length; ++i) {
            g_printers[i].Res.writeHead(200, {"Content-Type": "text/plain"});
            g_printers[i].Res.end('.');
        }
		g_printers = [];
	} else {
		body = "No printer currently waiting.";
	}
    console.log(body);
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end(body);
};

app.get('/status', function(req, res) {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-cache');
    res.end("<html>There are currently <b>" + g_printers.length + "</b> printers waiting.</html>");
});

app.get('/notify', function(req, res) {
    DoNotify(req, res);
});

app.put('/notify', function(req, res) {
    DoNotify(req, res);
});

module.exports = app;
