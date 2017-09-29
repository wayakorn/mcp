var express = require("express");
var router = express.Router();

//
// This is called when the printer gets notified of a new job
// Return true => remove the printer
//
function m_notify(printer) {
    var res = printer.Value;
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end(".");
    if (g_verbose) {
        console.log("[app_httpget.js] printer {" + printer.Key + "} scheduled to be removed");
    }
    return true;
}

//
// This function keeps track of notification sessions, which contains a reference to the 'res'
// object that represents the hanging-GET response. These notification sessions are held in memory
// until m_notify() function is called or the hanging-GET connection is closed.
//
function m_wait(req, res, printerId) {
    var key = g_getClientInfo(req.socket);
    var printer = g_findPrinter(key, false);
    if (printer != null) {
        printer.Id = printerId;
        printer.Value = res;
    } else {
        // This is a new printer, add to the list
        var printer = {Key: key, Id: printerId, Value: res, Notify: m_notify};
        g_addPrinter(printer);
    }

    if (g_verbose) {
        console.log("[app_httpget.js] printer {" + key + " (id=" + printerId + ")} added, numPrinters=" + g_getPrinterCount());
    }

    // Schedule a cleanup if the client closes HTTP connection
    res.on("close", function() {
        var printer = g_findPrinter(key, true);
        if (printer != null) {
            console.log("[app_httpget.js] printer {" + key + " (id=" + printer.Id + ")} removed, numPrinters=" + g_getPrinterCount());
        }
    });
}

//
// This is the hanging-GET endpoint. The GET response is deferred until notification arrives.
// It is called by the printer or proxy to get notifications from the cloud print service.
// E.g., there's a print job to print.
//
router.get("/wait", function(req, res) {
    m_wait(req, res, null);
});

//
// Same functionality as the "/wait" endpoint, but also handle parsing for the [printer] ID.
// E.g., "/wait/123456" => wait for print jobs that are intended for printer ID 123456.
//
router.get("/wait/:printerId", function(req, res) {
    var printerId = req.params.printerId;
    m_wait(req, res, printerId);
});

module.exports = router;
