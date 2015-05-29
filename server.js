var net = require("net");
var carrier = require("carrier"); // text stream line parser

var controlPort = 7770;

// main server
var server = net.createServer( function(conn) {
    console.log("Connection from " + conn.remoteAddress );
    // init
    conn.write( "hello\n" );
    conn.authorized = false;

    // parse command line
    carrier.carry( conn,  function(line) {
        var args = line.split(" ");
        if( args[0] == "echo" ) { // echo ANYTHING
            var subargs = args.slice(1, 1+args.length)
            var ret = subargs.join(" ") + "\n";
            conn.write(ret);
        } else if( args[0] == "add" ) { // "add REMOTEPORT"  ret: ""
            
        } else {
            var msg = "invalid command\n";
            conn.write(msg);
        }
    });
    
});

server.listen( controlPort, "0.0.0.0" );

console.log( "TCP server listening!" );
