assert = require("assert");

var net = require("net");

var targets = process.argv.slice(2);

function genData(n) {
    var ary = [];
    for(var i=0;i<n;i++) {
        ary.push(i);
    }
    return ary.join(":");
}
var g_id = 1;

var recv_only = false;
var binhead_mode = false;
var long_mode = false;

// args: "IP:PORT IP:PORT IP:PORT .."
targets.forEach( function(tgt) {

    if( tgt == "-r" ) {
        console.log( "Receiving-only mode" );
        recv_only = true;
    } else if( tgt == "-b" ) {
        console.log( "Binary-header mode" );
        binhead_mode = true;
    } else if( tgt == "-l" ) {
        console.log( "Long mode" );
        long_mode = true;
    } else {        
        var pair = tgt.split(":");
        var host = pair[0];
        var port = parseInt(pair[1]);

        var co = net.connect( { "host":host,"port":port } );
        co.count = 500
        co.id = g_id;
        g_id++;
        co.on( "connect", function() {
            setInterval( function() {
                if( !recv_only ) {
                    co.write( genData(co.count) );
                    co.count++;
                }
            }, 30 );
        });
        co.so_far = 0 
        co.on( "data", function(d) {
            var s = d.toString("hex");
            console.log( "data:",d.length, "id:", co.id, "count:",co.count, "dump:",d, "strlen:",s.length, "127-8:", d[127], d[128] );
            if( binhead_mode ) {
                var repeatlen = 256;
                if(long_mode)repeatlen = 20*1000;
                for(var i=0;i<d.length;i++) {
                    var check_n = ((co.so_far + i) % repeatlen) & 0xff;
                    if( d[i] != check_n ) {
                        console.log( "invalid data. i:",i, "d[i]:", d[i], "check_n:", check_n, "so_far:",co.so_far );
                        assert(false);
                    }
                }
                co.so_far += d.length;
            }
        });
        co.on( "error", function(e) {
            console.log( "error:", e );
        });
    }    
});
