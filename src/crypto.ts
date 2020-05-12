https://jameshfisher.com/2017/10/30/web-cryptography-api-hello-world/

async function sha256_utf8(str : string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)); // UTF8 only, see MDN
  return Array.prototype.map.call(new Uint8Array(buf), (x:number) =>(('00'+x.toString(16)).slice(-2))).join('');
}