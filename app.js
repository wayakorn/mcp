var ws = require("nodejs-websocket")

// Scream server example: "hi" -> "HI!!!" 
var server = ws.createServer(function (conn) {
    console.log("New connection")
	var timeout = null;
    conn.on("text", function (str) {
        console.log("Received "+str);
        conn.sendText(str.toUpperCase()+"!!!");
		
		var i = 0;
		timeout = setInterval(function() {
			++i;
			console.log(i.toString());
            conn.sendText(i.toString() + " ");
		}, 1000);
    })
    conn.on("close", function (code, reason) {
        console.log("Connection closed");
		if (timeout != null) {
			clearInterval(timeout);
			timeout = null;
		}
    })
}).listen(3000)
