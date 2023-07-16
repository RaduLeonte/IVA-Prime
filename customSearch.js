function initiateSearchFunctionality(pNr) {
    let customSearchInput = null;
    if (pNr === 1) {
        customSearchInput = document.getElementById('custom-search-input'); // Assign the customSearchInput variable
    } else {
        customSearchInput = document.getElementById('custom-search-input2'); // Assign the customSearchInput variable
    }   

    document.addEventListener('keydown', function(event) {
    // Check if Ctrl+F (or Command+F on Mac) is pressed
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault(); // Prevent the default browser search functionality

        customSearchInput.style.display = "block";
        customSearchInput.value = "";
        customSearchInput.focus(); // Set focus to the custom search input field
        customSearchInput.addEventListener('input', function() {
            console.log('Input event triggered');
            searchOccurrences(pNr);
        });
    }
    });

    function resetTableCells(pNr) {
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

      function scrollToNextSelectedCell(pNr) {
        let table = null;
        if (pNr === 1) {
            table = document.getElementById("sequence-grid");
        } else {
            table = document.getElementById("sequence-grid2");
        }
        const selectedCells = Array.from(table.getElementsByClassName("selected-cell-search"));
      
        if (selectedCells.length > 0) {
          const currentIndex = selectedCells.findIndex(cell => {
            const rect = cell.getBoundingClientRect();
            return rect.top >= 0 && rect.bottom <= window.innerHeight;
          });
      
          if (currentIndex > -1) {
            const nextIndex = currentIndex + 1;
            const nextCell = selectedCells[nextIndex];
      
            if (nextCell) {
              nextCell.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
            }
          }
        }
      }
      

    function searchOccurrences(pNr) {
        resetTableCells(pNr);
        const searchQuery = customSearchInput.value;
        let currSequence = null;
        let currGridStructure = null;
        if (pNr === 1) {
            currSequence = sequence;
            currGridStructure = gridStructure;
        } else {
            currSequence = sequence2;
            currGridStructure = gridStructure2;
        }
        if (searchQuery) {
            console.log(searchQuery)
            const indices = [];
            let currentIndex = currSequence.indexOf(searchQuery);

            while (currentIndex !== -1) {
                indices.push(currentIndex);
                currentIndex = currSequence.indexOf(searchQuery, currentIndex + 1);
            }

            console.log(indices);
            let table = null;
            if (pNr === 1) {
                table = document.getElementById("sequence-grid");
            } else {
                table = document.getElementById("sequence-grid2");
            }
            for (const index of indices) {
                for (let i = 0; i < searchQuery.length; i++) {
                    const [row, column] = seqIndexToCoords(index + i, 0, currGridStructure); // Assuming you have a function to convert the index to row and column coordinates
                    //console.log(row, column)
                
                    const cell = table.rows[row].cells[column + 1];
                    cell.classList.add("selected-cell-search");
                }
            }
            scrollToNextSelectedCell(pNr);
        }
    }
}