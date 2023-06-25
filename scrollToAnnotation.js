document.addEventListener('DOMContentLoaded', function () {
    const sidebarTable = document.getElementById('sidebar-table');
    const fileContentDiv = document.getElementById('file-content');
  
    // Function to add event listener to each <tr> element
    function addEventListenerToTableRow(row) {
      row.addEventListener('click', scrollToCell);
    }
  
    function scrollToCell(event) {
        const clickedRow = event.target.closest('tr');
      
        // Get the label text from the second cell in the clicked row
        const labelCell = clickedRow.cells[1];
        const label = labelCell.textContent;
        console.log(label)
      
        // Find the corresponding cell in the "file-content" table
        const fileContentTable = fileContentDiv.querySelector('table');
        const cells = fileContentTable.querySelectorAll('td');
        let desiredCell = null;
        cells.forEach((cell) => {
          if (cell.textContent === label) {
            desiredCell = cell;
          }
        });
      
        // Scroll the "file-content" div to the desired cell
        if (desiredCell) {
          desiredCell.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }
      
  
    // Observe changes to the sidebar table
    const observer = new MutationObserver(function (mutationsList) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const addedNodes = mutation.addedNodes;
          for (const node of addedNodes) {
            if (node.nodeName === 'TR') {
              // Add event listener to the newly added table row
              addEventListenerToTableRow(node);
            }
          }
        }
      }
    });
  
    // Start observing the sidebar table for changes
    observer.observe(sidebarTable, { childList: true, subtree: true });
  });
  