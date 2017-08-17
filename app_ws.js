var express = require("express");
var router = express.Router();

var wsserver = require("ws").Server;

// This is called when the printer gets notified of a new job
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

var m_wss = new wsserver({server: g_server});
m_wss.on("connection", function(ws, req) {
    ws.on("message", function(message) {
        console.log("[app_ws.js] websocket received a message: " + message);
    }).on("close", function() {
        var printer = g_findPrinter(ws, true);
        if (g_verbose && printer != null) {
            console.log("[app_ws.js] printer [" + printer.ClientInfo + "] removed (closed), numPrinters=" + g_getPrinterCount());
        }
    }).on("error", function(socketError) {
        console.log("[app_ws.js] error: " + socketError.toString());
    });
    
    var clientInfo = (ws._socket != null) ? g_getClientInfo(ws._socket) : "n/a";
    var printer = g_findPrinter(ws, false);
    if (printer != null) {
        printer.Key = ws;
        printer.ClientInfo = clientInfo;
    } else {
        // This is a new printer, add to the list
        var printer = {Key: ws, ClientInfo: clientInfo, Notify: m_notify};
        g_addPrinter(printer);
    }

    if (g_verbose) {
        console.log("[app_ws.js] printer {" + clientInfo + "} added, numPrinters=" + g_getPrinterCount());
    }
});
console.log("[app_ws.js] websocket server created");


module.exports = router;
