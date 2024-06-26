/**
 * Enables the sequence cursor as a red border on the nearest side of the hovered cell.
 */
function addCellBorderOnHover(sequenceGridTable, plasmidIndex) {
  // Select the grid table of interest

  Project.getPlasmid(plasmidIndex).previousCell = null;
  // Event listener for mouse movements
  sequenceGridTable.addEventListener('mousemove', function(event) {
    // Get the closest cell to the cursor
    const cell = event.target.closest('td');

    // If the cell exists and its not the same as the previous one, i.e. the cursor has moved to a new one
    if (cell && cell !== Project.getPlasmid(plasmidIndex).previousCell) {
      // Reset previous cell border styles
      if (Project.getPlasmid(plasmidIndex).previousCell) {
        Project.getPlasmid(plasmidIndex).previousCell.classList.remove("sequence-cursor-cell-left")
        Project.getPlasmid(plasmidIndex).previousCell.classList.remove("sequence-cursor-cell-right")
      };
      // Update the cell tracker
      Project.getPlasmid(plasmidIndex).previousCell = cell;
    };

    // If the cursor has changed cells
    if (
      Project.getPlasmid(plasmidIndex).previousCell
      && (
        Project.getPlasmid(plasmidIndex).previousCell.id === "Forward Strand"
        || Project.getPlasmid(plasmidIndex).previousCell.id === "Complementary Strand"
      )
      && Project.getPlasmid(plasmidIndex).previousCell.textContent.trim() !== ''
    ) {
      // Find the area of the cell
      const cellRect = Project.getPlasmid(plasmidIndex).previousCell.getBoundingClientRect();
      // Find the borders of the cell
      const cellLeft = cellRect.left;
      const cellRight = cellRect.right;
      // Get the cursors' x coordinate
      const cursorX = event.clientX;

      // Calculate the distance from the cursor to the left and right sides of the cell
      const distanceToLeft = cursorX - cellLeft;
      const distanceToRight = cellRight - cursorX;

      // Apply border style to the side closest to the cursor
      if (distanceToLeft < distanceToRight) {
        Project.getPlasmid(plasmidIndex).previousCell.classList.add("sequence-cursor-cell-left")
        Project.getPlasmid(plasmidIndex).previousCell.classList.remove("sequence-cursor-cell-right")
      } else {
        Project.getPlasmid(plasmidIndex).previousCell.classList.remove("sequence-cursor-cell-left")
        Project.getPlasmid(plasmidIndex).previousCell.classList.add("sequence-cursor-cell-right")
      };
    };
  });

  // If the mouse leaves the table, deselect
  sequenceGridTable.addEventListener('mouseleave', function() {
    // Reset cell border styles when leaving the table
    if (Project.getPlasmid(plasmidIndex).previousCell) {
      Project.getPlasmid(plasmidIndex).previousCell.classList.remove("sequence-cursor-cell-left")
      Project.getPlasmid(plasmidIndex).previousCell.classList.remove("sequence-cursor-cell-right")
      Project.getPlasmid(plasmidIndex).previousCell = null;
    };
  });
};
