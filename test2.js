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

// args: "IP:PORT IP:PORT IP:PORT .."
targets.forEach( function(tgt) {
    var pair = tgt.split(":");
    var host = pair[0];
    var port = parseInt(pair[1]);

    var co = net.connect( { "host":host,"port":port } );
    co.count = 500
    co.id = g_id;
    g_id++;
    co.on( "connect", function() {
        setInterval( function() {
            co.write( genData(co.count) );
            co.count++;
        }, 30 );
    });
    co.on( "data", function(d) {
        console.log( "data:",d.length, "id:", co.id, "count:",co.count);
    });
    co.on( "error", function(e) {
        console.log( "error:", e );
    });
});
