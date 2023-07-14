function initiateSearchFunctionality() {
    let customSearchInput = document.getElementById('custom-search-input'); // Assign the customSearchInput variable

    document.addEventListener('keydown', function(event) {
    // Check if Ctrl+F (or Command+F on Mac) is pressed
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault(); // Prevent the default browser search functionality

        customSearchInput.style.display = "block";
        customSearchInput.focus(); // Set focus to the custom search input field
        customSearchInput.addEventListener('input', function() {
            console.log('Input event triggered');
            searchOccurrences();
        });
    }
    });

    function resetTableCells() {
        const table = document.getElementById("sequence-grid");
      
        // Find all cells with the "selected-cell-search" class and remove it
        const cells = table.getElementsByClassName("selected-cell-search");
        while (cells.length > 0) {
          cells[0].classList.remove("selected-cell-search");
        }
      }

    function scrollToFirstSelectedCell() {
        const table = document.getElementById("sequence-grid");
        const selectedCell = table.querySelector(".selected-cell-search");
      
        if (selectedCell) {
          selectedCell.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
      }

    function searchOccurrences() {
        resetTableCells();
        const searchQuery = customSearchInput.value;
        if (searchQuery) {
            console.log(searchQuery)
            const indices = [];
            let currentIndex = sequence.indexOf(searchQuery);

            while (currentIndex !== -1) {
                indices.push(currentIndex);
                currentIndex = sequence.indexOf(searchQuery, currentIndex + 1);
            }

            console.log(indices);
            const table = document.getElementById("sequence-grid");
            for (const index of indices) {
                for (let i = 0; i < searchQuery.length; i++) {
                    const [row, column] = seqIndexToCoords(index + i, 0, gridStructure); // Assuming you have a function to convert the index to row and column coordinates
                    //console.log(row, column)
                
                    const cell = table.rows[row].cells[column + 1];
                    cell.classList.add("selected-cell-search");
                }
            }
            scrollToFirstSelectedCell();
        }
    }
}