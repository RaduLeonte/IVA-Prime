const PlasmidTabs = new class {
    /**
     * Create new plasmid tab
     */
    new(plasmidIndex, plasmidFileName) {
        // Select tabs container
        const plasmidTabsContainer = document.getElementById("plasmid-tabs-container");
        const newPlasmidTabId = "plasmid-tab-" + plasmidIndex;
        let newPlasmidTab = document.getElementById(newPlasmidTabId);
        // Check if tab element does not exist yet, then add it
        if (!newPlasmidTab) {
            newPlasmidTab = document.createElement("DIV");
            plasmidTabsContainer.appendChild(newPlasmidTab);
        };
        newPlasmidTab.id = newPlasmidTabId;
        newPlasmidTab.innerHTML = `
        <a href="#" onclick="PlasmidTabs.switch(${plasmidIndex})" oncontextmenu="PlasmidTabs.toggleDropdownMenu(event, ${plasmidIndex})">${plasmidFileName}</a>
        <a class="plasmid-tab-dropdown-button" href="#" onclick="PlasmidTabs.toggleDropdownMenu(event, ${plasmidIndex})" oncontextmenu="PlasmidTabs.toggleDropdownMenu(event, ${plasmidIndex})">▼</a>
        `;
        newPlasmidTab.classList.add("plasmid-tab");

        // If this is the first tab added, make it the currently
        // selected one
        if (Object.keys(Session.plasmids).length  === 1) {
            newPlasmidTab.classList.add("plasmid-tab-selected");
            Session.activePlasmidIndex = plasmidIndex;
        };

        // Generate content
        //Session.plasmids[plasmidIndex].generateContent();
        // Generate sidebar
        Session.plasmids[plasmidIndex].generateFeatureTable();

        // Create savepoint
        //Session.plasmids[plasmidIndex].saveProgress();

        // If this is the first tab added, enable search
        // and switch to it.
        if (Object.keys(Session.plasmids).length === 1) {
            //initiateSearchFunctionality();
            PlasmidTabs.switch(plasmidIndex);
        };
    };

    /**
     * Switch to specified plasmid tab.
     * 
     * @param {int} plasmidIndex 
     */
    switch(plasmidIndex) {
        // Close dropdown menus
        PlasmidTabs.removeAllDropdownMenus();
        
        // Deselect plasmid tab
        const previousPlasmidTab = document.getElementById("plasmid-tab-" + Session.activePlasmidIndex);
        previousPlasmidTab.classList.remove("plasmid-tab-selected");
        
        // Select new tab
        const newPlasmidTab = document.getElementById("plasmid-tab-" + plasmidIndex);
        newPlasmidTab.classList.add("plasmid-tab-selected");
    
        // Save side bar and grid of previous plasmid
        //saveSidebarAndGrid();
    
        // Update currently active plasmid
        Session.activePlasmidIndex = plasmidIndex;
        
        // Repopulate sidebar and grid
        // Check if the grid needs to be redrawn because the gridWidth has changed
        //const newGridWidth = Session.activePlasmid().contentGrid.rows[0].cells.length;
        //const remakeContentGrid = gridWidth !== newGridWidth;
        //if (remakeContentGrid) {
        //    Session.activePlasmid().makeContentGrid();
        //};
        PlasmidTabs.updateFeaturesTable();
        //PlasmidTabs.updateContent();
        return;
        // Update primers
        updateSidebarPrimers();
    
        // Refresh undo buttons and set disabled/enabled states
        refreshUndoRedoButtons();
    
        // Update selection info in the footer
        updateFooterSelectionInfo();
    
    
        const subcloningOriginPlasmidIndex = Session.subcloningOriginIndex;
        if (subcloningOriginPlasmidIndex !== null && Session.activePlasmidIndex === subcloningOriginPlasmidIndex) {
            markSelectionForSubcloning(
                Session.activePlasmidIndex,
                Session.subcloningOriginSpan[0],
                Session.subcloningOriginSpan[1]
            );
        } else {
            clearAllSubcloningSelections(clearVariables=false);
        };
    };

    /**
     * Update the sidebar and content with the 
     */
    updateFeaturesTable() {
        // Update sidebar table
        const featuresTableContainer = document.getElementById("features-table-container");
        const currFeaturesTable = document.getElementById("features-table");
        if (currFeaturesTable) {
            featuresTableContainer.removeChild(currFeaturesTable)
        };
        Session.activePlasmid().generateFeatureTable();
        featuresTableContainer.after(Session.activePlasmid().featuresTable);
        
        // Update content grid
        //const contentGridContainer = document.getElementById('file-content');
        //contentGridContainer.innerHTML = "";
        //contentGridContainer.appendChild(Project.activePlasmid().contentGrid);
        //addHoverPopupToTable();
    };

    /**
     * 
     * @param {*} event 
     * @param {*} plasmidIndex 
     */
    toggleDropdownMenu(event, plasmidIndex) {
        // Prevent default context menu on right click
        event.preventDefault();
        // Select closest tab, 
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
    
    /**
     * Find all dropdown menus and delete them.
     */
    removeAllDropdownMenus() {
        const existingDropdownMenus = document.querySelectorAll('.plasmid-tab-dropdown-menu');
        existingDropdownMenus.forEach(element => {
            element.parentNode.removeChild(element);
        });
    };
    
};

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



function updateSidebarPrimers() {
    // Update primers
    const oldPrimers = document.querySelector('.sidebar-content');
    const sidebarContainer = document.getElementById("sidebar-container");

    let newPrimers = document.createElement("div");
    newPrimers.classList.add("sidebar-content");
    if (Project.activePlasmid().primers !== null) {
        newPrimers.innerHTML = Project.activePlasmid().primers;
    } else {
        newPrimers.innerHTML = `<h2 id="primers-div-headline">Primers will appear here.</h2>`;
    };
    sidebarContainer.insertBefore(newPrimers, sidebarContainer.firstChild);
    sidebarContainer.removeChild(oldPrimers);

    enablePrimerIDEditing();
};


function saveSidebarAndGrid() {
    if (document.getElementById('sidebar-table') && document.getElementById('sequence-grid-' + Project.activePlasmidIndex)) {
        // Sidebar
        Project.activePlasmid().sidebarTable = document.getElementById('sidebar-table');

        // Content grid
        Project.activePlasmid().contentGrid = document.getElementById('sequence-grid-' + Project.activePlasmidIndex);
    };
};




function renamePlasmid(plasmidIndex) {

    const plasmidTabElement = document.getElementById("plasmid-tab-" + plasmidIndex);
    const oldHTML = plasmidTabElement.innerHTML;
    const originalText = plasmidTabElement.firstElementChild.textContent;
    const input = document.createElement('input');
    input.classList.add("editable-input");
    input.classList.add("wrap-text");
    input.style.padding = "12px 2px 12px 16px"
    input.type = 'text';

    let fileExtension = Project.getPlasmid(plasmidIndex).extension;
    input.value = originalText.replace(fileExtension, "");
    
    // Save the edited content when Enter is pressed
    input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            plasmidTabElement.innerHTML = oldHTML;
            plasmidTabElement.firstElementChild.textContent = (input.value !== "") ? input.value + fileExtension: originalText;
            Project.getPlasmid(plasmidIndex).name = plasmidTabElement.firstElementChild.textContent;
        };
    });

    input.addEventListener('blur', () => {
        plasmidTabElement.innerHTML = oldHTML;
        plasmidTabElement.firstElementChild.textContent = (input.value !== "") ? input.value + fileExtension: originalText;
        Project.getPlasmid(plasmidIndex).name = plasmidTabElement.firstElementChild.textContent;
    });
    
    plasmidTabElement.innerHTML = '';
    plasmidTabElement.appendChild(input);
    input.focus();
};


function flipPlasmid(plasmidIndex) {

    const targetPlasmid = Project.getPlasmid(plasmidIndex);

    // Flip sequence
    const flippedSequence = targetPlasmid.complementarySequence.split("").reverse().join("");
    const flippedCompSequence = targetPlasmid.sequence.split("").reverse().join("");
    Project.plasmids[plasmidIndex].sequence = flippedSequence;
    Project.plasmids[plasmidIndex].complementarySequence = flippedCompSequence;

    const sequenceLength = flippedSequence.length;

    // Flip features
    Object.entries(targetPlasmid.features).forEach(([key, value]) => {
        const currSpanString = value.span;
        const currDirection = (!currSpanString.includes("complement")) ? 1: -1;
        const currSpan = removeNonNumeric(currSpanString).split("..").map(Number);

        const newSpan = [
            sequenceLength - currSpan[1] + 1,
            sequenceLength - currSpan[0] + 1
        ];

        const newSpanString = (currDirection === -1) ? `${newSpan[0]}..${newSpan[1]}`: `complement(${newSpan[0]}..${newSpan[1]})`

        Project.plasmids[plasmidIndex].features[key].span = newSpanString;
    });
    Project.plasmids[plasmidIndex].features = sortBySpan(Project.plasmids[plasmidIndex].features);

    // Remake the sidebar and content grid 
    Project.plasmids[plasmidIndex].createSidebarTable();
    Project.plasmids[plasmidIndex].makeContentGrid();

    if(plasmidIndex === Project.activePlasmidIndex) {
        clearSelection(plasmidIndex, true);
        updateSidebarAndGrid();
    };

    // At the very end, save the progress to file history
    Project.plasmids[plasmidIndex].saveProgress();
};


function closePlasmid(plasmidIndex) {
    const entriesList = Object.keys(Project.plasmids);
    // Check if were deleting the currently displayed plasmid
    if (Project.activePlasmidIndex === plasmidIndex) {
        // If we can switch to another tab, do it
        if (entriesList.length > 1) {
            const index = entriesList.indexOf("" + plasmidIndex)
            if (index !== 0) {
                switchPlasmidTab(entriesList[index - 1])
            } else {
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
            Project.activePlasmidIndex = null;
        };
    }
    // Delete plasmid info and tab
    delete Project.plasmids[plasmidIndex];
    const plasmidTabElement = document.getElementById("plasmid-tab-" + plasmidIndex);
    plasmidTabElement.parentNode.removeChild(plasmidTabElement);
};


function closeOtherPlasmids(plasmidIndex) {
    switchPlasmidTab(plasmidIndex);
    for (const [plasmid, ] of Object.entries(Project.plasmids)) {
        const pIndex = parseInt(plasmid);
        if (pIndex !== plasmidIndex) {closePlasmid(pIndex)}
    };
};


function closePlasmidsToTheRight(plasmidIndex) {
    if (plasmidIndex < Project.activePlasmidIndex) {
        switchPlasmidTab(plasmidIndex);
    };
    for (const [plasmid, ] of Object.entries(Project.plasmids)) {
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
        <li><a href="#" onclick="flipPlasmid(${plasmidIndex})">Flip plasmid</a></li>
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
    const currPlasmid = Project.getPlasmid(plasmidIndex);
    const fileName = currPlasmid.name.replace(currPlasmid.extension, "") + " primers";
    exportPrimersDict[client.getAttribute("fileType")](
        fileName,
        plasmidIndex,
        currPlasmid.primers,
    );
};


/**
 * Enables horizontal scrolling using the mouse wheel 
 * inside plasmid tabs container
 */
document.addEventListener('DOMContentLoaded', function() {
    enableTabContainerScrolling();
})
function enableTabContainerScrolling() {
    const tabsContainer = document.getElementById("plasmid-tabs-container-wrapper");
    tabsContainer.addEventListener("wheel", function (e) {
        e.preventDefault();
        tabsContainer.scrollLeft += e.deltaY*5;
    });
};