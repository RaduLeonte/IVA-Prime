function addCellBorderOnHover(tableId, containerId, pNr) {
    const sequenceGridTable = document.getElementById(tableId);
    const fileContentContainer = document.getElementById(containerId);
  
    if (!sequenceGridTable) {
      // Table doesn't exist yet, observe the DOM for changes
      const observer = new MutationObserver(function(mutationsList) {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            // Check if the table is added
            const addedNodes = Array.from(mutation.addedNodes);
            const isTableAdded = addedNodes.some(node => node.id === tableId);
  
            if (isTableAdded) {
              observer.disconnect(); // Stop observing DOM changes
              addCellBorderOnHover(tableId, containerId, pNr); // Call the function again now that the table exists
              break;
            }
          }
        }
      });
  
      observer.observe(document.documentElement, { childList: true, subtree: true });
      return; // Exit the function for now, it will be called again when the table is added
    }
  
    let previousCell = null;
  
    sequenceGridTable.addEventListener('mousemove', function(event) {
      const cell = event.target.closest('td'); // Get the hovered cell
      if (cell && cell !== previousCell) {
        // Reset previous cell border styles
        if (previousCell) {
          previousCell.style.borderLeft = '';
          previousCell.style.borderRight = '';
        }
  
        previousCell = cell;
      }
  
      if (previousCell) {
        const cellRect = previousCell.getBoundingClientRect();
        const cellWidth = cellRect.width;
        const cellLeft = cellRect.left;
        const cellRight = cellRect.right;
        const cursorX = event.clientX;
  
        // Calculate the distance from the cursor to the left and right sides of the cell
        const distanceToLeft = cursorX - cellLeft;
        const distanceToRight = cellRight - cursorX;
  
        // Apply border style to the side closest to the cursor
        if (distanceToLeft < distanceToRight) {
          previousCell.style.borderLeft = '2px solid red';
          previousCell.style.borderRight = '';
        } else {
          previousCell.style.borderRight = '2px solid red';
          previousCell.style.borderLeft = '';
        }
      }
    });
  
    sequenceGridTable.addEventListener('mouseleave', function(event) {
      // Reset cell border styles when leaving the table
      if (previousCell) {
        previousCell.style.borderLeft = '';
        previousCell.style.borderRight = '';
        previousCell = null;
      }
    });
}


// Call the function to add the cell border on hover effect to your sequence grid table
addCellBorderOnHover('sequence-grid', 'file-content', 1);
addCellBorderOnHover('sequence-grid2', 'file-content2', 2);