const { DeviceDiscovery } = require('sonos')
const { AsyncDeviceDiscovery } = require('sonos')
const { Sonos } = require('sonos')
// event on all found...
const discovery = new AsyncDeviceDiscovery()

// discovery.discover().then((device, model) => {
//   console.log('Found one sonos device %s getting all groups', device.host)

//   //return device.getAllGroups().then((groups) => {

//     //console.log('Groups %s', JSON.stringify(groups, null, 2))
//     //return groups[0].CoordinatorDevice().togglePlayback()
//   //})
// }).catch(e => {
//   console.warn(' Error in discovery %j', e)
// })


// DeviceDiscovery((device) => {
//     // device.getZoneInfo((info) => console.log('zone', info));
//     device.deviceDescription().then((i) => console.log(i.roomName));
//     //device.getAllGroups().then((groups) => console.log(device, groups.find((q) => q.host === device.host)?.Name));
//     console.log('Sonos found at', device.host);
// });


// 102 = Walk in closet
// 114 = Office
// 154 = Living room
const device = new Sonos('192.168.1.154'); // livingroom

device.playNotification({
    uri: 'https://ttsmp3.com/created_mp3/c1281bb0f9daceaa8461016aa85614e3.mp3',
    onlyWhenPlaying: false, // It will query the state anyway, don't play the notification if the speaker is currently off.
    volume: 40 // Change the volume for the notification, and revert back afterwards.
  }).then(result => {
    // It will wait until the notification is played until getting here.
    console.log('Did play notification %j', result)
  
    // It starts (and stops) a listener in the background so you have to exit the process explicitly.
    //process.exit()
  }).catch(err => { console.log('Error occurred %j', err) })