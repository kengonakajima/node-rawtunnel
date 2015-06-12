node-rawtunnel
====
ssh -R without encryption. Raw TCP tunneling by node.js.


Usage
====

SSH:

~~~
ssh hogeserver.com -R 60000:localhost:60000 -R 60001:localhost:60001
~~~

node-rawtunnel:

On sshd (server) side,

~~~
node ./server.js
~~~

On ssh (client) side,

~~~
node ./client.js hogeserver.com -R 60000:localhost:60000 -R 60001:localhost:60001
~~~


Options
===
~~~
--debugwrite
~~~
This option will divide data from target server in smaller write() units.
For example, if the target server sends 1400 byte fragment
and client.js receives it, it divides it into two packets of 700 bytes each and write() two times.

By this option you can check the system is supporting TCP as a stream,
in other words you can test record parsing algorithm of the application.




LICENSE
====
MIT

