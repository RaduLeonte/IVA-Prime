let basePosition = -1;

function addHoverPopupToTable(tableId) {
  const table = document.getElementById(tableId);

  table.addEventListener('mouseover', function(event) {
    if (event.target.tagName === 'TD') {
      const row = event.target.parentNode;
      const rowIndex = row.rowIndex;
      const cellIndex = event.target.cellIndex;

      const popup = document.createElement('div');
      popup.className = 'hover-popup';
      popup.textContent = basePosition !== -1 ? basePosition + " (" + rowIndex + ", " + cellIndex + ")" : "";

      document.body.appendChild(popup);
      positionPopup(popup, event.clientX, event.clientY);
    }
  });

  table.addEventListener('mouseout', function() {
    const popup = document.querySelector('.hover-popup');
    if (popup) {
      document.body.removeChild(popup);
    }
    basePosition = -1;
  });

  table.addEventListener('mousemove', function(event) {
    if (event.target.tagName === 'TD') {
      const cellRect = event.target.getBoundingClientRect();
      const cursorOffset = event.clientX - cellRect.left;
      const cellWidth = cellRect.width;

      if (cursorOffset < cellWidth / 2) {
        basePosition = ((event.target.parentNode.rowIndex - event.target.parentNode.rowIndex % gridStructure.length) / gridStructure.length) * gridWidth + event.target.cellIndex + 1;
      } else {
        basePosition = ((event.target.parentNode.rowIndex - event.target.parentNode.rowIndex % gridStructure.length) / gridStructure.length) * gridWidth + event.target.cellIndex + 2;
      }

      const popup = document.querySelector('.hover-popup');
      if (popup) {
        popup.textContent = basePosition !== -1 ? basePosition + " (" + event.target.parentNode.rowIndex + ", " + event.target.cellIndex + ")" : "";
        positionPopup(popup, event.clientX, event.clientY);
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
  addHoverPopupToTable('sequence-grid');
});
