/**
 * Add search functionality for the sequence grid.
 */
let customSearchInput;
document.addEventListener('DOMContentLoaded', function() {
    customSearchInput = document.getElementById('custom-search-input');
    customSearchInput.addEventListener('input', function() {
        searchOccurrences(customSearchInput);
    });
})
function initiateSearchFunctionality() {
    // Event listener for ctrl F or cmd F
    document.addEventListener('keydown', function(event) {
        const altKeyPressed = event.altKey
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            event.stopPropagation()
            //document.getElementById("custom-search-aa-check").checked = altKeyPressed;
            customSearchInput.focus();
            customSearchInput.select();
        };
    });

    document.addEventListener('keydown', function(event) {
        if (customSearchInput === document.activeElement) {
            if (event.keyCode == "38") {
                // up arrow
                event.preventDefault();
                navigateSearchResults(-1)
            } else if (event.keyCode == "40") {
                // down arrow
                event.preventDefault();
                navigateSearchResults(1)
            };
        }
    });
};


/**
 * Reset highlighted cells in the specified grid
 */
function resetTableCells() {
    // Select table element
    let table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
    
    // Find all cells with the "selected-cell-search" class and remove it
    const cellsHighlighted = table.getElementsByClassName("cell-search-result-highlight");
    while (cellsHighlighted.length > 0) {
        cellsHighlighted[0].classList.remove("cell-search-result-highlight");
    };
    const cellsResults = table.getElementsByClassName("cell-search-result");
    while (cellsResults.length > 0) {
        cellsResults[0].classList.remove("cell-search-result");
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
    
    const aaBoxChecked = document.getElementById("custom-search-aa-check").checked;
    if ((isDNASequence(searchQuery) === true && aaBoxChecked === false) || (isAminoAcidSequence(searchQuery) === true && aaBoxChecked === true)) {
        // Select the sequence and grid structure of the plasmid of interest
        let currSequence = plasmidDict[currentlyOpenedPlasmid]["fileSequence"];
        let currSequenceComp = plasmidDict[currentlyOpenedPlasmid]["fileComplementarySequence"];
        let currGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"];
    
        // If the query is not empty
        if (searchQuery) {
            const compStrandCheckbox = document.getElementById("custom-search-compstrand-check").checked;
            let workingSequence = (compStrandCheckbox === false) ? currSequence: currSequenceComp;
            let workingQuery = (compStrandCheckbox === false || aaBoxChecked === true) ? searchQuery: searchQueryComplement;
            let targetStrandIndedx = (compStrandCheckbox === false) ? 0: 1;
    
            // Get a list of indices for all occurences of the search query
            highlightOccurences(targetStrandIndedx, workingSequence, workingQuery.toUpperCase(), currGridStructure, "cell-search-result", null);
    
    
            // Scroll to the nearest occurence of the search query
            scrollToNextSelectedCell();
            updateCustomSearchTracker();
        };
    } else {
        updateCustomSearchTracker(clearTracker=true);
    };

};


function isDNASequence(str) {
    return /^[ATCG]+$/.test(str);
};

function isAminoAcidSequence(str) {
    return /^[ACDEFGHIKLMNPQRSTVWYX*-]+$/i.test(str);
};


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
            indicesResultsDNA.sort(function(a, b) {
                return a - b;
            });
    
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
            const aaBoxChecked = document.getElementById("custom-search-compstrand-check").checked;
            const translationDirection = (aaBoxChecked === false) ? "forward": "reverse";
            const dir = (translationDirection === "forward") ? 1: -1;
            const listOfTranslationDicts = plasmidDict[currentlyOpenedPlasmid]["translations"][translationDirection];
            console.log("highlightOccurences AA", workingQuery);
            console.log("highlightOccurences AA", translationDirection, dir, listOfTranslationDicts);
            for (let translationDict of listOfTranslationDicts) {
                console.log("highlightOccurences AA", translationDict, translationDict["span"], translationDict["sequence"]);
                const translationSpan = translationDict["span"];
                const translationSequence = translationDict["sequence"];

                let index = translationSequence.indexOf(workingQuery);
                while (index !== -1) {
                    indicesResultsAA.push(translationSpan[0] + index*3*dir);
                    index = translationSequence.indexOf(workingQuery, index + 1);
                };
            };
            console.log("highlightOccurences AA", indicesResultsAA);
            indicesResultsAA.sort(function(a, b) {
                return a - b;
            });

    
            // Iterate over all cells that contain the search query and highlight them
            const gridStructureLength = workingGridStructure.length;
            let currentQueryLength = workingQuery.length*3;
            let table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
            for (const index of indicesResultsAA) {
                let startCellIndex;
                if (translationDirection === "forward") {
                    startCellIndex = index;
                } else {
                    startCellIndex = index - currentQueryLength + 1;
                };
                const [row, column] = seqIndexToCoords(startCellIndex, 2, workingGridStructure);
                let currentCell = table.rows[row].cells[column];
                console.log("highlightOccurences AA currentCell", currentCell);
                for (let j = 0; j < currentQueryLength; j++) {
                    currentCell.classList.add("cell-search-result");
                    if (currentCell.nextElementSibling === null) {
                        let rowElement = currentCell.parentElement;
                        const currGridStructureLength = plasmidDict[currentlyOpenedPlasmid]["gridStructure"].length;
                        for (j = 0; j < currGridStructureLength; j++) {
                            rowElement = rowElement.nextElementSibling;
                        };
                        currentCell = rowElement.firstElementChild;
                    } else {
                        currentCell = currentCell.nextElementSibling
                    };
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
                return element;
            };
        };
        return null;
    };

    // Make a list of all selected cells
    const selectedCells = Array.from(table.getElementsByClassName("cell-search-result"));

    // Make sure there are actually selected cells
    if (selectedCells.length > 0) {
        const firstCellInView = isAnyCellInView(selectedCells);

        // If theres a next result to scroll to, do it
        if (firstCellInView === null) {
            highlightSearchResult(selectedCells[0]);
            searchResultCellToTracker(selectedCells[0]);
        } else {
            highlightSearchResult(firstCellInView);
            searchResultCellToTracker(firstCellInView);
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
    const compCheckbox = document.getElementById("custom-search-compstrand-check").checked;
    const workingList = (aaCheckbox === false) ? indicesResultsDNA: indicesResultsAA;
    const workingQuery = document.getElementById("custom-search-input").value;

    if (workingList.length > 1) {
        let resultIndex = currentSearchResult - 1 + direction;
        if (resultIndex === -1) {
            resultIndex = workingList.length - 1;
        } else if (resultIndex === workingList.length) {
            resultIndex = 0;
        };
        console.log("navigateSearchResults", resultIndex, workingList);
        const cellSeqIndex = workingList[resultIndex];
    
        const currentGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"];
        let tarStrand;
        let tableCoords;
        let highlightStartIndex;
        if (aaCheckbox === false) {
            tarStrand = (compCheckbox === false) ? 0: 1;
            tableCoords = seqIndexToCoords(cellSeqIndex + 1, tarStrand, currentGridStructure);
        } else {
            tarStrand = 2;
            highlightStartIndex = (compCheckbox === false) ? cellSeqIndex: cellSeqIndex - workingQuery.length*3 + 1;
            tableCoords = seqIndexToCoords(highlightStartIndex, tarStrand, currentGridStructure);
            console.log("navigateSearchResults", highlightStartIndex, tableCoords)
        };
    
        const table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
        const targetCell = table.rows[tableCoords[0]].cells[tableCoords[1]];
    
        highlightSearchResult(targetCell);
        console.log("navigateSearchResults", targetCell);
        currentSearchResult = resultIndex + 1;
        updateCustomSearchTracker();
    };
};


/**
 * Highlight specific search result
 */
function highlightSearchResult(firstCell) {
    console.log("highlightSearchResult first cell", firstCell)
    firstCell.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
    });

    const table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
    const cellsHighlighted = table.getElementsByClassName("cell-search-result-highlight");
    while (cellsHighlighted.length > 0) {
        cellsHighlighted[0].classList.add("cell-search-result");
        cellsHighlighted[0].classList.remove("cell-search-result-highlight");
    };

    let currentQueryLength = document.getElementById("custom-search-input").value.length;
    if (document.getElementById("custom-search-aa-check").checked === true) {
        currentQueryLength *= 3
    };
    console.log("highlightSearchResult", currentQueryLength)
    let currentCell = firstCell;
    for (i = 0; i < currentQueryLength; i++) {
        console.log("highlightSearchResult", currentCell)
        currentCell.classList.remove("cell-search-result");
        currentCell.classList.add("cell-search-result-highlight");
        if (currentCell.nextElementSibling === null) {
            let row = currentCell.parentElement;
            const currGridStructureLength = plasmidDict[currentlyOpenedPlasmid]["gridStructure"].length;
            for (j = 0; j < currGridStructureLength; j++) {
                row = row.nextElementSibling;
            };
            currentCell = row.firstElementChild;
        } else {
            currentCell = currentCell.nextElementSibling
        }
    };
};


/**
 * Update search tracker
 */
function updateCustomSearchTracker(clearTracker=false) {
    const aaCheckbox = document.getElementById("custom-search-aa-check").checked;
    const workingList = (aaCheckbox === false) ? indicesResultsDNA: indicesResultsAA;
    console.log("updateCustomSearchTracker", workingList);
    if (workingList !== null) {
        const numberResults = workingList.length;
    
        if (customSearchInput.value === "" || clearTracker === true || numberResults === 0) {
            document.getElementById("custom-search-counter").innerText = "";
        } else {
            document.getElementById("custom-search-counter").innerText = currentSearchResult + "/" + numberResults;
        };
    } else {
        document.getElementById("custom-search-counter").innerText = "";
    };
};


/**
 * Find which search results corresponds to the cell
 */
function searchResultCellToTracker(inputCell) {
    const aaCheckbox = document.getElementById("custom-search-aa-check").checked;
    const workingList = (aaCheckbox === false) ? indicesResultsDNA: indicesResultsAA;
    console.log("searchResultCellToTracker", inputCell)
    // Convert cell coordinates to sequence index
    let cellRow = inputCell.parentNode.rowIndex;
    if (aaCheckbox === true) {
        cellRow -= 2;
    };
    const cellCol = inputCell.cellIndex;
    const cellSeqIndex = cellRow/plasmidDict[currentlyOpenedPlasmid]["gridStructure"].length*gridWidth + cellCol;
    console.log("searchResultCellToTracker", cellSeqIndex, cellRow, cellCol)

    
    let nearestIndex = 0;
    let nearestDifference = Math.abs(cellSeqIndex - workingList[0]);
    for (let i = 1; i < workingList.length; i++) {
        let difference = Math.abs(cellSeqIndex - workingList[i]);
        if (difference < nearestDifference) {
            nearestIndex = i;
            nearestDifference = difference;
        };
    };
    console.log("searchResultCellToTracker", nearestIndex)
    
    currentSearchResult = nearestIndex + 1;
};

/**
 * Search trackers
 */
let currentSearchResult = null;
let indicesResultsDNA = null;
let indicesResultsAA = null;