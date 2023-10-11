/**
 * Enables cell selection for the specified table.
 * 
 * TO DO:
 * - check if copying is disabled in unintended places
 */
function addCellSelection(tableId, containerId, pNr) {
  // Select target table and container
  const sequenceGridTable = document.getElementById(tableId);
  const fileContentContainer = document.getElementById(containerId);

  // Select the current grid structure
  let currGridStructure = null;
  if (pNr === 1) {
    selectionEndPos = basePosition;
    currGridStructure = gridStructure;
  } else {
    selectionEndPos = basePosition2;
    currGridStructure = gridStructure2;
  }

   // Table doesn't exist yet, observe the DOM for changes
  if (!sequenceGridTable) {
    const observer = new MutationObserver(function (mutationsList) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          // Check if the table is added
          const addedNodes = Array.from(mutation.addedNodes);
          const isTableAdded = addedNodes.some((node) => node.id === tableId);

          if (isTableAdded) {
            observer.disconnect(); // Stop observing DOM changes
            addCellSelection(tableId, containerId, pNr); // Call the function again now that the table exists
            break;
          }
        }
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    return;
  }

  // Initialize selection variables
  let isSelecting = false;
  let startCell = null;
  let endCell = null;

  /**
   * Selection start.
   */
  sequenceGridTable.addEventListener('mousedown', function (event) {
    if (event.button === 0) { // Check for left click
      // Clear the previous selection
      clearSelection(pNr);
      // Record where the selection started
      if (pNr === 1) {
        selectionStartPos = basePosition;
      } else {
        selectionStartPos = basePosition2;
      }
      
      // Signal selection start
      console.log("Starting selection at: " + selectionStartPos);
      isSelecting = true;

      // Reset cell selection
      startCell = null;
      endCell = null;

      // Disable text selection while selecting cells
      fileContentContainer.style.userSelect = 'none';
      fileContentContainer.style.MozUserSelect = 'none';
      fileContentContainer.style.webkitUserSelect = 'none';
      fileContentContainer.style.msUserSelect = 'none';
      // Prevent the default left mouse click behavior (e.g., text selection)
      event.preventDefault();
    }
  });

  /**
   * Removes the selected appearance from all the currently selected cells.
   */
  function clearSelection(pNr) {
    // Find all selected cells and iterate over them to remove the selected class
    const selectedCells = document.querySelectorAll('.selected-cell');
    selectedCells.forEach((cell) => {
      cell.classList.remove('selected-cell');
    });
    // Reset selected text variable
    if (pNr === 1) {
      selectedText = "";
    } else {
      selectedText2 = "";
    }
  }

  /**
   * Update the selection on mouse movement.
   */
  sequenceGridTable.addEventListener('mousemove', function (event) {
    if (isSelecting) { // Make sure we're currently selecting
      // Find cell closest to the cursor
      let cell = event.target.closest('td');
      // Check if the cell exists and if the current position is not the same as the selection start cell
      if (cell && basePosition !== selectionStartPos) {
        // Only select on the forward strand
        if (cell.id === "Forward Strand") {
          // Get the indices of the start and end cells
          let startCoords = null;
          let startRowIndex = null;
          let startCellIndex = null;
          let endCoords = null;
          let endRowIndex = null;
          let endCellIndex = null;
          // Convert sequence coords to table coordinates
          if (selectionStartPos < selectionEndPos) {
            startCoords = seqIndexToCoords(selectionStartPos, 0, currGridStructure);
            startRowIndex = startCoords[0];
            startCellIndex = startCoords[1];
            endCoords = seqIndexToCoords(selectionEndPos, 0, currGridStructure);
            endRowIndex = endCoords[0];
            endCellIndex = endCoords[1] - 1;
          } else {
            startCoords = seqIndexToCoords(selectionEndPos, 0, currGridStructure);
            startRowIndex = startCoords[0];
            startCellIndex = startCoords[1];
            endCoords = seqIndexToCoords(selectionStartPos, 0, currGridStructure);
            endRowIndex = endCoords[0];
            endCellIndex = endCoords[1] - 1;
          }

          // Clear the previous selection
          clearSelection(pNr);

          console.log("Iterating from: " + startRowIndex + ", " + startCellIndex);
          console.log("To: " + endRowIndex + ", " + endCellIndex);
          // Iterate over cells between start and end cells and select them
          for (let i = startRowIndex; i <= endRowIndex; i++) {
            // Current row
            const row = sequenceGridTable.rows[i];
            const start = (i === startRowIndex) ? startCellIndex : 0;
            const end = (i === endRowIndex) ? endCellIndex : row.cells.length - 1;
            // Iterate over all cells in the row
            for (let j = start; j <= end; j++) {
              const selectedCell = row.cells[j];
              if (selectedCell.id === "Forward Strand" && selectedCell.innerText.trim() !== "") {
                selectedCell.classList.add('selected-cell');
              }
            }
          }

          // Update the end cell
          endCell = cell;
        } else {
          // Clear the selection if the cell doesn't have the same ID
          //clearSelection(pNr);
        }
      }
    }
  });


  /**
   * Once left click is lifted, end the selection.
   */
  sequenceGridTable.addEventListener('mouseup', function (event) {
    if (event.button === 0 && isSelecting) { // Check if it was left click that was lifted and we are currently selecting
      // Signat that we have stopped selecting
      isSelecting = false;

      // Enable text selection after selecting cells
      fileContentContainer.style.userSelect = '';
      fileContentContainer.style.MozUserSelect = '';
      fileContentContainer.style.webkitUserSelect = '';
      fileContentContainer.style.msUserSelect = '';

      // Extract text content from selected cells
      if (pNr === 1) {
        selectedText = getSelectedText();
        console.log("Selected text: ", selectedText, selectionStartPos, selectionEndPos);
      } else {
        selectedText2 = getSelectedText();
        console.log("Selected text: ", selectedText2, selectionStartPos, selectionEndPos);
      }
    }
  });


  /**
   * Finds all selected cells and concatenates their inner text into a string.
   */
  function getSelectedText() {
    const selectedCells = document.querySelectorAll('.selected-cell');
    let text = '';
    selectedCells.forEach((cell) => {
      text += cell.textContent.trim();
    });
    return text;
  }


  /**
   * Clear startCell and endCell references when leaving the table while selecting and signal that we are not selecting.
   */
  sequenceGridTable.addEventListener('mouseleave', function () {
    if (isSelecting) {
      startCell = null;
      endCell = null;
      isSelecting = false;
    }
  });


  /**
   * Check for clicks outside the tables to clear the selection.
   */
  document.addEventListener('click', function (event) {
    if (!event.target.closest('#sequence-grid') && !event.target.closest('#sequence-grid2')) {
      clearSelection(pNr);
      startCell = null;
      endCell = null;
      isSelecting = false;
    }
  });


  /**
   * Listens for CTRl+C and copies the currently selected text into the clipboard.
   */
  document.addEventListener('keydown', function (event) {
    // Select selected text for the specified plasmid.
    let currSelectedText = "";
    if (pNr === 1) {
      currSelectedText = selectedText;
    } else {
      currSelectedText = selectedText2;
    }

    // Check if we've actually clicked ctrl+c and we have text selected
    if (event.ctrlKey && event.key === 'c' && currSelectedText !== '') {
      event.preventDefault(); // Prevent default copy behaviour
      copyToClipboard(currSelectedText);
    }
  });


  /**
   * Copies the input text into the clipboard.
   */
  function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};


// Enables selection functionality in the sequence grids
addCellSelection('sequence-grid', 'file-content', 1);
//addCellSelection('sequence-grid2', 'file-content2', 2);