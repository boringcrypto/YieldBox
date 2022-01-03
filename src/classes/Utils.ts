import { BigNumber } from "ethers"
import Decimal from "decimal.js-light"

declare module "decimal.js-light" {
    interface Decimal {
        toInt(decimals: number): BigNumber
    }
}

declare module "@ethersproject/bignumber" {
    interface BigNumber {
        toDec(divisor: number): Decimal
        print(divisor: number, decimals: number): string
    }
}

declare class CompressionStream {
    constructor(encoding: string)
    writable: any
    readable: any
}

declare class DecompressionStream {
    constructor(encoding: string)
    writable: any
    readable: any
}

Decimal.config({ precision: 36 })
Decimal.config({ toExpNeg: -1000 })
Decimal.config({ toExpPos: 1000 })
Decimal.prototype.toInt = function (decimals: number) {
    return BigNumber.from(this.times(new Decimal("10").pow(decimals)).todp(0).toString())
}

BigNumber.prototype.toDec = function (divisor: number) {
    return new Decimal(this.toString()).dividedBy(new Decimal("10").toPower(divisor));
}

// Returns a string where the value is divided by 10^divisor and cut off to decimalPlaces decimal places
// Pass in sep to change the decimal point. No rounding done at the moment.
BigNumber.prototype.print = function (divisor, decimals) {
    let powDivisor = new Decimal(10).toPower(divisor);
    //Scale the number down by divisor
    let x = new Decimal(this.toString());
    x = x.dividedBy(powDivisor);
    if (x.decimalPlaces() - x.precision(0) > decimals - 4) {
        return x.toSignificantDigits(4).toFixed();
    }
    else {
        return x.toFixed(decimals);
    }
}

let randomItem = function(array: any[]) {
    return array[Math.floor(Math.random() * array.length)]
}

function cleanURI(uri: string) {
    if (!uri) { return "" }
    let a = document.createElement("A") as HTMLAnchorElement
    if (!uri.startsWith("http:") && !uri.startsWith("https:")) {
        uri = "http://" + uri
    }
    a.href = uri
    if (a.protocol == 'http:' || a.protocol == 'https:') {
        return a.href
    }
    console.log("Bad url", uri)
    return "<invalid URL>"
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function playSound(src: string, volume: number = 1) {
    var myAudio = document.createElement('audio');
    if (myAudio.canPlayType('audio/mpeg')) {
        myAudio.setAttribute('src', src);
    }
    myAudio.volume = volume
    try {
        myAudio.play();                
    } catch(e) { 
        console.log("Playing sound failed")
    }
}

async function compress<T>(obj: T): Promise<string> {
    let str = JSON.stringify(obj)
    try {
        if (str && CompressionStream) {
            const byteArray = new TextEncoder().encode(str);
            const cs = new CompressionStream("gzip");
            const writer = cs.writable.getWriter();
            writer.write(byteArray);
            writer.close();
            let compressed = await new Response(cs.readable).arrayBuffer();
            return Array.from(new Uint8Array(compressed)).map(n => String.fromCharCode(n)).join('')
        }
    } catch {}
    return str || ""
}

async function decompress<T>(str: string | null): Promise<T | null> {
    try {
        if (str && DecompressionStream) {
            let dataNum = []
            for (var i = 0; i < str.length; i++) {
                dataNum.push(str.charCodeAt(i));
            }
            const cs = new DecompressionStream("gzip");
            const writer = cs.writable.getWriter();
            writer.write(Uint8Array.from(dataNum));
            writer.close();
            str = new TextDecoder().decode(await new Response(cs.readable).arrayBuffer())
        }
    } catch {}

    try {
        return JSON.parse(str || "");
    } catch {}

    return null
}

export {
    cleanURI,
    sleep,
    playSound,
    randomItem,
    compress,
    decompress
}