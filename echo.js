
var net = require('net');

var binheadmode = false;
var longmode = false;

process.argv.slice(2).forEach( function(arg) {
    if( arg == "-b" ) binheadmode = true;
    if( arg == "-l" ) longmode = true;
});

console.log( "binheadmodemode:", binheadmode, "longmode:", longmode );


var server = net.createServer(function (socket) {
    console.log("Connection from " + socket.remoteAddress);

    socket.on("data", function(d) {
        if( binheadmode ) {
            var l = 256;
            if(longmode) l = 20*1000;
            var buf = new Buffer(l);
            for(var i=0;i<l;i++) {
                buf.writeUInt8(i&0xff,i);
            }
            socket.write(buf);
        } else {
            socket.write(d);
        }        
    } );
    socket.on("error", function(e) {
        console.log( "erorr:",e);
    });
    socket.on("close", function() {
        console.log( "close" );
    });
});
server.listen(7777, "0.0.0.0");
console.log("TCP server listening on port 7777");

