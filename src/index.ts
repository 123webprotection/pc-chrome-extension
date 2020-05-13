import { setUpExtention } from "./chromeListeners";
import { getTokenAndProxyAPI, Token } from './startup';

export const PROXY_URL : string = "http://public-api.web-filter.local";

async function main() {
    console.log("Getting token and API...");
    await getTokenAndProxyAPI();

    console.log("Setting up listeners in extentions...");
    await setUpExtention();

    console.log("[DEBUG] " + Token)
}

main()
    .then(()=>{console.log("Done starting.")});