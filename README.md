One-time Azure deployment instructions:
1. Set up a Linux web service for Node.JS
2. Have it sync to this repo
3. Under web service's Application settings, add "WebSockets=On" (key value pair).

Usage:
- See the root of the web site
- To test printer notification via Websocket, establish a websocket connection (you can use "Simple WebSocket Client" chrome extension) to ws://<hostname>/ws/wait (e.g., ws://mscps-notif.azurewebsites.net/ws/wait). You can use a webbrowser to generate the notification. The notification arrives via websocket as a single dot ('.') char.
