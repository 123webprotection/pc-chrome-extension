import { isChromeError, shouldSkip } from './chrome-utils';
import { getLatestUrl, getLatestReferrer } from './tabHistory';
import { PROXY_URL_PREFIX } from './index';
/*
* ============== BACK ==============
*/
type get_string = ()=>string;
type get_refer_info = (tabid:number)=>{url:string, referer: string}

let ext_error :string = "";
export function updateUiStatus(status : string) {
    console.log("[UI-STATUS]",new Date(), status);
    ext_error = status;
} 

let getStatus : get_string = () => {
    return ext_error;
};

let getReferInfo : get_refer_info = (tabid:number) => {
    let result = {url: "", referer : ""};

    let urlInfo = getLatestUrl(tabid, new Date());
    result.url = urlInfo.url
    result.referer = getLatestReferrer(tabid, urlInfo.time)
    return result;
}

// Make it public:
(function exposeBackend() {
    (window as any)["getStatusCallback"] = getStatus;
    (window as any)["getReferInfoCallback"] = getReferInfo;
})();


/*
* ============== FRONT ==============
*/

let front_getStatus : get_string = (chrome.extension.getBackgroundPage() as any)["getStatusCallback"];
let front_getReferInfo : get_refer_info = (chrome.extension.getBackgroundPage() as any)["getReferInfoCallback"];



type TabInfo = {id: number, url : string}
async function front_getTabInfo() : Promise<TabInfo> {
    // Each click on icon create new popup.
    // https://stackoverflow.com/a/24072298/1997873

    let query = { active: true, currentWindow: true };

    return new Promise<TabInfo>((resolve,reject)=>{
        chrome.tabs.query(query,(tabs)=>{
            if(isChromeError(tabs,"popup get selected")) {
                reject("error");
            }
            else {
                // we requested exactly 1 (active tab in current window)
                resolve({id:tabs[0].id, url:tabs[0].url}); 
            }
        });
    })
}

function updateStatusText() {
    var error_span = document.getElementById("error");
    if (error_span)
        document.getElementById("error").innerText = front_getStatus();
}

function updateSpan(id: string, value: string, maxLen:number = 25) {
    let elem = document.getElementById(id);
    if (elem) {
        let text = value;
        if (text.length > maxLen) {
            text = value.substr(0,maxLen) + "..."
        }
        elem.innerText = text;
        elem.setAttribute("title", value);
    }
}

if (window.location.pathname.endsWith("popup.html"))  {
    window.addEventListener('load', async (ev)=>{
        updateStatusText()
        setInterval(()=>{
            updateStatusText();
        },500) // Only while popup is open, so no need to worry about performance

        let tabinfo = await front_getTabInfo();
        if (!shouldSkip(tabinfo.url)) {
            let url_info = front_getReferInfo(tabinfo.id);
            updateSpan("url",url_info.url);
            updateSpan("ref",url_info.referer);
        }
    })
}