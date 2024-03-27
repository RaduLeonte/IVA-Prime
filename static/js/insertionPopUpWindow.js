/**
 * Listener for when the page is loaded.
 * 
 */
document.addEventListener('DOMContentLoaded', function () {
  // Creat the popup window and immediately hide it.
  const popupWindow = document.createElement('div');
  popupWindow.className = 'popup-window';
  popupWindow.innerHTML = `
    <h2 id="popUpWindowHeader">Insertion</h2>
    <div id="insertionInput" style="display: block">
      <div>
        <label for="dna-sequence-input">DNA Sequence:</label>
        <input type="text" id="dna-sequence-input" class="popup-window-input">
      </div>
      <div>
        <label for="amino-acid-sequence-input">Amino Acid Sequence:</label>
        <input type="text" id="amino-acid-sequence-input" class="popup-window-input">
        <p class="stop-codon-hint">Accepted STOP letter codes: "-", "X", "*".</p>
      </div>
    </div>

    <div id="subcloningInput" style="display: none">
      <h3>5' end insertion:</h3>
        <div>
          <label for="dna-sequence-input-5">DNA Sequence:</label>
          <input type="text" id="dna-sequence-input-5" class="popup-window-input">
        </div>
        <div>
          <label for="amino-acid-sequence-input-5">Amino Acid Sequence:</label>
          <input type="text" id="amino-acid-sequence-input-5" class="popup-window-input">
          <p class="stop-codon-hint">Accepted STOP letter codes: "-", "X", "*".</p>
        </div>
      <h3>3' end insertion:</h3>
        <div>
          <label for="dna-sequence-input-3">DNA Sequence:</label>
          <input type="text" id="dna-sequence-input-3" class="popup-window-input">
        </div>
        <div>
          <label for="amino-acid-sequence-input-3">Amino Acid Sequence:</label>
          <input type="text" id="amino-acid-sequence-input-3" class="popup-window-input">
          <p class="stop-codon-hint">Accepted STOP letter codes: "-", "X", "*".</p>
        </div>
    </div>

    <div>
      <p> Optimize codons for:
        <select name="targetOrganismSelector" id="targetOrganismSelector"></select>
      </p>
      <p class="stop-codon-hint">Codon frequency tables from <a href="https://hive.biochemistry.gwu.edu/review/codon2" target="_blank">CoCoPUTs</a> (<a href="https://doi.org/10.1016/j.jmb.2019.04.021" target="_blank">Alexaki et al. 2019</a>).</p>
    </div>
    <div>
      <button id="create-primers-button">Create Primers</button>
      <button id="cancel-button">Cancel</button>
    </div>
  `;
  popupWindow.style.display = 'none';
  document.body.appendChild(popupWindow);

  // Add all supported organisms
  const organismsList = Object.keys(codonTablesDict);
  const select = document.getElementById('targetOrganismSelector'); 
  for (let i = 0; i < organismsList.length; i++) {
    let newOption = new Option(organismsList[i],organismsList[i]);
    if (organismsList[i] === preferredOrganism) {
      newOption.setAttribute('selected','selected');
    };
    select.add(newOption,undefined);
  };

  // Button listeners
  popupWindow.addEventListener('click', function (event) {
    // Creat primers button
    if (event.target.id === 'create-primers-button') {
      const operationType = event.target.getAttribute("operation-type");
      if (operationType === "Subcloning") {
        // Get the entered values from the text inputs and sanitize them
        // To uppercase, then remove anything that is not ACTG
        dnaSequenceInput5 = document.getElementById('dna-sequence-input-5').value.toUpperCase().replace(/[^ATCG]/g, '');
        dnaSequenceInput3 = document.getElementById('dna-sequence-input-3').value.toUpperCase().replace(/[^ATCG]/g, '');
        // To uppercase, replace "-" and "*" with X
        aminoAcidSequenceInput5 = document.getElementById('amino-acid-sequence-input-5').value.toUpperCase().replace(/[-*]/g, 'X');
        aminoAcidSequenceInput3 = document.getElementById('amino-acid-sequence-input-3').value.toUpperCase().replace(/[-*]/g, 'X');
        // Only keep allowed amino acid 1 letter codes
        const allowedLetterCodes = Object.keys(aaToCodon);
        aminoAcidSequenceInput5 = aminoAcidSequenceInput5.split('').filter(char => allowedLetterCodes.includes(char)).join('');
        aminoAcidSequenceInput3 = aminoAcidSequenceInput3.split('').filter(char => allowedLetterCodes.includes(char)).join('');

        let startPos = plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"];
        let endPos = plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"];
        if (!startPos) {startPos = endPos};
        if (!endPos) {endPos = startPos};

        makeSubcloningPrimers(startPos, endPos, aminoAcidSequenceInput5, dnaSequenceInput5, aminoAcidSequenceInput3, dnaSequenceInput3, document.getElementById("targetOrganismSelector").value);

        // Clear the text inputs
        document.getElementById('dna-sequence-input-5').value = '';
        document.getElementById('dna-sequence-input-3').value = '';
        document.getElementById('amino-acid-sequence-input-5').value = '';
        document.getElementById('amino-acid-sequence-input-3').value = '';

      } else {
        // Get the entered values from the text inputs and sanitize them
        // To uppercase, then remove anything that is not ACTG
        dnaSequenceInput = document.getElementById('dna-sequence-input').value.toUpperCase().replace(/[^ATCG]/g, '');
        // To uppercase, replace "-" and "*" with X
        aminoAcidSequenceInput = document.getElementById('amino-acid-sequence-input').value.toUpperCase().replace(/[-*]/g, 'X');
        // Only keep allowed amino acid 1 letter codes
        const allowedLetterCodes = Object.keys(aaToCodon);
        aminoAcidSequenceInput = aminoAcidSequenceInput.split('').filter(char => allowedLetterCodes.includes(char)).join('');


        // Call the function to create insertion primers or replacement primers if we have text selected
        let startPos = plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"];
        let endPos = plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"];
        if (!startPos) {startPos = endPos};
        if (!endPos) {endPos = startPos};

        makePrimers(plasmidDict[currentlyOpenedPlasmid]["fileSequence"], dnaSequenceInput, aminoAcidSequenceInput, document.getElementById("targetOrganismSelector").value, startPos, endPos, operationType);
        

        // Clear the text inputs
        document.getElementById('dna-sequence-input').value = '';
        document.getElementById('amino-acid-sequence-input').value = '';
      };
      
      // Hide the popup window
      hidePopupWindow();
      
      // Cancel button
    } else if (event.target.id === 'cancel-button') {
      // Hide the popup window
      hidePopupWindow();
    };
  });

  // On window resize, reposition the window
  window.addEventListener('resize', function () {
    positionContextMenu(event.clientX, event.clientY);
  });
});


/**
 * Display pop up window and change its header.
 */
function showPopupWindow(headerText, operationType) {
  const popupWindow = document.querySelector('.popup-window');
  popupWindow.style.display = 'block';

  const popupWindowHeader = document.getElementById('popUpWindowHeader');
  popupWindowHeader.innerText = headerText;
  
  const createPrimersButton = popupWindow.querySelector('#create-primers-button');
  console.log("showPopUpWindow", createPrimersButton, operationType);
  createPrimersButton.setAttribute("operation-type", operationType);

  if (operationType === "Subcloning") {
    const insertionInput = document.getElementById("insertionInput");
    insertionInput.style.display = "none";

    const subcloningInput = document.getElementById("subcloningInput");
    subcloningInput.style.display = "block";
  } else {
    const insertionInput = document.getElementById("insertionInput");
    insertionInput.style.display = "block";

    const subcloningInput = document.getElementById("subcloningInput");
    subcloningInput.style.display = "none";
  }
};


/**
 * Hide pop up window.
 */
function hidePopupWindow() {
  const popupWindow = document.querySelector('.popup-window');
  popupWindow.style.display = 'none';
};


/**
 * Update the default selection in the organism selector
 */
function updateOrganismSelectorDefault() {
  const selectElement = document.getElementById("targetOrganismSelector");

  for (let i = 0; i < selectElement.options.length; i++) {
    const option = selectElement.options[i];

    // Check if the option value matches the new value
    if (option.value === preferredOrganism) {
      // Set the selected attribute to true for the matching option
      option.selected = true;
    } else {
      // Deselect any other options
      option.selected = false;
    };
  };
};