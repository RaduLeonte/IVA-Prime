let selectedText = '';

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
    selectedText = "";
  }

  sequenceGridTable.addEventListener('mousemove', function (event) {
    if (isSelecting) {
      const cell = event.target.closest('td');
      if (cell) {
        // Check if the cell has the same ID as the start cell
        if (cell.id === startCell.id) {
          // Get the indices of the start and end cells
          const startRowIndex = startCell.parentElement.rowIndex;
          const startCellIndex = startCell.cellIndex;
          const endRowIndex = cell.parentElement.rowIndex;
          const endCellIndex = cell.cellIndex;

          // Determine the minimum and maximum indices
          const minRowIndex = Math.min(startRowIndex, endRowIndex);
          const maxRowIndex = Math.max(startRowIndex, endRowIndex);
          const minCellIndex = Math.min(startCellIndex, endCellIndex);
          const maxCellIndex = Math.max(startCellIndex, endCellIndex);

          // Clear the previous selection
          clearSelection();

          // Iterate over cells between start and end cells
          for (let i = minRowIndex; i <= maxRowIndex; i++) {
            const row = sequenceGridTable.rows[i];
            const start = (i === minRowIndex) ? minCellIndex : 0;
            const end = (i === maxRowIndex) ? maxCellIndex : row.cells.length - 1;

            for (let j = start; j <= end; j++) {
              const selectedCell = row.cells[j];
              if (selectedCell.id === startCell.id) {
                selectedCell.classList.add('selected-cell');
              }
            }
          }

          // Update the end cell
          endCell = cell;
        } else {
          // Clear the selection if the cell doesn't have the same ID
          clearSelection();
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
      selectedText = getSelectedText();
      console.log(selectedText);
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
    if (!event.target.closest('#sequence-grid')) {
      // Clicked outside the table, clear the selection
      clearSelection();
      startCell = null;
      endCell = null;
      isSelecting = false;
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === 'c' && selectedText !== '') {
      event.preventDefault();
      copyToClipboard(selectedText);
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
addCellSelection();
