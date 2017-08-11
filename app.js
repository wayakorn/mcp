var http = require("http");
var express = require("express");
var app = express();

app.set('port', process.env.PORT || 3000);

g_server = app.listen(app.get('port'), function() {
	console.log('Server listening on port ' + g_server.address().port);
	g_server.setTimeout(1200000, function() {
        console.log('Timed out');
	});
});

var m_printers = [];

g_findPrinter = function findPrinter(key, remove) {
    var result = null;
    var printers = [];
    for (var i = 0; i < m_printers.length; ++i) {
        if (key == m_printers[i].Key) {
            result = m_printers[i];
            if (!remove) {
                break;
            }
        } else {
            printers.push(m_printers[i]);
        }
    }
    if (remove) {
        m_printers = printers;
    }
    return result;
};

g_addPrinter = function addPrinter(printer) {
    m_printers.push(printer);
};

var app_httpget = require('./app_httpget.js');
app.use('/httpget', app_httpget);

var app_ws = require('./app_ws.js');
app.use('/ws', app_ws);

// ---------- Default page: show usage ----------
app.get('/', function(req, res) {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-cache');
    var body = "<html><b>Common API from PC/service side:</b>"
    body += "<br>  There are " + m_printers.length + " printer(s) waiting to be notified.";
    body += "<br>  <a href='notify'>notify</a>";
    body += "<hr><b>API to wait for job using hanging HTTP method:</b>";
    body += "<br>  <a href='httpget/wait'>httpget/wait</a> (expect text response '.')";
    body += "<hr><b>API to wait for job using Websocket method:</b>";
    body += "<br>  <a href='ws://<host>/ws/wait'>ws://<host>/ws/wait</a> (expect '.' character as response)";
    body += "</html>";
    res.end(body);
});

// ---------- Status API ----------
function notifyPrinter(req, res) {
    var httpStatus;
    var body;
    var removeList = [];
	if (m_printers.length > 0) {
		body = "Notifying " + m_printers.length + " printer(s)...";
        for (var i = 0; i < m_printers.length; ++i) {
            // Call the Notify handler
            if (m_printers[i].Notify(m_printers[i].Value)) {
                removeList.push(m_printers[i].Key);
            }
        }
        // Remove printers whose Notify handler wish to be removed
        for (var i = 0; i < removeList.length; ++i) {
            g_findPrinter(removeList[i], true);
        }
	} else {
		body = "No printer currently waiting.";
	}
    console.log(body);
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end(body);
};

app.get('/notify', function(req, res) {
    notifyPrinter(req, res);
});

app.put('/notify', function(req, res) {
    notifyPrinter(req, res);
});

// This route is provided for back compat only
app.get('/mcp/notify', function(req, res) {
    notifyPrinter(req, res);
});

// This route is provided for back compat only
app.put('/mcp/notify', function(req, res) {
    notifyPrinter(req, res);
});

// ---------- Notification API ----------
app.get('/status', function(req, res) {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-cache');
    res.end("<html>There are currently <b>" + m_printers.length + "</b> printers waiting.</html>");
});


module.exports = app;
