/**
 *  Custom right click context menu.
 */
// Wait for document to load
document.addEventListener('DOMContentLoaded', function () {
  // Create the menu and append it to the doc
  const targetElementId = 'sequence-grid';
  const contextMenu = document.createElement('div');
  contextMenu.className = 'custom-context-menu';
  contextMenu.innerHTML = `
  <div>
      <h3>IVA Cloning Operations</h3>
      <ul>
        <li id="insertion">Insert here</li>
        <li id="deletion" disabled>Delete selection</li>
        <li id="mutation" disabled>Mutate selection</li>
        <li id="subcloning" disabled>Subclone selection</li>
      </ul>
    </div>  
  <div>
      <h3>Copy</h3>
      <ul>
        <li id="copy-selection">Copy selection</li>
        <li id="copy-complement">Copy complement of selection</li>
        <li id="copy-rev-complement">Copy reverse complement of selection</li>
      </ul>
    </div>
    <div>
      <h3>Translation</h3>
      <ul>
        <li id="begin-translation" disabled>Begin translation at first ATG</li>
        <li id="translate-selection" disabled>Translate selection</li>
      </ul>
    </div>
  `;
  document.body.appendChild(contextMenu);
  contextMenu.style.display = "none";

  // Right click context menu logic while clicking on the content grid
  document.getElementById("content").addEventListener('contextmenu', function (event) {
    event.preventDefault(); // Prevent default right click menu
    if (sequence !== "") {
      const contextMenu = document.querySelector('.custom-context-menu');
      contextMenu.style.display = "block";
      insertionPosition = basePosition;
      console.log("HERE1", insertionPosition, basePosition)
      handleContextMenu(event.clientX, event.clientY);
    };
  });

  // Hite the context menu when clicking outside it
  document.addEventListener('click', function (event) {
    if (!event.target.closest('.custom-context-menu')) {
      hideContextMenu();
    };
  });

  /**
   * Menu items listeners
   */
  contextMenu.addEventListener('click', function (event) {
    event.stopPropagation();

    // Select clicked menu item if it is enabled
    const menuItemId = event.target.id;
    const menuItem = document.getElementById(menuItemId);
    if (menuItem.disabled) {
      return;
    };

    // Item logic
    if (menuItemId === 'copy-selection') {
      console.log('Copyting selection.');
      copySelectionToClipboard(1, );
    } else if (menuItemId === 'copy-complement') {
      console.log('Copyting selection.');
      copySelectionToClipboard(1, "complement");
    } else if (menuItemId === 'copy-rev-complement') {
      console.log('Copyting selection.');
      copySelectionToClipboard(1, "revcomplement");
    } else if (menuItemId === 'insertion') {
      console.log('Insertion selected');
      showPopupWindow("Insert here:"); // Show the popup window for insertions/replacements
    } else if (menuItemId === 'deletion') {
      console.log('Deletion selected');
      createDeletionPrimers(selectionStartPos, selectionEndPos); // Create deletion primers
    } else if (menuItemId === 'mutation') {
      console.log('Mutation selected');
      showPopupWindow("Replace selection with:"); // Show the popup window for insertions/replacements
    } else if (menuItemId === 'subcloning') {
      console.log('Subcloning selected');
      createSubcloningPrimers(selectionStartPos, selectionEndPos); // Start subcloning logic
    } else if (menuItemId === 'begin-translation') {
      console.log('Beginning translation');
      // Start translation logic
      if (sequence.slice(insertionPosition - 1, insertionPosition + 2) === "ATG") { // If we clicked on ATG, start translation there
        startTranslation(insertionPosition, 1);
      } else { // Else search for the first ATG then start there
        startTranslation(sequence.indexOf("ATG", insertionPosition) + 1, 1);
      };
    } else if (menuItemId === 'translate-selection') {
      console.log('Translating current selection', selectionStartPos, selectionEndPos);
      const translateSpanStart = Math.min(selectionStartPos, selectionEndPos);
      const translateSpanEnd = Math.max(selectionStartPos, selectionEndPos) - 3;
      console.log('Translating current selection', translateSpanStart, translateSpanEnd);
      translateSpan("fwd", translateSpanStart, translateSpanEnd, 1);
    };

    // Hide the menu once done
    hideContextMenu();
  });


  /**
   * 
   */
  function handleContextMenu(clientX, clientY) {
    // Record cursor position
    insertionPosition = basePosition;
  
    // Select all the menu items
    const copySelectionMenuItem = document.getElementById('copy-selection');
    const copyComplementSelectionMenuItem = document.getElementById('copy-complement');
    const copyRevComplementSelectionMenuItem = document.getElementById('copy-rev-complement');

    const insertionMenuItem = document.getElementById('insertion');
    const deletionMenuItem = document.getElementById('deletion');
    const mutationMenuItem = document.getElementById('mutation');
    const subcloningMenuItem = document.getElementById('subcloning');

    const beginTranslationMenuItem = document.getElementById('begin-translation');
    const translateSelectionMenuItem = document.getElementById('translate-selection');

    // Enable or disable menu items based on if the user is making a selection
    if (selectedText) {
      copySelectionMenuItem.classList.remove("disabled");
      copyComplementSelectionMenuItem.classList.remove("disabled");
      copyRevComplementSelectionMenuItem.classList.remove("disabled");
      // If there is a selection, disable insertions and translations
      insertionMenuItem.classList.add('disabled');
      beginTranslationMenuItem.classList.add('disabled');
      // Re-enable deletions and mutations
      deletionMenuItem.classList.remove('disabled');
      mutationMenuItem.classList.remove('disabled');
      translateSelectionMenuItem.classList.remove('disabled');
    } else {
      copySelectionMenuItem.classList.add("disabled");
      copyComplementSelectionMenuItem.classList.add("disabled");
      copyRevComplementSelectionMenuItem.classList.add("disabled");
      // If there is no selection, re-enable insertions and translations
      insertionMenuItem.classList.remove('disabled');
      beginTranslationMenuItem.classList.remove('disabled');
      // Disable deletions and mutations
      deletionMenuItem.classList.add('disabled');
      mutationMenuItem.classList.add('disabled');
      translateSelectionMenuItem.classList.add('disabled');
    };

    // If there is a selection and a second plasmid has been imported, enable the subcloning option
    if (selectedText && secondPlasmidImported) {
      subcloningMenuItem.classList.remove('disabled');
    } else {
      subcloningMenuItem.classList.add('disabled');
    };
    
    // Reposition the context menu
    positionContextMenu(clientX, clientY);
  };
  

  /**
   * Hides the context menu.
   */
  function hideContextMenu() {
    const contextMenu = document.querySelector('.custom-context-menu');
    contextMenu.style.display = 'none';
  }
});