let dnaSequenceInput = '';
let aminoAcidSequenceInput = '';

function showPopupWindow() {
    const popupWindow = document.querySelector('.popup-window');
    popupWindow.style.display = 'block';
}

function hidePopupWindow() {
    const popupWindow = document.querySelector('.popup-window');
    popupWindow.style.display = 'none';
}

function positionContextMenu(clientX, clientY) {
    const contextMenu = document.querySelector('.custom-context-menu');
  
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
  
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
  
    // Calculate the maximum left and top positions to ensure the menu is entirely visible
    const maxLeft = windowWidth - menuWidth;
    const maxTop = windowHeight - menuHeight;
  
    // Calculate the left and top positions for the context menu
    const left = Math.min(clientX, maxLeft);
    const top = Math.min(clientY, maxTop);
  
    contextMenu.style.left = left + 'px';
    contextMenu.style.top = top + 'px';
    contextMenu.style.display = 'block';
  }
  
  function positionContextMenu(clientX, clientY) {
    const contextMenu = document.querySelector('.custom-context-menu');
  
    contextMenu.style.left = clientX + 'px';
    contextMenu.style.top = clientY + 'px';
    contextMenu.style.display = 'block';
  }
  

document.addEventListener('DOMContentLoaded', function () {
  const popupWindow = document.createElement('div');
  popupWindow.className = 'popup-window';
  popupWindow.innerHTML = `
    <h2>Insert Sequence</h2>
    <div>
      <label for="dna-sequence-input">DNA Sequence:</label>
      <input type="text" id="dna-sequence-input">
    </div>
    <div>
      <label for="amino-acid-sequence-input">Amino Acid Sequence:</label>
      <input type="text" id="amino-acid-sequence-input">
    </div>
    <div>
      <button id="create-primers-button">Create Primers</button>
      <button id="cancel-button">Cancel</button>
    </div>
  `;
  popupWindow.style.display = 'none';
  document.body.appendChild(popupWindow);

  popupWindow.addEventListener('click', function (event) {
    if (event.target.id === 'create-primers-button') {
      // Get the entered values from the text inputs
      dnaSequenceInput = document.getElementById('dna-sequence-input').value;
      aminoAcidSequenceInput = document.getElementById('amino-acid-sequence-input').value;

      // Call the function to create insertion primers
      //createInsertionPrimers(dnaSequenceInput, aminoAcidSequenceInput,insertionPosition);
      if (!selectionEndPos) {
        createReplacementPrimers(dnaSequenceInput, aminoAcidSequenceInput, insertionPosition);
      } else {
        createReplacementPrimers(dnaSequenceInput, aminoAcidSequenceInput, selectionStartPos, selectionEndPos);
      }
      

      // Clear the text inputs
      document.getElementById('dna-sequence-input').value = '';
      document.getElementById('amino-acid-sequence-input').value = '';

      // Hide the popup window
      hidePopupWindow();
    } else if (event.target.id === 'cancel-button') {
      // Hide the popup window
      hidePopupWindow();
    }
  });

  window.addEventListener('resize', function () {
    positionContextMenu(event.clientX, event.clientY);
  });
});
