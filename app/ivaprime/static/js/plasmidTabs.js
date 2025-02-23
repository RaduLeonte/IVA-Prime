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
        <span
            class="plasmid-tab-button"
            onclick="PlasmidTabs.switch(${plasmidIndex})"
            oncontextmenu="PlasmidTabs.togglePlasmidTabDropdownMenu(event, ${plasmidIndex})"
        >${plasmidFileName}</span>
        <span
            class="plasmid-tab-dropdown-button"
            onclick="PlasmidTabs.togglePlasmidTabDropdownMenu(event, ${plasmidIndex})"
            oncontextmenu="PlasmidTabs.togglePlasmidTabDropdownMenu(event, ${plasmidIndex})"
        >▼</span>
        `;
        newPlasmidTab.classList.add("plasmid-tab");

        this.checkForPlasmidTabsScrollbar();

        // If this is the first tab added, make it the currently
        // selected one
        if (Object.keys(Session.plasmids).length  === 1) {
            this.hideWelcomeDisclaimer();

            newPlasmidTab.classList.add("plasmid-tab-selected");

            this.switch(plasmidIndex);

            this.enableSwitchViewButtons();
        };
    };

    /**
     * Switch to specified plasmid tab.
     * 
     * @param {int} plasmidIndex 
     */
    switch(plasmidIndex) {
        // Close dropdown menus
        this.removeAllPlasmidTabDropdownMenus();

        console.log(`PlasmidTabs.switch -> plasmidIndex=${plasmidIndex} (active=${Session.activePlasmidIndex}, ${(Session.activePlasmidIndex !== null && Session.activePlasmidIndex === plasmidIndex)})`)
        if (Session.activePlasmidIndex !== null && Session.activePlasmidIndex === plasmidIndex) {
            return;
        };
        
        // Deselect plasmid tab
        const previousPlasmidTab = document.getElementById("plasmid-tab-" + Session.activePlasmidIndex);
        if (previousPlasmidTab) {
            previousPlasmidTab.classList.remove("plasmid-tab-selected");
        };
        
        // Select new tab
        const newPlasmidTab = document.getElementById("plasmid-tab-" + plasmidIndex);
        newPlasmidTab.classList.add("plasmid-tab-selected");
    
    
        // Update currently active plasmid
        Session.activePlasmidIndex = plasmidIndex;
        

        PlasmidViewer.redraw();

        this.updateSidebarPrimers();
        this.updateFeaturesTable();

        return;
    
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
     * Close a specific plasmid tab
     * 
     * @param {int} plasmidIndex - Index of plasmid to be closed 
     */
    close(plasmidIndex) {
        // If we're closing the currently open tab
        if (plasmidIndex === Session.activePlasmidIndex) {
            // Check if we have another tab we can switch to
            if (Object.keys(Session.plasmids).length > 1) {
                this.switch(
                    (plasmidIndex !== 0) ? plasmidIndex - 1: plasmidIndex + 1
                );
            } else {
                // No tab to switch to, clear everything

                // Clear sidebar
                const featuresTable = document.getElementById("features-table");
                if (featuresTable) {
                    featuresTable.parentElement.removeChild(featuresTable);
                };

                // Clear views
                ["circular", "linear", "grid"].forEach(view => {
                    const container = document.getElementById(`${view}-view-container`);
                    if (container.firstElementChild) {
                        container.removeChild(container.firstElementChild);
                    };
                });

                Session.activePlasmidIndex = null;

                this.disableSwitchViewButtons();
                this.showWelcomeDisclaimer();
            };
        };

        // Delete plasmid from session
        delete Session.plasmids[plasmidIndex];

        // Remove plasmid tab
        // TO DO: removal animation?
        const plasmidTab = document.getElementById("plasmid-tab-" + plasmidIndex);
        plasmidTab.parentNode.removeChild(plasmidTab);
    };


    /**
     * Close all other tabs but the specified index
     * 
     * @param {int} plasmidIndex - Index of plasmid to keep open 
     */
    closeOthers(plasmidIndex) {
        if (plasmidIndex !== Session.activePlasmidIndex) {
            this.switch(plasmidIndex);
        };

        Object.keys(Session.plasmids).forEach(index => {
            index = parseInt(index);
            console.log(`PlasmidTabs.closeOthers -> ${plasmidIndex} ${index} (${index !== plasmidIndex})`)
            if (index !== plasmidIndex) {
                this.close(index);
            };
        });
    };

    
    closeToTheRight(plasmidIndex) {
        if (plasmidIndex < Session.activePlasmidIndex) {
            this.switch(plasmidIndex);
        };

        Object.keys(Session.plasmids).forEach(index => {
            index = parseInt(index);
            if (index > plasmidIndex) {
                this.close(index);
            };
        });
    };

    closeToTheLeft(plasmidIndex) {
        if (Session.activePlasmidIndex < plasmidIndex) {
            this.switch(plasmidIndex);
        };

        Object.keys(Session.plasmids).forEach(index => {
            index = parseInt(index);
            if (index < plasmidIndex) {
                this.close(index);
            };
        });
    };


    /**
     * Show and hide the welcome disclaimer
     */
    showWelcomeDisclaimer() {
        document.getElementById("welcome-disclaimer").style.display = "flex";
    };
    hideWelcomeDisclaimer() {
        document.getElementById("welcome-disclaimer").style.display = "none";
    };


    /**
     * Enable or disable scroll buttons based on whether there is a scroll bar present
     */
    checkForPlasmidTabsScrollbar() {
        const wrapper = document.getElementById("plasmid-tabs-container-wrapper");
        if (wrapper.scrollWidth > wrapper.clientWidth) {
            // scrollbar is visible
            this.enableScrollButtons();
        } else {
            this.disableScrollButtons();
        };
    };
    enableScrollButtons() {
        console.log("PlasmidTabs.enableScrollButtons => ");
        document.querySelectorAll(".plasmid-tabs-scroll-button").forEach(button => {
            button.removeAttribute('disabled');
        });
    };
    disableScrollButtons() {
        console.log("PlasmidTabs.disableScrollButtons => ");
        document.querySelectorAll(".plasmid-tabs-scroll-button").forEach(button => {
            button.setAttribute('disabled', '');
        });
    };


    /**
     * Enable or disable the switch view buttons in the toolbar
     */
    enableSwitchViewButtons() {
        ["circular", "linear", "grid"].forEach(view => {
            document.getElementById(`${view}-view-button`).removeAttribute('disabled');
        });
    };
    disableSwitchViewButtons() {
        ["circular", "linear", "grid"].forEach(view => {
            document.getElementById(`${view}-view-button`).setAttribute('disabled', '');
        });
    };


    /**
     * Update the sidebar with the current primers.
     */
    updateSidebarPrimers() {
        return;
    };


    /**
     * Update the sidebar with the current features table.
     */
    updateFeaturesTable() {
        // Update sidebar table
        const featuresTableContainer = document.getElementById("features-table-container");
        const currFeaturesTable = document.getElementById("features-table");
        if (currFeaturesTable) {
            featuresTableContainer.removeChild(currFeaturesTable)
        };
        featuresTableContainer.appendChild(Session.activePlasmid().featuresTable);
    };


    /**
     * Show the dropdown menu for a specific plasmid tab.
     * 
     * @param {Event} event - Click event
     * @param {int} plasmidIndex - Plasmid index of the corresponding plasmid tab
     */
    togglePlasmidTabDropdownMenu(e, plasmidIndex) {
        // Prevent default context menu on right click
        e.preventDefault();

        if (document.querySelectorAll(`ul[plasmid-index="${plasmidIndex}"]`)[0]) {
            //console.log(`PlasmidTabs.togglePlasmidTabDropdownMenu -> Already open`);
            this.removeAllPlasmidTabDropdownMenus();
            return;
        };

        // Select closest tab, 
        const parentTab = e.target.closest('.plasmid-tab');
    
        const dropdownMenu = this.createPlasmidTabDropdownMenu(plasmidIndex);
        document.body.appendChild(dropdownMenu);
        this.positionPlasmidTabDropdownMenu(parentTab, dropdownMenu);
    
        // Hide the dropdown menu if you click outside of it
        document.addEventListener('click', function hideDropdown(e) {
            if (!e.target.closest('.plasmid-tab')) {
                PlasmidTabs.removeAllPlasmidTabDropdownMenus();
                document.removeEventListener('click', hideDropdown);
            };
        });
    };


    /**
     * Create the dropdown menu for a specific plasmid tab.
     * 
     * @param {int} plasmidIndex - Plasmid index
     * @returns 
     */
    createPlasmidTabDropdownMenu(plasmidIndex) {
        const dropdownMenu = document.createElement('ul');
        dropdownMenu.className = 'plasmid-tab-dropdown-menu';
        dropdownMenu.setAttribute("plasmid-index", plasmidIndex);
        dropdownMenu.style.display = 'block'; // Display the menu initially

        dropdownMenu.innerHTML = `
        <h3>Export primers</h3>
        <ul>
            <li><a href="#" fileType="txt" onclick="FileIO.primerExporters['txt'](${plasmidIndex})">Plaint text (.txt)</a></li>
            <li><a href="#" fileType="doc" onclick="FileIO.primerExporters['doc'](${plasmidIndex})">MS Word file (.doc)</a></li>
            <li><a href="#" fileType="csv" onclick="FileIO.primerExporters['csv'](${plasmidIndex})">CSV file (.csv)</a></li>
            <li><a href="#" fileType="xlsx" onclick="FileIO.primerExporters['xlsx'](${plasmidIndex})">Excel file (.xlsx)</a></li>
            <li><a href="#" fileType="microsynth" onclick="FileIO.primerExporters['microsynth'](${plasmidIndex})">Microsynth order form (.xlsx)</a></li>
        </ul>
        <h3>Export plasmid file</h3>
        <ul>
            <li><a href="#" onclick="FileIO.exporters['gb'](${plasmidIndex})">GenBank file (.gb)</a></li>
            <li><a href="#" onclick="FileIO.exporters['dna'](${plasmidIndex})">SnapGene file (.dna)</a></li>
            <li><a href="#" onclick="FileIO.exporters['fasta'](${plasmidIndex})">Fasta file (.fasta)</a></li>
        </ul>
        <h3>Edit plasmid</h3>
        <ul>
            <li><a href="#" onclick="PlasmidTabs.renamePlasmid(${plasmidIndex})">Rename plasmid</a></li>
            <li><a href="#" onclick="PlasmidTabs.flipPlasmid(${plasmidIndex})">Flip plasmid</a></li>
            <li><a href="#" onclick="PlasmidTabs.setPlasmidOrigin(${plasmidIndex})">Set plasmid origin</a></li>
        </ul>
        <h3>Close plasmids</h3>
        <ul>
            <li><a href="#" onclick="PlasmidTabs.close(${plasmidIndex})">Close plasmid</a></li>
            <li><a href="#" onclick="PlasmidTabs.closeOthers(${plasmidIndex})">Close all OTHER plasmids</a></li>
            <li><a href="#" onclick="PlasmidTabs.closeToTheRight(${plasmidIndex})">Close plasmids to the RIGHT</a></li>
            <li><a href="#" onclick="PlasmidTabs.closeToTheLeft(${plasmidIndex})">Close plasmids to the LEFT</a></li>
        </ul>
        `;

        return dropdownMenu;
    };


    /**
     * Position dropdown menu relative to the parent tab.
     * 
     * @param {HTMLElement} parentTab - Parent tab to anchor dropdown menu to
     * @param {HTMLElement} dropdownMenu - Dropdown menu to reposition
     */
    positionPlasmidTabDropdownMenu(parentTab, dropdownMenu) {
        const rectTab = parentTab.getBoundingClientRect();
        const rectHeader = document.querySelectorAll("div .header")[0].getBoundingClientRect();
        //dropdownMenu.style.width = parentTab.offsetWidth + "px";
        dropdownMenu.style.right = (window.innerWidth - rectTab.right) + "px";
        dropdownMenu.style.top = rectHeader.bottom + "px";
    };
    

    /**
     * Find all dropdown menus and delete them.
     */
    removeAllPlasmidTabDropdownMenus() {
        const existingDropdownMenus = document.querySelectorAll('.plasmid-tab-dropdown-menu');
        existingDropdownMenus.forEach(element => {
            element.parentNode.removeChild(element);
        });
    };


    /**
     * Scroll tabs in specified direction.
     * 
     * @param {int} direction - Direction to scroll towards (1 or -1)
     */
    scrollTabs(direction, sender) {
        if (sender.hasAttribute("disabled")) {return};

        const container = document.getElementById('plasmid-tabs-container-wrapper');
        const scrollAmount = 200;
        container.scrollLeft += scrollAmount * direction;
    };
    

    /**
     * 
     * @param {*} fileType 
     * @param {*} plasmidIndex 
     */
    exportPrimers(fileType, plasmidIndex) {
        FileIO.primerExporters[fileType](plasmidIndex);
    };



    /**
     * Rename specific plasmid through a modal window.
     * 
     * @param {int} plasmidIndex - Index of plasmid to be renamed 
     */
    renamePlasmid(plasmidIndex) {
        const targetPlasmid = Session.getPlasmid(plasmidIndex);
        createModalWindow(
            "modal-window-rename-plasmid",
            "Rename Plasmid",
            "New plasmid name:",
            targetPlasmid.name,
            "Rename",
            targetPlasmid.rename.bind(targetPlasmid),
            targetPlasmid.extension
        );
    };


    /**
     * Flip plasmid sequence.
     * 
     * @param {int} plasmidIndex - Index of plasmid to be flipped 
     */
    flipPlasmid(plasmidIndex) {
        Session.getPlasmid(plasmidIndex).flip()
    };


    /**
     * Set new plasmid origin through a modal window.
     * 
     * @param {int} plasmidIndex - Index of plasmid to be shifted
     */
    setPlasmidOrigin(plasmidIndex) {
        const targetPlasmid = Session.getPlasmid(plasmidIndex);
        createModalWindow(
            "modal-window-set-origin",
            "Set new plasmid origin",
            "Set plasmid origin to:",
            0,
            "Set",
            targetPlasmid.setOrigin.bind(targetPlasmid)
        );
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
    if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        (event.key === 'Z' || event.key === 'z')
    ) {
        Session.activePlasmid().undo();
    };

    if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        (event.key === 'Z' || event.key === 'z')
    ) {
        Session.activePlasmid().redo();
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