var express = require("express");
var app = express();
var router = express.Router();

var wsserver = require("ws").Server;

// This is called when the printer gets notified of a new job
function m_notify(websocket) {
    var remove = false;
    try {
        websocket.send('.');
    }
    catch (err) {
        console.log("[app_ws.js] encountered exception while trying to send data over websocket: " + err.toString());
        remove = true;
    }
    return remove;
}

var m_wss = new wsserver({server: g_server});
m_wss.on("connection", function (ws) {
    console.info("[app_ws.js] websocket connection open");
    ws.on("message", function (data, flags) {
        console.log("[app_ws.js] websocket received a message: " + data);
    });
    ws.on("close", function () {
        console.log("[app_ws.js] websocket connection close");
        var printer = g_findPrinter(ws, true);
        if (printer != null) {
            console.log("[app_ws.js] printer removed");
        }
    });

    var printer = g_findPrinter(ws, false);
    if (printer != null) {
        printer.Key = ws;
    } else {
        // This is a new printer, add to the list
        var printer = {Key: ws, Value: ws, Notify: m_notify};
        g_addPrinter(printer);
    }
});
console.log("[app_ws.js] websocket server created");


module.exports = router;
