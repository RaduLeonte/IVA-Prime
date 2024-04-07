/**
 * Class storing search results
 */
const SearchResults = new class {
    constructor() {
        this.current = null; // Currently active search result
        this.dna = null; // List of indices 
        this.aa = null; // List of indices
    };
};


/**
 * Once the page has loaded, add input listener to the search bar
 */
let customSearchInput;
document.addEventListener('DOMContentLoaded', function() {
    customSearchInput = document.getElementById('custom-search-input');
    customSearchInput.addEventListener('input', function() {
        searchOccurrences(customSearchInput);
    });
})


/**
 * Enable keyboard shortcuts for search bar
 */
function initiateSearchFunctionality() {
    /**
     * On CTRl+F or CMD+F, focus and select the search bar
     */
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            event.stopPropagation();
            customSearchInput.focus();
            customSearchInput.select();
        };
    });

    /**
     * Cycle through search results using arrow keys
     */
    document.addEventListener('keydown', function(event) {
        if (customSearchInput === document.activeElement) {
            if (event.keyCode == "38") {
                // Up arrow
                event.preventDefault();
                navigateSearchResults(-1);
            } else if (event.keyCode == "40") {
                // Down arrow
                event.preventDefault();
                navigateSearchResults(1);
            };
        };
    });
};


/**
 * Reset highlighted cells in currently open sequence grid
 */
function resetTableCells() {
    // Select table element
    let table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
    
    // Find all highlighted cells (search results and highlighted search result)
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
 * Find all occurences of the search query in the sequence, highligh the cells then scroll to the nearest
 * occurence.
 * 
 * @param {Object} customSearchInput - custom search bar
 */
function searchOccurrences(customSearchInput) {
    // Reset highlighted cells
    resetTableCells();

    // Get search query from the search bar
    const searchQuery = customSearchInput.value;
    const searchQueryComplement = searchQuery.split('').reverse().join('');
    
    // Search for amino acid sequence checkbox
    const aaBoxChecked = document.getElementById("custom-search-aa-check").checked;
    if ((isDNASequence(searchQuery) === true && aaBoxChecked === false) || (isAminoAcidSequence(searchQuery) === true && aaBoxChecked === true)) {
        // If the search query is a valid DNA sequence and AA box not checked, or query is valid AA sequence
        // and AA checkbox is checked
        
        // Select the sequence and grid structure of the plasmid of interest
        let currSequence = plasmidDict[currentlyOpenedPlasmid]["fileSequence"];
        let currSequenceComp = plasmidDict[currentlyOpenedPlasmid]["fileComplementarySequence"];
        let currGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"];
    
        // If the query is not empty
        if (searchQuery) {
            // Search for complementary sequence checkbox
            const compStrandCheckbox = document.getElementById("custom-search-compstrand-check").checked;
            const workingSequence = (compStrandCheckbox === false) ? currSequence: currSequenceComp;
            const workingQuery = (compStrandCheckbox === false || aaBoxChecked === true) ? searchQuery: searchQueryComplement;
            const targetStrandIndedx = (compStrandCheckbox === false) ? 0: 1;
    
            // Highlight all occurences of the search query
            highlightOccurences(
                targetStrandIndedx,
                workingSequence,
                workingQuery.toUpperCase(),
                "cell-search-result",
                null
            );
    
            // Scroll to the nearest occurence of the search query
            scrollToNearestSearchResult();
            updateCustomSearchTracker();
        };
    } else {
        // If no valid search query given, reset tracker
        updateCustomSearchTracker(clearTracker=true);
    };
};


/**
 * Check if input string is a valid DNA sequence
 * 
 * @param {string} str - Input string
 * @returns {boolean}
 */
//TO DO: maybe add all other IUPAC nucleotide codes
function isDNASequence(str) {
    return /^[ATCG]+$/.test(str);
};

/**
 * Check if input string is a valid AA sequence
 * 
 * @param {string} str - Input string
 * @returns {boolean}
 */
function isAminoAcidSequence(str) {
    return /^[ACDEFGHIKLMNPQRSTVWYX*-]+$/i.test(str);
};


/**
 * Search for query occurences in sequence then add a class or highlight 
 * 
 * @param {number} targetStrandIndex 
 * @param {number} workingSequence 
 * @param {number} workingQuery
 * @param {Array<string>} workingGridStructure 
 * @param {number} highlightClass 
 * @param {number} highlightColor
 * @returns {void}
 */
function highlightOccurences(targetStrandIndex, workingSequence, workingQuery, highlightClass, highlightColor) {
    // Search for amino acid sequence checkbox
    const searchForAACheckbox = document.getElementById("custom-search-aa-check").checked;

    if (searchForAACheckbox === false){
        /**
         * Search for DNA sequence
         */
        // Check if query is valid DNA sequence
        if (isDNASequence(workingQuery)) {
            // Get a list of indices for all occurences of the search query
            let currentIndex = workingSequence.indexOf(workingQuery);
            let indicesResultsDNA = [];
            while (currentIndex !== -1) {
                indicesResultsDNA.push(currentIndex);
                currentIndex = workingSequence.indexOf(workingQuery, currentIndex + 1);
            };

            // Sort indices list
            indicesResultsDNA.sort(function(a, b) {
                return a - b;
            });
            
            SearchResults.dna = indicesResultsDNA;

            // Iterate over all found indices and highlight the cells
            for (const index of indicesResultsDNA) {
                highlightSpan(
                    targetStrandIndex,
                    index + 1,
                    index + workingQuery.length + 1,
                    highlightClass,
                    highlightColor
                );
            };
        };
    } else {
        /**
         * Search for AA sequence
         */
        // Check if query is valid DNA sequence
        if (isAminoAcidSequence(workingQuery)) {
            // Unify stop codons
            workingQuery = workingQuery.replace("X", "-").replace("*", "-")

            // Get list of translations for the current translation direction
            const translationDirection = (targetStrandIndex === 0) ? "forward": "reverse";
            const dir = (targetStrandIndex === 0) ? 1: -1;
            const listOfTranslationDicts = plasmidDict[currentlyOpenedPlasmid]["translations"][translationDirection];

            // Iterate over the list of translation dicts and search for occurences of the search query
            let indicesResultsAA = [];
            for (let translationDict of listOfTranslationDicts) {
                // Current translation span and sequence
                const translationSpan = translationDict["span"];
                const translationSequence = translationDict["sequence"];

                // Search for all occurences of the search query in the current translation sequence
                // and add the cell indices to the results list
                let index = translationSequence.indexOf(workingQuery);
                while (index !== -1) {
                    if (dir === 1) {
                        console.log("highlightOccurences", dir, translationSpan[0] + index*3)
                        indicesResultsAA.push(translationSpan[0] + index*3);
                    } else {
                        console.log("highlightOccurences", dir, translationSpan[0] - index*3 + 1)
                        indicesResultsAA.push(translationSpan[0] - index*3 + 1);
                    }
                    index = translationSequence.indexOf(workingQuery, index + 1);
                };
            };
            
            // Sort indices list
            indicesResultsAA.sort(function(a, b) {
                return a - b;
            });

            SearchResults.aa = indicesResultsAA;
    
            // Iterate over all cells that contain the search query and highlight them
            let currentQueryLength = workingQuery.length*3;
            for (const index of indicesResultsAA) {
                highlightSpan(
                    2,
                    index,
                    index + dir*currentQueryLength,
                    highlightClass,
                    highlightColor
                );
            };
        };
    };
};


/**
 * Highlight cells in a specified span
 * 
 * @param {number} targetStrandIndex - Index of the target row in the grid structure
 * @param {number} spanStart - Span start index
 * @param {number} spanEnd - Span end index
 * @param {string} highlightClass - Class to add to each cell in the span
 * @returns {void}
 */
function highlightSpan(targetStrandIndex, spanStart, spanEnd, highlightClass, backgroundColor=null, direction="forward") {
    // Reorder indices
    startIndex = Math.min(spanStart, spanEnd);
    endIndex = Math.max(spanStart, spanEnd);

    // Select table element
    let table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
    const currentGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"]
    if (table) {
        // Iterate over cells in span and add the highlightClass to the cells
        for (let j = startIndex; j < endIndex; j++) {
            // Convert sequence index to table coordinates
            const [row, col] = seqIndexToCoords(j, targetStrandIndex, currentGridStructure);
            
            // Select and highlight the cell
            const cell = table.rows[row].cells[col];
            if (highlightClass && highlightClass !== null) {
                cell.classList.add(highlightClass);
            } else {
                cell.style.color = "white";
                cell.style.backgroundColor = backgroundColor;
            };
        };
    };
};


/**
 * Scroll to the nearest search result cell
 */
function scrollToNearestSearchResult() {
    // Select table element
    let table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);

    /**
     * Check if any search result is currently on screen
     * 
     * @param {Array<Object>} cellsList 
     * @returns 
     */
    function isAnySearchResultCellInView(cellsList) {
        // Iterate over cells in list, if it is within the viewport, set that as the
        // active search result and return it
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

    // Get array of every search result cell
    const selectedCells = Array.from(table.getElementsByClassName("cell-search-result"));

    if (selectedCells.length > 0) {
        const firstCellInView = isAnySearchResultCellInView(selectedCells);
        if (firstCellInView === null) {
            // If there are no search result cells currently visible, set the first one as the active one
            highlightSearchResult(selectedCells[0]);
            searchResultCellToTracker(selectedCells[0]);
        } else {
            // If there is a search result cell on screen, set that one as the currently active one 
            highlightSearchResult(firstCellInView);
            searchResultCellToTracker(firstCellInView);
        };
    };
};


/**
 * Clears the custom search input and un-highlights cells
 */
function clearCustomSearchInput() {
    customSearchInput.value = "";
    resetTableCells();
    SearchResults.current = null;
    SearchResults.dna = null;
    SearchResults.aa = null;
    updateCustomSearchTracker();
};


/**
 * Navigate search results.
 * 
 * @param {number} direction - Navigation direction +1, -1
 */
function navigateSearchResults(direction) {
    const aaCheckbox = document.getElementById("custom-search-aa-check").checked;
    const compCheckbox = document.getElementById("custom-search-compstrand-check").checked;
    const workingList = (aaCheckbox === false) ? SearchResults.dna: SearchResults.aa;
    const workingQuery = document.getElementById("custom-search-input").value;

    if (workingList.length > 1) {
        // Convert displayed index to list index
        let resultIndex = SearchResults.current - 1 + direction;
        // Roll over index if necessary
        if (resultIndex === -1) {
            resultIndex = workingList.length - 1;
        } else if (resultIndex === workingList.length) {
            resultIndex = 0;
        };

        // Get sequence index to scroll to and calculate table coords
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
            highlightStartIndex = (compCheckbox === false) ? cellSeqIndex: cellSeqIndex - workingQuery.length*3;
            tableCoords = seqIndexToCoords(highlightStartIndex, tarStrand, currentGridStructure);
        };

        // Find target cell using table coords
        const table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
        const targetCell = table.rows[tableCoords[0]].cells[tableCoords[1]];
    
        // Highlight search result that has targeCell
        highlightSearchResult(targetCell);
        // Convert back to display index
        SearchResults.current = resultIndex + 1;
        updateCustomSearchTracker();
    };
};


/**
 * Highlight specific search result
 * 
 * @param {Object} firstCell 
 */
function highlightSearchResult(firstCell) {
    // Scroll to cell
    firstCell.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
    });

    // Find all currently active search result cells and convert them back to standard
    // search result cells
    const table = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
    const cellsHighlighted = table.getElementsByClassName("cell-search-result-highlight");
    while (cellsHighlighted.length > 0) {
        cellsHighlighted[0].classList.add("cell-search-result");
        cellsHighlighted[0].classList.remove("cell-search-result-highlight");
    };

    // Get current query length
    let currentQueryLength = document.getElementById("custom-search-input").value.length;
    if (document.getElementById("custom-search-aa-check").checked === true) {
        currentQueryLength *= 3;
    };
    
    // TO DO: use highlightSpan instead
    // Starting from firstcell, iterate over its siblings and give them the active search result class
    let currentCell = firstCell;
    for (i = 0; i < currentQueryLength; i++) {
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
 * Update search tracker displayed in the footer
 * 
 * @param {boolean} clearTracker - Flag to hide the tracker
 */
function updateCustomSearchTracker(clearTracker=false) {
    const aaCheckbox = document.getElementById("custom-search-aa-check").checked;
    const workingList = (aaCheckbox === false) ? SearchResults.dna: SearchResults.aa;
    if (workingList !== null) {
        const numberResults = workingList.length;
        if (customSearchInput.value === "" || clearTracker === true || numberResults === 0) {
            document.getElementById("custom-search-counter").innerText = "";
        } else {
            document.getElementById("custom-search-counter").innerText = SearchResults.current + "/" + numberResults;
        };
    } else {
        document.getElementById("custom-search-counter").innerText = "";
    };
};


/**
 * Find which search results corresponds to the specified cell
 * 
 * @param {Object} inputCell 
 */
function searchResultCellToTracker(inputCell) {
    const aaCheckbox = document.getElementById("custom-search-aa-check").checked;
    const workingList = (aaCheckbox === false) ? SearchResults.dna: SearchResults.aa;

    // Convert cell coordinates to sequence index
    let cellRow = inputCell.parentNode.rowIndex;
    if (aaCheckbox === true) {
        cellRow -= 2;
    };
    const cellCol = inputCell.cellIndex;
    const cellSeqIndex = cellRow/plasmidDict[currentlyOpenedPlasmid]["gridStructure"].length*gridWidth + cellCol;

    // Iterate over the list of search results and find the serach result with the nearest sequence index
    // to the index of the inputCell
    let nearestIndex = 0;
    let nearestDifference = Math.abs(cellSeqIndex - workingList[0]);
    for (let i = 1; i < workingList.length; i++) {
        let difference = Math.abs(cellSeqIndex - workingList[i]);
        if (difference < nearestDifference) {
            nearestIndex = i;
            nearestDifference = difference;
        };
    };
    SearchResults.current = nearestIndex + 1;
};