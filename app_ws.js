var express = require("express");
var app = express();
var router = express.Router();

var wsserver = require("ws").Server;

// This is called when the printer gets notified of a new job
function m_notify(websocket) {
    websocket.send('.');
}

var m_wss = new wsserver({server: g_server});
m_wss.on("connection", function (ws) {
    console.info("[app_ws.js] websocket connection open");
    ws.on("message", function (data, flags) {
        console.log("[app_ws.js] websocket received a message: " + data);
    });
    ws.on("close", function () {
        console.log("[app_ws.js] websocket connection close");
        // TODO: call FindPrinter(remove=true) here
        m_printer = null;
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

// This is called when the printer gets notified of a new job

router.get('/notify', function(req, res) {
    console.log("[app_ws.js] notify called");
    
    // TODO: call FindPrinter here
    if (m_printers.length > 0) {
        m_printers[0].Websocket.send('.');
    }
});

module.exports = router;
