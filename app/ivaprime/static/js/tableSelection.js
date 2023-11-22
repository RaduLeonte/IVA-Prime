/**
 * Enables cell selection for the specified table.
 * 
 * TO DO:
 * - check if copying is disabled in unintended places
 * - enable selection on the second plasmid at some point
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
  };

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
          };
        };
      };
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    return;
  };

  // Initialize selection variables
  let isSelecting = false;


  /**
   * Selection cursor hover
   */
  sequenceGridTable.addEventListener('mousemove', function (event) {
    const currBasePosition = (pNr === 1) ? basePosition: basePosition2;
    if ((currBasePosition === selectionStartPos || currBasePosition === selectionEndPos) && selectionEndPos) {
        sequenceGridTable.style.cursor = 'ew-resize';
        hoveringOverSelectionCursor = (currBasePosition === selectionStartPos) ? "start": "end";
    } else {
        sequenceGridTable.style.cursor = 'default';
        hoveringOverSelectionCursor = null;
    };
  });

  /**
   * Selection start.
   */
  sequenceGridTable.addEventListener('mousedown', function (event) {
    console.log("Table selection mouse down")
    if (event.button === 0) { // Check for left click
      isSelecting = true;
      if (!hoveringOverSelectionCursor) {
        initialSelectionStartCell = [event.target.closest('tr').rowIndex, event.target.closest('td').cellIndex]
        
        // Signal selection start
        const targetCell = event.target.closest('td');
        const targetRow = targetCell.parentElement
        let targetSpan = null;
        console.log("Mousedown", targetCell.id )
        if (targetCell.id === "Annotations") {
          const targetString = targetCell.getAttribute('feature-id');
          for (const entryKey in features) {
              if (entryKey === targetString) {
                  targetSpan = features[entryKey]["span"];
                  break;
              };
          };
        } else if (targetCell.id === "Amino Acids" && targetCell.innerText !== "") {
          const currGridStructure = (pNr === 1) ? gridStructure: gridStructure2;
          const seqIndex = (gridWidth * Math.floor(targetRow.rowIndex/currGridStructure.length)) + targetCell.cellIndex + 1;
          targetSpan = (seqIndex - 1)+ ".." + (seqIndex + 1);
        } else {
          // Clear the previous selection
          if (!isShiftKeyPressed()) {
            clearSelection(pNr, true);
            // Record where the selection started
            if (pNr === 1) {
              selectionStartPos = basePosition;
            } else {
              selectionStartPos = basePosition2;
            };
          } else {
            if (pNr === 1) {
              selectionEndPos = basePosition;
            } else {
              selectionEndPos = basePosition2;
            };
          };
          if (selectionEndPos) {
            targetSpan = (selectionStartPos < selectionEndPos) ? (selectionStartPos)+ ".." + (selectionEndPos - 1): "complement(" + (selectionEndPos)+ ".." + (selectionStartPos - 1) + ")";
          } else {
            setSelectionCursors(pNr, selectionStartPos, null);
          };
        };

        if (isShiftKeyPressed()) {
          const targetSpanNumbers = removeNonNumeric(targetSpan).split("..").map(str => parseInt(str));
          const currSelectionStartPos = Math.min(selectionStartPos, selectionEndPos);
          const currSelectionEndPos = Math.max(selectionStartPos, selectionEndPos);
          console.log("Shift key", currSelectionStartPos, currSelectionEndPos, targetSpan, targetSpanNumbers)
          console.log(currSelectionStartPos !== Math.min(targetSpanNumbers[0], targetSpanNumbers[1] + 1))
          console.log(currSelectionEndPos !== Math.max(targetSpanNumbers[0], targetSpanNumbers[1] + 1))
          if (currSelectionStartPos !== Math.min(targetSpanNumbers[0], targetSpanNumbers[1] + 1) || currSelectionEndPos !== Math.max(targetSpanNumbers[0], targetSpanNumbers[1] + 1)) {
                targetSpan = Math.min(currSelectionStartPos, targetSpanNumbers[0]) + ".." + Math.max(currSelectionEndPos - 1, targetSpanNumbers[1]);
                console.log(targetSpan)
          };
        };

        
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
          selectBySpan(targetSpan, pNr);
        };
      };
    };
  });


  /**
   * Update the selection on mouse movement.
   */
  fileContentContainer.addEventListener('mousemove', function (event) {
    let closestCell = event.target.closest('td')
    if (isSelecting) { // Make sure we're currently selecting
      if (!hoveringOverSelectionCursor) {
        selectionEndPos = (pNr === 1) ? basePosition: basePosition2;
      } else {
        if (hoveringOverSelectionCursor === "start") {
          selectionStartPos = (pNr === 1) ? basePosition: basePosition2;
        } else {
          selectionEndPos = (pNr === 1) ? basePosition: basePosition2;
        };
      };
      currGridStructure = (pNr === 1) ? gridStructure: gridStructure2;
      
      // Check if the cell exists and if the current position is not the same as the selection start cell
      if (closestCell) {
        if (selectionStartPos === selectionEndPos) {
          clearSelection(pNr, false);
          setSelectionCursors(pNr, selectionStartPos, null);
        } else {
          let startRowIndex = null;
          let startCellIndex = null;
          let endRowIndex = null;
          let endCellIndex = null;
          if (selectionStartPos < selectionEndPos) {
            const tableCoordsStartCell = seqIndexToCoords(selectionStartPos, 0, currGridStructure);
            startRowIndex = tableCoordsStartCell[0];
            startCellIndex = tableCoordsStartCell[1];
            const tableCoordsEndCell = seqIndexToCoords(selectionEndPos - 1, 0, currGridStructure);
            endRowIndex = tableCoordsEndCell[0];
            endCellIndex = tableCoordsEndCell[1];
          } else {
            const tableCoordsStartCell = seqIndexToCoords(selectionEndPos, 0, currGridStructure);
            startRowIndex = tableCoordsStartCell[0];
            startCellIndex = tableCoordsStartCell[1];
            const tableCoordsEndCell = seqIndexToCoords(selectionStartPos - 1, 0, currGridStructure);
            endRowIndex = tableCoordsEndCell[0];
            endCellIndex = tableCoordsEndCell[1];
          };
          
          // Clear the previous selection
          clearSelection(pNr, false);
          setSelectionCursors(pNr, selectionStartPos, selectionEndPos);

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
              };
            };
          };

          // Update the end cell
          endCell = closestCell;
        };
      };
    };
  });


  /**
   * Once left click is lifted, end the selection.
   */
  sequenceGridTable.addEventListener('mouseup', function (event) {
    if (event.button === 0 && isSelecting) { // Check if it was left click that was lifted and we are currently selecting
      // Enable text selection after selecting cells
      fileContentContainer.style.userSelect = '';
      fileContentContainer.style.MozUserSelect = '';
      fileContentContainer.style.webkitUserSelect = '';
      fileContentContainer.style.msUserSelect = '';

      // Extract text content from selected cells
      if (pNr === 1) {
        selectedText = getSelectedText(pNr);
        console.log("Selected text: ", selectedText, selectionStartPos, selectionEndPos);
      } else {
        selectedText2 = getSelectedText(pNr);
        console.log("Selected text: ", selectedText2, selectionStartPos, selectionEndPos);
      };
    };
    isSelecting = false;
  });


  /**
   * Check for clicks outside the tables to clear the selection.
   */
  document.addEventListener('click', function (event) {
    console.log("Table selection mouse click")
    if (!event.target.closest('#sequence-grid') && !event.target.closest('#sequence-grid2') && !event.target.closest('.popup-window')) {
      clearSelection(pNr, true);
      clearSelectionCursors(pNr);
      startCell = null;
      endCell = null;
      isSelecting = false;
    };
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
    };
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
      };
    };
  });
};


/**
   * Finds all selected cells and concatenates their inner text into a string.
   */
function getSelectedText(pNr) {
  const tableID = (pNr === 1) ? "sequence-grid": "sequence-grid2";
  const selectedCells = document.getElementById(tableID).querySelectorAll('.selected-cell');
  let text = '';
  selectedCells.forEach((cell) => {
    text += cell.textContent.trim();
  });
  return text;
};


/**
* Removes the selected appearance from all the currently selected cells.
*/
function clearSelection(pNr, clearingGlobalVars) {
  console.log("CLEARING SELECTION")
  clearSelectionCursors(pNr);
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
  };
  // Reset cell selection
  startCell = null;
  endCell = null;
  if (clearingGlobalVars) {
    selectionStartPos = null;
    selectionEndPos = null;
  };
};


/**
 * Select text from feature span.
 */
function selectBySpan(inputSpan, pNr) {
  let currGridStructure = (pNr === 1) ? gridStructure: gridStructure2;
  const sequenceGridTable = (pNr === 1) ? document.getElementById('sequence-grid'): document.getElementById('sequence-grid2');

  const spanList = removeNonNumeric(inputSpan);
  const range = spanList.split("..").map(Number);

  if (!inputSpan.includes("complement")) {
    selectionStartPos = range[0];
    selectionEndPos = range[1] + 1;
  } else {
    selectionEndPos = range[0];
    selectionStartPos = range[1] + 1;
  };

  clearSelection(pNr, false);
  setSelectionCursors(pNr, selectionStartPos, selectionEndPos);

  const starCellCoords = seqIndexToCoords(range[0], 0, currGridStructure);
  const endCellCoords = seqIndexToCoords(range[1], 0, currGridStructure);

  const startRowIndex = starCellCoords[0];
  const startCellIndex = starCellCoords[1];
  const endRowIndex = endCellCoords[0];
  const endCellIndex = endCellCoords[1];


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
      };
    };
  };

  if (pNr === 1) {
    selectedText = getSelectedText(pNr);
    console.log("Selected text: ", selectedText, selectionStartPos, selectionEndPos);
  } else {
    selectedText2 = getSelectedText(pNr);
    console.log("Selected text: ", selectedText2, selectionStartPos, selectionEndPos);
  };
};


/**
 *  Set the position of the selection cursor
 */
function setSelectionCursors(pNr, cursorStartPos, cursorEndPos) {
  if (cursorEndPos) {
    const tempStartPos = cursorStartPos;
    cursorStartPos = (cursorStartPos < cursorEndPos) ? cursorStartPos : cursorEndPos;
    cursorEndPos = (tempStartPos < cursorEndPos) ? cursorEndPos : tempStartPos;
  };
  console.log("setSelectionCursors", cursorStartPos, cursorEndPos)
  clearSelectionCursors(pNr);
  const currGridStructure = (pNr === 1) ? gridStructure: gridStructure2;
  const tableID = (pNr === 1) ? "sequence-grid": "sequence-grid2";
  const tableCoordsStart = seqIndexToCoords(cursorStartPos, 0, currGridStructure);

  const targetCell1 = document.getElementById(tableID).rows[tableCoordsStart[0]].cells[tableCoordsStart[1]];
  targetCell1.classList.add("selection-cursor-cell-left");
  const targetCell2 = document.getElementById(tableID).rows[tableCoordsStart[0] + 1].cells[tableCoordsStart[1]];
  targetCell2.classList.add("selection-cursor-cell-left");

  if (cursorEndPos) {
    const tableCoordsEnd = seqIndexToCoords(cursorEndPos - 1, 0, currGridStructure);
    console.log("tableCoordsEnd", tableCoordsEnd)
    const targetCell3 = document.getElementById(tableID).rows[tableCoordsEnd[0]].cells[tableCoordsEnd[1]];
    targetCell3.classList.add("selection-cursor-cell-right");
    const targetCell4 = document.getElementById(tableID).rows[tableCoordsEnd[0] + 1].cells[tableCoordsEnd[1]];
    targetCell4.classList.add("selection-cursor-cell-right");
  }
};


/**
 * Remove the selection cursor
 */
function clearSelectionCursors(pNr) {
  const tableID = (pNr === 1) ? "sequence-grid": "sequence-grid2";
  const cellsLeft = document.getElementById(tableID).querySelectorAll('.selection-cursor-cell-left');
  cellsLeft.forEach(cell => {
      cell.classList.remove('selection-cursor-cell-left');
  });
  const cellsRight = document.getElementById(tableID).querySelectorAll('.selection-cursor-cell-right');
  cellsRight.forEach(cell => {
      cell.classList.remove('selection-cursor-cell-right');
  });
};


/**
 * Check if shiftkey is pressed
 */
function isShiftKeyPressed() {
  return window.event ? !!window.event.shiftKey : false;
};


// Enables selection functionality in the sequence grids
addCellSelection('sequence-grid', 'file-content', 1);
//addCellSelection('sequence-grid2', 'file-content2', 2);
