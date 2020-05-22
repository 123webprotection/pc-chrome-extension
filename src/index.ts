import { setUpExtention } from "./chromeListeners";
import { getTokenAndProxyAPI, Token, updatePhrases } from './proxy-api';
import { updateUiStatus, updateUiState } from "./popup";

export const PROXY_URL_PREFIX : string = "http://public-api.web-filter.local";
export let failedInit = false

async function main() {
    try {
        let debug_token:string = "";

        updateUiStatus("Getting token and API...");
        await getTokenAndProxyAPI(debug_token);
        console.log("Got token, length: " + Token.length + ", '" + Token.substr(0,3)  +  "...'");

        updateUiStatus("Getting phrases...");
        await updatePhrases();
        
        updateUiState("OK ✅");
    } catch (error) {
        updateUiState("ERROR 💥");
        failedInit = true;
        
        console.log("INIT-ERROR", error)
        updateUiStatus(String(error));
    }

    updateUiStatus("Setting up listeners in extentions...");
    await setUpExtention(failedInit);

    updateUiStatus("Done init.");
}

if (!window.location.pathname.endsWith("popup.html"))  {
    main()
        .then(()=>{console.log("Done starting.")});
}