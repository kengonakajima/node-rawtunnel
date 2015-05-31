var net = require("net");
var msgpack = require("msgpack");

var controlPort = 7770;


var g_idgen = 0;
function getNewId() {
    g_idgen ++;
    return g_idgen;
}

function Tunnel(p) {
    this.server = null;
    this.portnum = p;
    this.connections = []; // store all sockets from a server
}

function addTunnel(portnum, ctrl_conn ) {
    var tun = new Tunnel(portnum);
    
    var sv = net.createServer( function(conn) {
        conn.id = getNewId();
        console.log("Connection for tunnel from remote:", conn.remoteAddress, conn.localAddress, "newid:", conn.id );
        ctrl_conn.newRemoteConnection(portnum,conn.id);
        conn.on( "data", function(d) {
            ctrl_conn.receiveRemoteData(portnum,conn.id,d);
        });
        conn.on( "error", function(e) {
            ctrl_conn.receiveRemoteError(portnum,conn.id,e);
        });
        tun.connections.push(conn);
    });

    sv.listen( portnum, "0.0.0.0" );
    tun.server = sv;
    tun.finish = function() {
        tun.server.close();
        tun.connections.forEach( function(co) {
            co.close();
        });
    }
    tun.receiveTargetData = function( cid, data ) {
        tun.connections.forEach( function(co) {
            if( co.id == cid ) {
                co.write(data);
            }
        });
    }

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

    conn.receiveRemoteData = function( portnum, cid, data ) {
        console.log( "receiveRemoteData from port:", portnum, "cid:",cid, " datalen:", data.length );
        var o = [ "data", portnum,cid,  data ];
        conn.write( msgpack.pack(o));
    }
    conn.newRemoteConnection = function( portnum, cid ) {
        console.log( "newRemoteConnection: portnum:", portnum, "cid:",cid );
        var o = [ "accept", cid ];
        conn.write( msgpack.pack(o));
    }
    conn.receiveRemoteError = function( portnum, cid, e ) {
        console.log( "receiveRemoteError: portnum",portnum, "cid:",cid, "e:",e);
        var o = [ "error", cid, e ];
        conn.write(msgpack.pack(o));
    }
    
    var ms = new msgpack.Stream(conn);
    ms.addListener( "msg", function(m) {
        console.log( "received message:", m );
        var cmd = m[0];
        
        if( cmd == "echo" ) {
            var rest = m.slice(1,1+m.length);
            conn.write( msgpack.pack(rest) );            
        } else if( cmd == "tunnel" ) { // create a new tunnel port. arg=["add", PORTNUM] ret=["OK"] or ["ERROR"]
            var portnum = m[1];
            var tun = addTunnel( portnum, conn );
            console.log("new tunnel:", tun );
            conn.tunnels.push(tun);
        } else if( cmd == "list" ) {
            var out = [];
            conn.tunnels.forEach( function(tun) {
                out.push( { "port" : tun.portnum, "error" : tun.error });
            });
            conn.write( msgpack.pack(out));
        } else if( cmd == "data" ) { // [ "data", portnum, cid, data ]
            var portnum = m[1];
            var cid = m[2];
            var data = m[3];
            conn.tunnels.forEach( function(tun) {
                tun.receiveTargetData(cid,data);                    
            });
        }
    });

    conn.on("close", function() {
        console.log( "Control conection closed: ", conn.remoteAddress );
        conn.tunnels.forEach( function(tun) {
            tun.finish();
        });
    });

    
});

server.listen( controlPort, "0.0.0.0" );



console.log( "TCP server listening!" );
