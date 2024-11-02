// Cursor trackers
let basePosition = -1;
let hoveringOverSelectionCursor = null;

/**
 * Enables the cursor hvoer hint displaying the position in the sequence and table coordinates.
 * 
 * TO DO:
 * - dont create the popup on every mousement
 * - dont delete the popup just hide it
 */
function addHoverPopupToTable() {
  removeAllHoverPopups();
  // Select table
  const tablecontainer = document.getElementById("content");
  const fileContent = document.getElementById("file-content");
  const footerElement = document.getElementById("footer");
  // Create popup for this table
  const popup = document.createElement('div');
  popup.id = "hover-popup";
  popup.className = 'hover-popup';
  popup.style.display = "none"; // hide immediately
  document.body.appendChild(popup);

  // Add the hover listener
  fileContent.addEventListener('mouseover', function(event) {
    // Check if we're hovering over a cell
    if (event.target.tagName === 'TD' && (event.target.id === 'Forward Strand' || event.target.id === 'Complementary Strand')) {
      // Get cell coordinates
      const row = event.target.parentNode;
      const rowIndex = row.rowIndex;
      const cellIndex = event.target.cellIndex;

      // Insert the popup text based on the hovered plasmid
      popup.textContent = basePosition !== -1 ? basePosition + " (" + rowIndex + ", " + cellIndex + ")" : "";
      
      // Position it accordingly
      positionPopup(popup, event.clientX, event.clientY);
    } else if (event.target.tagName === 'td' && event.getAttribute("aaIndex")) {
        popup.textContent = event.target.innerText + event.getAttribute("aaIndex");
        positionPopup(popup, event.clientX, event.clientY);
    };
  });

  // Add the hover listener
  footerElement.addEventListener('mouseover', function(event) {
    if (popup) {
      popup.style.display = "none";
    };
    basePosition = -1;
  });


  /**
   * Tracks the cursor position and updates the position of the hover popup.
   */
  fileContent.addEventListener('mousemove', function(event) {
    if (event.target.tagName === 'TD' || event.target.tagName === 'DIV') { // Check to see if we're hovering over a cell

      // Find cell dimensions
      const targetCell = (event.target.tagName === 'TD') ? event.target: event.target.parentNode;
      if (targetCell) {
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
  
        // Check which side of the cell we're closer to
        const gridStructureLength = Project.activePlasmid().gridStructure.length
        basePosition = Math.floor((targetCellRowIndex + 1) / gridStructureLength) * gridWidth + targetCellCellIndex + 1 + basePositionOffset;
  
        // Update the text content and mvoe the popup into position
        if (popup) {
          if ((event.target.id === 'Forward Strand' || event.target.id === 'Complementary Strand') && event.target.textContent.trim() !== '') {
            popup.textContent = basePosition !== -1 ? basePosition + " (" + targetCellRowIndex + ", " + targetCellCellIndex + ")" : "";
            positionPopup(popup, event.clientX, event.clientY);
          } else if (event.target.id === 'Amino Acids' && event.target.getAttribute("aaindex")) {
            popup.textContent = event.target.textContent + event.target.getAttribute("aaindex");
            positionPopup(popup, event.clientX, event.clientY);
          } else {
            popup.style.display = "none";
          };
        };
      };
    };
  });


  // Disable the popup if leaving the table and reset the hovering position tracker
  tablecontainer.addEventListener('mouseleave', function(event) {
    const tableRect = tablecontainer.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // Check if the cursor is outside the bounds of the table
    if (
      mouseX < tableRect.left ||
      mouseX > tableRect.right ||
      mouseY < tableRect.top ||
      mouseY > tableRect.bottom
    ) {
      if (popup) {
        popup.style.display = "none";
      };

      basePosition = -1;
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
 * 
 */
function removeAllHoverPopups() {
  const popups = document.querySelectorAll(".hover-popup");
  popups.forEach(element => {
    element.parentNode.removeChild(element);
  });
};

document.addEventListener('DOMContentLoaded', function () {
  addHoverPopupToTable();
});