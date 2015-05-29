var net = require("net");
var msgpack = require("msgpack");

var controlPort = 7770;



function Tunnel(sv,p) {
    this.server = sv;
    this.portnum = p;
}

//Tunnel.prototype.

function addTunnel(portnum) {
    var sv = net.createServer( function(conn) {
        console.log("Connection for tunnel from " + conn.remoteAddress );
    });
    
    sv.listen( portnum, "0.0.0.0" );

    var tun = new Tunnel(sv,portnum);
    tun.error = null;
    
    sv.on("error",function(e){
        console.log("tun error:",e);
        tun.error = e;
    });
    return tun;
}

// main server
var server = net.createServer( function(conn) {
    console.log("Connection from " + conn.remoteAddress );

    // init
    conn.authorized = false;
    conn.tunnels = [];    
    var o = [ "hello", "world" ];
    conn.write( msgpack.pack(o) );    

    
    var ms = new msgpack.Stream(conn);
    ms.addListener( "msg", function(m) {
        console.log( "received message:", m );
        var cmd = m[0];
        
        if( cmd == "echo" ) {
            var rest = m.slice(1,1+m.length);
            conn.write( msgpack.pack(rest) );            
        } else if( cmd == "tunnel" ) { // create a new tunnel port. arg=["add", PORTNUM] ret=["OK"] or ["ERROR"]
            var portnum = m[1];
            var tun = addTunnel( portnum );
            console.log("new tunnel:", tun );
            conn.tunnels.push(tun);
        } else if( cmd == "list" ) {
            var out = [];
            conn.tunnels.forEach( function(tun) {
                out.push( { "port" : tun.portnum, "error" : tun.error });
            });
            conn.write( msgpack.pack(out));
        }
    });

    conn.on("close", function() {
        console.log( "Control conection closed: ", conn.remoteAddress );
        conn.tunnels.forEach( function(tun) {
            tun.server.close();
        });
    });

    
});

server.listen( controlPort, "0.0.0.0" );



console.log( "TCP server listening!" );
