/**
 * Enables cell selection for the specified table.
 * 
 * TO DO:
 * - check if copying is disabled in unintended places
 * - enable selection on the second plasmid at some point
 */
function addCellSelection(sequenceGridTable, plasmidIndex) {
  const currPlasmid = Project.getPlasmid(plasmidIndex);
  
  // Select target table and container
  const fileContentContainer = document.getElementById("file-content");

  // Initialize selection variables
  let isSelecting = false;


  /**
   * Selection cursor hover
   */
  sequenceGridTable.addEventListener('mousemove', function () {
    const currBasePosition = basePosition;
    if (!isSelecting) {
      if (
        (
          currBasePosition === Project.activePlasmid().selectionStartPos
          || currBasePosition === Project.activePlasmid().selectionEndPos
        )
        && currPlasmid.selectionEndPos
      ) {
          sequenceGridTable.style.cursor = 'ew-resize';
          hoveringOverSelectionCursor = (currBasePosition === Project.activePlasmid().selectionStartPos) ? "start": "end";
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
    if (event.button === 0) { // Check for left click
      isSelecting = true;
      if (!hoveringOverSelectionCursor) {
        initialSelectionStartCell = [event.target.closest('tr').rowIndex, event.target.closest('td').cellIndex]
        
        // Signal selection start
        const targetCell = event.target.closest('td');
        const targetRow = targetCell.parentElement
        let targetSpan = null;
        if (targetCell.id === "Annotations") {
          const featureID = targetCell.getAttribute('feature-id');
          targetSpan = Project.activePlasmid().features[featureID].span;
          expandCollapsibleHeader(featureID);
        } else if (targetCell.id === "Amino Acids" && targetCell.innerText !== "") {
          const currGridStructure = Project.activePlasmid().gridStructure;
          const seqIndex = (gridWidth * Math.floor(targetRow.rowIndex/currGridStructure.length)) + targetCell.cellIndex + 1;
          targetSpan = (seqIndex - 1)+ ".." + (seqIndex + 1);
        } else {
          // Clear the previous selection
          if (!isShiftKeyPressed()) {
            clearSelection(Project.activePlasmidIndex, true);
            Project.activePlasmid().selectionStartPos = basePosition;
          } else {
            Project.activePlasmid().selectionEndPos = basePosition;
          };

          if (Project.activePlasmid().selectionEndPos) {
            targetSpan = (
              Project.activePlasmid().selectionStartPos < Project.activePlasmid().selectionEndPos
            ) ? (Project.activePlasmid().selectionStartPos)+ ".." + (Project.activePlasmid().selectionEndPos - 1)
            : "complement(" + (Project.activePlasmid().selectionEndPos)+ ".." + (Project.activePlasmid().selectionStartPos - 1) + ")";
          } else {
            setSelectionCursors(
              Project.activePlasmidIndex,
              Project.activePlasmid().selectionStartPos,
              null
            );
          };
        };

        if (isShiftKeyPressed()) {
          const targetSpanNumbers = removeNonNumeric(targetSpan).split("..").map(str => parseInt(str));
          const currSelectionStartPos = Project.activePlasmid().selectionStartPos;
          const currSelectionEndPos = Project.activePlasmid().selectionEndPos;
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
    let closestCell = event.target.closest('td');

    const activePlasmidIndex = Project.activePlasmidIndex;
    let currGridStructure = Project.activePlasmid().gridStructure;

    if (isSelecting) { // Make sure we're currently selecting
      if (!hoveringOverSelectionCursor) {
        Project.activePlasmid().selectionEndPos = basePosition;
      } else {
        if (hoveringOverSelectionCursor === "start") {
          Project.activePlasmid().selectionStartPos = basePosition;
        } else {
          Project.activePlasmid().selectionEndPos = basePosition;
        };
      };
      
      // Check if the cell exists and if the current position is not the same as the selection start cell
      if (closestCell) {
        if (Project.activePlasmid().selectionStartPos === Project.activePlasmid().selectionEndPos) {
          clearSelection(
            activePlasmidIndex,
            false
          );
          setSelectionCursors(
            activePlasmidIndex,
            Project.activePlasmid().selectionStartPos,
            null
          );
        } else {
          let startRowIndex = null;
          let startCellIndex = null;
          let endRowIndex = null;
          let endCellIndex = null;


          if (Project.activePlasmid().selectionStartPos < Project.activePlasmid().selectionEndPos) {
            [startRowIndex, startCellIndex] = seqIndexToCoords(
              Project.activePlasmid().selectionStartPos,
              0,
              currGridStructure
            );
            [endRowIndex, endCellIndex] = seqIndexToCoords(
              Project.activePlasmid().selectionEndPos - 1,
              0,
              currGridStructure
            );
            clearSelection(
              activePlasmidIndex,
              false
            );
            setSelectionCursors(
              activePlasmidIndex,
              Project.activePlasmid().selectionStartPos,
              Project.activePlasmid().selectionEndPos
            );
          } else {
            [startRowIndex, startCellIndex] = seqIndexToCoords(
              Project.activePlasmid().selectionEndPos,
              0,
              currGridStructure
            );
            [endRowIndex, endCellIndex] = seqIndexToCoords(
              Project.activePlasmid().selectionStartPos - 1,
              0,
              currGridStructure
            );

            clearSelection(
              activePlasmidIndex,
              false
            );
            setSelectionCursors(
              activePlasmidIndex,
              Project.activePlasmid().selectionEndPos,
              Project.activePlasmid().selectionStartPos
            );
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
      Project.activePlasmid().selectedText = getSelectedText(Project.activePlasmidIndex);
    };
    isSelecting = false;
  });


  /**
   * Check for clicks outside the tables to clear the selection.
   */
  //document.addEventListener('click', function (event) {
  //  const currActivePlasmidIndex = Project.activePlasmidIndex;
  //  if (
  //    !event.target.closest('#sequence-grid-' + currActivePlasmidIndex)
  //    && !event.target.closest('.popup-window')
  //    && event.target.tagName !== "A"
  //  ) {
  //    clearSelection(currActivePlasmidIndex, true);
  //    clearSelectionCursors(currActivePlasmidIndex);
  //    isSelecting = false;
  //  };
  //});
};

/**
 * Listens for CTRl+C and copies the currently selected text into the clipboard.
 */
document.addEventListener('keydown', function (event) {
  // Check if we've actually clicked ctrl+c and we have text selected
  if (
    (event.ctrlKey || event.metaKey)
    && event.key === 'c'
    && Project.activePlasmid().selectedText !== ''
  ) {
    if (Project.activePlasmid().selectionStartPos !== null && Project.activePlasmid().selectionEndPos !== null) {
      event.preventDefault(); // Prevent default copy behavior
      copySelectionToClipboard(Project.activePlasmidIndex);
    };
  };
});


/**
 * Copy selection to cliboard.
 */
function copySelectionToClipboard(plasmidIndex, special=null) {
  let currSelectedText = Project.getPlasmid(plasmidIndex).selectedText;
  if (special === "complement") {
    currSelectedText = getComplementaryStrand(currSelectedText);
  } else if (special === "revcomplement") {
    currSelectedText = getComplementaryStrand(currSelectedText).split("").reverse().join("");
  };
  
  copyStringToClipboard(currSelectedText);
};


/**
 * Copy string to clipboard
 * 
 * @param {string} inputString 
 */
function copyStringToClipboard(inputString, inputHTML="") {
  console.log("copyStringToClipboard", inputString, inputHTML)
  
  function dummyCopyListener(event) {
    event.clipboardData.setData("text/html", (inputHTML === "") ? inputString: inputHTML);
    event.clipboardData.setData("text/plain", inputString);
    event.preventDefault();
  };

  document.addEventListener("copy", dummyCopyListener);
  document.execCommand("copy");
  document.removeEventListener("copy", dummyCopyListener);
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
  console.log("clearSelection", plasmidIndex, clearingGlobalVars);
  clearSelectionCursors(plasmidIndex);
  // Find all selected cells and iterate over them to remove the selected class
  const selectedCells = document.getElementById("sequence-grid-" + plasmidIndex).querySelectorAll('.selected-cell');
  selectedCells.forEach((cell) => {
    cell.classList.remove('selected-cell');
  });
  // Reset selected text variable
  Project.activePlasmid().selectedText = null;
  if (clearingGlobalVars) {
    Project.activePlasmid().selectionStartPos = null;
    Project.activePlasmid().selectionEndPos = null;
  };
  updateFooterSelectionInfo();
};


/**
 * Select text from feature span.
 */
function selectBySpan(inputSpan) {
  console.log("selectBySpan inputSpan", inputSpan);
  const currPlasmid = Project.activePlasmid();
  const activePlasmidIndex = Project.activePlasmidIndex
  let currGridStructure = Project.activePlasmid().gridStructure;
  const sequenceGridTable = document.getElementById('sequence-grid-' + activePlasmidIndex);

  const range = removeNonNumeric(inputSpan).split("..").map(parseFloat);

  const spanStart = Math.min(range[0], range[1]);
  const spanEnd = Math.max(range[0], range[1]);

  if (!inputSpan.includes("complement")) {
    Project.activePlasmid().selectionStartPos = range[0];
    Project.activePlasmid().selectionEndPos = range[1] + 1;
  } else {
    Project.activePlasmid().selectionEndPos = range[0];
    Project.activePlasmid().selectionStartPos = range[1] + 1;
  };

  clearSelection(
    activePlasmidIndex,
    false
  );
  setSelectionCursors(
    activePlasmidIndex,
    spanStart,
    spanEnd + 1
  );

  console.log("selectBySpan", spanStart, spanEnd);
  for (let i = spanStart; i <= spanEnd; i++) {
    const [row, col] = seqIndexToCoords(i, 0, currGridStructure);
    const selectedCell = sequenceGridTable.rows[row].cells[col];
    //console.log(selectedCell)
    selectedCell.classList.add('selected-cell');
  };

  Project.activePlasmid().selectedText = getSelectedText(activePlasmidIndex);
  updateFooterSelectionInfo();
};


/**
 *  Set the position of the selection cursor
 */
function setSelectionCursors(plasmidIndex, cursorStartPos, cursorEndPos) {
  clearSelectionCursors(plasmidIndex);
  const currGridStructure = Project.getPlasmid(plasmidIndex).gridStructure;
  const tableID = "sequence-grid-" + plasmidIndex;
  const tableCoordsStart = seqIndexToCoords(cursorStartPos, 0, currGridStructure);

  const targetCell1 = document.getElementById(tableID).rows[tableCoordsStart[0]].cells[tableCoordsStart[1]];
  targetCell1.classList.add("selection-cursor-cell-left");
  const targetCell2 = document.getElementById(tableID).rows[tableCoordsStart[0] + 1].cells[tableCoordsStart[1]];
  targetCell2.classList.add("selection-cursor-cell-left");

  if (cursorEndPos) {
    const tableCoordsEnd = seqIndexToCoords(cursorEndPos - 1, 0, currGridStructure);
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


function divisibleByThreeString(nr) {
  let output;
  if (nr < 3) {
      output = "";
  } else {
      if (nr%3 == 0) {
          output = "3x" + Math.floor(nr/3);
      } else {
          output = "3x" + Math.floor(nr/3) + "+" + (nr%3);
      };
  };
  return output;
};


/**
 * Updates current selection info in the footer
 */
function updateFooterSelectionInfo() {
  // Selection length
  const currActivePlasmid = Project.activePlasmidIndex;
  const selectedText = getSelectedText(currActivePlasmid);
  document.getElementById("footer-selection-length").innerText = selectedText.length;

  // Divisible by 3 info
  document.getElementById("footer-selection-divisible").innerText = divisibleByThreeString(selectedText.length);
  
  // Selection span
  const currSelectionStartPos = Project.activePlasmid().selectionStartPos;
  const currSelectionEndPos = Project.activePlasmid().selectionEndPos;
  const footerSelectionSpanStart = Math.min(currSelectionStartPos, currSelectionEndPos)
  const footerSelectionSpanEnd = Math.max(currSelectionStartPos, currSelectionEndPos)
  document.getElementById("footer-selection-span").innerText = (selectedText !== "") ? "(" + footerSelectionSpanStart + ".." + footerSelectionSpanEnd + ")" : "";
  
  // Melting temp
  const meltingTemp = getMeltingTemperature(selectedText, method=meltingTempAlgorithmChoice);
  document.getElementById("footer-selection-tm").innerText = (selectedText !== "") ? meltingTemp.toFixed(2): "--";
};