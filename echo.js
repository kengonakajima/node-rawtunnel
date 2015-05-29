var net = require('net');
var server = net.createServer(function (socket) {
    console.log("Connection from " + socket.remoteAddress);
    socket.on("data", function(d) { socket.write(d); } );
});
server.listen(7777, "localhost");
console.log("TCP server listening on port 7777");