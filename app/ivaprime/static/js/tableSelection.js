/**
 * Enables cell selection for the specified table.
 * 
 * TO DO:
 * - check if copying is disabled in unintended places
 * - enable selection on the second plasmid at some point
 */
function addCellSelection(sequenceGridTable, plasmidIndex) {
  // Select target table and container
  const fileContentContainer = document.getElementById("file-content");

  // Select the current grid structure
  let currGridStructure = plasmidDict[plasmidIndex]["gridStructure"];
  selectionEndPos = plasmidDict[plasmidIndex]["selectionEndPos"];

  // Initialize selection variables
  let isSelecting = false;


  /**
   * Selection cursor hover
   */
  sequenceGridTable.addEventListener('mousemove', function () {
    const currBasePosition = basePosition;
    if (!isSelecting) {
      if ((currBasePosition === plasmidDict[plasmidIndex]["selectionStartPos"] || currBasePosition === plasmidDict[plasmidIndex]["selectionEndPos"]) && plasmidDict[plasmidIndex]["selectionEndPos"]) {
          sequenceGridTable.style.cursor = 'ew-resize';
          hoveringOverSelectionCursor = (currBasePosition === plasmidDict[plasmidIndex]["selectionStartPos"]) ? "start": "end";
          console.log("hoveringOverSelectionCursor", hoveringOverSelectionCursor, plasmidDict[plasmidIndex]["selectionStartPos"] , plasmidDict[plasmidIndex]["selectionEndPos"])
      } else {
          sequenceGridTable.style.cursor = 'default';
          hoveringOverSelectionCursor = null;
      };
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
          for (const entryKey in plasmidDict[plasmidIndex]["fileFeatures"]) {
              if (entryKey === targetString) {
                  targetSpan = plasmidDict[plasmidIndex]["fileFeatures"][entryKey]["span"];
                  break;
              };
          };
        } else if (targetCell.id === "Amino Acids" && targetCell.innerText !== "") {
          const currGridStructure = plasmidDict[plasmidIndex]["gridStructure"];
          const seqIndex = (gridWidth * Math.floor(targetRow.rowIndex/currGridStructure.length)) + targetCell.cellIndex + 1;
          targetSpan = (seqIndex - 1)+ ".." + (seqIndex + 1);
        } else {
          // Clear the previous selection
          if (!isShiftKeyPressed()) {
            clearSelection(plasmidIndex, true);
            plasmidDict[plasmidIndex]["selectionStartPos"] = basePosition;
            console.log("Shift key NOT pressed", plasmidDict[plasmidIndex]["selectionStartPos"], plasmidDict[plasmidIndex]["selectionEndPos"])
          } else {
            plasmidDict[plasmidIndex]["selectionEndPos"] = basePosition;
            console.log("Shift key pressed", plasmidDict[plasmidIndex]["selectionStartPos"], plasmidDict[plasmidIndex]["selectionEndPos"])

          };

          if (plasmidDict[plasmidIndex]["selectionEndPos"]) {
            targetSpan = (plasmidDict[plasmidIndex]["selectionStartPos"] < plasmidDict[plasmidIndex]["selectionEndPos"]) ? (plasmidDict[plasmidIndex]["selectionStartPos"])+ ".." + (plasmidDict[plasmidIndex]["selectionEndPos"] - 1): "complement(" + (plasmidDict[plasmidIndex]["selectionEndPos"])+ ".." + (plasmidDict[plasmidIndex]["selectionStartPos"] - 1) + ")";
          } else {
            setSelectionCursors(plasmidIndex, plasmidDict[plasmidIndex]["selectionStartPos"], null);
          };
        };

        if (isShiftKeyPressed()) {
          const targetSpanNumbers = removeNonNumeric(targetSpan).split("..").map(str => parseInt(str));
          const currSelectionStartPos = plasmidDict[plasmidIndex]["selectionStartPos"]
          const currSelectionEndPos = plasmidDict[plasmidIndex]["selectionEndPos"];
          console.log("Shift key", currSelectionStartPos, currSelectionEndPos, targetSpan, targetSpanNumbers)
          console.log(currSelectionStartPos !== Math.min(targetSpanNumbers[0], targetSpanNumbers[1] + 1))
          console.log(currSelectionEndPos !== Math.max(targetSpanNumbers[0], targetSpanNumbers[1] + 1))
          if (currSelectionStartPos !== Math.min(targetSpanNumbers[0], targetSpanNumbers[1] + 1) || currSelectionEndPos !== Math.max(targetSpanNumbers[0], targetSpanNumbers[1] + 1)) {
                targetSpan = Math.min(currSelectionStartPos, targetSpanNumbers[0]) + ".." + Math.max(currSelectionEndPos - 1, targetSpanNumbers[1]);
          };
        };

        
        isSelecting = true;

        // Disable text selection while selecting cells
        fileContentContainer.style.userSelect = 'none';
        fileContentContainer.style.MozUserSelect = 'none';
        fileContentContainer.style.webkitUserSelect = 'none';
        fileContentContainer.style.msUserSelect = 'none';
        // Prevent the default left mouse click behavior (e.g., text selection)
        event.preventDefault();

        if (targetSpan) {
          selectBySpan(targetSpan);
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
        console.log("NONE")
        plasmidDict[plasmidIndex]["selectionEndPos"] = basePosition;
      } else {
        if (hoveringOverSelectionCursor === "start") {
          console.log("START")
          plasmidDict[plasmidIndex]["selectionStartPos"] = basePosition;
        } else {
          console.log("END")
          plasmidDict[plasmidIndex]["selectionEndPos"] = basePosition;
        };
      };
      
      // Check if the cell exists and if the current position is not the same as the selection start cell
      if (closestCell) {
        if (plasmidDict[plasmidIndex]["selectionStartPos"] === plasmidDict[plasmidIndex]["selectionEndPos"]) {
          clearSelection(plasmidIndex, false);
          setSelectionCursors(plasmidIndex, plasmidDict[plasmidIndex]["selectionStartPos"], null);
        } else {
          let startRowIndex = null;
          let startCellIndex = null;
          let endRowIndex = null;
          let endCellIndex = null;
          if (plasmidDict[plasmidIndex]["selectionStartPos"] < plasmidDict[plasmidIndex]["selectionEndPos"]) {
            console.log("TEST1")
            const tableCoordsStartCell = seqIndexToCoords(plasmidDict[plasmidIndex]["selectionStartPos"], 0, currGridStructure);
            startRowIndex = tableCoordsStartCell[0];
            startCellIndex = tableCoordsStartCell[1];

            const tableCoordsEndCell = seqIndexToCoords(plasmidDict[plasmidIndex]["selectionEndPos"] - 1, 0, currGridStructure);
            endRowIndex = tableCoordsEndCell[0];
            endCellIndex = tableCoordsEndCell[1];

            clearSelection(plasmidIndex, false);
            setSelectionCursors(plasmidIndex, plasmidDict[plasmidIndex]["selectionStartPos"], plasmidDict[plasmidIndex]["selectionEndPos"]);
          } else {
            console.log("TEST2")
            const tableCoordsStartCell = seqIndexToCoords(plasmidDict[plasmidIndex]["selectionEndPos"], 0, currGridStructure);
            startRowIndex = tableCoordsStartCell[0];
            startCellIndex = tableCoordsStartCell[1];

            const tableCoordsEndCell = seqIndexToCoords(plasmidDict[plasmidIndex]["selectionStartPos"] - 1, 0, currGridStructure);
            endRowIndex = tableCoordsEndCell[0];
            endCellIndex = tableCoordsEndCell[1];

            clearSelection(plasmidIndex, false);
            setSelectionCursors(plasmidIndex, plasmidDict[plasmidIndex]["selectionEndPos"], plasmidDict[plasmidIndex]["selectionStartPos"]);
          };

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
      plasmidDict[plasmidIndex]["selectedText"] = getSelectedText(plasmidIndex);
      console.log("Selected text: ", plasmidDict[plasmidIndex]["selectedText"], plasmidDict[plasmidIndex]["selectionStartPos"], plasmidDict[plasmidIndex]["selectionEndPos"]);
    };
    isSelecting = false;
  });


  /**
   * Check for clicks outside the tables to clear the selection.
   */
  document.addEventListener('click', function (event) {
    //console.log("Table selection mouse click", event.target)
    if (!event.target.closest('#sequence-grid-' + currentlyOpenedPlasmid) && !event.target.closest('.popup-window') && event.target.tagName !== "A") {
      clearSelection(plasmidIndex, true);
      clearSelectionCursors(plasmidIndex);
      isSelecting = false;
    };
  });


  /**
   * Listens for CTRl+C and copies the currently selected text into the clipboard.
   */
  document.addEventListener('keydown', function (event) {
    // Check if we've actually clicked ctrl+c and we have text selected
    if ((event.ctrlKey || event.metaKey) && event.key === 'c' && plasmidDict[plasmidIndex]["selectedText"] !== '') {
      event.preventDefault(); // Prevent default copy behavior
      copySelectionToClipboard(plasmidIndex);
    };
  });
};


/**
   * Copy selection to cliboard.
   */
function copySelectionToClipboard(plasmidIndex, special = null) {
  let currSelectedText = plasmidDict[plasmidIndex]["selectedText"];
  if (special === "complement") {
    currSelectedText = getComplementaryStrand(currSelectedText);
  } else if (special === "revcomplement") {
    currSelectedText = getComplementaryStrand(currSelectedText).split("").reverse().join("");
  };
  
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


/**
   * Finds all selected cells and concatenates their inner text into a string.
   */
function getSelectedText(plasmidIndex) {
  const selectedCells = document.getElementById("sequence-grid-" + plasmidIndex).querySelectorAll('.selected-cell');
  let text = '';
  selectedCells.forEach((cell) => {
    text += cell.textContent.trim();
  });
  return text;
};


/**
* Removes the selected appearance from all the currently selected cells.
*/
function clearSelection(plasmidIndex, clearingGlobalVars) {
  console.log("CLEARING SELECTION")
  clearSelectionCursors(plasmidIndex);
  // Find all selected cells and iterate over them to remove the selected class
  const selectedCells = document.getElementById("sequence-grid-" + plasmidIndex).querySelectorAll('.selected-cell');
  selectedCells.forEach((cell) => {
    cell.classList.remove('selected-cell');
  });
  // Reset selected text variable
  plasmidDict[plasmidIndex]["selectedText"] = "";
  // Reset cell selection
  plasmidDict[plasmidIndex]["selectedText"] = null;
  plasmidDict[plasmidIndex]["selectedText"] = null;
  if (clearingGlobalVars) {
    plasmidDict[plasmidIndex]["selectionStartPos"] = null;
    plasmidDict[plasmidIndex]["selectionEndPos"] = null;
  };
};


/**
 * Select text from feature span.
 */
function selectBySpan(inputSpan) {
  let currGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"];
  const sequenceGridTable = document.getElementById('sequence-grid-' + currentlyOpenedPlasmid);

  const spanList = removeNonNumeric(inputSpan);
  const range = spanList.split("..").map(Number);

  if (!inputSpan.includes("complement")) {
    plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] = range[0];
    plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"] = range[1] + 1;
  } else {
    plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"] = range[0];
    plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] = range[1] + 1;
  };

  clearSelection(currentlyOpenedPlasmid, false);
  setSelectionCursors(currentlyOpenedPlasmid, plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]);

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

  plasmidDict[currentlyOpenedPlasmid]["selectedText"] = getSelectedText(currentlyOpenedPlasmid);
};


/**
 *  Set the position of the selection cursor
 */
function setSelectionCursors(plasmidIndex, cursorStartPos, cursorEndPos) {
  console.log(plasmidIndex, plasmidDict[plasmidIndex]["selectionStartPos"], plasmidDict[plasmidIndex]["selectionEndPos"])

  console.log("setSelectionCursors", cursorStartPos, cursorEndPos)
  clearSelectionCursors(plasmidIndex);
  const currGridStructure = plasmidDict[plasmidIndex]["gridStructure"];
  const tableID = "sequence-grid-" + plasmidIndex;
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
  };
};


/**
 * Remove the selection cursor
 */
function clearSelectionCursors(plasmidIndex) {
  console.log("clearSelectionCursors", plasmidIndex)
  const cellsLeft = document.getElementById("sequence-grid-" + plasmidIndex).querySelectorAll('.selection-cursor-cell-left');
  if (cellsLeft.length !== 0) {
    cellsLeft.forEach(cell => {
        cell.classList.remove('selection-cursor-cell-left');
    });
  };
  const cellsRight = document.getElementById("sequence-grid-" + plasmidIndex).querySelectorAll('.selection-cursor-cell-right');
  if (cellsRight.length !== 0) {
    cellsRight.forEach(cell => {
      cell.classList.remove('selection-cursor-cell-right');
    });
  };
};


/**
 * Check if shiftkey is pressed
 */
function isShiftKeyPressed() {
  return window.event ? !!window.event.shiftKey : false;
};
