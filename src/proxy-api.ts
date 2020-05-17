import {  PROXY_URL } from './index';
import { xhrRequestJson, xhrRequestText } from './xhr-utils';
import {hash} from './crypto'

interface TokenInfo {
    token : string,
    salt : string,
    token_salted : string
}

export interface StartupInfo {
    token : string,
    proxy_host : string,
}

export const API_CODENAMES = {
    manager_temp_url: "MANAGER_PORT_GET",
    get_blocked_phrases : "PHRASE_LIST_BROWSER",
    check_blocked : "REASON_BROWSER",
}


type ProxyAPIItem = {ep:string,method: string,desc: string}
type ProxyAPIResponse = {[key:string]: ProxyAPIItem}

export var ProxyAPI :ProxyAPIResponse = null
export var Token: string = null


export function getAPIEndpoint(code: string) {
    return ProxyAPI[code].ep;
}

export async function getTokenAndProxyAPI(debug_value: string = "") : Promise<void> {
    if (debug_value != "") {
        Token = debug_value;
        return;
    }

    ProxyAPI = 
        await xhrRequestJson<ProxyAPIResponse>(PROXY_URL, "GET", null, [["Accept","application/json"]]);
    let manager_port = await xhrRequestText(PROXY_URL + getAPIEndpoint(API_CODENAMES.manager_temp_url));
    let tokenInfo = await xhrRequestJson<TokenInfo>(`http://localhost:${manager_port}/`,"GET",null,
            [["x-helper","anti-user"]]);
    if ((await hash(tokenInfo.salt,tokenInfo.token)) == tokenInfo.token_salted) {
        Token = tokenInfo.token;
    }
    else {
        throw new Error("Can't verify token");
    }
}