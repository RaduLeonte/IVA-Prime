let clickedOffset = 0;
let targetCell = null;
let target = null;
insertionPosition = null;

function updateMenuItems() {
  const insertionMenuItem = document.getElementById('insertion');
  const deletionMenuItem = document.getElementById('deletion');
  const mutationMenuItem = document.getElementById('mutation');
  const subcloningMenuItem = document.getElementById('subcloning');

  // Example logic for updating menu item states based on selectedText
  console.log(selectedText)
  if (selectedText) {
    insertionMenuItem.classList.add('disabled');
    deletionMenuItem.classList.remove('disabled');
    mutationMenuItem.classList.remove('disabled');
    subcloningMenuItem.classList.remove('disabled');
  } else {
    insertionMenuItem.classList.remove('disabled');
    deletionMenuItem.classList.add('disabled');
    mutationMenuItem.classList.add('disabled');
    subcloningMenuItem.classList.add('disabled');
  }
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

document.addEventListener('DOMContentLoaded', function () {
  const targetElementId = 'sequence-grid';

  const contextMenu = document.createElement('div');
  contextMenu.className = 'custom-context-menu';
  contextMenu.innerHTML = `
    <ul>
      <li id="insertion">Insert here</li>
      <li id="deletion" disabled>Delete selection</li>
      <li id="mutation" disabled>Mutate selection</li>
      <li id="subcloning" disabled>Subclone</li>
    </ul>
  `;
  document.body.appendChild(contextMenu);

  function handleContextMenu(clientX, clientY) {
    const table = document.getElementById(targetElementId);
    target = targetCell; // Declare the target variable
  
    clickedOffset = getCharacterOffset(targetCell);
  
    if (selectedText) {
      console.log('Selected text:', selectedText);
    }
    insertionPosition = basePosition;
    console.log('Clicked position:', insertionPosition);
  
    updateMenuItems();
  
    positionContextMenu(clientX, clientY);
  }
  

  function hideContextMenu() {
    const contextMenu = document.querySelector('.custom-context-menu');
    contextMenu.style.display = 'none';
  }

  document.addEventListener('contextmenu', function (event) {
    event.preventDefault();

    if (event.target.matches(`#${targetElementId} td`)) {
      targetCell = event.target; // Store the target cell
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
      const tableRow = target.parentNode;
      const rowIndex = tableRow.rowIndex;
      const cellIndex = Array.from(tableRow.cells).indexOf(target);

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

  function getCharacterOffset(target) {
    const tableRow = target.parentNode;
    const cellIndex = Array.from(tableRow.cells).indexOf(target);

    return { rowIndex: tableRow.rowIndex, cellIndex };
  }
});
