/**
 * Add search functionality for the sequence grid.
 */
function initiateSearchFunctionality() {
    // Select the search bar element
    let customSearchInput = document.getElementById('custom-search-input');

    // Event listener for ctrl F or cmd F
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            if (!searchOn) {
                event.preventDefault(); // Prevent default search functionality
                // Make search bar visible
                customSearchInput.style.display = "block";
                customSearchInput.value = "";
                customSearchInput.focus();
                // Event listener for typing
                customSearchInput.addEventListener('input', function() {
                    searchOccurrences(customSearchInput);
                });
                searchOn = true;
            } else { // Disable
                event.preventDefault();
                resetTableCells();
                customSearchInput.style.display = "none";
                searchOn = false;
            };
        };
    });
};


/**
 * Reset highlighted cells in the specified grid
 */
function resetTableCells() {
    // Select table element
    let table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
    
    // Find all cells with the "selected-cell-search" class and remove it
    const cells = table.getElementsByClassName("selected-cell-search");
    while (cells.length > 0) {
        cells[0].classList.remove("selected-cell-search");
    };
};
      

/**
 * Find all occurences of the search query in the sequence, highligh the cells then scroll to the nearest occurence.
 */
function searchOccurrences(customSearchInput) {
    // Reset highlighted cells
    resetTableCells();

    // Get search query from the search bar
    const searchQuery = customSearchInput.value;
    const searchQueryComplement = searchQuery.split('').reverse().join('');

    // Select the sequence and grid structure of the plasmid of interest
    let currSequence = plasmidDict[currentlyOpenedPlasmid]["fileSequence"];
    let currSequenceComp = plasmidDict[currentlyOpenedPlasmid]["fileComplementarySequence"];
    let currGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"];

    // If the query is not empty
    if (searchQuery) {
        for (i = 0; i < 2; i++) {
            let workingSequence = (i === 0) ? currSequence: currSequenceComp;
            let workingQuery = (i === 0) ? searchQuery: searchQueryComplement;

            // Get a list of indices for all occurences of the search query
            highlightOccurences(i, workingSequence, workingQuery.toUpperCase(), currGridStructure, "selected-cell-search", null);
        };

        // Scroll to the nearest occurence of the search query
        scrollToNextSelectedCell();
    };
};


function isDNASequence(str) {
    return /^[ATCG]+$/.test(str);
};

function isAminoAcidSequence(str) {
    return /^[ACDEFGHIKLMNPQRSTVWYX*-]+$/i.test(str);
}


/**
 * Search for query occurences in sequence then add a class or highlight 
 */
function highlightOccurences(targetStrandIndex, workingSequence, workingQuery, workingGridStructure, highlightClass, highlightColor) {
    if (isDNASequence(workingQuery)) {
        // Get a list of indices for all occurences of the search query
        let currentIndex = workingSequence.indexOf(workingQuery);
        const indices = [];
        while (currentIndex !== -1) {
            indices.push(currentIndex);
            currentIndex = workingSequence.indexOf(workingQuery, currentIndex + 1);
        };

        // Select table element
        let table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
        
        // Iterate over all cells that contain the search query and highlight them
        for (const index of indices) {
            for (let j = 1; j < workingQuery.length + 1; j++) {
                // Convert sequence index to table coordinates
                const [row, column] = seqIndexToCoords(index + j, targetStrandIndex, workingGridStructure);
                // Select and highlight the cell
                const cell = table.rows[row].cells[column];
                if (highlightClass) {
                    cell.classList.add(highlightClass);
                } else if (highlightColor) {
                    cell.style.backgroundColor = highlightColor;
                    cell.style.color = "white";
                };
            };
        };
    };
    
    if (isAminoAcidSequence(workingQuery)) {
        workingQuery = workingQuery.replace("X", "-").replace("*", "-")
        const indices = [];
        // Get all cells
        const aaCells = document.querySelectorAll(".AminoAcids:not(:empty)");
        
        let aaSequence = "";
        aaCells.forEach(cell => {
            aaSequence += cell.textContent + "";
        });

        let currentIndex = aaSequence.indexOf(workingQuery);
        while (currentIndex !== -1) {
            indices.push(currentIndex);
            currentIndex = workingSequence.indexOf(workingQuery, currentIndex + 1);
        };

        // Iterate over all cells that contain the search query and highlight them
        const gridStructureLength = workingGridStructure.length;
        for (const index of indices) {
            let currentCell = aaCells[index];
            for (let j = 1; j < workingQuery.length + 1; j++) {
                let leftCell;
                if (currentCell.previousElementSibling !== null) {
                    leftCell = currentCell.previousElementSibling;
                } else {
                    let row = currentCell.parentElement;
                    for (let k = 0; k < gridStructureLength; k++) {
                        row = row.nextElementSibling;
                    };
                    leftCell = row.lastElementChild;
                };

                let rightCell;
                if (currentCell.nextElementSibling !== null) {
                    rightCell = currentCell.nextElementSibling;
                } else {
                    let row = currentCell.parentElement;
                    for (let k = 0; k < gridStructureLength; k++) {
                        row = row.nextElementSibling;
                    };
                    rightCell = row.firstElementChild;
                };

                if (highlightClass) {
                    leftCell.classList.add(highlightClass);
                    currentCell.classList.add(highlightClass);
                    rightCell.classList.add(highlightClass);
                } else if (highlightColor) {
                    leftCell.style.backgroundColor = highlightColor;
                    leftCell.style.color = "white";

                    currentCell.style.backgroundColor = highlightColor;
                    currentCell.style.color = "white";

                    rightCell.style.backgroundColor = highlightColor;
                    rightCell.style.color = "white";
                };
                currentCell = aaCells[index + j];
            };
        };
    };


};


/**
 * Search for query occurences in sequence then add a class or highlight 
 */
function highlightSpan(plasmidIndex, targetStrandIndex, spanStart, spanEnd, highlightClass, backgroundColor, textColor) {
    startIndex = Math.min(spanStart, spanEnd);
    endIndex = Math.max(spanStart, spanEnd);
    // Select table element
    let table = document.getElementById("sequence-grid-" + plasmidIndex);
    if (table) {
        // Iterate over all cells that contain the search query and highlight them
        for (let j = startIndex; j < endIndex; j++) {
            // Convert sequence index to table coordinates
            const [row, column] = seqIndexToCoords(j, 0, plasmidDict[plasmidIndex]["gridStructure"]);
            // Select and highlight the cell
            const cell = table.rows[row + targetStrandIndex].cells[column];
            if (highlightClass) {
                cell.classList.add(highlightClass);
            } else if (highlightColor) {
                cell.style.backgroundColor = backgroundColor;
                cell.style.color = textColor;
            };
        };
    };
};


/**
 * Scroll to the next selected cell
 */
function scrollToNextSelectedCell() {
    // Select table element
    let table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);

    function isAnyCellInView(cellsList) {
        for (let i = 0; i < cellsList.length; i++) {
            let element = cellsList[i];
            let rect = element.getBoundingClientRect();
            if (
                rect.bottom >= 0 &&
                rect.top <= (window.innerHeight || document.documentElement.clientHeight)
            ) {
                return true;
            };
        };
        return false;
    };

    // Make a list of all selected cells
    const selectedCells = Array.from(table.getElementsByClassName("selected-cell-search"));

    // Make sure there are actually selected cells
    if (selectedCells.length > 0) {
        const anyCellInView = isAnyCellInView(selectedCells);

        // If theres a next result to scroll to, do it
        if (!anyCellInView) {
            selectedCells[0].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        };
    };
};