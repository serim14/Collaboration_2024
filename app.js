// 서버 측
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var server_time = require('moment');
require('moment-timezone');
server_time.tz.setDefault('Asia/Seoul');
const ytdl = require('ytdl-core'); // 추가된 부분

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/chat.html');
});

const express = require('express');
app.use(express.static('public'));

// 각 메시지의 좋아요/싫어요 카운트를 저장할 객체
let messageReactions = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('login', function (data) {
        console.log(
            'Client logged-in:\n name:' +
                data.name +
                '\n userid: ' +
                data.userid +
                '\n time:' +
                server_time().format('YYYY-MM-DD HH:mm:ss')
        );

        // socket에 클라이언트 정보를 저장한다
        socket.name = data.name;
        socket.userid = data.userid;
        socket.enter_time = server_time().format('YYYY-MM-DD HH:mm:ss');

        // 접속된 모든 클라이언트에게 메시지를 전송한다
        io.emit('login', { name: this.name, enter_time: this.enter_time });
    });

    
    socket.on('chat', async (data) => { // async 추가
        console.log(
            'Message from %s: %s (%s)',
            socket.name,
            data.msg,
            server_time().format('YYYY-MM-DD HH:mm:ss')
        );

        // 유튜브 썸네일 url 저장
        let thumbnailUrl = '';

        if (isYouTubeLink(data.msg)) {
            try {
                const videoId = getVideoIdFromUrl(data.msg);
                if (videoId) {
                    const info = await ytdl.getInfo(videoId);
                    thumbnailUrl = info.videoDetails.thumbnails.pop().url;
                    console.log("thumbnailUrl:");
                    console.log(thumbnailUrl);
                } else {
                    console.error('No video id found:', data.msg);
                }
            } catch (error) {
                console.error('Error fetching YouTube video information:', error.message);
            }
        }

        socket.broadcast.emit('chat', {
            msg: data.msg,
            name: socket.name,
            msg_time: data.msg_time,
            count: 0, // 채팅 메시지는 서버에서 카운트를 관리
            thumbnail: thumbnailUrl // 썸네일 URL 추가
        });
    });

    socket.on('base64', (data) => {
        console.log('base64 image received');
        socket.broadcast.emit('base64', {
            msg: data.base64,
            name: socket.name,
            msg_time: data.msg_time,
            count: 0, // 이미지 메시지는 서버에서 카운트를 관리
        });
    });

    // 서버 사이드
    socket.on('like', (data) => {
        console.log('like:', data.msg_id);
        // 좋아요 처리
        if (messageReactions[data.msg_id]) {
            messageReactions[data.msg_id].like++;
        } else {
            messageReactions[data.msg_id] = { like: 1, dislike: 0 };
        }
        io.emit('update', {
            msg_id: data.msg_id,
            action: 'like',
            count: messageReactions[data.msg_id].like,
        });
    });

    socket.on('dislike', (data) => {
        console.log('dislike:', data.msg_id);
        // 싫어요 처리
        if (messageReactions[data.msg_id]) {
            messageReactions[data.msg_id].dislike++;
        } else {
            messageReactions[data.msg_id] = { like: 0, dislike: 1 };
        }
        io.emit('update', {
            msg_id: data.msg_id,
            action: 'dislike',
            count: messageReactions[data.msg_id].dislike,
        });
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(3000, function () {
    console.log('Socket IO server listening on port 3000');
});

// 유튜브 링크에서 비디오id를 추출해내는 함수
function getVideoIdFromUrl(url) {
    let videoId = '';
    if (url.includes('youtube.com')) {
        videoId = url.split('v=')[1];
        const ampersandPosition = videoId.indexOf('&');
        if (ampersandPosition !== -1) {
            videoId = videoId.substring(0, ampersandPosition);
        }
    } else if (url.includes('youtu.be')) {
        videoId = url.split('/').pop();
    }
    return videoId;
}

// 링크가 유튜브 링크인지 판독
function isYouTubeLink(url) {
    return url.includes('youtube.com') || url.includes('youtu.be');
}