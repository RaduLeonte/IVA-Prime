function scrollTabs(direction) {
    const container = document.getElementById('plasmid-tabs-container');
    const scrollAmount = 200; // Adjust as needed
    if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
    } else if (direction === 'right') {
        container.scrollLeft += scrollAmount;
    };
};


function switchPlasmidTab(plasmidIndex) {
    // Update content grid
    const siebarContainer = document.getElementById('sidebar');
    siebarContainer.innerHTML = plasmidDict[plasmidIndex]["sidebar"].innerHTML;
    console.log("Switching sidebar:", plasmidDict[plasmidIndex]["sidebar"])

    // Update content grid
    const contentGridContainer = document.getElementById('file-content');
    contentGridContainer.innerHTML = "";
    contentGridContainer.appendChild(plasmidDict[plasmidIndex]["contentGrid"])
    console.log("Switching grid:", plasmidDict[plasmidIndex]["contentGrid"])

    enableSidebarEditing();
    addCellSelection(plasmidIndex);
    addHoverPopupToTable(plasmidIndex);
    addCellBorderOnHover(plasmidIndex);
    updateAnnotationTrianglesWidth();

    // Update global tracker
    currentlyOpenedPlasmid = plasmidIndex;
};