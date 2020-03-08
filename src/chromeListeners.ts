function calledFunction(functionCode : string) :string {
    return "(" + functionCode + ")()";
}

function isExtError(results : Array<any>) : boolean {
    if (chrome.runtime.lastError || !results || !results.length) {
        console.log("Some error occurred", chrome.runtime.lastError);
        return true;
    }
    return false;
}

function onExtIconClickSetup() {
    chrome.browserAction.onClicked.addListener(function(tab) {
        chrome.tabs.executeScript({
            allFrames: true,
            code: 'alert(1)'
        }, function(results) {
        });
    })
}

function changeHeadersListenerSetup() {
    chrome.webRequest.onBeforeSendHeaders.addListener(
        //https://developer.chrome.com/extensions/webRequest#type-HttpHeaders
        function(details) {
            //TODO: sign this 3:
                //1. details.url
                //2. details.method
                //3. details.type
            details.requestHeaders.push({name:"SELFC-TYPE",value:details.type})
            return { requestHeaders: details.requestHeaders };
        },
        {urls: ['<all_urls>']}, // filters
        [ 'blocking', 'requestHeaders','extraHeaders'] // specs
    );
}

function processAllSelectedTabs() {
    chrome.windows.getAll({
        populate: true, // Populate Tabs object
        windowTypes: ['normal', 'popup'] // no devtool
    }, function callback(windows) {
        if (!isExtError(windows)) {
            for (let i = 0; i < windows.length; i++) {
                const window = windows[i];
                for (let j = 0; j < window.tabs.length; j++) {
                    const tab = window.tabs[j];
                    if (tab.highlighted) {
                        // [window.id, tab.id] Tab.id is unique across windows 
                        //          (no need for window.id in executeScript)
                        processAllFramesHTML(tab.id);
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

function getPageInfo() {
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

function blockPage() {
    window.location.href = "http://yoniwas.com";
}

function processAllFramesHTML(tabid : number) {
    console.log("Processing tab id:" + tabid);
    chrome.tabs.executeScript(tabid, {
        allFrames: true,
        code: calledFunction(getPageInfo.toString())
    }, function(results : string[]) {
        if (!isExtError(results)) {
            var foundBad = false;

            results.forEach(function(str, index) {
                if (!foundBad) {
                    var info = JSON.parse(str) as FrameContentInfo;
                    // TODO: Filter (navigate with js - say word + url + isTop)
                    if (info.html.indexOf("gogogo") > -1)  {
                        foundBad = true;
                        console.log("Found bad");

                        chrome.tabs.executeScript(
                            tabid, 
                            {
                                code: calledFunction(blockPage.toString())
                            },
                            function() {
                                setTimeout(function() {
                                    // TODO: Update html (same tab) with blocked info
                                }, 1000);
                            }
                        )
                    }
                }
            });
        }
    });
}

export function setUpExtention() {
    onExtIconClickSetup();    
    changeHeadersListenerSetup();
    setInterval(processAllSelectedTabs, 15 * 1000);
}