/**
 * Add search functionality for the sequence grid.
 * 
 * TO DO:
 * - Make it so it also searches for the complement of the search query
 */
function initiateSearchFunctionality(pNr) {
    // Select the search bar element
    let customSearchInput = null;
    if (pNr === 1) {
        customSearchInput = document.getElementById('custom-search-input');
    } else {
        customSearchInput = document.getElementById('custom-search-input2');
    }   

    // Event listener for ctrl F or cmd F
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            let searchEnabled = null;
            if (pNr === 1) {
                searchEnabled = customSearchEnabledFirstPlasmid;
            } else {
                searchEnabled = customSearchEnabledSecondPlasmid;
            }
            
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
                    searchOccurrences(pNr);
                });
                if (pNr === 1) {
                    customSearchEnabledFirstPlasmid = true;
                } else {
                    customSearchEnabledSecondPlasmid = true;
                }
            } else { // Disable
                event.preventDefault();
                resetTableCells(pNr);
                customSearchInput.style.display = "none";
                if (pNr === 1) {
                    customSearchEnabledFirstPlasmid = false;
                } else {
                    customSearchEnabledSecondPlasmid = false;
                }
            }
        }
    });

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
        }
        
        // Find all cells with the "selected-cell-search" class and remove it
        const cells = table.getElementsByClassName("selected-cell-search");
        while (cells.length > 0) {
            cells[0].classList.remove("selected-cell-search");
        }
    }

    /**
     * Scroll to the next selected cell
     */
    function scrollToNextSelectedCell(pNr) {
        // Select table element
        let table = null;
        if (pNr === 1) {
            table = document.getElementById("sequence-grid");
        } else {
            table = document.getElementById("sequence-grid2");
        }

        // Make a list of all selected cells
        const selectedCells = Array.from(table.getElementsByClassName("selected-cell-search"));
    
        // Make sure there are actually selected cells
        if (selectedCells.length > 0) {

            // Find the index of the nearest occurence
            const currentIndex = selectedCells.findIndex(cell => {
                const rect = cell.getBoundingClientRect();
                return rect.top >= 0 && rect.bottom <= window.innerHeight;
            });
    
            // If theres a next result to scroll to, do it
            if (currentIndex > -1) {
                const nextIndex = currentIndex + 1;
                const nextCell = selectedCells[nextIndex];
                
                if (nextCell) {
                    nextCell.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
                }
            }
        }
    }
      

    /**
     * Find all occurences of the search query in the sequence, highligh the cells then scroll to the nearest occurence.
     */
    function searchOccurrences(pNr) {
        // Reset highlighted cells
        resetTableCells(pNr);

        // Get search query from the search bar
        const searchQuery = customSearchInput.value;
        const searchQueryComplement = searchQuery.split('').reverse().join('');;
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
        }

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
                }
                // Get a list of indices for all occurences of the search query
                const indices = [];
                let currentIndex = workingSequence.indexOf(workingQuery);
                while (currentIndex !== -1) {
                    indices.push(currentIndex);
                    currentIndex = workingSequence.indexOf(workingQuery, currentIndex + 1);
                }

                // Select table element
                let table = null;
                if (pNr === 1) {
                    table = document.getElementById("sequence-grid");
                } else {
                    table = document.getElementById("sequence-grid2");
                }
                
                // Iterate over all cells that contain the search query and highlight them
                for (const index of indices) {
                    for (let j = 0; j < workingQuery.length; j++) {
                        // Convert sequence index to table coordinates
                        const [row, column] = seqIndexToCoords(index + j, 0, currGridStructure);
                        // Select and highlight the cell
                        const cell = table.rows[row + i].cells[column + 1];
                        cell.classList.add("selected-cell-search");
                    }
            }
            };

            // Scroll to the nearest occurence of the search query
            scrollToNextSelectedCell(pNr);
        }
    }
}