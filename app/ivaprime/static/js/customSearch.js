/**
 * Add search functionality for the sequence grid.
 */
let customSearchInput
document.addEventListener('DOMContentLoaded', function() {
    customSearchInput = document.getElementById('custom-search-input');
    customSearchInput.addEventListener('input', function() {
        searchOccurrences(customSearchInput);
    });
})
function initiateSearchFunctionality() {
    // Event listener for ctrl F or cmd F
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault(); // Prevent default search functionality
            customSearchInput.focus();
            customSearchInput.select();
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
        const compStrandCheckbox = document.getElementById("custom-search-compstrand-check").checked;
        let workingSequence = (compStrandCheckbox === false) ? currSequence: currSequenceComp;
        let workingQuery = (compStrandCheckbox === false) ? searchQuery: searchQueryComplement;
        let targetStrandIndedx = (compStrandCheckbox === false) ? 0: 1;

        // Get a list of indices for all occurences of the search query
        highlightOccurences(targetStrandIndedx, workingSequence, workingQuery.toUpperCase(), currGridStructure, "selected-cell-search", null);


        // Scroll to the nearest occurence of the search query
        scrollToNextSelectedCell();
        updateCustomSearchTracker();
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
    const searchForAACheckbox = document.getElementById("custom-search-aa-check").checked;
    console.log("highlightOccurences checkbox", searchForAACheckbox);

    if (searchForAACheckbox === false){
        if (isDNASequence(workingQuery)) {
            // Get a list of indices for all occurences of the search query
            let currentIndex = workingSequence.indexOf(workingQuery);
            indicesResultsDNA = [];
            while (currentIndex !== -1) {
                indicesResultsDNA.push(currentIndex);
                currentIndex = workingSequence.indexOf(workingQuery, currentIndex + 1);
            };
    
            // Select table element
            let table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
            
            // Iterate over all cells that contain the search query and highlight them
            for (const index of indicesResultsDNA) {
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
    } else {
        if (isAminoAcidSequence(workingQuery)) {
            workingQuery = workingQuery.replace("X", "-").replace("*", "-")
            indicesResultsAA = [];
            // Get all cells
            const aaCells = document.querySelectorAll(".AminoAcids:not(:empty)");
            
            let aaSequence = "";
            aaCells.forEach(cell => {
                aaSequence += cell.textContent + "";
            });
    
            let currentIndex = aaSequence.indexOf(workingQuery);
            while (currentIndex !== -1) {
                indicesResultsAA.push(currentIndex);
                currentIndex = workingSequence.indexOf(workingQuery, currentIndex + 1);
            };
    
            // Iterate over all cells that contain the search query and highlight them
            const gridStructureLength = workingGridStructure.length;
            for (const index of indicesResultsAA) {
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
                searchResultCellToTracker(element);
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
            searchResultCellToTracker(selectedCells[0]);
        };
    };
};


/**
 * Clears the custom search input and un-highlights cells
 */
function clearCustomSearchInput() {
    document.getElementById('custom-search-input').value = "";
    resetTableCells();
    currentSearchResult = null;
    indicesResultsDNA = null;
    indicesResultsAA = null;
    updateCustomSearchTracker();
};


/**
 * Navigate search results
 * 
 * direction = +- 1
 */
function navigateSearchResults(direction) {
    console.log("navigateSearchResults", direction);
    const aaCheckbox = document.getElementById("custom-search-aa-check").checked;
    const workingList = (aaCheckbox === false) ? indicesResultsDNA: indicesResultsAA;

    let resultIndex = currentSearchResult - 1 + direction;
    if (resultIndex === -1) {
        resultIndex = workingList.length - 1;
    } else if (resultIndex === workingList.length) {
        resultIndex = 0;
    };
    console.log("navigateSearchResults", resultIndex, workingList);
    const cellSeqIndex = workingList[resultIndex];

    const currentGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"];
    const tableCoords = seqIndexToCoords(cellSeqIndex, 0, currentGridStructure);

    const table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
    const targetCell = table.rows[tableCoords[0]].cells[tableCoords[1]];

    targetCell.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
    });
    console.log("navigateSearchResults", targetCell);
    currentSearchResult = resultIndex + 1;
    updateCustomSearchTracker();
};


/**
 * Update search tracker
 */
function updateCustomSearchTracker() {
    if (customSearchInput.value === "") {
        document.getElementById("custom-search-counter").innerText = "";
    } else {
        const aaCheckbox = document.getElementById("custom-search-aa-check").checked;
        const workingList = (aaCheckbox === false) ? indicesResultsDNA: indicesResultsAA;
        console.log("updateCustomSearchTracker", workingList)
        const numberResults = workingList.length;
        document.getElementById("custom-search-counter").innerText = currentSearchResult + "/" + numberResults;
    };
};


/**
 * Find which search results corresponds to the cell
 */
function searchResultCellToTracker(inputCell) {
    // Convert cell coordinates to sequence index
    const cellRow = inputCell.parentNode.rowIndex;
    const cellCol = inputCell.cellIndex;
    const cellSeqIndex = cellRow/plasmidDict[currentlyOpenedPlasmid]["gridStructure"].length*gridWidth + cellCol;
    
    const aaCheckbox = document.getElementById("custom-search-aa-check").checked;
    const workingList = (aaCheckbox === false) ? indicesResultsDNA: indicesResultsAA;

    let nearestIndex = 0;
    let nearestDifference = Math.abs(cellSeqIndex - workingList[0]);
    for (let i = 1; i < workingList.length; i++) {
        let difference = Math.abs(cellSeqIndex - workingList[i]);
        if (difference < nearestDifference) {
            nearestIndex = i;
            nearestDifference = difference;
        };
    };

    currentSearchResult = nearestIndex + 1;
};

/**
 * Search trackers
 */
let currentSearchResult = null;
let indicesResultsDNA = null;
let indicesResultsAA = null;