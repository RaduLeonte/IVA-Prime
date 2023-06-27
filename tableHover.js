let basePosition = -1;
let basePosition2 = -1;

function addHoverPopupToTable(tableId, pNr) {
  const table = document.getElementById(tableId);

  table.addEventListener('mouseover', function(event) {
    if (event.target.tagName === 'TD') {
      const row = event.target.parentNode;
      const rowIndex = row.rowIndex;
      const cellIndex = event.target.cellIndex;

      const popup = document.createElement('div');
      popup.className = 'hover-popup';
      if (pNr === 1) {
        popup.textContent = basePosition !== -1 ? basePosition + " (" + rowIndex + ", " + cellIndex + ")" : "";
      } else {
        popup.textContent = basePosition2 !== -1 ? basePosition2 + " (" + rowIndex + ", " + cellIndex + ")" : "";
      }
      

      document.body.appendChild(popup);
      positionPopup(popup, event.clientX, event.clientY);
    }
  });

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

  table.addEventListener('mousemove', function(event) {
    if (event.target.tagName === 'TD') {
      const cellRect = event.target.getBoundingClientRect();
      const cursorOffset = event.clientX - cellRect.left;
      const cellWidth = cellRect.width;

      if (cursorOffset < cellWidth / 2) {
        if (pNr === 1) {
          basePosition = ((event.target.parentNode.rowIndex - event.target.parentNode.rowIndex % gridStructure.length) / gridStructure.length) * gridWidth + event.target.cellIndex + 1;
        } else {
          basePosition2 = ((event.target.parentNode.rowIndex - event.target.parentNode.rowIndex % gridStructure2.length) / gridStructure2.length) * gridWidth + event.target.cellIndex + 1;
        }
      } else {
        if (pNr === 1) {
          basePosition = ((event.target.parentNode.rowIndex - event.target.parentNode.rowIndex % gridStructure.length) / gridStructure.length) * gridWidth + event.target.cellIndex + 2;
        } else {
          basePosition2 = ((event.target.parentNode.rowIndex - event.target.parentNode.rowIndex % gridStructure2.length) / gridStructure2.length) * gridWidth + event.target.cellIndex + 2;
        }
      }

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
}

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

function waitForTableToExist(tableId, callback) {
  const checkTableExistence = setInterval(function() {
    const table = document.getElementById(tableId);
    if (table) {
      clearInterval(checkTableExistence);
      callback();
    }
  }, 100); // Check for table existence every 100ms
}

waitForTableToExist('sequence-grid', function() {
  addHoverPopupToTable('sequence-grid', 1);
});

waitForTableToExist('sequence-grid2', function() {
  addHoverPopupToTable('sequence-grid2', 2);
});
