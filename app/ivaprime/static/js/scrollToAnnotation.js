/**
 * Adds a scrolling effect when clicking on a feature in the side bar.
 */
function addScrollingEffectToFeatureTable() {
  const sidebarTable = document.getElementById("sidebar-table");

  // Listeners are added once the sidebar is populated after plasmid import
  const trList = sidebarTable.querySelectorAll("tr");
  console.log("addScrollingEffectToFeatureTable", trList)
  trList.forEach((trElement) => {
    trElement.addEventListener('click', scrollToCell)
  });    
};


/**
 * Scrolls to the annotaton specified by the sidebar row closes to where the user clicked.
 */
function scrollToCell(event) {
  console.log("Scrolling to cell", event)
  event.stopPropagation();
  // Closes row to click event
  const clickedRow = event.target.closest('tr');

  // Get the label text from the second column in the clicked row
  const labelCell = clickedRow.cells[0];
  const label = labelCell.innerText;
  console.log("Scrolling to:", clickedRow.cells[0], label);

  // Find the corresponding cell in the "file-content" table
  const fileContentTable = document.getElementById('sequence-grid-' + currentlyOpenedPlasmid);
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


  // Scroll the "file-content" div to the desired cell
  if (desiredCell) {
    desiredCell.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };
  // Select feature
  console.log("Scrolling to, selecting:", clickedRow.cells[2].innerText)
  selectBySpan(clickedRow.cells[2].innerText);
};