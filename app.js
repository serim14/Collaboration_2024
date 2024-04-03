var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var server_time = require('moment');
require('moment-timezone');
server_time.tz.setDefault("Asia/Seoul");


// localhost:3000으로 서버에 접속하면 클라이언트로 chat.html을 전송한다
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/chat.html');
});
const express = require('express')
app.use(express.static('public'))


// connection event handler
// connection이 수립되면 event handler function의 인자로 socket인 들어온다
io.on('connection', function(socket) {

  // 접속한 클라이언트의 정보가 수신되면
  socket.on('login', function(data) {
    console.log('Client logged-in:\n name:' + data.name + '\n userid: ' + data.userid + '\n time:' + server_time().format('YYYY-MM-DD HH:mm:ss'));

    // socket에 클라이언트 정보를 저장한다
    socket.name = data.name;
    socket.userid = data.userid;
    socket.enter_time = server_time().format('YYYY-MM-DD HH:mm:ss')

    // 접속된 모든 클라이언트에게 메시지를 전송한다
    io.emit('login', {name : this.name, enter_time : this.enter_time});
  });

  // 클라이언트로부터의 메시지가 수신되면
  socket.on('chat', function(data) {
    console.log('Message from %s: %s (%s)', socket.name, data.msg, server_time().format('YYYY-MM-DD HH:mm:ss'));
    var msg = {
      from: {
        name: socket.name,
        userid: socket.userid,
        msg_time : server_time().format('YYYY-MM-DD HH:mm:ss')
      },
      msg: data.msg
    };

    // 메시지를 전송한 클라이언트를 제외한 모든 클라이언트에게 메시지를 전송한다
    socket.broadcast.emit('chat', {msg : data.msg, name:msg.from.name, msg_time : msg.from.msg_time});
  });

  socket.on('base64', function (data) {
    console.log('received base64 file from ' + socket.name);

    var msg = {
      from : {
        name: socket.name,
        userid: socket.userid,
        msg_time : server_time().format('YYYY-MM-DD HH:mm:ss'),
      },
      msg: data.base64
    };
    
    // 메시지를 전송한 클라이언트를 제외한 모든 클라이언트에게 메시지를 전송한다
    socket.broadcast.emit('base64', {msg : data.base64, name:msg.from.name, msg_time : msg.from.msg_time});
});


  // force client disconnect from server
  socket.on('forceDisconnect', function() {
    socket.disconnect();
  });

  socket.on('disconnect', function() {
    console.log('user disconnected: ' + socket.name);
  });
});

server.listen(3000, function() {
  console.log('Socket IO server listening on port 3000');
});