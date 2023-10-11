/**
 * Adds a scrolling effect when clicking on a feature in the side bar.
 * 
 * TO DO:
 * - sometimes doesnt work
 */
function addScrollingEffectToFeatureTable(tableId, containerId) {
  // Wait for the page to load
  document.addEventListener('DOMContentLoaded', function () {
    // Select specified table and content div
    const sidebarTable = document.getElementById(tableId);
    const fileContentDiv = document.getElementById(containerId);
  
    /**
     * Scrolls to the annotaton specified by the sidebar row closes to where the user clicked.
     */
    function scrollToCell(event) {
      // Closes row to click event
      const clickedRow = event.target.closest('tr');
    
      // Get the label text from the second column in the clicked row
      const labelCell = clickedRow.cells[1];
      const label = labelCell.textContent;
    
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
      
  
    // Listeners are added once the sidebar is populated after plasmid import
    const observer = new MutationObserver(function (mutationsList) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const addedNodes = mutation.addedNodes;
          for (const node of addedNodes) {
            if (node.nodeName === 'TR') {
              node.addEventListener('click', scrollToCell);
            }
          }
        }
      }
    });
  
    // Start observing the sidebar table for changes
    observer.observe(sidebarTable, { childList: true, subtree: true });
  });
}


// Enables the effect for both plasmids
addScrollingEffectToFeatureTable('sidebar-table', 'file-content', 1);
addScrollingEffectToFeatureTable('sidebar-table2', 'file-content2', 2);