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