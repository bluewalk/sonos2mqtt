const http = require("http");
const fs = require('fs');
const crypto = require('crypto');
const Mqtt = require('mqtt');
const gTTS = require('gtts');
const { DeviceDiscovery } = require('sonos');

const MQTT_HOST = process.env.MQTT_HOST || 'mqtt://127.0.0.1';
const MQTT_USERNAME = process.env.MQTT_USERNAME || null;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || null;
const MQTT_BASE_TOPIC = process.env.MQTT_BASE_TOPIC || 'sonos2';
const TTS_SAVE_DIR = process.env.TTS_SAVE_DIR || '.cache';
const TTS_HTTP_PORT = process.env.TTS_HTTP_PORT || 0;
const TTS_HTTP_BASEURL = process.env.TTS_HTTP_BASEURL || 'http://localhost:' + TTS_HTTP_PORT;
const TTS_NOTIFICATION_VOLUME = process.env.TTS_NOTIFICATION_VOLUME || 40

console.log('Sonos2MQTT v1.0');
console.log('https://github.com/bluewalk/sonos2mqtt');
console.log();

const mqttclient = Mqtt.connect(MQTT_HOST, {
    clientId: 'Sonos2MQTT-' + Math.random().toString(16).substring(2, 8),
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD
});

mqttclient.on('connect', () => {
    console.log('MQTT connected');

    mqttclient.subscribe(MQTT_BASE_TOPIC + '/+/+');
});

mqttclient.on('message', (topic, payload) => {
    let [sonos, action] = topic.replace(MQTT_BASE_TOPIC + '/', '').split('/');
    let device = devices.find((q) => q.mqttName === sonos)?.instance;
    if (device == null) return;

    switch (action.toUpperCase()) {
        case 'TTS':
            tts(payload.toString(), device);
            break;
        case 'PLAY':
            device.play(payload.toString());
            break;
        case 'PAUSE':
            device.pause();
            break;
        case 'STOP':
            device.stop();
            break;
        case 'NEXT':
            device.next();
            break;
        case 'PREVIOUS':
            device.previous();
            break;
        case 'PLAYTUNEINRADIO':
            device.playTuneinRadio(payload.toString(), 'TuneIn');
            break;
    }
})

let devices = [];

DeviceDiscovery((device) => {
    device.deviceDescription().then((info) => {
        let mqttName = info.roomName.toLowerCase().replaceAll(' ', '-');

        console.log('Sonos', info.roomName, 'found at', device.host, 'using MQTT topic', mqttName);

        devices.push({
            ip: device.host,
            instance: device,
            name: info.roomName,
            mqttName: mqttName
        });
    });
});

// sonos2mqtt_1    | (node:1) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 PlaybackStopped listeners added to [Sonos]. Use emitter.setMaxListeners() to increase limit
// sonos2mqtt_1    | (Use `node --trace-warnings ...` to show where the warning was created)

const tts = function (text, device) {
    let md5 = crypto.createHash('md5').update(text).digest("hex");
    let mp3 = TTS_SAVE_DIR + '/' + md5 + '.mp3';

    console.log('checking if already have mp3')
    if (!fs.existsSync(mp3)) {
        var gtts = new gTTS(text, 'en');

        console.log('generating')
        gtts.save(mp3, function (err) {
            if (err) { throw new Error(err); }
            console.log("Text to speech converted!");
        });
    }

    console.log('sending play command')
    device.playNotification({
        uri: TTS_HTTP_BASEURL + '/' + md5 + '.mp3', // test https://ttsmp3.com/created_mp3/c1281bb0f9daceaa8461016aa85614e3.mp3
        onlyWhenPlaying: false,
        volume: TTS_NOTIFICATION_VOLUME
    }).then(result => {
        console.log('Did play notification %j', result)

        // It starts (and stops) a listener in the background so you have to exit the process explicitly.
        // process.exit()
    }).catch(err => { console.log('Error occurred', err) })

    return mp3;
}

const requestListener = function (req, res) {
    if (req.method === 'GET') {
        console.log('GET', req.url, 'by', req.socket.remoteAddress);

        if (fs.existsSync(TTS_SAVE_DIR + req.url)) {
            fs.readFile(TTS_SAVE_DIR + req.url, (err, data) => {
                res.setHeader('Content-Type', 'audio/mpeg');
                res.writeHead(200);
                res.end(data);
            });
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    }
};

if (TTS_HTTP_PORT > 0) {
    const server = http.createServer(requestListener);
    server.listen(TTS_HTTP_PORT, '0.0.0.0', () => {
        console.log(`Server is running on http://0.0.0.0:${TTS_HTTP_PORT}`);
    });
}