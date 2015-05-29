var net = require("net");
var msgpack = require("msgpack");

var controlPort = 7770;

// main server
var server = net.createServer( function(conn) {
    console.log("Connection from " + conn.remoteAddress );

    // init
    conn.authorized = false;    
    var o = [ "hello", "world" ];
    conn.write( msgpack.pack(o) );    

    
    var ms = new msgpack.Stream(conn);
    ms.addListener( "msg", function(m) {
        console.log( "received message:", m );
    });

    
});

server.listen( controlPort, "0.0.0.0" );

console.log( "TCP server listening!" );
