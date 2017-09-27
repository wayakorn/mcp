var express = require("express");
var router = express.Router();

var wsserver = require("ws").Server;

//
// This is called when the printer gets notified of a new job
//
function m_notify(printer) {
    var websocket = printer.Key;
    var remove = false;
    try {
        websocket.send(".");        
    }
    catch (e) {
        console.log("[app_ws.js] encountered exception: " + e);
        remove = true;
    }
    return remove;
}

//
// This function extracts printer ID from the websocket URL. The function returns null on failures.
// E.g., if url "ws://localhost:80/ws/wait/123456" was provided, the function would return "123456".
//
function m_getPrinterId(url) {
    const WaitResource = "/ws/wait";
    var result = null;
    var url = url.toLowerCase();
    if (url.startsWith(WaitResource)) {
        url = url.replace(WaitResource, "");
        if (url.length == 0 || url == "/") {
            // No printerId given in the request
            if (g_verbose) {
                console.log("[app_ws.js] m_getPrinterId: request has no printerId");
            }
        } else if (url.startsWith("/")) {
            result = url.slice(1);
            if (g_verbose) {
                console.log("[app_ws.js] m_getPrinterId: printerId: " + result);
            }
        } else {
            if (g_verbose) {
                console.log("[app_ws.js] m_getPrinterId: request has no printerId, url: " + url);
            }
        }
    }
    return result;
}

//
// From here on out, we create a new instance of websocket server and register various events that
// the server supports. See https://github.com/websockets/ws/blob/master/doc/ws.md for reference.
//
var m_wss = new wsserver({server: g_server});
m_wss.on("connection", function(ws, req) {
    var key = ws;
    var printerId = m_getPrinterId(req.url);

    ws.on("message", function(message) {
        console.log("[app_ws.js] websocket received a message: " + message);
    }).on("close", function() {
        var printer = g_findPrinter(ws, true);
        if (g_verbose && printer != null) {
            console.log("[app_ws.js] printer {" + printer.ClientInfo + " (id=" + printerId + ")} removed (closed), numPrinters=" + g_getPrinterCount());
        }
    }).on("error", function(socketError) {
        console.log("[app_ws.js] error: " + socketError.toString());
    });

    var clientInfo = (ws._socket != null) ? g_getClientInfo(ws._socket) : "n/a";
    var printer = g_findPrinter(ws, false);
    if (printer != null) {
        printer.Id = printerId;
        printer.ClientInfo = clientInfo;
    } else {
        // This is a new printer, add to the list
        var printer = {Key: ws, Id: printerId, ClientInfo: clientInfo, Notify: m_notify};
        g_addPrinter(printer);
    }

    if (g_verbose) {
        console.log("[app_ws.js] printer {" + clientInfo + " (id=" + printerId + ")} added, numPrinters=" + g_getPrinterCount());
    }
});
console.log("[app_ws.js] websocket server created");


module.exports = router;
