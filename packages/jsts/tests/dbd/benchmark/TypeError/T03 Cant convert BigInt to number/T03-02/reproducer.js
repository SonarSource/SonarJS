const { Buffer } = require('buffer');
let buf = Buffer.alloc(10);
let cursor = 0;

const bigints = [BigInt(1), BigInt(2), BigInt(3)];
for (const bigint of bigints) {
    writeVarUInt(bigint >>> 0); // Noncompliant: Cannot mix BigInt and other types, use explicit conversions
}

function writeVarUInt(value) {
    do {
        let b = value & 0xff;
        if (value >= 0x80) {
            b |= 0x80;
        }
        resizeBuffer(1);
        buf.writeUInt8(b, cursor++);
        value >>>= 7;
    } while (value != 0);
}


function resizeBuffer(addsize) {
    let newlen = cursor + addsize;
    if (buf.length < cursor + addsize) {
        newlen = newlen - buf.length + cursor;
    }
    const newb = Buffer.alloc(newlen);
    buf.copy(newb);
    buf = newb;
}
