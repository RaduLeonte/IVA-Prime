/**
 * Enables the cursor hvoer hint displaying the position in the sequence and table coordinates.
 * 
 * TO DO:
 * - dont create the popup on every mousement
 * - dont delete the popup just hide it
 */
function addHoverPopupToTable(tableId, pNr) {
  // Select table
  const table = document.getElementById(tableId);

  // Add the hover listener
  table.addEventListener('mouseover', function(event) {
    // Check if we're hovering over a cell
    if (event.target.tagName === 'TD') {
      // Get cell coordinates
      const row = event.target.parentNode;
      const rowIndex = row.rowIndex;
      const cellIndex = event.target.cellIndex;

      // Create the hover popup
      const popup = document.createElement('div');
      popup.className = 'hover-popup';
      // Insert the popup text based on the hovered plasmid
      if (pNr === 1) {
        popup.textContent = basePosition !== -1 ? basePosition + " (" + rowIndex + ", " + cellIndex + ")" : "";
      } else {
        popup.textContent = basePosition2 !== -1 ? basePosition2 + " (" + rowIndex + ", " + cellIndex + ")" : "";
      }
      
      // Append the popup and position it accordingly
      document.body.appendChild(popup);
      positionPopup(popup, event.clientX, event.clientY);
    }
  });


  /**
   * Tracks the cursor position and updates the position of the hover popup.
   */
  table.addEventListener('mousemove', function(event) {
    if (event.target.tagName === 'TD') { // Check to see if we're hovering over a cell
      // Find cell dimensions
      const cellRect = event.target.getBoundingClientRect();
      const cursorOffset = event.clientX - cellRect.left; // Cursor position inside the cell
      const cellWidth = cellRect.width;

      // Check which side of the cell we're closer to
      if (cursorOffset < cellWidth / 2) { // Left side
        if (pNr === 1) {
          basePosition = ((event.target.parentNode.rowIndex - event.target.parentNode.rowIndex % gridStructure.length) / gridStructure.length) * gridWidth + event.target.cellIndex + 1;
        } else {
          basePosition2 = ((event.target.parentNode.rowIndex - event.target.parentNode.rowIndex % gridStructure2.length) / gridStructure2.length) * gridWidth + event.target.cellIndex + 1;
        }
      } else { // Right side
        if (pNr === 1) {
          basePosition = ((event.target.parentNode.rowIndex - event.target.parentNode.rowIndex % gridStructure.length) / gridStructure.length) * gridWidth + event.target.cellIndex + 2;
        } else {
          basePosition2 = ((event.target.parentNode.rowIndex - event.target.parentNode.rowIndex % gridStructure2.length) / gridStructure2.length) * gridWidth + event.target.cellIndex + 2;
        }
      }

      // Update the text content and mvoe the popup into position
      const popup = document.querySelector('.hover-popup');
      if (popup) {
        if (pNr === 1) {
          popup.textContent = basePosition !== -1 ? basePosition + " (" + event.target.parentNode.rowIndex + ", " + event.target.cellIndex + ")" : "";
          positionPopup(popup, event.clientX, event.clientY);
        } else {
          popup.textContent = basePosition2 !== -1 ? basePosition2 + " (" + event.target.parentNode.rowIndex + ", " + event.target.cellIndex + ")" : "";
          positionPopup(popup, event.clientX, event.clientY);
        }
      }
    }
  });


  // Disable the popup if leaving the table and reset the hovering position tracker
  table.addEventListener('mouseout', function() {
    const popup = document.querySelector('.hover-popup');
    
    if (popup) {
      document.body.removeChild(popup);
    }

    if (pNr === 1) {
      basePosition = -1;
    } else {
      basePosition2 = -1;
    }
  });

}


/**
 * Changes the position of the popup to the target coordinates.
 */
function positionPopup(popup, clientX, clientY) {
  const popupWidth = popup.offsetWidth;
  const popupHeight = popup.offsetHeight;

  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  const maxLeft = windowWidth - popupWidth;
  const maxTop = windowHeight - popupHeight;

  const left = Math.min(clientX + 10, maxLeft);
  const top = Math.min(clientY + 10, maxTop);

  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.zIndex = '3';
}


/**
 * Wait for tables to exist then return.
 */
function waitForTableToExist(tableId, callback) {
  const checkTableExistence = setInterval(function() {
    const table = document.getElementById(tableId);
    if (table) {
      clearInterval(checkTableExistence);
      callback();
    }
  }, 100); // Check for table existence every 100ms
}


// Listeners waiting for the tables to exist before enabling the cursor hover hint
waitForTableToExist('sequence-grid', function() {
  addHoverPopupToTable('sequence-grid', 1);
});

waitForTableToExist('sequence-grid2', function() {
  addHoverPopupToTable('sequence-grid2', 2);
});