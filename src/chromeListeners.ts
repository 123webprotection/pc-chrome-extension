import { StartupInfo, Token, getBlockedUrlPage as getBlockedEPPage, checkURLAllowed } from './proxy-api';
import { hash } from './crypto';
import { PROXY_URL_PREFIX } from './index';
import { isHTMLAllowed } from './phrases';
import { setTabParent, closeTab, addHistory, getLatestReferrer } from './tabHistory';
import { isChromeError, shouldSkip } from './chrome-utils';

const bypass_header = "proxy-sha256";

function runningFuncString(functionCode : string) :string {
    return "(" + functionCode + ")()";
}



function htmlList(arr: string[]) {
    return "<ul><li>" + arr.join("</li><li>") + "</li></ul>";
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

function tabUrlChangeListenerSetup() {
    chrome.tabs.onUpdated.addListener(async (tabid, changeInfo, tabObj)=>{
        if (tabid && changeInfo && changeInfo.url) {
            let referrerURL : string = getLatestReferrer(tabid, new Date());
            addHistory(tabid,changeInfo.url,new Date());

            if (shouldSkip(changeInfo.url))
                return;

            let _refererReason = "<refer-init>";

            let new_url = changeInfo.url;
            let new_url_reason = "<url-init>";

            let urlCheck = await checkURLAllowed(new_url);
            if (!urlCheck.blocked) {
                return;
            }
            else {
                new_url_reason = urlCheck.reason;

                let referCheck = await checkURLAllowed(referrerURL);
                _refererReason = "<i>Allowed to refer?</i> " + referCheck.allowReferrer;

                if (!referCheck.blocked && referCheck.allowReferrer) {
                    return;
                }
                else
                {
                    blockTab(tabid, htmlList([
                        "<b>Referrer: </b>",
                        referrerURL,
                        _refererReason,
                        "<b>Target: </b>",
                        new_url,
                        htmlReason(new_url_reason),
                    ]))
                }
            }
        }
    });
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
                            blockTab(tabid, htmlList([
                                info.url, "Top Frame? " + info.top, htmlReason(reason)
                            ]));
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
        window.location.href = "@";
    }

    function setReason(reason: string) {
        document.getElementById("reason").innerHTML = "@"
    }

    let navigateFunction = 
        runningFuncString(blockPageCallback.toString()).replace("@",blocked_url);
    let changeReasonFunction = 
        runningFuncString(setReason.toString()).replace("@", reason_html);

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
export async function setUpExtention() {
    setUpReferrerListeners();
    HeadersListenerSetup();
    setInterval(processAllSelectedTabs, 2 * 1000); 
    tabUrlChangeListenerSetup();
}