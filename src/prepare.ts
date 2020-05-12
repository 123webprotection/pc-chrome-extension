


interface MangedStorage {
    manager_host : string
    proxy_local :string
}

function getRegistryInfo() : Promise<MangedStorage> {
    let result = new Promise<MangedStorage>((resolve,reject)=>{
        chrome.storage.managed.get("manager_host",(data)=> {
            let manager_host = data["manager_host"];
            if (!manager_host) 
                reject("Can't get manager_host");

            chrome.storage.managed.get("proxy_local",(data)=> {
                let proxy_local = data["proxy_local"];
                if (!proxy_local) 
                    reject("Can't get proxy_local");
                
                resolve({manager_host, proxy_local })
            })
        })
    });
    return result;
}

interface TokenInfo {
    token : string,
    salt : string,
    token_salted : string
}

async function getToken(manager_host: string) : Promise<TokenInfo> {
    let tokenInfo : TokenInfo = await (await fetch(`http://${manager_host}/get-token`)).json()
    return tokenInfo;
}

export interface StartupInfo {
    token : string,
    proxy_host : string,
}

export async function getStartupInfo() : Promise<StartupInfo> {
    let registryInfo = await getRegistryInfo();
    let tokenInfo = await getToken(registryInfo.manager_host);

    let salted = await sha256_utf8(tokenInfo.token + tokenInfo.salt);
    console.log(`SALTED: got ${tokenInfo.token_salted} calculated ${salted}`)

    if(salted != tokenInfo.token_salted) {
        throw new Error("Token is bad");
    }

    return {token: tokenInfo.token, proxy_host: registryInfo.proxy_local};
}

