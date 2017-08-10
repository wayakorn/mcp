// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});




var g_printers = [];
var g_notifyCount = 0;

// Default page: show status and usage
app.get('/', function(req, res) {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'public');
    var body = "<html>Hanging HTTP: "
    body += "<br>  <a href='mcp/status'>mcp/status</a> ( get the status )";
    body += "<br>  <a href='mcp/notify'>mcp/notify</a> ( [PC] notify printers of new job )";
    body += "<br>  <a href='mcp/wait'>mcp/wait</a> ( [Printer] Wait for job )";
    body += "</html>";
    res.end(body);
});

function FindPrinter(socket, remove) {
    var result = null;
    var printers = [];
    for (var i = 0; i < g_printers.length; ++i) {
        if (socket == g_printers[i].Sock) {
            result = g_printers[i];
            if (!remove) {
                break;
            }
        } else {
            printers.push(g_printers[i]);
        }
    }
    if (remove) {
        g_printers = printers;
    }
    return result;
};

function DoNotify(req, res) {
    var httpStatus;
    var body;
	if (g_printers.length > 0) {
		body = "Notifying " + g_printers.length + " printers...";
        for (var i = 0; i < g_printers.length; ++i) {
            ++g_notifyCount;
            g_printers[i].Res.writeHead(200, {"Content-Type": "text/plain"});
            g_printers[i].Res.end(g_notifyCount.toString());
        }
		g_printers = [];
	} else {
		body = "No printer currently waiting.";
	}
    console.log(body);
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end(body);
};

// [PC] Get printer status
app.get('/mcp/status', function(req, res) {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-cache');
    res.end("<html>There are currently <b>" + g_printers.length + "</b> printers waiting.</html>");
});

app.get('/mcp/notify', function(req, res) {
    DoNotify(req, res);
});

app.put('/mcp/notify', function(req, res) {
    DoNotify(req, res);
});

// [Printer] Wait for print job 
app.get('/mcp/wait', function(req, res) {
    console.log("[Printer] connected @ " + req.socket);
    var printer = FindPrinter(req.socket, false);
    if (printer != null) {
        printer.Res = res;
        printer.Sock = req.socket;
    } else {
        // New printer, add it into the list
        printer = {Res: res, Sock: req.socket};
        g_printers.push(printer);
    }

    // Schedule a cleanup if the HTTP connection is closed
    res.on('close', function(e) {
        console.log("[Printer] lost connection @ " + res.socket);
        var printer = FindPrinter(res.socket, true);
        if (printer != null) {
            console.log("  removed from list");
        }
    });
});
