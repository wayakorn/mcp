var express = require("express");
var app = express();
var router = express.Router();

var wsserver = require("ws").Server;

var g_userId = 0;
var g_wss = null;

module.exports = function(server) {
    g_wss = new wsserver({server: server});
    console.info("app_ws called!");
        g_wss.on("connection", function (ws) {

        console.info("websocket connection open");

        var timestamp = new Date().getTime();
        g_userId = timestamp;

        ws.send(JSON.stringify({msgType:"onOpenConnection", msg:{connectionId:timestamp}}));


        ws.on("message", function (data, flags) {
            console.log("websocket received a message");
            var clientMsg = data;

            ws.send(JSON.stringify({msg:{connectionId:g_userId}}));


        });

        ws.on("close", function () {
            console.log("websocket connection close");
        });
    });
    console.log("websocket server created");
};

module.exports = router;
