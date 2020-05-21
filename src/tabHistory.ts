// ==> Note:
// ==> The entire point of this file is to have a full path referer


type HistoryItem = {time:Date, url: string};
type TabTempHistory = HistoryItem[]

type ParentTabInfo = {parent_tabid: number};

let TabsHistories: {[tabid:number]: TabTempHistory} = {}
let TabsParents : {[tabid:number] : ParentTabInfo } = {}

const keepalive_timespan = 5 * 1000;

function removeHistoryItem(tabid: number) {
    try {
        let TabHistory = TabsHistories[tabid];
        if (TabHistory) {
            // Keep the last until new history (in same tab: 1 current + 1 before)
            if (TabHistory.length > 2)  
            {
                let lastIndex = TabHistory.length; // in terms of slice
                TabsHistories[tabid]=  TabHistory.slice(lastIndex - 2, lastIndex );
            }
            else 
            {
                // Try again later
                setTimeout(()=>{removeHistoryItem(tabid);},keepalive_timespan)
            }
        }
    } catch (error) {
        console.error("[REMOVE-HISTORY-ITEM]", new Date(), error)
    }
}

export function addHistory(tabid: number, url: string, time: Date) {
   try {
        let time_id = `${time.getTime()}_${Math.random()}`;
        let historyItem : HistoryItem = {time,url};

        let TabHistory = (TabsHistories[tabid] || [])
        if (TabHistory.length == 0 || TabHistory[TabHistory.length-1].url != url) // Don't duplicate on refresh
            TabHistory.push(historyItem)
        TabsHistories[tabid] = TabHistory

        setTimeout(()=>{removeHistoryItem(tabid);},keepalive_timespan)
   } catch (error) {
        console.error("[ADD-HISTORY-ITEM]", new Date(), error)
   }
}

export function getLatestUrl(tabid : number, before : Date) {
    let result :HistoryItem = {url:"",time: null}

    let TabHistory = TabsHistories[tabid]
    if (TabHistory) {

        for (let i = TabHistory.length - 1; i > -1; i--) {
            const history = TabHistory[i];
            if (history.time < before){
                result =  history;
                break;
            }
        }
    }

    return result;
}

export function getLatestReferrer(tabid: number, before: Date) : string {
    let result = "";
    try {
        result = getLatestUrl(tabid, before).url;

        if (result == "") {
            // Recursive try to get referer from parent
            let parentInfo = TabsParents[tabid];
            if (parentInfo) {
                result = getLatestReferrer(parentInfo.parent_tabid, before);
            }
        }
    } catch (error) {
        console.error("[GET-HISTORY]", new Date(), error)
    }
    return result;
}

export function setTabParent(tabid: number, parent_tabid: number) {
    TabsParents[tabid] = {parent_tabid};
}

export function closeTab(tabid: number) {
    try {
        delete TabsHistories[tabid]
        if (TabsParents[tabid])
            delete TabsParents[tabid];
    } catch (error) {
        console.error("[CLOSE-TAB-HISTORY]", new Date(), error)
    }
}

function printHistoryState() { // For debugging
    console.log("History", TabsHistories);
    console.log("Parents", TabsParents)
}

if (!window.location.href.endsWith("popup.html"))
    (window as any)["printHistoryState"] = printHistoryState