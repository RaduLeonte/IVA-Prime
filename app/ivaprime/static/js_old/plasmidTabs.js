
function navigateFileHistory(direction) {
    const currPlasmid = Project.activePlasmid();
    const fileHistory = currPlasmid.history;
    const currentInstance = currPlasmid.historyTracker;

    if (currentInstance + direction <= 0 || currentInstance + direction >= -(fileHistory.length - 1)) {
        Project.activePlasmid().historyTracker += direction; // Instance tracker
        Project.activePlasmid().operationNr += direction; // Operation tracker
        const targetInstance = Project.activePlasmid().historyTracker; // domain -(list length - 1)) to 0
        
        const instance = fileHistory[fileHistory.length - 1 + targetInstance];
        Project.activePlasmid().sequence = instance[0];
        Project.activePlasmid().complementarySequence = getComplementaryStrand(instance[0]);

        Project.activePlasmid().features = JSON.parse(JSON.stringify(instance[1]));
        
        Project.activePlasmid().gridStructure = Project.activePlasmid().checkAnnotationOverlap();
        if (instance[2] !== null) {
            Project.activePlasmid().primers = instance[2].replace(/&quot;/g, "'");
        } else {
            Project.activePlasmid().primers = `<h2 id="primers-div-headline">Primers will appear here.</h2>`;
        }
        //Project.activePlasmid().sidebarTable = instance[3];
        Project.activePlasmid().contentGrid = instance[4];

        Project.activePlasmid().translations = JSON.parse(JSON.stringify(instance[5]));
        
        // Update primers
        updateSidebarPrimers();

        // Repopulate sidebar and grid
        updateSidebarAndGrid();

        // Refresh undo redo buttons
        refreshUndoRedoButtons();

        clearAllSubcloningSelections(clearVariables = true);
    };
};


/**
 * CTRL + Z or CTRL + SHIFT + Z key combination listener to undo and redo actions
 */
document.addEventListener('keydown', function(event) {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'Z' || event.key === 'z')) {
        navigateFileHistory(-1);
    };

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'Z' || event.key === 'z')) {
        navigateFileHistory(1);
    };
});


function switchUndoRedoButtons(direction, targetState) {
    const targetButton = (direction === -1) ? document.getElementById("undo-btns").getElementsByTagName("A")[0] : document.getElementById("undo-btns").getElementsByTagName("A")[1];
    targetButton.setAttribute("onClick", (targetState === "off") ? null: "navigateFileHistory(" + direction + ")");
    if (targetState === "on") {
        targetButton.classList.remove("svg-icon-btn-a-disabled");
    } else {
        targetButton.classList.add("svg-icon-btn-a-disabled");
    };
};


function refreshUndoRedoButtons() {
    const activePlasmid = Project.activePlasmid();
    const currentInstance = activePlasmid.historyTracker;
    const currentFileHistory = activePlasmid.history;

    if (currentInstance === 0) {
        // We're on the newest version, disable the redo button
        switchUndoRedoButtons(1, "off");
    } else {
        // Else enable redo button
        switchUndoRedoButtons(1, "on");
    };
    
    if (currentInstance === -(currentFileHistory.length - 1)) {
        // We're at the beginning, disable undo button and enable redo
        switchUndoRedoButtons(-1, "off");
    } else {
        // Else enable undo button
        switchUndoRedoButtons(-1, "on");
    };
};