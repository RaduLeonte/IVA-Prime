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
    <div>
      <label for="dna-sequence-input">DNA Sequence:</label>
      <input type="text" id="dna-sequence-input" class="popup-window-input">
    </div>
    <div>
      <label for="amino-acid-sequence-input">Amino Acid Sequence:</label>
      <input type="text" id="amino-acid-sequence-input" class="popup-window-input">
      <p class="stop-codon-hint">Accepted STOP letter codes: "-", "X", "*".</p>
      <p> Optimize codons for: <select name="targetOrganismSelector" id="targetOrganismSelector">
        <option value="prioLowTM">Prioritize melting temperature</option>
      </select> </p>
      <p class="stop-codon-hint">Codon frequency tables from <a href="https://www.genscript.com/tools/codon-frequency-table" target="_blank">GenScript</a>.</p>
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
      // Get the entered values from the text inputs and sanitize them
      // To uppercase, then remove anything that is not ACTG
      dnaSequenceInput = document.getElementById('dna-sequence-input').value.toUpperCase().replace(/[^ATCG]/g, '');
      // To uppercase, replace "-" and "*" with X
      aminoAcidSequenceInput = document.getElementById('amino-acid-sequence-input').value.toUpperCase().replace(/[-*]/g, 'X');
      // Only keep allowed amino acid 1 letter codes
      const allowedLetterCodes = Object.keys(aaToCodon);
      aminoAcidSequenceInput = aminoAcidSequenceInput.split('').filter(char => allowedLetterCodes.includes(char)).join('');


      // Call the function to create insertion primers or replacement primers if we have text selected
      if (!selectionEndPos || selectionEndPos === -1) {
        createReplacementPrimers(dnaSequenceInput, aminoAcidSequenceInput, document.getElementById("targetOrganismSelector").value, insertionPosition);
      } else {
        createReplacementPrimers(dnaSequenceInput, aminoAcidSequenceInput, document.getElementById("targetOrganismSelector").value, selectionStartPos, selectionEndPos);
      };
      
      // Clear the text inputs
      document.getElementById('dna-sequence-input').value = '';
      document.getElementById('amino-acid-sequence-input').value = '';

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
function showPopupWindow(headerText) {
  const popupWindow = document.querySelector('.popup-window');
  popupWindow.style.display = 'block';

  const popupWindowHeader = document.getElementById('popUpWindowHeader');
  popupWindowHeader.innerText = headerText;
};


/**
 * Hide pop up window.
 */
function hidePopupWindow() {
  const popupWindow = document.querySelector('.popup-window');
  popupWindow.style.display = 'none';
};


/**
 * Move context menu to coordinates.
 */
function positionContextMenu(clientX, clientY) {
  const contextMenu = document.querySelector('.custom-context-menu');
  contextMenu.style.left = clientX + 'px';
  contextMenu.style.top = clientY + 'px';
  //contextMenu.style.display = 'block';
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