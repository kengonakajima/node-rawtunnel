var net = require("net");
var msgpack = require("msgpack");

var controlPort = 7770;

if( process.argv.length < 3 ) {
    console.log( "Usage: node client.js HOSTNAME -R TUNNELPORT:TARGETIP:TARGETPORT" );
    process.exit(1);
}

var options = {};
options.host = process.argv[2];
options.port = controlPort;

var conn = net.connect( options );

var o = [ "echo", "aaa", "bbb" ];

var packed = msgpack.pack(o);
console.log( "packed length:", packed.length );

conn.write(packed);

conn.write( msgpack.pack( [ "tunnel", 60000 ] ) );
    
var ms = new msgpack.Stream(conn);
ms.addListener( "msg", function(m) {
    console.log( "received message:", m );
});


setInterval( function() {
    conn.write( msgpack.pack( [ "list" ] ) );
}, 500 );
