//https://gist.github.com/GaspardP/fffdd54f563f67be8944

export function sign(data: string, token: string) {
    //return window.crypto.subtle.digest("SHA256", token);
}

async function digestMessage(message: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return hash;
  }

  async function digestMessage2(message: string) {
    const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
    const hashArray = Array(new Uint8Array(hashBuffer));                     // convert buffer to byte array
    //const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    //return hashHex;
  }