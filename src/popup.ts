/*
* ============== BACK ==============
*/
type get_string = ()=>string;

let ext_error :string = "";
export function updateUiStatus(status : string) {
    console.log("[UI-STATUS]",new Date(), status);
    ext_error = status;
} 
let getStatus : get_string = () => {
    return ext_error;
};

// Make it public:
(function exposeGetStatus() {
    (window as any)["getStatusCallback"] = getStatus;
})();


/*
* ============== FRONT ==============
*/

let front_getStatus : get_string = (chrome.extension.getBackgroundPage() as any).getStatusCallback;

window.addEventListener('load',(ev)=>{
    updateStatusText()
    setInterval(()=>{
        updateStatusText();
    },500) // Only while popup is open, so no need to worry about performance
})

function updateStatusText() {
    var error_span = document.getElementById("error");
    if (error_span)
        document.getElementById("error").innerText = front_getStatus();
}
