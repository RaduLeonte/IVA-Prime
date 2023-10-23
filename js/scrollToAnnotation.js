/**
 * Adds a scrolling effect when clicking on a feature in the side bar.
 * 
 * TO DO:
 * - sometimes doesnt work
 */
function addScrollingEffectToFeatureTable(pNr) {
  // Wait for the page to load
  document.addEventListener('DOMContentLoaded', function () {
    // Select specified table and content div
    const tableId = (pNr === 1) ? "sidebar-table": "sidebar-table2";
    const containerId = (pNr === 1) ? "file-content": "file-content2";
    const sidebarTable = document.getElementById(tableId);
    const fileContentDiv = document.getElementById(containerId);
  
    /**
     * Scrolls to the annotaton specified by the sidebar row closes to where the user clicked.
     */
    function scrollToCell(event) {
      event.stopPropagation();
      // Closes row to click event
      const clickedRow = event.target.closest('tr');
    
      // Get the label text from the second column in the clicked row
      const labelCell = clickedRow.cells[0];
      const label = labelCell.innerText;
      console.log("Scrolling to:", clickedRow.cells[0], label);
    
      // Find the corresponding cell in the "file-content" table
      const fileContentTable = fileContentDiv.querySelector('table');
      const cells = fileContentTable.querySelectorAll('td');
      let desiredCell = null;
      let lowestRow = Number.MAX_VALUE; // Initialize with a large value

      cells.forEach((cell) => {
        if (cell.getAttribute("feature-id") && cell.getAttribute("feature-id").includes(label)) {
          const cellRow = cell.closest('tr').rowIndex; // Get the row index of the current cell
          if (cellRow < lowestRow) {
            lowestRow = cellRow; // Update the lowest row if a lower one is found
            desiredCell = cell;
          }
        }
      });    

      console.log("Scrolling to:", desiredCell);
    
      // Scroll the "file-content" div to the desired cell
      if (desiredCell) {
        desiredCell.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      };
      // Select feature
      console.log("Scrolling to, selecting:", clickedRow.cells[2].innerText)
      selectBySpan(clickedRow.cells[2].innerText, pNr);
    };

  
      
  
    // Listeners are added once the sidebar is populated after plasmid import
    const observer = new MutationObserver(function (mutationsList) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const addedNodes = mutation.addedNodes;
          for (const node of addedNodes) {
            if (node.nodeName === 'TR') {
              node.addEventListener('click', scrollToCell);
            };
          };
        };
      };
    });
  
    // Start observing the sidebar table for changes
    observer.observe(sidebarTable, { childList: true, subtree: true });
  });
};


// Enables the effect for both plasmids
addScrollingEffectToFeatureTable(1);
addScrollingEffectToFeatureTable(2);