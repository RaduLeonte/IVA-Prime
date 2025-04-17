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


        // Save current scroll level
        PlasmidViewer.saveGridViewScrollTop();
        
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

        Sidebar.update();
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
        //console.log("PlasmidTabs.enableScrollButtons => ");
        document.querySelectorAll(".plasmid-tabs-scroll-button").forEach(button => {
            button.removeAttribute('disabled');
        });
    };
    disableScrollButtons() {
        //console.log("PlasmidTabs.disableScrollButtons => ");
        document.querySelectorAll(".plasmid-tabs-scroll-button").forEach(button => {
            button.setAttribute('disabled', '');
        });
    };


    /**
     * Enable or disable the switch view buttons in the toolbar
     */
    enableSwitchViewButtons() {
        return;
        ["circular", "linear", "grid"].forEach(view => {
            document.getElementById(`${view}-view-button`).removeAttribute('disabled');
        });
    };
    disableSwitchViewButtons() {
        return;
        ["circular", "linear", "grid"].forEach(view => {
            document.getElementById(`${view}-view-button`).setAttribute('disabled', '');
        });
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
        <div class="plasmid-tab-dropdown-menu-section-title">Export primers</div>
        <ul>
            <li><span fileType="txt" onclick="FileIO.exportPrimersSingle(${plasmidIndex}, 'txt')">Plaint text (.txt)</span></li>
            <li><span fileType="doc" onclick="FileIO.exportPrimersSingle(${plasmidIndex}, 'doc')">MS Word file (.doc)</span></li>
            <li><span fileType="csv" onclick="FileIO.exportPrimersSingle(${plasmidIndex}, 'csv')">CSV file (.csv)</span></li>
            <li><span fileType="xlsx" onclick="FileIO.exportPrimersSingle(${plasmidIndex}, 'xlsx')">Excel file (.xlsx)</span></li>
            <li><span fileType="microsynth" onclick="FileIO.exportPrimersSingle(${plasmidIndex}, 'microsynth')">Microsynth order form (.xlsx)</span></li>
        </ul>
        <div class="plasmid-tab-dropdown-menu-section-title">Export plasmid file</div>
        <ul>
            <li><span onclick="FileIO.exporters['gb'](${plasmidIndex})">GenBank file (.gb)</span></li>
            <li><span onclick="FileIO.exporters['dna'](${plasmidIndex})">SnapGene file (.dna)</span></li>
            <li><span onclick="FileIO.exporters['fasta'](${plasmidIndex})">Fasta file (.fasta)</span></li>
        </ul>
        <div class="plasmid-tab-dropdown-menu-section-title">Edit plasmid</div>
        <ul>
            <li><span onclick="PlasmidTabs.renamePlasmid(${plasmidIndex})">Rename plasmid</span></li>
            <li><span onclick="PlasmidTabs.flipPlasmid(${plasmidIndex})">Flip plasmid</span></li>
            <li><span onclick="PlasmidTabs.setPlasmidOrigin(${plasmidIndex})">Set plasmid origin</span></li>
            <li><span onclick="PlasmidTabs.setFileTopology(${plasmidIndex})">Set file topology</span></li>
        </ul>
        <div class="plasmid-tab-dropdown-menu-section-title">Close plasmids</div>
        <ul>
            <li><span onclick="PlasmidTabs.close(${plasmidIndex})">Close plasmid</span></li>
            <li><span onclick="PlasmidTabs.closeOthers(${plasmidIndex})">Close all OTHER plasmids</span></li>
            <li><span onclick="PlasmidTabs.closeToTheRight(${plasmidIndex})">Close plasmids to the RIGHT</span></li>
            <li><span onclick="PlasmidTabs.closeToTheLeft(${plasmidIndex})">Close plasmids to the LEFT</span></li>
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
     * Rename specific plasmid through a modal window.
     * 
     * @param {int} plasmidIndex - Index of plasmid to be renamed 
     */
    renamePlasmid(plasmidIndex) {
        const targetPlasmid = Session.getPlasmid(plasmidIndex);
        Modals.createRenamePlasmidModal(targetPlasmid);
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
        Modals.createSetOriginModal(targetPlasmid);
    };


    /**
     * 
     * @param {*} plasmidIndex 
     */
    setFileTopology(plasmidIndex) {
        const targetPlasmid = Session.getPlasmid(plasmidIndex);
        Modals.createSetFileTopologyModal(targetPlasmid);
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