var express = require('express');
var router = express.Router();

// This is called when the printer gets notified of a new job
// Return true => remove the printer
function m_notify(res) {
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end('.');
    return true;
}

router.get('/wait', function(req, res) {
    console.log("[app_httpget.js] connected @ " + req.socket);

    var printer = g_findPrinter(req.socket, false);
    if (printer != null) {
        printer.Key = req.socket;
        printer.Value = res;
    } else {
        // This is a new printer, add to the list
        var printer = {Key: req.socket, Value: res, Notify: m_notify};
        g_addPrinter(printer);
    }

    // Schedule a cleanup if the HTTP connection is closed
    res.on('close', function(e) {
        console.log("[app_httpget.js] lost connection @ " + res.socket);
        var printer = g_findPrinter(res.socket, true);
        if (printer != null) {
            console.log("[app_httpget.js] printer removed");
        }
    });
});

module.exports = router;
