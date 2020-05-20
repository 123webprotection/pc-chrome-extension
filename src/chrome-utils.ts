import { PROXY_URL_PREFIX } from './index';
export function isChromeError(results : Array<any>, tag:string) : boolean {
    if (chrome.runtime.lastError || !results || !results.length) {
        console.log(tag,"Some error occurred", chrome.runtime.lastError);
        return true;
    }
    return false;
}

export function shouldSkip(url: string) : boolean {
    return url.startsWith(PROXY_URL_PREFIX) || url.toLowerCase().startsWith("chrome://")
}