const SerialPort = require('serialport');
const NmeaParser = require('./node-nmea');
const Ublox      = require('./ublox');

const GPS_SVS = 32;
const tty = "COM4";
const port = new SerialPort(tty,{baudRate:9600})
const ubx = new Ublox();
let   gps = {
  "GPGGA":0,
  "GPRMC":0,
  "GPGSV":0,
  sat:[]
};

console.log(port);

// populate the satellite data structure
for(let i=0;i<GPS_SVS;++i) {
  gps.sat.push({prn:i,time:0,snr:0});
}

NmeaParser.setErrorHandler((id,msg) => {
  // ignore id not found, print all others
  if (id != NmeaParser.ERROR_ID_NOT_FOUND) {
    console.log(`${id} : ${msg}`);
  }
});

port.on("open", (err) => {
  if (err) {
    console.log(err);
  }
});

port.on("error",(err) => {
  console.log(err);
});

port.on("data",(data) => {
  // parse messages into sentences to skip UBS binary data
  ubx.parse(data,(nmea) => {
    let sat;
    // parse each sentence and get its data
    const r = NmeaParser.parse(nmea);
    if (r) {
      switch(r.id) {
        case "GPGGA":
          // new r overrides gga message data in gps
          gps = {...gps,...r};
          gps[r.id]++;
          break;
        case "GPRMC":
          // only keep the date from gprmc
          gps = {date:r.date,...gps};          
          gps[r.id]++;
        break;
        case "GPGSV":
          // copy the sat array
          sat = gps.sat.slice();
          // get sat PRN and SNR
          for(let i=0;i<r.sat.length;++i) {
            let prn = r.sat[i].prn;
            if (prn <= GPS_SVS) {
              sat[prn].time = gps.time;
              sat[prn].snr  = r.sat[i].snr;
            }
          }
          gps[r.id]++;
          // new sat overrides old gps.sat
          gps = {...gps,sat};
          break;
        default:
          break;
      }
      console.log(gps);
    }
  });
});

port.open();


