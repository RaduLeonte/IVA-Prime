function addCellSelection() {
    const sequenceGridTable = document.getElementById('sequence-grid');
    const fileContentContainer = document.getElementById('file-content');
  
    if (!sequenceGridTable) {
      // Table doesn't exist yet, observe the DOM for changes
      const observer = new MutationObserver(function(mutationsList) {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            // Check if the table is added
            const addedNodes = Array.from(mutation.addedNodes);
            const isTableAdded = addedNodes.some(node => node.id === 'sequence-grid');
  
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
  
    sequenceGridTable.addEventListener('mousedown', function(event) {
      if (event.button === 0) {
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
  
    sequenceGridTable.addEventListener('mousemove', function(event) {
      if (isSelecting) {
        const cell = event.target.closest('td');
        if (cell) {
          if (endCell) {
            endCell.classList.remove('selected-cell');
          }
          endCell = cell;
          endCell.classList.add('selected-cell');
  
          // Highlight cells between startCell and endCell
          const cells = getCellsBetween(startCell, endCell);
          cells.forEach((cell) => cell.classList.add('selected-cell'));
        }
      }
    });
  
    sequenceGridTable.addEventListener('mouseup', function(event) {
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
  
    sequenceGridTable.addEventListener('mouseleave', function() {
      if (isSelecting) {
        // Clear startCell and endCell references when leaving the table while selecting
        startCell = null;
        endCell = null;
      }
    });
  
    function getCellsBetween(start, end) {
      const cells = [];
      const startRowIndex = start.parentElement.rowIndex;
      const endRowIndex = end.parentElement.rowIndex;
      const startCellIndex = start.cellIndex;
      const endCellIndex = end.cellIndex;
  
      for (let i = Math.min(startRowIndex, endRowIndex); i <= Math.max(startRowIndex, endRowIndex); i++) {
        const row = sequenceGridTable.rows[i];
        for (let j = Math.min(startCellIndex, endCellIndex); j <= Math.max(startCellIndex, endCellIndex); j++) {
          const cell = row.cells[j];
          cells.push(cell);
        }
      }
  
      return cells;
    }
    function getSelectedText() {
        const cells = Array.from(document.getElementsByClassName('selected-cell'));
        const selectedText = cells.map(cell => cell.textContent.trim()).join('');
        return selectedText;
      }

  }
  
  // Call the function to enable cell selection in your sequence grid table
  addCellSelection();