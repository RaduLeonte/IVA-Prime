function addCellSelection() {
  const sequenceGridTable = document.getElementById('sequence-grid');
  const fileContentContainer = document.getElementById('file-content');

  if (!sequenceGridTable) {
    // Table doesn't exist yet, observe the DOM for changes
    const observer = new MutationObserver(function (mutationsList) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          // Check if the table is added
          const addedNodes = Array.from(mutation.addedNodes);
          const isTableAdded = addedNodes.some((node) => node.id === 'sequence-grid');

          if (isTableAdded) {
            observer.disconnect(); // Stop observing DOM changes
            addCellSelection(); // Call the function again now that the table exists
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
      clearSelection();

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

      // Get the starting cell
      const cell = event.target.closest('td');
      if (cell) {
        startCell = cell;
        startCell.classList.add('selected-cell');
      }
    }
  });

  function clearSelection() {
    const selectedCells = document.querySelectorAll('.selected-cell');
    selectedCells.forEach((cell) => {
      cell.classList.remove('selected-cell');
    });
  }

  sequenceGridTable.addEventListener('mousemove', function (event) {
    if (isSelecting) {
      const cell = event.target.closest('td');
      if (cell) {
        // Find the first cell with the same ID directly above or below the cursor
        let nearestCell = cell;
        let rowIndex = cell.parentElement.rowIndex;
  
        if (rowIndex > startCell.parentElement.rowIndex) {
          // If the cursor is below the start cell, search downwards
          while (rowIndex < sequenceGridTable.rows.length && nearestCell.id !== startCell.id) {
            nearestCell = sequenceGridTable.rows[rowIndex].cells[cell.cellIndex];
            rowIndex++;
          }
        } else {
          // If the cursor is above the start cell, search upwards
          while (rowIndex >= 0 && nearestCell.id !== startCell.id) {
            nearestCell = sequenceGridTable.rows[rowIndex].cells[cell.cellIndex];
            rowIndex--;
          }
        }
  
        if (endCell && endCell !== nearestCell) {
          endCell.classList.remove('selected-cell');
        }
        endCell = nearestCell;
        if (endCell) {
          endCell.classList.add('selected-cell');
        }
  
        // Get the indices of the start and end cells
        const startRowIndex = startCell.parentElement.rowIndex;
        const endRowIndex = endCell.parentElement.rowIndex;
        const startCellIndex = startCell.cellIndex;
        const endCellIndex = endCell.cellIndex;
  
        // Highlight cells between startCell and endCell
        const rows = sequenceGridTable.rows;
        for (let i = startRowIndex; i <= endRowIndex; i++) {
          const row = rows[i];
          const minIndex = (i === startRowIndex) ? startCellIndex : 0;
          const maxIndex = (i === endRowIndex) ? endCellIndex : row.cells.length - 1;
  
          for (let j = minIndex; j <= maxIndex; j++) {
            const selectedCell = row.cells[j];
            if (selectedCell.id === startCell.id) {
              selectedCell.classList.add('selected-cell');
            } else {
              selectedCell.classList.remove('selected-cell');
            }
          }
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
  
      // Clear startCell and endCell references
      startCell = null;
      endCell = null;
  
      // Extract text content from selected cells
      const selectedText = getSelectedText();
      console.log(selectedText);
    }
  });
  
  function getSelectedText() {
    const cells = Array.from(document.getElementsByClassName('selected-cell'));
    const selectedText = cells.map(cell => cell.textContent.trim()).join('');
    return selectedText;
  }
  

  sequenceGridTable.addEventListener('mouseleave', function () {
    if (isSelecting) {
      // Clear startCell and endCell references when leaving the table while selecting
      startCell = null;
      endCell = null;
    }
  });
}

// Call the function to enable cell selection in your sequence grid table
addCellSelection();
