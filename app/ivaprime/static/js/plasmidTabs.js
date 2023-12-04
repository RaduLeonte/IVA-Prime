function scrollTabs(direction) {
    const container = document.getElementById('plasmid-tabs-container');
    const scrollAmount = 200; // Adjust as needed
    if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
    } else if (direction === 'right') {
        container.scrollLeft += scrollAmount;
    };
};


function updateSidebarAndGrid(plasmidIndex) {
    // Update sidebar table
    const sidebarTableContainer = document.getElementById('sidebar-table');
    sidebarTableContainer.innerHTML = plasmidDict[plasmidIndex]["sidebarTable"].innerHTML;

    // Update content grid
    const contentGridContainer = document.getElementById('file-content');
    contentGridContainer.innerHTML = "";
    contentGridContainer.appendChild(plasmidDict[plasmidIndex]["contentGrid"])

    enableSidebarEditing();
    addCellSelection(plasmidIndex);
    addHoverPopupToTable(plasmidIndex);
    addCellBorderOnHover(plasmidIndex);
    updateAnnotationTrianglesWidth();
};


function saveSidebarAndGrid() {
    if (document.getElementById('sidebar-table') && document.getElementById('sequence-grid-' + currentlyOpenedPlasmid)) {
        // Sidebar
        plasmidDict[currentlyOpenedPlasmid]["sidebarTable"] = document.getElementById('sidebar-table');

        // Content grid
        plasmidDict[currentlyOpenedPlasmid]["contentGrid"] = document.getElementById('sequence-grid-' + currentlyOpenedPlasmid);
    };
};

function savePrimers() {
    console.log("Saving primers", document.querySelector('.sidebar-content'))
    plasmidDict[currentlyOpenedPlasmid]["sidebarPrimers"] = document.querySelector('.sidebar-content');
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

    // Update primers
    const oldPrimers = document.querySelector('.sidebar-content');
    const sidebar = document.getElementById("sidebar");

    let newPrimers = null;
    if (plasmidDict[plasmidIndex]["sidebarPrimers"] !== null) {
        newPrimers = plasmidDict[plasmidIndex]["sidebarPrimers"];
    } else {
        newPrimers = document.createElement("div");
        newPrimers.classList.add("sidebar-content");
        newPrimers.innerHTML = `<h2 id="primers-div-headline">Primers will appear here.</h2>`;
    };
    sidebar.insertBefore(newPrimers, sidebar.firstChild);
    sidebar.removeChild(oldPrimers);

    // Save side bar and grid of previous plasmid
    saveSidebarAndGrid();

    // Repopulate sidebar and grid
    updateSidebarAndGrid(plasmidIndex);

    // Update global tracker
    currentlyOpenedPlasmid = plasmidIndex;
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
            const sidebarContainer = document.getElementById('sidebar');
            sidebarContainer.innerHTML = "";
    
            // Clear content grid
            const contentGridContainer = document.getElementById('file-content');
            contentGridContainer.innerHTML = "";
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