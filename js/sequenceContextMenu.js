function updateMenuItems() {
  const insertionMenuItem = document.getElementById('insertion');
  const deletionMenuItem = document.getElementById('deletion');
  const mutationMenuItem = document.getElementById('mutation');
  const subcloningMenuItem = document.getElementById('subcloning');
  const beginTranslationMenuItem = document.getElementById('begin-translation');

  // Example logic for updating menu item states based on selectedText
  console.log(selectedText)
  if (selectedText) {
    insertionMenuItem.classList.add('disabled');
    beginTranslationMenuItem.classList.add('disabled');

    deletionMenuItem.classList.remove('disabled');
    mutationMenuItem.classList.remove('disabled');
  } else {
    insertionMenuItem.classList.remove('disabled');
    beginTranslationMenuItem.classList.remove('disabled');

    deletionMenuItem.classList.add('disabled');
    mutationMenuItem.classList.add('disabled');
  }

  if (selectedText && secondPlasmidIported) {
    subcloningMenuItem.classList.remove('disabled');
  } else {
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
      <li id="subcloning" disabled>Subclone selection</li>
      <li id="begin-translation" disabled>Begin translation here</li>
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
    event.stopPropagation();
    const menuItemId = event.target.id;
    const menuItem = document.getElementById(menuItemId);
    if (menuItem.disabled) {
      return;
    }

    if (menuItemId === 'insertion') {
      console.log('Insertion selected');

      // Show the popup window for sequence insertion
      showPopupWindow();
    } else if (menuItemId === 'deletion') {
      console.log('Deletion selected');
      createDeletionPrimers(selectionStartPos, selectionEndPos);
      // Deletion logic here
    } else if (menuItemId === 'mutation') {
      console.log('Mutation selected');
      //showMutationPopupWindow();
      showPopupWindow();
      // Mutation logic here
    } else if (menuItemId === 'subcloning') {
      console.log('Subcloning selected');
      // Subcloning logic here
      createSubcloningPrimers(selectionStartPos, selectionEndPos);
    } else if (menuItemId === 'begin-translation') {
      console.log('Beginning translation');
      if (sequence.slice(insertionPosition - 1, insertionPosition + 2) === "ATG") {
        startTranslation(insertionPosition, 1);
      } else {
        startTranslation(sequence.indexOf("ATG", insertionPosition) + 1, 1);
      }
    }

    hideContextMenu();
  });

  function getCharacterOffset(target) {
    const tableRow = target.parentNode;
    const cellIndex = Array.from(tableRow.cells).indexOf(target);

    return { rowIndex: tableRow.rowIndex, cellIndex };
  }
});