import { StartupInfo } from './proxy-api';


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
            //TODO: sign this 3:
                //1. details.url
                //2. details.method
                //3. details.type (chrome resource type)
            details.requestHeaders.push({name:"SELFC-TYPE",value:details.type})
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
                    console.log("tab:", tabid, "new-url:", changeInfo.url, "ref:", referrer );
                }
                else {
                    console.log("tab:", tabid, "new-url-no-referrer:", changeInfo.url);
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
                    if (tab.highlighted) {
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

    console.log("Processing tab id:" + tabid);
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

                        blockTab(tabid);
                    }
                }
            });
        }
    });
}

function blockTab(tabid: number) {
    function blockPageCallback() {
        window.location.href = "http://yoniwas.com";
    }

    chrome.tabs.executeScript(tabid, {
        code: runningFuncString(blockPageCallback.toString())
    }, function () {
        setTimeout(function () {
            // TODO: Update html (same tab) with blocked info
        }, 1000);
    });
}

function getTokenFromManager() {
      /* fetch('http://OpenSinun.local/getLatestTokenUrl')
    .then((response) => {return response.text();}).then((data) => {
        console.log(data);
        fetch('http://localhost:7171/next2')
        .then((response) => {return response.text();}).then((data) => {console.log(data);});
    }); */

    // TODO: On fail token, open some tab with error.

    console.log("Trying to get manager url");
    chrome.storage.managed.get("token_url",(data)=> {
        console.log(1,data);
        console.log(2,data["token_url"]);
    })
}



let startupInfo : StartupInfo = null;
export async function setUpExtention() {
   
    //HeadersListenerSetup();
    //setInterval(processAllSelectedTabs, 15 * 1000); 
    //tabUrlChangeListenerSetup();
}