// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const exec = require('child_process').exec;
const yaml = require('js-yaml');
const fs = require('fs');

function execute(command, callback) {
    exec(command, (error, stdout, stderr) => {
        callback(stdout);
    });
}

function addEventListenerWithArgs(elem, event, funct, vars) {
    var f = function(ff, vv){
        return (function (){
            ff(vv);
        });
    }(funct, vars);
    elem.addEventListener(event, f);
    return f;
}

// Generate event listeners for open, close and cancel buttons
var types = ['Init', 'New', 'Assign', 'Open', 'Get', 'Commit', 'Push', 'Lock', 'Unlock', 'Grade'];
for(var index in types){
    // Ids to get open buttons and close buttons
    var buttonId = "button" + types[index];
    var closeId = "close" + types[index];
    // Call general modalOpen and modalClose with type as arg
    addEventListenerWithArgs(document.getElementById(buttonId), "click", modalOpen, types[index]);
    addEventListenerWithArgs(document.getElementById(closeId), "click", modalClose, types[index]);
    // If type has a cancel button, generate event listener for that
    var cancelId = "cancel" + types[index];
    addEventListenerWithArgs(document.getElementById(cancelId), "click", modalClose, types[index]);
    // If type can use the general submit function, set up event listener
    if(["Assign", "Open", "Lock", "Unlock", "Grade"].includes(types[index])){
        var submitId = "submit" + types[index];
        addEventListenerWithArgs(document.getElementById(submitId), "click", generalSubmit, types[index]);
    }
}


// Generate remaining event listeners that have unique functions
document.getElementById("submitInit").addEventListener("click", submitInit);
document.getElementById("submitNew").addEventListener("click", submitNew);
document.getElementById("submitGet").addEventListener("click", getSubmit);
document.getElementById("submitCommit").addEventListener("click", commitSubmit);
document.getElementById("submitPush").addEventListener("click", pushSubmit);

document.getElementById("assignment_select").addEventListener("change", handleChanged);

// Get a list of current assignments via python script
var array = [];
execute("python3 assignmentIdentifier.py", (output) => {
    array = output.split(",");
    console.log(array);
    var select = document.getElementById("assignment_select");
    // Populate selectbox 
    for(index in array){
        select.options[select.options.length] = new Option(array[index], index);
    };
    select.size = select.options.length;
});
// selectedAssignment is used throught the page to determine which assignment is selected.
var selectedAssignment = '';

//Get title based on class
try {
    const doc = yaml.load(fs.readFileSync('_config.yml', 'utf8'));
    console.log(doc);
    document.getElementById("title").innerHTML = doc.namespace;
    document.getElementById("header").innerHTML = "Assigner (" + doc.namespace + ")";
} catch(e) {
    // If there is no _config.yml, prompt user to make one
    console.log(e);
    modalOpen("Init");
};


// Update selectedAssignment, change display of selectedAssignment
function handleChanged() {
    var select = document.getElementById("assignment_select");
    var out = document.getElementById("display_select");
    selectedAssignment = select.value;
    out.textContent = "Assignment Selected: " + array[selectedAssignment];
    if(selectedAssignment != ""){
        // Enable assignment-specific buttons
        // when one is selected
        for(index in types){
            var buttonId = "button" + types[index];
            document.getElementById(buttonId).disabled = false;
        }
        // Very verbose output
        var toprint = "Selected " + array[selectedAssignment];
        printToLog(toprint);
    }
}

// Print a string to the output box, prepended by a timestamp
function printToLog(string) {
    var outputDiv = document.getElementById("output_div");
    let time = new Date();
    let sec = time.getSeconds();
    let min = time.getMinutes();
    let hour = time.getHours();
    outputDiv.innerHTML = outputDiv.innerHTML + "[" + hour + ":" + min + ":" + sec + "] " + string + "<br/>";
    outputDiv.scrollTop = outputDiv.scrollHeight;
}

function modalOpen(type) {
    var modalName = "modal" + type;
    if(modalName == "modalInit"){
        //try to determine the best semester based on current time
        const d = new Date();
        var semester = "";
        var month = d.getMonth();
        if(month < 5){
            semester = "SP"
        } else if(month < 8){
            semester = "SS"
        } else {
            semester = "FS"
        }
        guess_semester = d.getFullYear() + "-" + semester;
        document.getElementById("init_year").value = guess_semester;
    }
    headerTypes = ["Assign", "Open", "Get", "Commit", "Push", "Lock", "Unlock", "Grade"];
    for(var index in headerTypes){
        searchName = "modal" + headerTypes[index];
        headerName = "header" + headerTypes[index];
        string = headerTypes[index] + " " + array[selectedAssignment] + "?";
        if(modalName == searchName){
            document.getElementById(headerName).innerHTML = string;
            break;
        }
    }
    modal = document.getElementById(modalName);
    modal.style.display = "block";
}

function modalClose(type) {
    var modalName = "modal" + type;
    var warnName = "warn" + type;
    modal = document.getElementById(modalName);
    if(warnSpan = document.getElementById(warnName)){
        warnSpan.style.display = "none";
    }
    if(type == "Init"){
        document.getElementById("init_gitlab").value = "";
        document.getElementById("init_accessToken").value = "";
        document.getElementById("init_year").value = "";
        document.getElementById("init_group").value = "";
        document.getElementById("init_info").value = "";
    }
    if(type == "New"){
        document.getElementById("new_name").value = "";
    }
    if(type == "Commit"){
        document.getElementById("commentCommit").value = "";
    }
    modal.style.display = "none";
}

function submitInit() {
    var gitlabHost = document.getElementById("init_gitlab");
    var gitlabAccess = document.getElementById("init_accessToken");
    var year = document.getElementById("init_year");
    var gitlabGroup = document.getElementById("init_group");
    var canvasInfo = document.getElementById("init_info");

    if(gitlabHost.value == "" ||
       gitlabAccess.value == "" ||
       year.value == "" ||
       gitlabGroup.value == ""){
        var warn_div = document.getElementById("warnInit");
        warn_div.style.display = "block";
        return;
    }

    // Need to set up pipe to run init
    console.log("Running assigner init with following:");
    console.log(gitlabHost.value, gitlabAccess.value, year.value, gitlabGroup.value, canvasInfo.value);

    modalInit.style.display = "none";

}

function submitNew() {
    var name = document.getElementById("new_name");

    if(name.value == ""){
        document.getElementById("warnNew").style.display = "block";
        return;
    }

    var cmd = "assigner new " + name.value;
    console.log(cmd)
    execute(cmd, (output) => {
        printToLog(output);
        array = [];
        //TODO: REPLACE this is jank as hell lol
        execute("python3 assignmentIdentifier.py", (output) => {
            array = output.split(",");;
            var select = document.getElementById("assignment_select");
            //TODO: REPLACE this feels like cheating
            select.innerHTML = "";
            select.options.length = 0;
            for(index in array){
                select.options[select.options.length] = new Option(array[index], index);
            };
            select.size = select.options.length;
        });
    });

    //After running command, empty fields and close modal
    name.value = "";
    modalNew.style.display = "none";
}

//Can use for assign, open, lock, unlock
// other 3 have optional path
function generalSubmit(command) {
    var cmd = "assigner " + command + " " + array[selectedAssignment];
    console.log("Running command:", cmd)
    execute(cmd, (output) =>{
        console.log(output);
        if(output == ""){
            out = "Ran " + command + " " + array[selectedAssignment];
            printToLog(out);
        }
    });
    var modalName = "modal" + command;
    document.getElementById(modalName).style.display = "none";
}

function getSubmit() {
    var path = document.getElementById("pathGet");
    var cmd = "assigner get " + array[selectedAssignment] + " " + path.value;
    console.log("Running command:", cmd);
    execute(cmd, (output) =>{
        var toPrint = "Got repo " + array[selectedAssignment];
        if(path.value){
            toPrint = toPrint + " using path " + path.value;
        }
        printToLog(toPrint);
    });
    document.getElementById("modalGet").style.display = "none";
}

function commitSubmit() {
    var comment = document.getElementById("commentCommit");
    if(comment.value == ""){
        document.getElementById("warnCommit").style.display = "block";
        return;
    }
    var cmd = "assigner commit " + array[selectedAssignment] + " \"" + comment.value + "\"";
    console.log("Running command:", cmd);
    execute(cmd, (output) =>{
        var toPrint = "Committed to " + array[selectedAssignment] + " with message \"" + comment.value + "\"";
        printToLog(toPrint);
    });
    document.getElementById("modalCommit").style.display = "none";
}

function pushSubmit() {
    var path = document.getElementById("pathPush");
    var cmd = "assigner push " + array[selectedAssignment] + " " + path.value;
    console.log("Running command:", cmd);
    execute(cmd, (output) =>{
        var toPrint = "Pushed to " + array[selectedAssignment];
        if(path.value){
            toPrint = toPrint + " using path " + path.value;
        }
        printToLog(toPrint);
    });
    document.getElementById("modalPush").style.display = "none";
}

// Detect if the user clicks off a modal
window.onclick = function(event) {
    for(index in types){
        var Id = "modal" + types[index];
        modal = document.getElementById(Id);
        if(event.target == modal){
            modalClose(types[index]);
        }
    }
}