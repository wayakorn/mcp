var express = require("express");
var router = express.Router();

// This is called when the printer gets notified of a new job
// Return true => remove the printer
function m_notify(printer) {
    var res = printer.Value;
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end(".");
    if (g_verbose) {
        console.log("[app_httpget.js] printer {" + printer.Key + "} scheduled to be removed");
    }
    return true;
}

router.get("/wait", function(req, res) {
    var key = g_getClientInfo(req.socket);
    var printer = g_findPrinter(key, false);
    if (printer != null) {
        printer.Key = key;
        printer.Value = res;
    } else {
        // This is a new printer, add to the list
        var printer = {Key: key, Value: res, Notify: m_notify};
        g_addPrinter(printer);
    }

    if (g_verbose) {
        console.log("[app_httpget.js] printer {" + key + "} added, numPrinters=" + g_getPrinterCount());
    }

    // Schedule a cleanup if the client closes HTTP connection
    res.on("close", function() {
        var printer = g_findPrinter(key, true);
        if (printer != null) {
            console.log("[app_httpget.js] printer {" + key + "} removed, numPrinters=" + g_getPrinterCount());
        }
    });
});

module.exports = router;
