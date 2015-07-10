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


Passcode
====
You can add passcode to access the server for basic security.

Server side:

~~~
node ./server.js --passcode=asdfasdf
~~~

Client side:

~~~
node ./client.js hogeserver.com -R 60000:localhost:60000 -R 60001:localhost:60001 --passcode=asdfasdf
~~~


Timeout
====
Server (and eventually client) will automatically quit after 30 minutes of idling.
To skip this timeout, you can give "--skip_timeout" option.
You can also set timeout in second like "--timeout_sec=30"

LICENSE
====
MIT

