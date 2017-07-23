var msg = document.getElementById("message");

function log(text) {
    console.log(text)
    msg.value = msg.value + text + '\n'
}



var socket = io();
socket.on('connection', function() {
    console.log('connection')
});

socket.on('answer', function(data) {
    log('---answer---')
    log(JSON.stringify(data).replace(/\\r\\n/g, '\n'))
    localPC.setRemoteDescription(data)
});

socket.on('candidate', function(data) {
    log('---remote candidate---')
    log(JSON.stringify(data).replace(/\\r\\n/g, '\n'))
    localPC.addIceCandidate(data).then(() => {
        log('---local add candidate success---')
    }, () => {
        log('---local add candidate failed---')
    })
});


var localPC = new RTCPeerConnection({
    iceServers: []
});

localPC.onicecandidate = function onIceCandidate(e) {
    if (e.candidate) {
        log('---local candidate---')
        log(JSON.stringify(e.candidate).replace(/\\r\\n/g, '\n'))
        socket.emit('candidate', e.candidate)
    }
};

var localDC = localPC.createDataChannel('chat')
    // var remoteDC
    // remotePC.ondatachannel = function(event) {
    //     log('---remote ondatachannel---')
    //     remoteDC = event.channel
    //     remoteDC.onmessage = (event) => {
    //         log('---remote received---')
    //         log(event.data)
    //     }
    //     remoteDC.onopen = (event) => {
    //         log('---remote open---')
    //     }
    // }

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
})