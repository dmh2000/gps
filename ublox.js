class Ublox {
  constructor() {
    this.state = 0;
    this.len = 0;
    this.count = 0;
    this.nmea = "";
  }

  /**
   * parse a buffer of serial bytes
   * @param buf Buffer object
   * @param cb(string)  callback receives nmea string when one is found
   */
  parse(buf,cb) {
    for(let index=0;index<buf.length;index++) {
      const b = buf[index];

      // don't exceed buffer lengths
      if (this.nmea.len >= 256) {
        state = 0;
      }
      switch (this.state) {
      case 0:
        this.index = 0;
        this.nmea = "";
        // looking for $
        if (b == 0x24) {
          this.nmea += String.fromCharCode(b);
          this.state = 1;
        }
        else if (b == 0xb5) {
          // ubx sync character
          this.state = 10;
        }
        else {
          // stay in start this.state
          this.state = 0;
        }
        break;
      case 1:
        // looking for G
        if (b == 0x47) {
          this.nmea += String.fromCharCode(b);
          this.state = 2;
        }
        else {
          this.state = 0;
        }
        break;
      case 2:
        this.nmea += String.fromCharCode(b);
        if (b == 0x0a) {
          cb(this.nmea);
          this.state = 0;
        }
        break;
      case 10:
        // ubx message
        if (b == 0x62) {
          // its a ubx message
          this.state = 11;
          this.count = 0;
        }
        else {
          this.state = 0;
        }
        break;
      case 11:
        // skip class and id
        this.count++;
        if (this.count == 2) {
          this.state = 12;
        }
        break;
      case 12:
        // first this.length byte
        this.len = b; // lsb of length
        this.state = 13;
        break;
      case 13:
        this.len += (b  * 256); // msg of length
        this.len += 2; // for checksum
        this.count = 0;
        this.state = 14;
        break;
      case 14:
        // throw away ubx bytes
        this.count++;
        if (this.count >= this.len) {
          this.state = 0;
        }
        break;
      default:
        this.state = 0;
        break;
      }      
    }
  }
}

module.exports = Ublox;