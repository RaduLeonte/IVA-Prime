function addHoverPopupToTable(tableId) {
    const table = document.getElementById(tableId);
    table.addEventListener('mouseover', function(event) {
      if (event.target.tagName === 'TD') {
        const row = event.target.parentNode;
        let rowIndex = row.rowIndex;
        const cellIndex = event.target.cellIndex;
  
        const popup = document.createElement('div');
        popup.className = 'hover-popup';
        const basePosition = ((rowIndex - rowIndex % gridStructure.length)/gridStructure.length)*gridWidth + cellIndex + 1;
        popup.textContent = basePosition + " (" + rowIndex + ", " + cellIndex + ")";
  
        document.body.appendChild(popup);
        positionPopup(popup, event.clientX, event.clientY);
      }
    });
  
    table.addEventListener('mouseout', function() {
      const popup = document.querySelector('.hover-popup');
      if (popup) {
        document.body.removeChild(popup);
      }
    });
  
    table.addEventListener('mousemove', function(event) {
      const popup = document.querySelector('.hover-popup');
      if (popup) {
        positionPopup(popup, event.clientX, event.clientY);
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
  