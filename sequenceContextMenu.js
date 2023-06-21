let clickedOffset = 0;
let selectedText = '';

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
}

document.addEventListener('DOMContentLoaded', function() {
  const targetElementId = 'sequence-grid';

  const contextMenu = document.createElement('div');
  contextMenu.className = 'custom-context-menu';
  contextMenu.innerHTML = `
    <ul>
      <li id="insertion" ${selectedText.length > 0 ? 'disabled' : ''}>Insert sequence</li>
      <li id="deletion" ${selectedText ? '' : 'disabled'}>Delete selection</li>
      <li id="mutation" ${selectedText ? '' : 'disabled'}>Mutate selection</li>
      <li id="subcloning" ${selectedText ? '' : 'disabled'}>Subclone</li>
    </ul>
  `;
  document.body.appendChild(contextMenu);

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

    contextMenu.style.top = event.pageY + 'px';
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.display = 'block';
  }

  function hideContextMenu() {
    contextMenu.style.display = 'none';
  }

  document.addEventListener('contextmenu', function(event) {
    event.preventDefault();

    if (event.target.matches(`#${targetElementId} td`)) {
      handleContextMenu(event.clientX, event.clientY);
    } else {
      hideContextMenu();
    }
  });

  document.addEventListener('click', function(event) {
    if (!event.target.closest('.custom-context-menu')) {
      hideContextMenu();
    }
  });

  contextMenu.addEventListener('click', function(event) {
    const menuItemId = event.target.id;
    const menuItem = document.getElementById(menuItemId);
    if (menuItem.disabled) {
      return;
    }

    if (menuItemId === 'insertion') {
      console.log('Insertion selected');
      const currentCursorPosition = clickedOffset;
      const tableRow = Array.from(table.rows).find(row => row.contains(event.target));
      const rowIndex = tableRow.rowIndex;
      const cellIndex = Array.from(tableRow.cells).indexOf(event.target);

      // Insertion logic here
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
});

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
