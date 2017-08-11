var express = require('express');
var router = express.Router();

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

router.get('/wait', function(req, res) {
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

module.exports = router;
