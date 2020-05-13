export function xhrRequestText(url:string, method:string="GET", body:any = null, headers:(string[])[] = [])
    : Promise<string> {
    return new Promise<string>((resolve, reject)=>{
        let oReq = new XMLHttpRequest();
        oReq.addEventListener("error", () => reject("request error"));
        oReq.addEventListener("abort", () => reject("request aborted"));
        oReq.onreadystatechange = function() {
            if (oReq.readyState == XMLHttpRequest.DONE) {
                resolve(oReq.responseText);
            }
        }
        oReq.open(method, url);
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            oReq.setRequestHeader(header[0],header[1]);
        }
        if (body != null) {
            oReq.send(body)
        }
        else {
            oReq.send();
        }
    })
}

export async function xhrRequestJson<T>(url:string, method:string="GET", body:any = null, headers:(string[])[] = [])
    : Promise<T> {
        let responseText = await xhrRequestText(url,method=method,body=body,headers=headers);
        return JSON.parse(responseText) as T;
}