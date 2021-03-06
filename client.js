assert = require("assert");

var net = require("net");
var msgpack = require("msgpack");
var minimist = require("minimist");

var control_port = 7770;

function randomIntInclusive(a,b) {
    return Math.floor(Math.random() * (b-a+1) + a );
}

function Tunnel(remport,tgthost,tgtport) {
    assert(remport||tgthost||tgtport);

    this.remote_port = remport;
    this.target_host = tgthost;
    this.target_port = tgtport;
    this.connections = [];

    // cid: allocated by server
    this.connectToTarget = function(remote_id, ctlco) {
        var opts = {};
        opts.host = this.target_host;
        opts.port = this.target_port;
        var co = net.connect(opts);
        this.connections.push(co);
        co.remote_id = remote_id;
        co.remote_data_count = 0;
        co.remote_data_total_bytes = 0;
        co.setNoDelay();
        
        co.on( "data", function(d) {
//            console.log( "data from target server:", d );
//            console.log("127,8:", d[127], d[128], "dataarylen:", dataary.length, "d.length:", d.length );
            var dataary = []
            for(var i=0;i<d.length;i++) { dataary.push( d[i] ); }
            ctlco.conn.write( msgpack.pack( [ "data", this.remote_port, remote_id, dataary ]));
        });
        co.on("error", function(e) {
            console.log( "error on connection to target:",e );
            ctlco.conn.write( msgpack.pack( [ "error", this.remote_port, remote_id, e ] ));
        });
        
        this.receiveRemoteData = function(remote_id, data) {
            this.connections.forEach( function(c) {
                if( c.remote_id == remote_id ) {
                    var len = data.length;
                    c.remote_data_count++;
                    c.remote_data_total_bytes += len;
//                    console.log( "id:", c.remote_id, "datalen:", len, "cnt:", c.remote_data_count, "total:", c.remote_data_total_bytes );
                    c.write(data);
                }
            });                               
        }
        this.close = function(remote_id) {
            var tgtco = null;
            this.connections.forEach( function(c) {
                if( c.remote_id == remote_id ) {
                    tgtco = c;
                }
            });
            if( tgtco != null ) {
                tgtco.destroy();
                var i = this.connections.indexOf(tgtco);
                this.connections.splice(i,1);
            }
        };
    };    
}


function Controller(co,passcode) {
    this.conn = co;
    this.tunnels = [];
    this.passcode = passcode;
    
    // echo test first
    co.write( msgpack.pack( [ "echo", "aaa", "bbb" ] ) );
    co.write( msgpack.pack( [ "auth", passcode ] ) );
    co.on("error", function(e) {
        console.log("fatal: control connection error:",e );
        process.exit(1);
    });

    setInterval( function() {
        co.write( msgpack.pack( [ "list" ] ) );
    }, 10000 );

    this.addTunnel = function(rp,th,tp) {
        console.log("adding tunnel:", rp, th, tp );
    
        var tun = new Tunnel(rp,th,tp);
        co.write( msgpack.pack( ["tunnel", rp] ) );
        this.tunnels.push(tun);
    };
    this.findTunnel = function(rp) {
        for(var i in this.tunnels ) {
            var t = this.tunnels[i];
            if(t.remote_port == rp) return t;
        };
        assert(false);
        return null;
    }
    var ctl = this;
    this.receiveMessage = function(m) {
//        console.log( "received control message:", m );
        var cmd = m[0];
        if( cmd == "data" ) { // [ "data", portnum, data ]
            var portnum = m[1];
            var cid = m[2];
            var dataary = m[3];
//            console.log( "sending data to target server:",typeof(data));
            var tun = ctl.findTunnel(portnum);
            var buf = new Buffer( dataary.length );
            for(var i=0;i<dataary.length;i++) buf[i] = dataary[i];
            tun.receiveRemoteData( cid, buf );
        } else if( cmd == "accept" ) { // [ portnum, connid ]
            var portnum = m[1]
            var connid = m[2];
            var tun = ctl.findTunnel(portnum);
            tun.connectToTarget(connid,ctl) 
        } else if( cmd == "error" ) { // [ portnum, connid, e ]
            var portnum = m[1] ;
            var connid = m[2];
            var tun = ctl.findTunnel(portnum);
            console.log( "received an error on tunneling socket id:", connid );
            tun.close(connid);
        } else if( cmd == "close" ) { // [ portnum, connid ]
            var portnum = m[1];
            var connid = m[2];
            var tun = ctl.findTunnel(portnum);
            console.log( "received close on tunneling socket id:", connid );            
            tun.close(connid);
        } else if( cmd == "list" ) { // [ {port:N, error:MSG}, ... ] }
            m.slice(1).forEach( function(s) {
                console.log( "Tunnel:", s );
            });
        }
    };

    var ms = new msgpack.Stream(co);
    ms.addListener( "msg", this.receiveMessage );
}

function createController(host,port,passcode) {
    var co = net.connect( { "host" : host, "port" : port } );
    var ctrl = new Controller(co,passcode);
    return ctrl;    
}


/////////////////

function printUsageExit() { 
    console.log( "Usage: node client.js HOSTNAME [-R TUNNELPORT:TARGETIP:TARGETPORT]... " );
    process.exit(1);
}

var argv = minimist( process.argv.slice(2));
console.log(argv);

var server_host = argv["_"][0];

if( !server_host ) printUsageExit();

var tunnel_args = [].concat(argv["R"]);

var passcode = argv["passcode"];

var confs = [];


tunnel_args.forEach( function(arg) {
    // arg: "TUNNELPORT:TARGETIP:TARGETPORT"
    var ary = arg.split(":");
    if( ary.length != 3 ) {
        console.log( "invalid argument:", arg );
        printUsageExit();
    }

    var conf = {}
    conf.tunnel_port = parseInt(ary[0]);
    conf.target_host = ary[1];
    conf.target_port = parseInt(ary[2]);
    if( (!conf.target_host) || (!conf.target_port) ) {
        console.log( "invalid argument:", arg );
        printUsageExit();
    }
    confs.push(conf);        
});



var ctl = createController( server_host, control_port, passcode );

confs.forEach( function(conf) {
    ctl.addTunnel( conf.tunnel_port, conf.target_host, conf.target_port );
});

