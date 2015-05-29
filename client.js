var net = require("net");
var msgpack = require("msgpack");

var controlPort = 7770;

var options = {};
options.host = process.argv[2];
options.port = controlPort;

var conn = net.connect( options );

var o = [ "echo", "aaa", "bbb" ];

var packed = msgpack.pack(o);
console.log( "packed length:", packed.length );

conn.write(packed);

var ms = new msgpack.Stream(conn);
ms.addListener( "msg", function(m) {
    console.log( "received message:", m );
});
