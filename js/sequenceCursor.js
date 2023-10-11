/**
 * Enables a cursor hover hint displaying the cursor position.
 */
function addCellBorderOnHover(tableId, containerId, pNr) {
  // Select the grid table of interest
  const sequenceGridTable = document.getElementById(tableId);

  // If the table doesn't exist yet, wait for it
  if (!sequenceGridTable) {
    // Define observer
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
    // Run observer
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return;
  }

  let previousCell = null; // Previously hovered cell
  // Event listener for mouse movements
  sequenceGridTable.addEventListener('mousemove', function(event) {
    // Get the closest cell to the cursor
    const cell = event.target.closest('td');
    
    // If the cell exists and its not the same as the previous one, i.e. the cursor has moved to a new one
    if (cell && cell !== previousCell) {
      // Reset previous cell border styles
      if (previousCell) {
        previousCell.style.borderLeft = '';
        previousCell.style.borderRight = '';
      }
      // Update the cell tracker
      previousCell = cell;
    }

    // If the cursor has changed cells
    if (previousCell) {
      // Find the area of the cell
      const cellRect = previousCell.getBoundingClientRect();
      // Find the borders of the cell
      const cellLeft = cellRect.left;
      const cellRight = cellRect.right;
      // Get the cursors' x coordinate
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

  // If the mouse leaves the table, deselect
  sequenceGridTable.addEventListener('mouseleave', function(event) {
    // Reset cell border styles when leaving the table
    if (previousCell) {
      previousCell.style.borderLeft = '';
      previousCell.style.borderRight = '';
      previousCell = null;
    }
  });
}


// Enable the cursor hover hint
addCellBorderOnHover('sequence-grid', 'file-content', 1);
addCellBorderOnHover('sequence-grid2', 'file-content2', 2);