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
  selectionEndPos = plasmidDict[plasmidIndex]["selectionEndPos"];

  // Initialize selection variables
  let isSelecting = false;


  /**
   * Selection cursor hover
   */
  sequenceGridTable.addEventListener('mousemove', function () {
    const currBasePosition = basePosition;
    if (!isSelecting) {
      if ((currBasePosition === plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] || currBasePosition === plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]) && plasmidDict[plasmidIndex]["selectionEndPos"]) {
          sequenceGridTable.style.cursor = 'ew-resize';
          hoveringOverSelectionCursor = (currBasePosition === plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"]) ? "start": "end";
          console.log("hoveringOverSelectionCursor", hoveringOverSelectionCursor, plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] , plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"])
      } else {
          sequenceGridTable.style.cursor = 'auto';
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
        console.log("Mousedown", targetCell.id, targetCell)
        if (targetCell.id === "Annotations") {
          const targetString = targetCell.getAttribute('feature-id');
          console.log("Mousedown", targetString, Object.keys(plasmidDict[currentlyOpenedPlasmid]["fileFeatures"]))
          for (const entryKey in plasmidDict[currentlyOpenedPlasmid]["fileFeatures"]) {
              if (entryKey === targetString) {
                  targetSpan = plasmidDict[currentlyOpenedPlasmid]["fileFeatures"][entryKey]["span"];
                  console.log("Mousedown", targetString, entryKey, targetSpan)
                  break;
              };
          };
        } else if (targetCell.id === "Amino Acids" && targetCell.innerText !== "") {
          const currGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"];
          const seqIndex = (gridWidth * Math.floor(targetRow.rowIndex/currGridStructure.length)) + targetCell.cellIndex + 1;
          targetSpan = (seqIndex - 1)+ ".." + (seqIndex + 1);
        } else {
          // Clear the previous selection
          if (!isShiftKeyPressed()) {
            clearSelection(currentlyOpenedPlasmid, true);
            plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] = basePosition;
            console.log("Shift key NOT pressed", plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"])
          } else {
            plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"] = basePosition;
            console.log("Shift key pressed", plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"])

          };

          if (plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]) {
            targetSpan = (plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] < plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]) ? (plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"])+ ".." + (plasmidDict[plasmidIndex]["selectionEndPos"] - 1): "complement(" + (plasmidDict[plasmidIndex]["selectionEndPos"])+ ".." + (plasmidDict[plasmidIndex]["selectionStartPos"] - 1) + ")";
          } else {
            setSelectionCursors(currentlyOpenedPlasmid, plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], null);
          };
        };

        if (isShiftKeyPressed()) {
          const targetSpanNumbers = removeNonNumeric(targetSpan).split("..").map(str => parseInt(str));
          const currSelectionStartPos = plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"]
          const currSelectionEndPos = plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"];
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
  sequenceGridTable.addEventListener('mousemove', function (event) {
    let closestCell = event.target.closest('td')
    if (isSelecting) { // Make sure we're currently selecting
      if (!hoveringOverSelectionCursor) {
        console.log("NONE")
        plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"] = basePosition;
      } else {
        if (hoveringOverSelectionCursor === "start") {
          console.log("START")
          plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] = basePosition;
        } else {
          console.log("END")
          plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"] = basePosition;
        };
      };
      
      // Check if the cell exists and if the current position is not the same as the selection start cell
      if (closestCell) {
        if (plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] === plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]) {
          clearSelection(currentlyOpenedPlasmid, false);
          setSelectionCursors(currentlyOpenedPlasmid, plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], null);
        } else {
          let startRowIndex = null;
          let startCellIndex = null;
          let endRowIndex = null;
          let endCellIndex = null;

          let currGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"]

          if (plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] < plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]) {
            const tableCoordsStartCell = seqIndexToCoords(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], 0, currGridStructure);
            startRowIndex = tableCoordsStartCell[0];
            startCellIndex = tableCoordsStartCell[1];

            const tableCoordsEndCell = seqIndexToCoords(plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"] - 1, 0, currGridStructure);
            endRowIndex = tableCoordsEndCell[0];
            endCellIndex = tableCoordsEndCell[1];

            clearSelection(currentlyOpenedPlasmid, false);
            setSelectionCursors(currentlyOpenedPlasmid, plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]);
          } else {
            const tableCoordsStartCell = seqIndexToCoords(plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"], 0, currGridStructure);
            startRowIndex = tableCoordsStartCell[0];
            startCellIndex = tableCoordsStartCell[1];

            const tableCoordsEndCell = seqIndexToCoords(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] - 1, 0, currGridStructure);
            endRowIndex = tableCoordsEndCell[0];
            endCellIndex = tableCoordsEndCell[1];

            clearSelection(currentlyOpenedPlasmid, false);
            setSelectionCursors(currentlyOpenedPlasmid, plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"], plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"]);
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

          updateFooterSelectionInfo();
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
      plasmidDict[currentlyOpenedPlasmid]["selectedText"] = getSelectedText(currentlyOpenedPlasmid);
      console.log("Selected text: ", plasmidDict[currentlyOpenedPlasmid]["selectedText"], plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]);
    };
    isSelecting = false;
  });


  /**
   * Check for clicks outside the tables to clear the selection.
   */
  document.addEventListener('click', function (event) {
    //console.log("Table selection mouse click", event.target)
    if (!event.target.closest('#sequence-grid-' + currentlyOpenedPlasmid) && !event.target.closest('.popup-window') && event.target.tagName !== "A") {
      clearSelection(currentlyOpenedPlasmid, true);
      clearSelectionCursors(currentlyOpenedPlasmid);
      isSelecting = false;
    };
  });


};

/**
 * Listens for CTRl+C and copies the currently selected text into the clipboard.
 */
document.addEventListener('keydown', function (event) {
  // Check if we've actually clicked ctrl+c and we have text selected
  if ((event.ctrlKey || event.metaKey) && event.key === 'c' && plasmidDict[currentlyOpenedPlasmid]["selectedText"] !== '') {
    if (plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] !== null && plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"] !== null) {
      event.preventDefault(); // Prevent default copy behavior
      copySelectionToClipboard(currentlyOpenedPlasmid);
    };
  };
});


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
  
  copyStringToClipboard(currSelectedText);
};


/**
 * Copy string to clipboard
 */
function copyStringToClipboard(inputString) {
  // Create a temporary textarea element to copy text to clipboard
  const tempTextArea = document.createElement('textarea');
  tempTextArea.value = inputString;
  document.body.appendChild(tempTextArea);
  tempTextArea.select();
  try {
    // Execute the copy command
    document.execCommand('copy');
    console.log('Copied to clipboard:', inputString);
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
  //console.log("CLEARING SELECTION", plasmidIndex, clearingGlobalVars, new Date().getSeconds())
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
  updateFooterSelectionInfo();
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
  updateFooterSelectionInfo()
};


/**
 *  Set the position of the selection cursor
 */
function setSelectionCursors(plasmidIndex, cursorStartPos, cursorEndPos) {
  console.log("setSelectionCursors", plasmidIndex, plasmidDict[plasmidIndex]["selectionStartPos"], plasmidDict[plasmidIndex]["selectionEndPos"])

  console.log("setSelectionCursors", cursorStartPos, cursorEndPos)
  clearSelectionCursors(plasmidIndex);
  const currGridStructure = plasmidDict[plasmidIndex]["gridStructure"];
  const tableID = "sequence-grid-" + plasmidIndex;
  const tableCoordsStart = seqIndexToCoords(cursorStartPos, 0, currGridStructure);
  console.log("setSelectionCursors tableCoords", plasmidIndex, currGridStructure)

  const targetCell1 = document.getElementById(tableID).rows[tableCoordsStart[0]].cells[tableCoordsStart[1]];
  targetCell1.classList.add("selection-cursor-cell-left");
  const targetCell2 = document.getElementById(tableID).rows[tableCoordsStart[0] + 1].cells[tableCoordsStart[1]];
  targetCell2.classList.add("selection-cursor-cell-left");
  console.log("setSelectionCursors", targetCell1, targetCell2, cursorStartPos, tableCoordsStart, currGridStructure)

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


/**
 * Updates current selection info in the footer
 */
function updateFooterSelectionInfo() {
  // Selection length
  const selectedText = getSelectedText(currentlyOpenedPlasmid);
  document.getElementById("footer-selection-length").innerText = selectedText.length;
  
  // Selection span
  const footerSelectionSpanStart = Math.min(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"])
  const footerSelectionSpanEnd = Math.max(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"])
  document.getElementById("footer-selection-span").innerText = (selectedText !== "") ? "(" + footerSelectionSpanStart + ".." + footerSelectionSpanEnd + ")" : "";
  
  // Melting temp
  const meltingTemp = get_tm(selectedText, primerConc, saltConc, method=meltingTempAlgorithmChoice);
  document.getElementById("footer-selection-tm").innerText = (selectedText !== "") ? meltingTemp.toFixed(2): "--";
};