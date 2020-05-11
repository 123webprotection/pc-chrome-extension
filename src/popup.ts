let getStatus = (chrome.extension.getBackgroundPage() as any).getStatus

window.addEventListener('load',(ev)=>{
    getStatusText()
    setInterval(()=>{
        getStatusText();
    },1000)
})

function getStatusText() {
    document.getElementById("error").innerText = getStatus();
}
