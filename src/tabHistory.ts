// ==> Note:
// ==> The entire point of this file is to have a full path referer


type HistoryItem = {time:Date, url: string};
type TabTempHistory = {[time_id: string]: HistoryItem}

type ParentTabInfo = {parent_tabid: number};

let TabsHistories: {[tabid:number]: TabTempHistory} = {}
let TabsParents : {[tabid:number] : ParentTabInfo } = {}

const keepalive_timespan = 5 * 1000;

function removeHistoryItem(tabid: number, time_id: string) {
    try {
        let TabHistory = TabsHistories[tabid];
        if (TabHistory) {
            // Keep the last until new history (in same tab: 1 current + 1 before)
            if (Object.keys(TabHistory).length > 2)  
            {
                delete TabHistory[time_id];
            }
            else 
            {
                // Try again later
                setTimeout(()=>{removeHistoryItem(tabid, time_id);},keepalive_timespan)
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

        let TabHistory = (TabsHistories[tabid] || {})
        TabHistory[time_id] = historyItem
        TabsHistories[tabid] = TabHistory

        setTimeout(()=>{removeHistoryItem(tabid, time_id);},keepalive_timespan)
   } catch (error) {
        console.error("[ADD-HISTORY-ITEM]", new Date(), error)
   }
}

export function getLatestUrl(tabid : number, before : Date) {
    let result :HistoryItem = {url:"",time: null}

    let TabHistory = TabsHistories[tabid]
    if (TabHistory) {
        let history_enteries_desc = 
            Object.keys(TabHistory)
            .map((value)=>TabHistory[value])
            .sort((a,b)=> -1 * ( a.time.getTime() - b.time.getTime()));
        
        for (let i = 0; i < history_enteries_desc.length; i++) {
            const history = history_enteries_desc[i];
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