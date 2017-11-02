var dateFormat = require("dateformat");
var http = require("http");
var express = require("express");
var app = express();

app.set("port", process.env.PORT || 3000);

// ---------- Globals ----------
g_verbose = false;

g_getClientInfo = function(clientSocket) {
    return clientSocket.remoteAddress.toString() + ":" + clientSocket.remotePort.toString();
}

g_server = app.listen(app.get("port"), function() {
    console.log("Server listening on port " + g_server.address().port);
    g_server.setTimeout(1200000, function(socket) {
        console.log("Connection " + g_getClientInfo(socket) + " still alive.");
    });
});

// Active notification sessions representing the connections to the printer or proxy.
var m_printers = [];
var m_history = [];

g_addHistory = function(operation, msg) {
    if (g_verbose || (operation == "API")) {
        var history = {Timestamp: new Date(), Operation: operation, Msg: msg};
        if (m_history.length > 100) {
            m_history.pop();
        }
        m_history.splice(0, 0, history);
    }
}

//
// This function looks up the outstanding notification sessions, optionally removes the session
// from the list, and returns it.
//
g_findPrinter = function(key, remove) {
    var result = null;
    var printers = [];
    var history = "";
    for (var i = 0; i < m_printers.length; ++i) {
        if (key == m_printers[i].Key) {
            result = m_printers[i];
            if (!remove) {
                break;
            }
            history += m_printers[i].Id + "(" + m_printers[i].Key.toString() + ") ";
        } else {
            printers.push(m_printers[i]);
        }
    }
    if (remove) {
        if (history != "") {
            g_addHistory("Remove", history);
        }
        m_printers = printers;
    }
    return result;
};

g_addPrinter = function(printer) {
    var oldPrinter = g_findPrinter(printer.Key, true);
    if (oldPrinter != null) {
        console.log("[app.js] WARNING: duplicate printer added, the previous entry has been removed.")
    }
    m_printers.push(printer);
    g_addHistory("Wait", printer.Id + "(" + printer.Key.toString() + ")");
};

g_getPrinterCount = function() {
    return m_printers.length;
};

g_removeAllPrinters = function() {
    var history = "";
    for (var i = 0; i < m_printers.length; ++i) {
        history += m_printers[i].Id + "(" + m_printers[i].Key.toString() + ")";
    }
    g_addHistory("RemoveAll", history);
    m_printers = [];
};

var app_httpget = require("./app_httpget.js");
app.use("/httpget", app_httpget);

var app_ws = require("./app_ws.js");
app.use("/ws", app_ws);

// ---------- Default page: show usage ----------
app.get("/", function(req, res) {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("cache-control", "no-cache");
    var body = "<html><h1>Welcome to FCP notification service homepage.</h1>"
    body += "<br>View notification <a href='history'>history</a>.<br>";
    body += "There are " + m_printers.length + " printer(s) waiting to be notified:<br>";
    for (var i = 0; i < m_printers.length; ++i) {
        body += "&nbsp;&nbsp;" + (i+1) + ") " + m_printers[i].Id + "<br>";
    }
    body += "<hr>";
    body += "<b>Example calls from FCP service to notify that a new print job is available:</b>"
    body += "<br>  <a href='notify'>notify</a>";
    body += "<br>  <a href='mcp/notify'>mcp/notify</a> (deprecated)";
    body += "<br>  <a href='notify/7c518235-4e72-4563-a0d6-861dff98f1d1'>notify/7c518235-4e72-4563-a0d6-861dff98f1d1</a>";
    body += "<hr><b>API intended to be called by printer/proxy to wait for job using hanging HTTP GET:</b>";
    body += "<br>  <a href='httpget/wait'>httpget/wait</a> (expect text response '.')";
    body += "<br>  <a href='httpget/wait/7c518235-4e72-4563-a0d6-861dff98f1d1'>httpget/wait/7c518235-4e72-4563-a0d6-861dff98f1d1</a> (expect text response '.')";
    body += "<hr><b>API intended to be called by printer/proxy to wait for job using Websocket:</b>";
    body += "<br>  ws://mscps-notif/ws/wait (expect '.' character as response)";
    body += "<br>  ws://mscps-notif/ws/wait/7c518235-4e72-4563-a0d6-861dff98f1d1 (expect '.' character as response)";
    body += "</html>";
    res.end(body);
});

// ---------- Notification APIs ----------
//
// This function iterates through the outstanding notification sessions, compares if the session
// matches the provided 'printerId' filter, then calls the appropriate Notify() function.
// The session is forgotten if the protocol-dependent Notify() function indicates that the session
// should be dropped (by returning true).
//
function m_notifyPrinter(req, res, printerId) {
    var body;
    var notifyList = [];
    var removeList = [];
    // Build the notifyList
    for (var i = 0; i < m_printers.length; ++i) {
        if (printerId == null || (m_printers[i].Id && m_printers[i].Id == printerId)) {
            notifyList.push(m_printers[i]);
        }
    }
    // Call the Notify handler
    body = "Notifying " + notifyList.length + " printer(s)...";
    for (var i = 0; i < notifyList.length; ++i) {
        var history = notifyList[i].Id + "(" + m_printers[i].Key.toString() + ")";
        g_addHistory("Notify", history);
        if (notifyList[i].Notify(notifyList[i])) {
            removeList.push(notifyList[i].Key);
        }
        if (g_verbose) {
            console.log("[app.js] printer {" + notifyList[i].Key.toString() + " (id=" + notifyList[i].Id + ")} notified");
        }
    }
    // Remove the printers whose Notify handler is set for removal
    for (var i = 0; i < removeList.length; ++i) {
        g_findPrinter(removeList[i], true);
    }
    console.log(body);
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end(body);
};

//
// This REST endpoint is intended to be called by the cloud service side. It lets the proxy
// or printer know that there's a new print job to print. 'printerId' can optionally be provided.
// E.g., if "/notify" (or deprecated "/mcp/notify") is given, all printers are notified.
//       if "/notify/123456" is given, only printer with ID "123456" is notified.
//
app.all("(/mcp)?/notify(/:printerId)?", function(req, res, next) {
    if (req.method != "GET" && req.method != "PUT") {
        next();
        return;
    }
    var printerId = req.params.printerId;
    var history = (printerId != null) ? "notifying printer \"" + printerId.toString() + "\"..." :
        "notifying all printers...";
    g_addHistory("API", history);
    if (g_verbose) {
        console.log("[app.js] " + history);
    }
    m_notifyPrinter(req, res, printerId);
});

// ---------- Status APIs ----------
//
// This GET endpoint returns notification history, in plain text.
// It is used by the notification web portal.
//
app.get("/history", function(req, res) {
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.setHeader("cache-control", "no-cache");
    var body = "";
    for (var i = 0; i < m_history.length; ++i) {
        var history = m_history[i];
        body += "[" + dateFormat(history.Timestamp, "mm/dd/yy hh:MM:ss TT Z") + "] ";
        body += history.Operation + ": ";
        body += history.Msg + "\r\n";
    }
    res.end(body);
});

//
// This GET endpoint returns the number of active notification sessions, in HTML.
// It is used by the notification web portal.
//
app.get("/status", function(req, res) {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("cache-control", "no-cache");
    var body = "<html>There are currently <b>" + m_printers.length + "</b> printers waiting...<br>";
    for (var i = 0; i < m_printers.length; ++i) {
        body += "&nbsp;" + (i+1) + ". " + m_printers[i].Id + "<br>";
    }
    body += "</html>";
    res.end(body);
});

//
// Similar to /status, this endpoint returns the session count, but in plain text.
// It is used by the notif-test service.
//
app.get("/count", function(req, res) {
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.setHeader("cache-control", "no-cache");
    res.end(m_printers.length.toString());
});


module.exports = app;
