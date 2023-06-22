let clickedOffset = 0;
let selectedText = '';
let dnaSequenceInput = '';
let aminoAcidSequenceInput = '';

function updateMenuItems() {
  const insertionMenuItem = document.getElementById('insertion');
  const deletionMenuItem = document.getElementById('deletion');
  const mutationMenuItem = document.getElementById('mutation');
  const subcloningMenuItem = document.getElementById('subcloning');

  insertionMenuItem.disabled = selectedText.length > 0;
  deletionMenuItem.disabled = selectedText.length === 0;
  mutationMenuItem.disabled = selectedText.length === 0;
  subcloningMenuItem.disabled = selectedText.length === 0;

  insertionMenuItem.classList.toggle('disabled', selectedText.length > 0);
  deletionMenuItem.classList.toggle('disabled', selectedText.length === 0);
  mutationMenuItem.classList.toggle('disabled', selectedText.length === 0);
  subcloningMenuItem.classList.toggle('disabled', selectedText.length === 0);

  const selectedTextPreview = selectedText ? selectedText.substring(0, 5) : '';
  const selectedTextInfo = selectedText ? ` (${selectedTextPreview})` : '';
  insertionMenuItem.textContent = `Insert sequence${selectedTextInfo}`;
}

document.addEventListener('DOMContentLoaded', function () {
  const targetElementId = 'sequence-grid';

  const contextMenu = document.createElement('div');
  contextMenu.className = 'custom-context-menu';
  contextMenu.innerHTML = `
    <ul>
      <li id="insertion">Insert sequence</li>
      <li id="deletion" disabled>Delete selection</li>
      <li id="mutation" disabled>Mutate selection</li>
      <li id="subcloning" disabled>Subclone</li>
    </ul>
    <p id="selected-text-preview"></p>
  `;
  document.body.appendChild(contextMenu);

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
    <button id="insert-sequence-button">Insert</button>
  `;
  popupWindow.style.display = 'none';
  document.body.appendChild(popupWindow);

  contextMenu.style.display = 'none';

  function handleContextMenu(clientX, clientY) {
    const table = document.getElementById(targetElementId);

    const selection = window.getSelection();
    selectedText = selection.toString().trim();

    if (!selectedText) {
      selection.removeAllRanges();
      const range = document.createRange();
      range.setStart(table, 0);
      range.setEnd(table, 0);
      selection.addRange(range);
    }

    clickedOffset = getCharacterOffset(table, clientX, clientY);

    if (selectedText) {
      console.log('Selected text:', selectedText);
    }

    console.log('Clicked position:', clickedOffset);

    updateMenuItems();

    const selectedTextPreviewElement = document.getElementById('selected-text-preview');
    selectedTextPreviewElement.textContent = selectedText.length > 0 ? selectedText.substring(0, 5) : '';

    contextMenu.style.top = event.pageY + 'px';
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.display = 'block';
  }

  function hideContextMenu() {
    contextMenu.style.display = 'none';
  }

  document.addEventListener('contextmenu', function (event) {
    event.preventDefault();

    if (event.target.matches(`#${targetElementId} td`)) {
      handleContextMenu(event.clientX, event.clientY);
    } else {
      hideContextMenu();
    }
  });

  document.addEventListener('click', function (event) {
    if (!event.target.closest('.custom-context-menu')) {
      hideContextMenu();
    }
  });

  contextMenu.addEventListener('click', function (event) {
    const menuItemId = event.target.id;
    const menuItem = document.getElementById(menuItemId);
    if (menuItem.disabled) {
      return;
    }

    if (menuItemId === 'insertion') {
      console.log('Insertion selected');
      const currentCursorPosition = clickedOffset;
      const tableRow = Array.from(table.rows).find((row) => row.contains(event.target));
      const rowIndex = tableRow.rowIndex;
      const cellIndex = Array.from(tableRow.cells).indexOf(event.target);

      // Show the popup window for sequence insertion
      showPopupWindow();
    } else if (menuItemId === 'deletion') {
      console.log('Deletion selected');
      // Deletion logic here
    } else if (menuItemId === 'mutation') {
      console.log('Mutation selected');
      // Mutation logic here
    } else if (menuItemId === 'subcloning') {
      console.log('Subcloning selected');
      // Subcloning logic here
    }

    hideContextMenu();
  });

  popupWindow.addEventListener('click', function (event) {
    if (event.target.id === 'insert-sequence-button') {
      // Get the entered values from the text inputs
      dnaSequenceInput = document.getElementById('dna-sequence-input').value;
      aminoAcidSequenceInput = document.getElementById('amino-acid-sequence-input').value;

      console.log('DNA Sequence:', dnaSequenceInput);
      console.log('Amino Acid Sequence:', aminoAcidSequenceInput);

      // Insertion logic here

      // Clear the text inputs
      document.getElementById('dna-sequence-input').value = '';
      document.getElementById('amino-acid-sequence-input').value = '';

      // Hide the popup window
      hidePopupWindow();
    }
  });

  function showPopupWindow() {
    popupWindow.style.display = 'block';
    centerPopupWindow();
  }

  function hidePopupWindow() {
    popupWindow.style.display = 'none';
  }

  function centerPopupWindow() {
    const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    const popupWidth = popupWindow.offsetWidth;
    const popupHeight = popupWindow.offsetHeight;
    const left = (screenWidth - popupWidth) / 2;
    const top = (screenHeight - popupHeight) / 2;
    popupWindow.style.left = left + 'px';
    popupWindow.style.top = top + 'px';
  }

  function getCharacterOffset(element, clientX, clientY) {
    const range = document.createRange();
    const textNode = document.createTextNode('');
    range.setStart(element, 0);
    range.insertNode(textNode);

    const dummy = document.createElement('span');
    dummy.appendChild(document.createTextNode('\u200b'));
    range.insertNode(dummy);

    const rect = dummy.getBoundingClientRect();
    const offset = (clientX - rect.left) / dummy.offsetWidth;
    dummy.parentNode.removeChild(dummy);
    textNode.parentNode.removeChild(textNode);

    return Math.floor(offset * element.textContent.length);
  }

  window.addEventListener('resize', function () {
    centerPopupWindow();
  });
});