function scrollTabs(direction) {
    const container = document.getElementById('plasmid-tabs-container');
    const scrollAmount = 200; // Adjust as needed
    if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
    } else if (direction === 'right') {
        container.scrollLeft += scrollAmount;
    };
};


function navigateFileHistory(direction) {
    console.log("navigateFileHistory", direction);
    const fileHistory = plasmidDict[currentlyOpenedPlasmid]["fileHistory"];
    console.log("navigateFileHistory", fileHistory);
    const currentInstance = plasmidDict[currentlyOpenedPlasmid]["fileHistoryTracker"];

    if (currentInstance + direction <= 0 || currentInstance + direction >= -(fileHistory.length - 1)) {
        plasmidDict[currentlyOpenedPlasmid]["fileHistoryTracker"] += direction; // Instance tracker
        plasmidDict[currentlyOpenedPlasmid]["operationNr"] += direction; // Operation tracker
        const targetInstance = plasmidDict[currentlyOpenedPlasmid]["fileHistoryTracker"]; // domain -(list length - 1)) to 0
        
        const instance = fileHistory[fileHistory.length - 1 + targetInstance];
        plasmidDict[currentlyOpenedPlasmid]["fileSequence"] = instance[0];
        plasmidDict[currentlyOpenedPlasmid]["fileComplementarySequence"] = getComplementaryStrand(instance[0]);

        console.log("navigateFileHistory features before", plasmidDict[currentlyOpenedPlasmid]["fileFeatures"]);
        console.log("navigateFileHistory o be replaced with", plasmidDict[currentlyOpenedPlasmid]["fileFeatures"]);
        plasmidDict[currentlyOpenedPlasmid]["fileFeatures"] = JSON.parse(JSON.stringify(instance[1]));
        console.log("navigateFileHistory features after", plasmidDict[currentlyOpenedPlasmid]["fileFeatures"]);

        plasmidDict[currentlyOpenedPlasmid]["gridStructure"] = checkAnnotationOverlap(plasmidDict[currentlyOpenedPlasmid]["fileFeatures"], currentlyOpenedPlasmid);
        plasmidDict[currentlyOpenedPlasmid]["sidebarPrimers"] = instance[2];
        plasmidDict[currentlyOpenedPlasmid]["sidebarTable"] = instance[3];
        plasmidDict[currentlyOpenedPlasmid]["contentGrid"] = instance[4];
        
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


function saveProgress(plasmidIndex) {
    const fileSequence = plasmidDict[plasmidIndex]["fileSequence"];
    const fileFeatures = JSON.parse(JSON.stringify(plasmidDict[plasmidIndex]["fileFeatures"]));
    const sidebarPrimers = plasmidDict[plasmidIndex]["sidebarPrimers"];
    const sidebarTable = plasmidDict[plasmidIndex]["sidebarTable"];
    const contentGrid = plasmidDict[plasmidIndex]["contentGrid"];
    const listToPush = [fileSequence, fileFeatures, sidebarPrimers, sidebarTable, contentGrid]

    const currentInstance = plasmidDict[plasmidIndex]["fileHistoryTracker"];
    let currentFileHistory = plasmidDict[plasmidIndex]["fileHistory"]
    if (currentInstance === 0) {
        // We're on the newest version, extend the list
        plasmidDict[plasmidIndex]["fileHistory"].push(listToPush);
    } else {
        // We're somewhere in the past, rewrite history
        let slicedFileHistory = currentFileHistory.slice(0, currentFileHistory.length + currentInstance);
        slicedFileHistory.push(listToPush)
        
        plasmidDict[plasmidIndex]["fileHistory"] = slicedFileHistory;
    };

    // Once we have 2 instances in the file history, enable the undo button
    plasmidDict[plasmidIndex]["fileHistoryTracker"] = 0;
    if (plasmidIndex === currentlyOpenedPlasmid) {refreshUndoRedoButtons()};
};


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
    const currentInstance = plasmidDict[currentlyOpenedPlasmid]["fileHistoryTracker"];
    const currentFileHistory = plasmidDict[currentlyOpenedPlasmid]["fileHistory"];
    console.log("refreshUndoRedoButtons", currentlyOpenedPlasmid, currentInstance);

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


function updateSidebarAndGrid() {
    // Update sidebar table
    const sidebarContent = document.querySelector('.sidebar-content');
    console.log("sidebarContent", sidebarContent)
    const currSidebarTable = document.getElementById("sidebar-table");
    if (currSidebarTable) {
        currSidebarTable.parentNode.removeChild(currSidebarTable)
    };
    sidebarContent.after(plasmidDict[currentlyOpenedPlasmid]["sidebarTable"]);
    enableSidebarEditing();
    addScrollingEffectToFeatureTable();
    
    // Update content grid
    const contentGridContainer = document.getElementById('file-content');
    contentGridContainer.innerHTML = "";
    contentGridContainer.appendChild(plasmidDict[currentlyOpenedPlasmid]["contentGrid"]);
    addHoverPopupToTable();
    updateAnnotationTrianglesWidth();
};


function updateSidebarPrimers() {
    // Update primers
    const oldPrimers = document.querySelector('.sidebar-content');
    const sidebarContainer = document.getElementById("sidebar-container");

    let newPrimers = document.createElement("div");
    newPrimers.classList.add("sidebar-content");
    if (plasmidDict[currentlyOpenedPlasmid]["sidebarPrimers"] !== null) {
        newPrimers.innerHTML = plasmidDict[currentlyOpenedPlasmid]["sidebarPrimers"];
    } else {
        newPrimers.innerHTML = `<h2 id="primers-div-headline">Primers will appear here.</h2>`;
    };
    sidebarContainer.insertBefore(newPrimers, sidebarContainer.firstChild);
    sidebarContainer.removeChild(oldPrimers);

    addPrimerRegionHoverEvents();
};


function saveSidebarAndGrid() {
    if (document.getElementById('sidebar-table') && document.getElementById('sequence-grid-' + currentlyOpenedPlasmid)) {
        // Sidebar
        plasmidDict[currentlyOpenedPlasmid]["sidebarTable"] = document.getElementById('sidebar-table');
        console.log("Updating save table", currentlyOpenedPlasmid, document.getElementById('sidebar-table').innerHTML.slice(200, 300), plasmidDict[currentlyOpenedPlasmid]["sidebarTable"].innerHTML.slice(200, 300))

        // Content grid
        plasmidDict[currentlyOpenedPlasmid]["contentGrid"] = document.getElementById('sequence-grid-' + currentlyOpenedPlasmid);
    };
};

function savePrimers() {
    console.log("Saving primers", document.querySelector('.sidebar-content'))
    plasmidDict[currentlyOpenedPlasmid]["sidebarPrimers"] = document.querySelector('.sidebar-content').innerHTML;
};


function switchPlasmidTab(plasmidIndex) {
    console.log("Switching from", currentlyOpenedPlasmid, "to", plasmidIndex)
    removeAllPlasmidTabDropdownMenus();
    
    // Deselect plasmid tab
    const previousPlasmidTab = document.getElementById("plasmid-tab-" + currentlyOpenedPlasmid);
    previousPlasmidTab.classList.remove("plasmid-tab-selected");
    
    // Select new tab
    const newPlasmidTab = document.getElementById("plasmid-tab-" + plasmidIndex);
    newPlasmidTab.classList.add("plasmid-tab-selected");

    // Save side bar and grid of previous plasmid
    saveSidebarAndGrid();

    // Update global tracker
    currentlyOpenedPlasmid = plasmidIndex;

    // Repopulate sidebar and grid
    // Check if the grid needs to be redrawn because the gridWidth has changed
    const newGridWidth = plasmidDict[plasmidIndex]["contentGrid"].rows[0].cells.length;
    const remakeContentGrid = gridWidth !== newGridWidth;
    console.log("switchPlasmidTab", gridWidth, newGridWidth, remakeContentGrid);
    if (remakeContentGrid) {
        plasmidDict[currentlyOpenedPlasmid]["contentGrid"] = makeContentGrid(currentlyOpenedPlasmid);
    };
    updateSidebarAndGrid();

    // Update primers
    updateSidebarPrimers();

    // Refresh undo buttons and set disabled/enabled states
    refreshUndoRedoButtons();


    if (subcloningOriginPlasmidIndex !== null && currentlyOpenedPlasmid === subcloningOriginPlasmidIndex) {
        console.log("Marked for subcloning on this tab")
        markSelectionForSubcloning(currentlyOpenedPlasmid, subcloningOriginSpan[0], subcloningOriginSpan[1])
    } else {
        console.log("No marked for subcloning on this tab")
        clearAllSubcloningSelections(clearVariables = false);
    };
};


function renamePlasmid(plasmidIndex) {
    console.log("Renaming plasmid", plasmidIndex);

    const plasmidTabElement = document.getElementById("plasmid-tab-" + plasmidIndex);
    console.log(plasmidTabElement)
    const oldHTML = plasmidTabElement.innerHTML;
    const originalText = plasmidTabElement.firstElementChild.textContent;
    const input = document.createElement('input');
    input.classList.add("editable-input");
    input.classList.add("wrap-text");
    input.style.padding = "12px 2px 12px 16px"
    input.type = 'text';

    let fileExtension = plasmidDict[plasmidIndex]["fileExtension"];
    input.value = originalText.replace(fileExtension, "");
    
    // Save the edited content when Enter is pressed
    input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            plasmidTabElement.innerHTML = oldHTML;
            plasmidTabElement.firstElementChild.textContent = (input.value !== "") ? input.value + fileExtension: originalText;
            plasmidDict[plasmidIndex]["fileName"] = plasmidTabElement.firstElementChild.textContent;
        };
    });

    input.addEventListener('blur', () => {
        plasmidTabElement.innerHTML = oldHTML;
        plasmidTabElement.firstElementChild.textContent = (input.value !== "") ? input.value + fileExtension: originalText;
        plasmidDict[plasmidIndex]["fileName"] = plasmidTabElement.firstElementChild.textContent;
    });
    
    plasmidTabElement.innerHTML = '';
    plasmidTabElement.appendChild(input);
    input.focus();
};


function closePlasmid(plasmidIndex) {
    console.log("Closing plasmid", plasmidIndex)
    const entriesList = Object.keys(plasmidDict);
    // Check if were deleting the currently displayed plasmid
    if (currentlyOpenedPlasmid === plasmidIndex) {
        // If we can switch to another tab, do it
        if (entriesList.length > 1) {
            const index = entriesList.indexOf("" + plasmidIndex)
            if (index !== 0) {
                console.log("Go left", index, entriesList, entriesList[index - 1])
                switchPlasmidTab(entriesList[index - 1])
            } else {
                console.log("Go right", index, entriesList, entriesList[index + 1])
                switchPlasmidTab(entriesList[index + 1])
            };
        // Other wise clear everything
        } else {
            // Clear sidebar
            const sidebarContainer = document.getElementById('sidebar-container');
            sidebarContainer.innerHTML = "<div class=\"sidebar-content\"><h2 id=\"primers-div-headline\">Primers will appear here.</h2></div>";
    
            // Clear content grid
            const contentGridContainer = document.getElementById('file-content');
            contentGridContainer.innerHTML = "";
            currentlyOpenedPlasmid = null;
        };
    }
    // Delete plasmid info and tab
    delete plasmidDict[plasmidIndex];
    const plasmidTabElement = document.getElementById("plasmid-tab-" + plasmidIndex);
    plasmidTabElement.parentNode.removeChild(plasmidTabElement);
};


function closeOtherPlasmids(plasmidIndex) {
    console.log("Closing other plasmids", plasmidIndex);
    switchPlasmidTab(plasmidIndex);
    for (const [plasmid, value] of Object.entries(plasmidDict)) {
        const pIndex = parseInt(plasmid);
        if (pIndex !== plasmidIndex) {closePlasmid(pIndex)}
    };
};


function closePlasmidsToTheRight(plasmidIndex) {
    console.log("Closing plasmids to the right", plasmidIndex);
    if (plasmidIndex < currentlyOpenedPlasmid) {
        switchPlasmidTab(plasmidIndex);
    };
    for (const [plasmid, value] of Object.entries(plasmidDict)) {
        const pIndex = parseInt(plasmid);
        if (pIndex > plasmidIndex) {closePlasmid(pIndex)}
    };
};


function togglePlasmidTabDropdownMenu(event, plasmidIndex) {
    event.preventDefault();
    const parentTab = event.target.closest('.plasmid-tab');
    removeAllPlasmidTabDropdownMenus()

    const dropdownMenu = createPlasmidTabDropdownMenu(plasmidIndex);
    document.body.appendChild(dropdownMenu);
    positionPlasmidTabDropdownMenu(parentTab, dropdownMenu);

    // Hide the dropdown menu if you click outside of it
    document.addEventListener('click', function hideDropdown(e) {
        if (!e.target.closest('.plasmid-tab')) {
            removeAllPlasmidTabDropdownMenus();
            document.removeEventListener('click', hideDropdown);
        };
    });
};


function removeAllPlasmidTabDropdownMenus() {
    const existingDropdownMenus = document.querySelectorAll('.plasmid-tab-dropdown-menu');
    existingDropdownMenus.forEach(element => {
        element.parentNode.removeChild(element);
    });
};


function createPlasmidTabDropdownMenu(plasmidIndex) {
    const dropdownMenu = document.createElement('ul');
    dropdownMenu.className = 'plasmid-tab-dropdown-menu';
    dropdownMenu.style.display = 'block'; // Display the menu initially

    dropdownMenu.innerHTML = `
    <h3>Export primers</h3>
    <ul>
        <li><a href="#" fileType="txt" onclick="exportPrimers(this, ${plasmidIndex})">Plaint text (.txt)</a></li>
        <li><a href="#" fileType="doc" onclick="exportPrimers(this, ${plasmidIndex})">MS Word file (.doc)</a></li>
        <li><a href="#" fileType="csv" onclick="exportPrimers(this, ${plasmidIndex})">CSV file (.csv)</a></li>
        <li><a href="#" fileType="xlsx" onclick="exportPrimers(this, ${plasmidIndex})">Excel file (.xlsx)</a></li>
        <li><a href="#" fileType="microsynth" onclick="exportPrimers(this, ${plasmidIndex})">Microsynth order form (.xlsx)</a></li>
    </ul>
    <h3>Export plasmid file</h3>
    <ul>
        <li><a href="#" onclick="exportGBFile(${plasmidIndex})">GenBank file (.gb)</a></li>
        <li><a href="#" onclick="exportDNAFile(${plasmidIndex})">SnapGene file (.dna)</a></li>
    </ul>
    <h3>Edit plasmid</h3>
    <ul>
        <li><a href="#" onclick="renamePlasmid(${plasmidIndex})">Rename plasmid</a></li>
    </ul>
    <h3>Close plasmids</h3>
    <ul>
        <li><a href="#" onclick="closePlasmid(${plasmidIndex})">Close plasmid</a></li>
        <li><a href="#" onclick="closeOtherPlasmids(${plasmidIndex})">Close all other plasmids</a></li>
        <li><a href="#" onclick="closePlasmidsToTheRight(${plasmidIndex})">Close plasmids to the right</a></li>
    </ul>
    `;

    return dropdownMenu;
};

function positionPlasmidTabDropdownMenu(parentTab, dropdownMenu) {
    const rectTab = parentTab.getBoundingClientRect();
    const rectHeader = document.getElementsByTagName("header")[0].getBoundingClientRect();
    //dropdownMenu.style.width = parentTab.offsetWidth + "px";
    dropdownMenu.style.right = (window.innerWidth - rectTab.right) + "px";
    dropdownMenu.style.top = rectHeader.bottom + "px";
};


function exportPrimers(client, plasmidIndex) {
    console.log(client, plasmidIndex)
    exportPrimersDict[client.getAttribute("fileType")](plasmidIndex);
}