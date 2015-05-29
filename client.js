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

var ctlco = net.connect( options );

var o = [ "echo", "aaa", "bbb" ];

var packed = msgpack.pack(o);
console.log( "packed length:", packed.length );
ctlco.write(packed);
ctlco.write( msgpack.pack( [ "tunnel", 60000 ] ) );


function Tunnel(remport,tgthost,tgtport) {
    this.remote_port = remport;
    this.target_host = tgthost;
    this.target_port = tgtport;
    this.connections = [];
}

function addTunnel(rp,th,tp, ctrl_conn) {
    var tun = new Tunnel(rp,th,tp);

    // cid: allocated by server
    tun.connectToTarget = function(remote_id) {
        var opts = {};
        opts.host = tun.target_host;
        opts.port = tun.target_port;
        var co = net.connect(opts);
        tun.connections.push(co);
        co.remote_id = remote_id;
        co.on( "data", function(d) {
            console.log( "data from target server:", d );
            ctrl_conn.write( msgpack.pack( [ "data", tun.remote_port, remote_id, d ]));
        });
    };
    tun.receiveRemoteData = function(remote_id, data) {
        tun.connections.forEach( function(c) {
            if( c.remote_id == remote_id ) {
                c.write(data);
            }
        });                               
    }
    tun.close = function(remote_id) {
        var tgtco = null;
        tun.connections.forEach( function(c) {
            if( c.remote_id == remote_id ) {
                tgtco = c;
            }
        });
        if( tgtco != null ) {
            tgtco.close();
            var i = tun.connections.indexOf(tgtco);
            tun.connections.splice(i,1);
        }
    }

    var ms = new msgpack.Stream(ctrl_conn);
    ms.addListener( "msg", function(m) {
        console.log( "received control message:", m );
        var cmd = m[0];
        if( cmd == "data" ) { // [ "data", portnum, data ]
            var portnum = m[1];
            var cid = m[2];
            var data = m[3];
            console.log( "sending data to target server:",data);
            tun.receiveRemoteData( cid, data );
        } else if( cmd == "accept" ) { // [ connid ]
            var connid = m[1];
            tun.connectToTarget(connid) 
        } else if( cmd == "error" ) { // [ connid, e ]
            var connid = m[1];
            tun.close(connid);            
        }
    });    

    setInterval( function() {
        ctrl_conn.write( msgpack.pack( [ "list" ] ) );
    }, 500 );
    
    return tun;
}



addTunnel( 60000, "localhost", 7777, ctlco )

