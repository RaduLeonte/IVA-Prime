function addCellSelection(tableId, containerId, pNr) {

  const sequenceGridTable = document.getElementById(tableId);
  const fileContentContainer = document.getElementById(containerId);

  if (!sequenceGridTable) {
    // Table doesn't exist yet, observe the DOM for changes
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
    return; // Exit the function for now, it will be called again when the table is added
  }

  let isSelecting = false;
  let startCell = null;
  let endCell = null;

  sequenceGridTable.addEventListener('mousedown', function (event) {

    if (event.button === 0) {
      // Clear the previous selection
      clearSelection(pNr);
      if (pNr === 1) {
        selectionStartPos = basePosition;
      } else {
        selectionStartPos = basePosition2;
      }
      
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

  function clearSelection(pNr) {
    const selectedCells = document.querySelectorAll('.selected-cell');
    selectedCells.forEach((cell) => {
      cell.classList.remove('selected-cell');
    });
    if (pNr === 1) {
      selectedText = "";
    } else {
      selectedText2 = "";
    }
  }

  sequenceGridTable.addEventListener('mousemove', function (event) {
    if (isSelecting) {
      let cell = event.target.closest('td');
      if (cell && basePosition !== selectionStartPos) {
        if (cell.id === "Forward Strand") {
          let currGridStructure = null;
          if (pNr === 1) {
            selectionEndPos = basePosition;
            currGridStructure = gridStructure;
          } else {
            selectionEndPos = basePosition2;
            currGridStructure = gridStructure2;
          }

          // Get the indices of the start and end cells
          let startCoords = null;
          let startRowIndex = null;
          let startCellIndex = null;
          let endCoords = null;
          let endRowIndex = null;
          let endCellIndex = null;

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
          // Iterate over cells between start and end cells
          for (let i = startRowIndex; i <= endRowIndex; i++) {
            const row = sequenceGridTable.rows[i];
            const start = (i === startRowIndex) ? startCellIndex : 0;
            const end = (i === endRowIndex) ? endCellIndex : row.cells.length - 1;

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

  sequenceGridTable.addEventListener('mouseup', function (event) {
    if (event.button === 0 && isSelecting) {
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

  function getSelectedText() {
    const selectedCells = document.querySelectorAll('.selected-cell');
    let text = '';
    selectedCells.forEach((cell) => {
      text += cell.textContent.trim();
    });
    return text;
  }

  sequenceGridTable.addEventListener('mouseleave', function () {
    if (isSelecting) {
      // Clear startCell and endCell references when leaving the table while selecting
      startCell = null;
      endCell = null;
      isSelecting = false;
    }
  });

  document.addEventListener('click', function (event) {
    if (!event.target.closest('#sequence-grid') && !event.target.closest('#sequence-grid2')) {
      // Clicked outside the table, clear the selection
      clearSelection(pNr);
      startCell = null;
      endCell = null;
      isSelecting = false;
    }
  });

  document.addEventListener('keydown', function (event) {
    let currSelectedText = "";
    if (pNr === 1) {
      currSelectedText = selectedText;
    } else {
      currSelectedText = selectedText2;
    }
    if (event.ctrlKey && event.key === 'c' && currSelectedText !== '') {
      event.preventDefault();
      copyToClipboard(currSelectedText);
    }
  });

  function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}


// Call the function to enable cell selection in your sequence grid table
addCellSelection('sequence-grid', 'file-content', 1);
//addCellSelection('sequence-grid2', 'file-content2', 2);