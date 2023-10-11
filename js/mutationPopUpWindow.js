function showMutationPopupWindow() {
  const mutationPopupWindow = document.querySelector('.mutation-popup-window');
  mutationPopupWindow.style.display = 'block';
}


function hideMutationPopupWindow() {
  const mutationPopupWindow = document.querySelector('.mutation-popup-window');
  mutationPopupWindow.style.display = 'none';
}


document.addEventListener('DOMContentLoaded', function () {
  const mutationPopupWindow = document.createElement('div');
  mutationPopupWindow.className = 'mutation-popup-window';
  mutationPopupWindow.innerHTML = `
    <h2>Mutate to:</h2>
    <div>
      <label for="mutate-to-sequence-input">DNA Sequence:</label>
      <input type="text" id="mutate-to-sequence-input">
    </div>
    <div>
      <button id="create-mutagenesis-primers-button" disabled>Create Mutagenesis Primers</button>
      <button id="cancel-button">Cancel</button>
    </div>
  `;
  mutationPopupWindow.style.display = 'none';
  document.body.appendChild(mutationPopupWindow);

  const createMutagenesisPrimersButton = document.getElementById('create-mutagenesis-primers-button');
  const mutateToSequenceInput = document.getElementById('mutate-to-sequence-input');

  mutateToSequenceInput.addEventListener('input', function () {
    const inputLength = mutateToSequenceInput.value.length;
    const selectionLength = Math.abs(selectionEndPos - selectionStartPos);

    if (inputLength > 0) {
      createMutagenesisPrimersButton.removeAttribute('disabled');
    } else {
      createMutagenesisPrimersButton.setAttribute('disabled', 'disabled');
    }
  });

  mutationPopupWindow.addEventListener('click', function (event) {
    if (event.target.id === 'create-mutagenesis-primers-button') {
      // Get the entered value from the text input
      mutateToSequence = mutateToSequenceInput.value;

      console.log('Mutate to Sequence:', mutateToSequence);

      // Call the function to create mutagenesis primers
      createMutagenesisPrimers(mutateToSequence, selectionStartPos, selectionEndPos);

      // Clear the text input
      mutateToSequenceInput.value = '';

      // Hide the popup window
      hideMutationPopupWindow();
    } else if (event.target.id === 'cancel-button') {
      // Hide the popup window
      hideMutationPopupWindow();
    }
  });

  window.addEventListener('resize', function () {
    positionContextMenu(event.clientX, event.clientY);
  });
});