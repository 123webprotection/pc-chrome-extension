import { StartupInfo, Token, getBlockedUrlPage as getBlockedEPPage, checkURLAllowed } from './proxy-api';
import { hash } from './crypto';
import { PROXY_URL_PREFIX, failedInit } from './index';
import { isHTMLAllowed } from './phrases';
import { setTabParent, closeTab, addHistory, getLatestReferrer } from './tabHistory';
import { isChromeError, shouldSkip } from './chrome-utils';

const bypass_header = "proxy-sha256";

function runningFuncString(functionCode : string) :string {
    return "(" + functionCode + ")()";
}

function htmlList(arr: any[]) {
    let result = "<ul style=\"text-align: left;\">";
    for (let i = 0; i < arr.length; i++) {
        const element = arr[i];
        
        result += "<li>";

        if (typeof element == "string") {
            let e : string = element as string;
            if (e.startsWith("***")) {
                result += `<b>${element.substr(3)}</b>`
            }
            else {
                result += `${element}`
            }
        }
        else {
            result += String(element);
        }
    
        if (i + 1 < arr.length && Array.isArray(arr[i+1])) {
            result += htmlList(arr[i+1]);
            i++; // skip the array
        } 

        result += "</li>";
    }
    result += "</ul>";
    return result;
}

function htmlReason(reason:string):string {
    return reason.replace(/\<\*/g, "<b>").replace(/\*\>/g, "</b>").replace(/_\</g, "<u>").replace(/\>\_/g, "</u>");
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

function isUserAction(ttype: string, tqualifier: string[]): boolean {
    //https://developer.chrome.com/extensions/history#transition_types
    let blocked_TTypes = ["typed","auto_bookmark","generated","auto_toplevel","keyword","keyword_generated"];
    
    //https://developer.chrome.com/extensions/webNavigation#transition_types
    let blocked_TQualifiers = ["from_address_bar"]
    return (
        blocked_TTypes.indexOf(ttype) > -1  || 
        tqualifier.findIndex((q)=>blocked_TQualifiers.indexOf(q) > -1) > -1
    );
}

async function enforcePolicyNavigation(tabid:number, url:string, ignore_ref : boolean,
     addToHistory : boolean = true) {
    console.log("UPDATE",tabid, url);

    let referrerURL : string = getLatestReferrer(tabid, new Date());
    if (addHistory)
        addHistory(tabid,url,new Date());

    if (shouldSkip(url))
        return;

    let _refererReason = ignore_ref ? "Referer only on navigation" : "<refer-init>";

    let new_url = url;
    let new_url_reason = "<url-init>";

    let urlCheck = await checkURLAllowed(new_url);
    if (!urlCheck.blocked) {
        return;
    }
    else {
        new_url_reason = urlCheck.reason;

        if (!ignore_ref) {
            let referCheck = await checkURLAllowed(referrerURL);
            _refererReason = "<i>Allowed to refer?</i> " + referCheck.allowReferrer;
    
            if (!referCheck.blocked && referCheck.allowReferrer) {
                return;
            }
        }
        
        blockTab(tabid, htmlList([
            "***Referrer:",
            [
                "***URL:",
                [   referrerURL],
                "***Reason:",
                [     htmlReason(_refererReason)]
            ],
            "***Target:",
            [
                "***URL:",
                [    new_url ],
                "***Reason:", 
                [    htmlReason(new_url_reason)]
            ]
        ]))
    }
}

function tabUrlChangeListenerSetup() {
    /*
    Old: problem was we can't detect user typed url
    
    chrome.tabs.onUpdated.addListener(async (tabid, changeInfo, tabObj)=>{
        if (tabid && changeInfo && changeInfo.url) {
            await enforcePolicyNavigation(tabid, changeInfo.url, false);
        }
    });*/

    chrome.webNavigation.onCommitted.addListener((details_nav)=>{
        if (failedInit && !details_nav.url.startsWith(PROXY_URL_PREFIX)) {
            blockTab(details_nav.tabId, htmlList(["***Init failed. Blocking all"]));
            return;
        }

        chrome.webNavigation.getFrame(
            {tabId: details_nav.tabId, frameId: details_nav.frameId},
            async (details_frame)=> {
                if (details_frame && details_frame.parentFrameId == -1) { // The navigating frame is top frame
                    await enforcePolicyNavigation(details_nav.tabId, details_nav.url,
                        isUserAction(details_nav.transitionType, details_nav.transitionQualifiers),
                        !details_nav.url.startsWith(PROXY_URL_PREFIX));
            }
        })
    })

    
}

function processAllSelectedTabs() {
    chrome.windows.getAll({
        populate: true, // Populate Tabs object
        windowTypes: ['normal', 'popup'] // no devtool
    }, function callback(windows) {
        if (!isChromeError(windows,"[list tabs]")) {
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
        if (!isChromeError(results,"[HTML selectedTab]")) {
            var foundBadPhrase = false;

            results.forEach(function(str, index) {
                if (!foundBadPhrase) {
                    var info = JSON.parse(str) as FrameContentInfo;

                    if (!info.url.startsWith(PROXY_URL_PREFIX)) // Dont filter our block page
                    {
                        let reason = "";
                        if (!isHTMLAllowed(info.html, (r)=>{reason=r}))  {
                            foundBadPhrase = true;
                            console.log("Found bad");
                            blockTab(tabid, htmlList(
                            [
                                "***Source Frame:", [
                                    "***Main/Top Frame?",
                                    [info.top],
                                    "***URL:",
                                    [info.url]
                                ],
                                "***Reason:",[
                                    htmlReason(reason)
                                ]
                            ]
                            ));
                        }
                    }
                }
            });
        }
    });
}

function blockTab(tabid: number, reason_html: string) {
    let blocked_url = `${PROXY_URL_PREFIX}${getBlockedEPPage()}`;

    function blockPageCallback() {
        window.location.href = ({} as any).data;
    }

    function setReason(reason: string) {
        document.getElementById("reason").innerHTML = ({} as any).data
    }

    let navigateFunction = 
        runningFuncString(blockPageCallback.toString()).replace("{}",JSON.stringify({data:blocked_url}));
    let changeReasonFunction = 
        runningFuncString(setReason.toString()).replace("{}",JSON.stringify({data:reason_html}));

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

function setUpReferrerListeners() {
    chrome.tabs.onCreated.addListener((tab)=> {
        if (tab.openerTabId) {
            setTabParent(tab.id, tab.openerTabId);
        }
    })

    chrome.tabs.onRemoved.addListener((tabid, info)=>{
        closeTab(tabid);
    })
}


let startupInfo : StartupInfo = null;
export async function setUpExtention(minimal: boolean = false) {
    if (!minimal) {
        setUpReferrerListeners();
        HeadersListenerSetup();
        setInterval(processAllSelectedTabs, 2 * 1000); 
    }
    tabUrlChangeListenerSetup();
}