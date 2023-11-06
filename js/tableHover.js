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
  // Create popup for this table
  const popup = document.createElement('div');
  popup.id = tableId + "popup";
  popup.className = 'hover-popup';
  popup.style.display = "none"; // hide immediately
  document.body.appendChild(popup);

  // Add the hover listener
  table.addEventListener('mouseover', function(event) {
    // Check if we're hovering over a cell
    if (event.target.tagName === 'td') {
      // Get cell coordinates
      const row = event.target.parentNode;
      const rowIndex = row.rowIndex;
      const cellIndex = event.target.cellIndex;

      // Insert the popup text based on the hovered plasmid
      if (pNr === 1) {
        popup.textContent = basePosition !== -1 ? basePosition + " (" + rowIndex + ", " + cellIndex + ")" : "";
      } else {
        popup.textContent = basePosition2 !== -1 ? basePosition2 + " (" + rowIndex + ", " + cellIndex + ")" : "";
      };
      
      // Position it accordingly
      positionPopup(popup, event.clientX, event.clientY);
    };
  });


  /**
   * Tracks the cursor position and updates the position of the hover popup.
   */
  table.addEventListener('mousemove', function(event) {
    if (event.target.tagName === 'TD' || event.target.tagName === 'DIV') { // Check to see if we're hovering over a cell

      // Find cell dimensions
      const targetCell = (event.target.tagName === 'TD') ? event.target: event.target.parentNode;
      const targetCellSpan = targetCell.colSpan;
      const targetCellRowIndex = targetCell.parentNode.rowIndex;

      let totalColumnSpan = 0;
      let cellFound = false;
      for (let i = 0; i < targetCell.parentNode.cells.length; i++) {
        const currentCell = targetCell.parentNode.cells[i];
        if (currentCell === targetCell) {
          cellFound = true;
          break;
        };
        totalColumnSpan += currentCell.colSpan;
      };
      //const targetCellCellIndex = targetCell.cellIndex;
      const targetCellCellIndex = totalColumnSpan;

      const cellRect = targetCell.getBoundingClientRect();
      const cursorOffset = event.clientX - cellRect.left; // Cursor position inside the cell
      const cellWidth = cellRect.width;
      const tdCursorCoords = Math.min(1, Math.max(0, cursorOffset / cellWidth)) * (targetCellSpan);
      const basePositionOffset = Math.round(tdCursorCoords);
      //console.log("Table Hover", targetCell, tdCursorCoords, basePositionOffset);

      // Check which side of the cell we're closer to
      if (cursorOffset < cellWidth / 2) { // Left side
        if (pNr === 1) {
          basePosition = ((targetCellRowIndex - targetCellRowIndex % gridStructure.length) / gridStructure.length) * gridWidth + targetCellCellIndex + 1 + basePositionOffset;
        } else {
          basePosition2 = ((targetCellRowIndex - targetCellRowIndex % gridStructure2.length) / gridStructure2.length) * gridWidth + targetCellCellIndex + 1 + basePositionOffset;
        };
      } else { // Right side
        if (pNr === 1) {
          basePosition = ((targetCellRowIndex - targetCellRowIndex % gridStructure.length) / gridStructure.length) * gridWidth + targetCellCellIndex + 1 + basePositionOffset;
        } else {
          basePosition2 = ((targetCellRowIndex - targetCellRowIndex % gridStructure2.length) / gridStructure2.length) * gridWidth + targetCellCellIndex + 1 + basePositionOffset;
        };
      };

      // Update the text content and mvoe the popup into position
      if (popup) {
        if (pNr === 1) {
          popup.textContent = basePosition !== -1 ? basePosition + " (" + targetCellRowIndex + ", " + targetCellCellIndex + ")" : "";
          positionPopup(popup, event.clientX, event.clientY);
        } else {
          popup.textContent = basePosition2 !== -1 ? basePosition2 + " (" + targetCellRowIndex + ", " + targetCellCellIndex + ")" : "";
          positionPopup(popup, event.clientX, event.clientY);
        };
      };
    };
  });


  // Disable the popup if leaving the table and reset the hovering position tracker
  table.addEventListener('mouseleave', function(event) {
  const tableRect = table.getBoundingClientRect();
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  // Check if the cursor is outside the bounds of the table
  if (
    mouseX < tableRect.left ||
    mouseX > tableRect.right ||
    mouseY < tableRect.top ||
    mouseY > tableRect.bottom
  ) {
    console.log("Mouse out of the table bounds");
    if (popup) {
      popup.style.display = "none";
    }

    if (pNr === 1) {
      basePosition = -1;
    } else {
      basePosition2 = -1;
    }
  }
});
};


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
  popup.style.display = "block";
};


/**
 * Wait for tables to exist then return.
 */
function waitForTableToExist(tableId, callback) {
  const checkTableExistence = setInterval(function() {
    const table = document.getElementById(tableId);
    if (table) {
      clearInterval(checkTableExistence);
      callback();
    };
  }, 100); // Check for table existence every 100ms
};


// Listeners waiting for the tables to exist before enabling the cursor hover hint
waitForTableToExist('sequence-grid', function() {
  addHoverPopupToTable('sequence-grid', 1);
});

waitForTableToExist('sequence-grid2', function() {
  addHoverPopupToTable('sequence-grid2', 2);
});