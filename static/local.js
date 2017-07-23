var msg = document.getElementById("message");

function log(text) {
    console.log(text)
    msg.value = msg.value + text + '\n'
}



var socket = io();
socket.on('connection', function() {
    console.log('connection')
});


var localPC = new RTCPeerConnection({
    iceServers: []
});
var remotePC = new RTCPeerConnection({
    iceServers: []
});

localPC.onicecandidate = function onIceCandidate(e) {
    if (e.candidate) {
        log('---local candidate---')
        log(JSON.stringify({
            type: 'candidate',
            mlineindex: e.candidate.sdpMLineIndex,
            candidate: e.candidate.candidate
        }).replace(/\\r\\n/g, '\n'))
        remotePC.addIceCandidate(e.candidate).then(() => {
            log('---remote add candidate success---')
        }, () => {
            log('---remote add candidate failed---')
        })
    }
};

remotePC.onicecandidate = function onIceCandidate(e) {
    if (e.candidate) {
        log('---remote candidate---')
        log(JSON.stringify({
            type: 'candidate',
            mlineindex: e.candidate.sdpMLineIndex,
            candidate: e.candidate.candidate
        }).replace(/\\r\\n/g, '\n'))
        localPC.addIceCandidate(e.candidate).then(() => {
            log('---local add candidate success---')
        }, () => {
            log('---local add candidate failed---')
        })
    }
};

var localDC = localPC.createDataChannel('chat')
var remoteDC
remotePC.ondatachannel = function(event) {
    log('---remote ondatachannel---')
    remoteDC = event.channel
    remoteDC.onmessage = (event) => {
        log('---remote received---')
        log(event.data)
    }
    remoteDC.onopen = (event) => {
        log('---remote open---')
    }
}

localDC.onopen = function() {
    var readyState = localDC.readyState;
    log('---local ' + readyState + '---')
    localDC.send('hello')
}

localPC.createOffer({}).then((desc) => {
    log('---offer---')
    log(JSON.stringify(desc).replace(/\\r\\n/g, '\n'))
    localPC.setLocalDescription(desc)
    socket.emit('offer', (desc))
    remotePC.setRemoteDescription(desc)
    remotePC.createAnswer({}).then((answer) => {
        log('---answer---')
        log(JSON.stringify(answer).replace(/\\r\\n/g, '\n'))
        localPC.setRemoteDescription(answer)
        remotePC.setLocalDescription(answer)
    })
})