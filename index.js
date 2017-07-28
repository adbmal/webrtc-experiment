const serve = require('koa-static');
const Koa = require('koa');
const app = new Koa();
const transform = require('sdp-transform');

const dgram = require('dgram');
const udpServer = dgram.createSocket('udp4');
const stun = require('stun-agent');

var iceUfrag;
var icePwd;
var iceUfrag2 = '7i05';
var icePwd2 = 'yJ4kGH2x2bXp0QEWh1Qa1Vdm';

// $ GET /package.json
app.use(serve('static'));

const server = require('http').createServer(app.callback());
const io = require('socket.io')(server);
io.on('connection', function(client) {
    console.log('connection')
    client.on('offer', function(data) {
        const sdp = transform.parse(data.sdp)
            // console.log(sdp)
        iceUfrag = sdp.media[0].iceUfrag
        icePwd = sdp.media[0].icePwd
        var answer = { "type": "answer", "sdp": "v=0\r\no=- 1893481071614735887 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE data\r\na=msid-semantic: WMS\r\nm=application 9 DTLS/SCTP 5000\r\nc=IN IP4 0.0.0.0\r\nb=AS:30\r\na=ice-ufrag:7i05\r\na=ice-pwd:yJ4kGH2x2bXp0QEWh1Qa1Vdm\r\na=fingerprint:sha-256 EB:42:A4:F6:91:E5:95:B1:5B:60:A0:4E:AE:A7:04:4C:0E:36:94:2C:42:C6:05:76:AE:2E:AC:56:4E:04:64:F4\r\na=setup:active\r\na=mid:data\r\na=sctpmap:5000 webrtc-datachannel 1024\r\n" }
        const sdp2 = transform.parse(answer.sdp)
        client.emit('answer', answer)
            // console.log(sdp2)
    })
    client.candidateSent = false
    client.on('candidate', function(data) {
        // console.log(transform.parseRemoteCandidates(data.candidate))
        if (client.candidateSent)
            return
        var { ip, port, ufrag } = candidateParser(data)
            // console.log(ip, port, ufrag, data.candidate)
            // var packet = stun.create.bindingRequest({ username: client.iceUfrag, password: client.icePwd });

        // udpServer.send(packet.raw, 0, packet.length, port, ip, function(err, bytes) {
        //     if (err) throw err;
        //     console.log('UDP message sent to ' + ip + ':' + port);
        // });

        client.candidateSent = true
        const candidate = {
                "type": "candidate",
                'sdpMid': 'data',
                "sdpMLineIndex:": 0,
                "candidate": "candidate:2755359820 1 udp 2122194687 192.168.88.88 41234 typ host generation 0 ufrag 7i05 network-id 1 network-cost 10"
            }
            // console.log(data)
        client.emit('candidate', candidate)
    })
});
server.listen(5001);
console.log('listening on port 5001');



function candidateParser(data) {
    data = data.candidate.split(" ");
    return {
        ip: data[4],
        port: data[5],
        ufrag: data[11]
    }
}


function stunParser(buffer) {
    var vars = {};
    var offset = 0;
    if (!Buffer.isBuffer(buffer)) {
        throw new Error("argument buffer is not a Buffer object");
    }
    var $tmp0 = buffer.readUInt16BE(offset);
    offset += 2;
    vars.version = $tmp0 >> 14 & 3;
    vars.type = $tmp0 >> 0 & 16383;
    vars.length = buffer.readUInt16BE(offset);
    offset += 2;
    vars.magic = buffer.readUInt32BE(offset);
    offset += 4;
    return vars;
}
//     .endianess('big')
//     .bit2('version')
//     .bit14('type')
//     .uint16('length')
//     .uint32('magic')
//     // .uint96('id')
// console.log(stunParse.getCode())

function isStun(packet) {
    const numberInRange = byte => byte >= 0 && byte <= 3
    if (Buffer.isBuffer(packet) && packet.length > 0) {
        return numberInRange(packet[0])
    }

    throw new TypeError('Argument 1 should be a Buffer.')
}

function isDtls(packet) {
    const numberInRange = byte => byte >= 20 && byte <= 63
    if (Buffer.isBuffer(packet) && packet.length > 0) {
        return numberInRange(packet[0])
    }

    throw new TypeError('Argument 1 should be a Buffer.')
}

udpServer.on('error', (err) => {
    console.log(`udpServer error:\n${err.stack}`);
    udpServer.close();
});
// console.log(stun.constants)

udpServer.on('message', (msg, rinfo) => {
    // var packet = Packet.parse(msg);
    // const request = stunParser(msg)
    // console.log(request)
    if (isDtls(msg)) {
        console.log('!!!!!!!!!!!!!Dtls Packet !!!')
        return
    }
    if (isStun(msg)) {
        console.log('stun msg from ', rinfo.address, rinfo.port)
        const packet = stun.StunMessage.from(msg)
            // console.log(packet)
        if (stun.validateFingerprint(packet)) {
            // console.log('username: ', packet.getAttribute(stun.constants.STUN_ATTR_USERNAME).value.toString('utf8'))
            if (stun.validateMessageIntegrity(packet, icePwd2)) {
                // console.log('password: ', icePwd2)
                const resStun = stun.createMessage(stun.constants.STUN_BINDING_RESPONSE, packet.transactionId)
                resStun.addAttribute(stun.constants.STUN_ATTR_XOR_MAPPED_ADDRESS, rinfo.address, rinfo.port)
                resStun.addMessageIntegrity(icePwd)
                resStun.addFingerprint()
                const resBuf = resStun.toBuffer()

                udpServer.send(resBuf, 0, resBuf.length, rinfo.port, rinfo.address, function(err, bytes) {
                    if (err) throw err;
                    // console.log('Response Stun message sent to ' + iceUfrag + ' ' + rinfo.address + ':' + rinfo.port);
                });
            }
            // if (stun.validateMessageIntegrity(packet, icePwd)) {
            //     console.log('password: ', icePwd)
            // }
        }
        // console.log(packet, icePwd, , stun.validateMessageIntegrity(packet, icePwd), stun.validateMessageIntegrity(packet, icePwd2))


        // const reqStun = stun.createMessage(stun.constants.STUN_BINDING_REQUEST)
        // reqStun.addAttribute(stun.constants.STUN_ATTR_USERNAME, iceUfrag + ':' + iceUfrag2)
        // reqStun.addMessageIntegrity(icePwd)
        // reqStun.addFingerprint()
        // const reqBuf = reqStun.toBuffer()

        // udpServer.send(reqBuf, 0, reqBuf.length, rinfo.port, rinfo.address, function(err, bytes) {
        //     if (err) throw err;
        //     // console.log('Request Stun message sent to ' + iceUfrag + ' ' + rinfo.address + ':' + rinfo.port);
        // });
        return
    }
    console.log('unknow packet')
        // // var packet = stun.create.bindingSuccess({ username: iceUfrag, password: icePwd });
        // var error, address = { host: rinfo.address, port: rinfo.port, family: 'IPv4' }
        // if (error = packet.append.responseAddress(address)) console.log(error);


    // var packet2 = stun.create.bindingRequest({ username: iceUfrag, password: icePwd });

    // udpServer.send(packet2.raw, 0, packet2.length, rinfo.port, rinfo.address, function(err, bytes) {
    //     if (err) throw err;
    //     console.log('UDP2 message sent to ' + rinfo.address + ':' + rinfo.port);
    // });

    // console.log(packet)
    // console.log(`udpServer got: ${msg} from ${rinfo.address}:${rinfo.port}`);
});

udpServer.on('listening', () => {
    const address = udpServer.address();
    console.log(`udpServer listening ${address.address}:${address.port}`);
});

udpServer.bind(41234);