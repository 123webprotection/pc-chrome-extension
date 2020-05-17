import { StartupInfo, Token, getBlockedUrlPage as getBlockedEPPage } from './proxy-api';
import { hash } from './crypto';
import { PROXY_URL_PREFIX } from './index';

const bypass_header = "proxy-sha256";

function runningFuncString(functionCode : string) :string {
    return "(" + functionCode + ")()";
}

function isChromeError(results : Array<any>) : boolean {
    if (chrome.runtime.lastError || !results || !results.length) {
        console.log("Some error occurred", chrome.runtime.lastError);
        return true;
    }
    return false;
}


function HeadersListenerSetup() {
    chrome.webRequest.onBeforeSendHeaders.addListener(
        //https://developer.chrome.com/extensions/webRequest#type-HttpHeaders
        function(details) {
            details.requestHeaders.push({name:bypass_header,value: hash(details.url, Token) })
            return { requestHeaders: details.requestHeaders };
        },
        {urls: ['<all_urls>']}, // filters
        [ 'blocking', 'requestHeaders','extraHeaders'] // specs from docs
    );
}

function tabUrlChangeListenerSetup() {
    function getReferrerCallback() {
        return document.referrer;
    }
    
    chrome.tabs.onUpdated.addListener((tabid, changeInfo, tabObj)=>{
        if (tabid && changeInfo && changeInfo.url) {
            chrome.tabs.executeScript(tabid,{
                allFrames: false,
                code: runningFuncString(getReferrerCallback.toString())
            }, (result)=> {
                if (!isChromeError(result)) {
                    var referrer : string = result[0];
                    //console.log("tab:", tabid, "new-url:", changeInfo.url, "ref:", referrer );
                }
                else {
                    //console.log("tab:", tabid, "new-url-no-referrer:", changeInfo.url);
                }
            })
        }
    });
}

function processAllSelectedTabs() {
    chrome.windows.getAll({
        populate: true, // Populate Tabs object
        windowTypes: ['normal', 'popup'] // no devtool
    }, function callback(windows) {
        if (!isChromeError(windows)) {
            for (let i = 0; i < windows.length; i++) {
                const window = windows[i];
                for (let j = 0; j < window.tabs.length; j++) {
                    const tab = window.tabs[j];
                    if (tab.highlighted) { // highlighted = current selected tab

                        // [window.id, tab.id] Tab.id is unique across windows 
                        //          (no need for window.id in executeScript)
                        processAllTabFramesHTML(tab.id);
                    }
                }
            }
        }
    });
}

export interface FrameContentInfo {
    top: boolean,
    url: string,
    html: string,
}


function processAllTabFramesHTML(tabid : number) {
    function getPageInfoCallback() {
        var result : FrameContentInfo = {
            top : true,
            url : "no-url",
            html: "no-html",
        }
        result.top = window.top === window;
        if (!!location && !!location.href)
            result.url = location.href
        if (!!document)
            var elemList = document.getElementsByTagName("html")
            if (!!elemList && elemList.length > 0)
                result.html = elemList[0].outerHTML
    
        return JSON.stringify(result);
    }

    //console.log("Processing tab id:" + tabid);
    chrome.tabs.executeScript(tabid, {
        allFrames: true,
        code: runningFuncString(getPageInfoCallback.toString())
    }, function(results : string[]) {
        if (!isChromeError(results)) {
            var foundBadPhrase = false;

            results.forEach(function(str, index) {
                if (!foundBadPhrase) {
                    var info = JSON.parse(str) as FrameContentInfo;
                    // TODO: Filter (navigate with js - say word + url + isTop)
                    
                    if (info.html.indexOf("gogogo") > -1)  {
                        foundBadPhrase = true;
                        console.log("Found bad");

                        blockTab(tabid, "Found gogo and gogo is bad");
                    }
                }
            });
        }
    });
}

function blockTab(tabid: number, reason: string) {
    let blocked_url = `${PROXY_URL_PREFIX}${getBlockedEPPage()}`;

    function blockPageCallback() {
        window.location.href = "@";
    }

    function setReason(reason: string) {
        document.getElementById("reason").innerText = "@"
    }

    let navigateFunction = 
        runningFuncString(blockPageCallback.toString()).replace("@",blocked_url);
    let changeReasonFunction = 
        runningFuncString(setReason.toString()).replace("@", reason);

    chrome.tabs.executeScript(tabid, {
        code: navigateFunction
    }, function () {
        setTimeout(function () {
            chrome.tabs.executeScript(tabid, {
                code: changeReasonFunction
            }, function () {});
        }, 1000);
    });
}


let startupInfo : StartupInfo = null;
export async function setUpExtention() {
    HeadersListenerSetup();
    setInterval(processAllSelectedTabs, 2 * 1000); 
    tabUrlChangeListenerSetup();
}