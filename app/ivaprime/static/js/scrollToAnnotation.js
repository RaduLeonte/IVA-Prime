/**
 * Adds a scrolling effect when clicking on a feature in the side bar.
 */
function addScrollingEffectToFeatureTable() {
  const sidebarTable = document.getElementById("sidebar-table");

  // Listeners are added once the sidebar is populated after plasmid import
  const trList = sidebarTable.querySelectorAll("tr");
  console.log("addScrollingEffectToFeatureTable", trList)
  trList.forEach((trElement) => {
    trElement.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log("Scroll to", event.target.parentElement.id)
      scrollToAnnotation(event.target.parentElement.id)
    });
  });    
};


/**
 * Scrolls to the annotaton specified by the sidebar row closes to where the user clicked.
 */
function scrollToAnnotation(featureID) {
  const annotationSpanString = plasmidDict[currentlyOpenedPlasmid]["fileFeatures"][featureID].span;
  const annotationSpan = removeNonNumeric(annotationSpanString).split("..")
  console.log("Scrolling to cell", annotationSpanString, annotationSpan)

  const fileContentTable = document.getElementById('sequence-grid-' + currentlyOpenedPlasmid);

  const [targetRow, targetCol] = seqIndexToCoords(
      annotationSpan[0],
      0, 
      plasmidDict[currentlyOpenedPlasmid]["gridStructure"]
    );
  const targetCell = fileContentTable.rows[targetRow].cells[targetCol];
  console.log("Scrolling to cell", targetCell)


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