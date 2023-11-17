/**
 * Add search functionality for the sequence grid.
 */
function initiateSearchFunctionality(pNr) {
    // Select the search bar element
    let customSearchInput = null;
    if (pNr === 1) {
        customSearchInput = document.getElementById('custom-search-input');
    } else {
        customSearchInput = document.getElementById('custom-search-input2');
    };  

    // Event listener for ctrl F or cmd F
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            let searchEnabled = null;
            if (pNr === 1) {
                searchEnabled = customSearchEnabledFirstPlasmid;
            } else {
                searchEnabled = customSearchEnabledSecondPlasmid;
            };
            
            if (!searchEnabled) {
                event.preventDefault(); // Prevent default search functionality
                // Make search bar visible
                customSearchInput.style.display = "block";
                customSearchInput.value = "";
                //if (customSearchInput.value !== "") {searchOccurrences(pNr)}
                customSearchInput.focus(); // Set focus to the custom search input field
                // Event listener for typing
                customSearchInput.addEventListener('input', function() {
                    // Send search query
                    searchOccurrences(customSearchInput, pNr);
                });
                if (pNr === 1) {
                    customSearchEnabledFirstPlasmid = true;
                } else {
                    customSearchEnabledSecondPlasmid = true;
                };
            } else { // Disable
                event.preventDefault();
                resetTableCells(pNr);
                customSearchInput.style.display = "none";
                if (pNr === 1) {
                    customSearchEnabledFirstPlasmid = false;
                } else {
                    customSearchEnabledSecondPlasmid = false;
                };
            };
        };
    });
};


/**
     * Reset highlighted cells in the specified grid
     */
function resetTableCells(pNr) {
    // Select table element
    let table = null;
    if (pNr === 1) {
        table = document.getElementById("sequence-grid");
    } else {
        table = document.getElementById("sequence-grid2");
    };
    
    // Find all cells with the "selected-cell-search" class and remove it
    const cells = table.getElementsByClassName("selected-cell-search");
    while (cells.length > 0) {
        cells[0].classList.remove("selected-cell-search");
    };
};
      

/**
 * Find all occurences of the search query in the sequence, highligh the cells then scroll to the nearest occurence.
 */
function searchOccurrences(customSearchInput, pNr) {
    // Reset highlighted cells
    resetTableCells(pNr);

    // Get search query from the search bar
    const searchQuery = customSearchInput.value;
    const searchQueryComplement = searchQuery.split('').reverse().join('');
    //console.log("Search:", searchQuery, searchQueryComplement)

    // Select the sequence and grid structure of the plasmid of interest
    let currSequence = null;
    let currSequenceComp = null;
    let currGridStructure = null;
    if (pNr === 1) {
        currSequence = sequence;
        currSequenceComp = complementaryStrand;
        currGridStructure = gridStructure;
    } else {
        currSequence = sequence2;
        currSequenceComp = complementaryStrand2;
        currGridStructure = gridStructure2;
    };

    // If the query is not empty
    if (searchQuery) {
        for (i = 0; i < 2; i++) {
            let workingSequence = "";
            let workingQuery = "";
            if (i === 0) {
                workingSequence = currSequence;
                workingQuery = searchQuery;
            } else {
                workingSequence = currSequenceComp;
                workingQuery = searchQueryComplement;
            };
            // Get a list of indices for all occurences of the search query
            highlightOccurences(pNr, i, workingSequence, workingQuery, currGridStructure, "selected-cell-search", null);
        };

        // Scroll to the nearest occurence of the search query
        scrollToNextSelectedCell(pNr);
    };
};


/**
 * Search for query occurences in sequence then add a class or highlight 
 */
function highlightOccurences(pNr, targetStrandIndex, workingSequence, workingQuery, workingGridStructure, highlightClass, highlightColor) {
    // Get a list of indices for all occurences of the search query
    const indices = [];
    let currentIndex = workingSequence.indexOf(workingQuery);
    while (currentIndex !== -1) {
        indices.push(currentIndex);
        currentIndex = workingSequence.indexOf(workingQuery, currentIndex + 1);
    };
    if (indices.length !== 0) {
        console.log("Highlight Occurences:", pNr, targetStrandIndex, workingQuery, highlightClass, highlightColor);
    };

    // Select table element
    let table = null;
    if (pNr === 1) {
        table = document.getElementById("sequence-grid");
    } else {
        table = document.getElementById("sequence-grid2");
    };
    
    // Iterate over all cells that contain the search query and highlight them
    for (const index of indices) {
        for (let j = 1; j < workingQuery.length + 1; j++) {
            // Convert sequence index to table coordinates
            const [row, column] = seqIndexToCoords(index + j, 0, workingGridStructure);
            // Select and highlight the cell
            const cell = table.rows[row + targetStrandIndex].cells[column];
            //console.log("Custom search:",index + j, cell, row + targetStrandIndex, column);
            if (highlightClass) {
                cell.classList.add(highlightClass);
            } else if (highlightColor) {
                cell.style.backgroundColor = highlightColor;
                cell.style.color = "white";
            };
        };
    };
};


/**
 * Scroll to the next selected cell
 */
function scrollToNextSelectedCell(pNr) {
    console.log("scrollToNextSelectedCell, pNr", pNr)
    // Select table element
    let table = null;
    if (pNr === 1) {
        table = document.getElementById("sequence-grid");
    } else {
        table = document.getElementById("sequence-grid2");
    };

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

        console.log("scrollToNextSelectedCell, currentIndex", anyCellInView)

        // If theres a next result to scroll to, do it
        if (!anyCellInView) {
            console.log("scrollToNextSelectedCell, selectedCells[0]", selectedCells[0])
            selectedCells[0].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        };
    };
};