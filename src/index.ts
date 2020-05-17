import { setUpExtention } from "./chromeListeners";
import { getTokenAndProxyAPI, Token } from './proxy-api';
import { updateUiStatus } from "./popup";

export const PROXY_URL_PREFIX : string = "http://public-api.web-filter.local";

async function main() {
    try {
        let debug_token:string = "gQ3q9rpjvtP7P9C45z2g";

        updateUiStatus("Getting token and API...");
        await getTokenAndProxyAPI(debug_token);
        console.log("Got token, length: " + Token.length + ", '" + Token.substr(0,3)  +  "...'");

        updateUiStatus("Setting up listeners in extentions...");
        await setUpExtention();

        updateUiStatus("Done init.");
    } catch (error) {
        updateUiStatus(String(error));
    }
}

main()
    .then(()=>{console.log("Done starting.")});