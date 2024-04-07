/**
 * Adds a scrolling effect when clicking on a feature in the side bar.
 */
function addScrollingEffectToFeatureTable() {
  const sidebarTable = document.getElementById("sidebar-table");

  // Listeners are added once the sidebar is populated after plasmid import
  const trList = sidebarTable.querySelectorAll("tr");
  trList.forEach((trElement) => {
    trElement.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      scrollToAnnotation(event.target.parentElement.id)
    });
  });    
};


/**
 * Scrolls to the annotaton specified by the sidebar row closes to where the user clicked.
 */
function scrollToAnnotation(featureID) {
  const currPlasmid = Project.activePlasmid()
  const annotationSpanString = currPlasmid.features[featureID].span;
  const annotationSpan = removeNonNumeric(annotationSpanString).split("..")

  const fileContentTable = document.getElementById('sequence-grid-' + Project.activePlasmidIndex);

  const [targetRow, targetCol] = seqIndexToCoords(
      annotationSpan[0],
      0, 
      currPlasmid.gridStructure
    );
  const targetCell = fileContentTable.rows[targetRow].cells[targetCol];


  // Scroll the "file-content" div to the desired cell
  if (targetCell) {
    targetCell.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  // Select feature
  selectBySpan(annotationSpanString);
};