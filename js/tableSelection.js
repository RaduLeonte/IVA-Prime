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
  let initialSelectionStartCell = null;

  /**
   * Selection start.
   */
  sequenceGridTable.addEventListener('mousedown', function (event) {
    if (event.button === 0) { // Check for left click
      // Clear the previous selection
      clearSelection(pNr, true);
      // Record where the selection started
      if (pNr === 1) {
        selectionStartPos = basePosition;
      } else {
        selectionStartPos = basePosition2;
      }

      initialSelectionStartCell = [event.target.closest('tr').rowIndex, event.target.closest('td').cellIndex]
      isSelecting = true;
      
      // Signal selection start
      //console.log("Starting selection at: " + selectionStartPos);
      //console.log(features)
      const targetAnnotation = event.target.closest('td');
      const targetString = targetAnnotation.getAttribute('feature-id');
      let targetSpan = null;
      let found = false;
      for (const entryKey in features) {
          if (entryKey === targetString) {
              found = true;
              targetSpan = features[entryKey]["span"];
              break;
          }
      }
      
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

      if (targetSpan) {
        selectFeatureSpan(targetSpan, pNr);
      }
    }
  });

  /**
   * Removes the selected appearance from all the currently selected cells.
   */
  function clearSelection(pNr, clearingGlobalVars) {
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
    // Reset cell selection
    startCell = null;
    endCell = null;
    if (clearingGlobalVars) {
      selectionStartPos = null;
      selectionEndPos = null;
    }
  }

  /**
   * Update the selection on mouse movement.
   */
  fileContentContainer.addEventListener('mousemove', function (event) {
    if (isSelecting) { // Make sure we're currently selecting
      const cellRect = event.target.getBoundingClientRect();
      const cursorOffset = event.clientX - cellRect.left; // Cursor position inside the cell
      const cellWidth = cellRect.width;
      let closestSide = "right";
      if (cursorOffset < cellWidth / 2) {
        closestSide = "left";
      }

      // Find cell closest to the cursor
      if (pNr === 1) {
        selectionEndPos = basePosition;
        currGridStructure = gridStructure;
      } else {
        selectionEndPos = basePosition2;
        currGridStructure = gridStructure2;
      }
      let closestCell = event.target.closest('td')
      let closestRow = event.target.closest('tr')
      let selectionEndCell = [event.target.closest('tr').rowIndex, event.target.closest('td').cellIndex]
      //console.log("Start Cell: ", initialSelectionStartCell, "End Cell: ", selectionEndCell)
      // Check if the cell exists and if the current position is not the same as the selection start cell
      if (closestCell && closestRow && basePosition !== selectionStartPos && closestCell.id !== "Annotations") {

        // Test
        // Go from whereever the cell upwards till the forward strand row
        const rowAdjustment = currGridStructure.indexOf(closestCell.id)
        //console.log(closestCell.id, closestRow.rowIndex, closestCell.cellIndex, rowAdjustment)
        selectionEndCell[0] -= rowAdjustment;
        let selectionStartCell = initialSelectionStartCell;
        if (closestSide === "left") {
          selectionEndCell[1]--;
        }

        // swap if needed
        //console.log("Before swap:", selectionStartCell, selectionEndCell)
        if (selectionStartCell[0] >= selectionEndCell[0] && selectionStartCell[1] > selectionEndCell[1]) {
          const tempCell = selectionEndCell;
          selectionEndCell = selectionStartCell;
          selectionStartCell = tempCell;
          selectionStartCell[1]++;
        }
        //console.log("After swap:", selectionStartCell, selectionEndCell)

        startRowIndex = selectionStartCell[0];
        startCellIndex = selectionStartCell[1];
        endRowIndex = selectionEndCell[0];
        endCellIndex = selectionEndCell[1];

        // Clear the previous selection
        clearSelection(pNr, false);

        //console.log("Iterating from: " + startRowIndex + ", " + startCellIndex);
        //console.log("To: " + endRowIndex + ", " + endCellIndex);
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
        endCell = closestCell;
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
  /* sequenceGridTable.addEventListener('mouseleave', function () {
    if (isSelecting) {
      startCell = null;
      endCell = null;
      isSelecting = false;
    }
  }); */


  /**
   * Check for clicks outside the tables to clear the selection.
   */
  document.addEventListener('click', function (event) {
    if (!event.target.closest('#sequence-grid') && !event.target.closest('#sequence-grid2')) {
      clearSelection(pNr, true);
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
    if ((event.ctrlKey || event.metaKey) && event.key === 'c' && currSelectedText !== '') {
      event.preventDefault(); // Prevent default copy behavior

      // Create a temporary textarea element to copy text to clipboard
      const tempTextArea = document.createElement('textarea');
      tempTextArea.value = currSelectedText;
      document.body.appendChild(tempTextArea);
      tempTextArea.select();

      try {
        // Execute the copy command
        document.execCommand('copy');
        console.log('Copied to clipboard:', currSelectedText);
      } catch (err) {
        console.error('Unable to copy to clipboard:', err);
      } finally {
        // Remove the temporary textarea element
        document.body.removeChild(tempTextArea);
      }
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


/**
 * Select text from feature span.
 */
function selectFeatureSpan(inputSpan, pNr) {
  // Clear the previous selection
  let currGridStructure = (pNr === 1) ? gridStructure: gridStructure2;
  const sequenceGridTable = (pNr === 1) ? document.getElementById('sequence-grid'): document.getElementById('sequence-grid2');

  const spanList = removeNonNumeric(inputSpan);
  const range = spanList.split("..").map(Number);

  selectionStartPos = range[0];
  selectionEndPos = range[1] + 1;

  const starCellCoords = seqIndexToCoords(range[0], 0, currGridStructure);
  const endCellCoords = seqIndexToCoords(range[1], 0, currGridStructure);

  const startRowIndex = starCellCoords[0];
  const startCellIndex = starCellCoords[1];
  const endRowIndex = endCellCoords[0];
  const endCellIndex = endCellCoords[1];

  //console.log("Iterating from: " + startRowIndex + ", " + startCellIndex);
  //console.log("To: " + endRowIndex + ", " + endCellIndex);
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
};


// Enables selection functionality in the sequence grids
addCellSelection('sequence-grid', 'file-content', 1);
//addCellSelection('sequence-grid2', 'file-content2', 2);