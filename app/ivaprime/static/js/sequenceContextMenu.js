/**
 *  Custom right click context menu.
 */
// Wait for document to load
document.addEventListener('DOMContentLoaded', function () {
  // Right click context menu logic while clicking on the content grid
  const contextMenu = document.querySelector(".custom-context-menu");

  document.getElementById("content").addEventListener('contextmenu', function (event) {
    event.preventDefault(); // Prevent default right click menu
    const currPlasmid = Project.activePlasmid();
    if (currPlasmid.sequence !== "") {
      const contextMenu = document.querySelector('.custom-context-menu');
      contextMenu.style.display = "block";
      insertionPosition = currPlasmid.basePosition;
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
    
    /**
     * Copy forward strand
     */
    if (menuItemId === 'copy-selection') {
      copySelectionToClipboard(Project.activePlasmidIndex, null);
    
    /**
     * Copy complementary strand
     */
    } else if (menuItemId === 'copy-complement') {
      copySelectionToClipboard(Project.activePlasmidIndex, "complement");
    
    /**
     * Copy reverse complement
     */
    } else if (menuItemId === 'copy-rev-complement') {
      copySelectionToClipboard(Project.activePlasmidIndex, "revcomplement");
    
    /**
     * Insert here
     */
    } else if (menuItemId === 'insertion') {
      showPopupWindow("Insert here:", "Insertion"); // Show the popup window for insertions/replacements
    
    /**
     * Delete selection
     */
    } else if (menuItemId === 'deletion') {
      const currPlasmid = Project.activePlasmid();
      makePrimers(
        currPlasmid.sequence,
        "",
        "",
        "",
        currPlasmid.selectionStartPos,
        currPlasmid.selectionEndPos,
        "Deletion",
        false
      );


    /**
     * Mutate selection
     */
    } else if (menuItemId === 'mutation') {
      showPopupWindow("Mutate selection to:", "Mutation"); // Show the popup window for insertions/replacements
    
    /**
     * Mark selection as subcloning target
     */
    } else if (menuItemId === 'mark-for-subcloning') {
      const currPlasmid = Project.activePlasmid();
      markSelectionForSubcloning(
        Project.activePlasmidIndex,
        currPlasmid.selectionStartPos,
        currPlasmid.selectionEndPos
      );
    
      /**
     * Subclone into selection
     */
    } else if (menuItemId === 'subcloning') {
      const currPlasmid = Project.activePlasmid();
      makeSubcloningPrimers(
        currPlasmid.selectionStartPos,
        currPlasmid.selectionEndPos,
        "",
        "",
        "",
        "",
        null
      );

    /**
     * Subclone into selection with insertion
     */
    } else if (menuItemId === 'subcloning-with-insertion') {
      showPopupWindow("Subclone with insertions:", "Subcloning");

    /**
     * Begin translation at first ATG
     */
    } else if (menuItemId === 'begin-translation') {
      const currPlasmid = Project.activePlasmid();
      // Start translation logic
      if (currPlasmid.sequence.slice(currPlasmid.selectionStartPos - 1, currPlasmid.selectionStartPos + 2) === "ATG") { // If we clicked on ATG, start translation there
        startTranslation(currPlasmid.selectionStartPos);
      } else { // Else search for the first ATG then start there
        startTranslation(currPlasmid.sequence.indexOf("ATG", currPlasmid.selectionStartPos) + 1);
      };
    
    /**
     * Translate current selection
     */
    } else if (menuItemId === 'translate-selection') {
      const currPlasmid = Project.activePlasmid();
      const translateSpanStart = Math.min(currPlasmid.selectionStartPos, currPlasmid.selectionEndPos);
      const translateSpanEnd = Math.max(currPlasmid.selectionStartPos, currPlasmid.selectionEndPos) - 3;
      
      const targetTable = document.getElementById("sequence-grid-" + Project.activePlasmidIndex);
      const targetGridStructure = currPlasmid.gridStructure;
      translateSpan(
        "fwd",
        translateSpanStart,
        translateSpanEnd,
        targetTable,
        targetGridStructure,
        Project.activePlasmidIndex
      );
    
    /**
     * Reverse ranslate current selection
     */
    } else if (menuItemId === 'translate-selection-rev') {
      const currPlasmid = Project.activePlasmid();
      const translateSpanStart = Math.min(currPlasmid.selectionStartPos, currPlasmid.selectionEndPos);
      const translateSpanEnd = Math.max(currPlasmid.selectionStartPos, currPlasmid.selectionEndPos);
      
      const targetTable = document.getElementById("sequence-grid-" + Project.activePlasmidIndex);
      const targetGridStructure = currPlasmid.gridStructure;
      translateSpan(
        "comp",
        translateSpanStart,
        translateSpanEnd,
        targetTable,
        targetGridStructure,
        Project.activePlasmidIndex
      );
    };

    // Hide the menu once done
    hideContextMenu();
  });


  /**
   * 
   */
  function handleContextMenu(clientX, clientY) {
    // Record cursor position
    const currPlasmid = Project.activePlasmid()
    insertionPosition = currPlasmid.basePosition;
  
    // Select all the menu items
    const copySelectionMenuItem = document.getElementById('copy-selection');
    const copyComplementSelectionMenuItem = document.getElementById('copy-complement');
    const copyRevComplementSelectionMenuItem = document.getElementById('copy-rev-complement');

    const insertionMenuItem = document.getElementById('insertion');
    const deletionMenuItem = document.getElementById('deletion');
    const mutationMenuItem = document.getElementById('mutation');

    const markForSubcloningMenuItem = document.getElementById('mark-for-subcloning');
    const subcloningMenuItem = document.getElementById('subcloning');
    if (Project.subcloningOriginIndex !== null) {
      const subcloningOriginSpan = Project.subcloningOriginSpan;
      const subcloningOriginIndex = Project.subcloningOriginIndex;
      subcloningMenuItem.innerHTML = subcloningMenuItem.innerHTML.replace(/\((.*)\)$/, `(${subcloningOriginSpan[0]}-${subcloningOriginSpan[1]} from ${Project.getPlasmid(subcloningOriginIndex).name})`);
    } else {
      subcloningMenuItem.innerHTML = subcloningMenuItem.innerHTML.replace(/\((.*)\)$/, `(<em>no region marked for subcloning</em>)`);
    };
    const subcloningWithInsertionMenuItem = document.getElementById('subcloning-with-insertion');

    const beginTranslationMenuItem = document.getElementById('begin-translation');
    const translateSelectionMenuItem = document.getElementById('translate-selection');
    const translateSelectionRevMenuItem = document.getElementById('translate-selection-rev');

    // Enable or disable menu items based on if the user is making a selection
    if (currPlasmid.selectedText) {
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
      translateSelectionRevMenuItem.classList.remove('disabled');
      markForSubcloningMenuItem.classList.remove('disabled');
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
      translateSelectionRevMenuItem.classList.add('disabled');
      markForSubcloningMenuItem.classList.add('disabled');
    };

    // If there is a selection and a second plasmid has been imported, enable the subcloning option
    if (Project.subcloningOriginSpan) {
      subcloningMenuItem.classList.remove('disabled');
      subcloningWithInsertionMenuItem.classList.remove('disabled');
    } else {
      subcloningMenuItem.classList.add('disabled');
      subcloningWithInsertionMenuItem.classList.add('disabled');
    };
    
    // Reposition the context menu
    positionContextMenu(clientX, clientY);
  };
});

/**
 * Move context menu to coordinates.
 */
function positionContextMenu(clientX, clientY) {
  const contextMenu = document.querySelector('.custom-context-menu');
  const sequenceGrid = document.getElementById("content");
  
  let posX = clientX + sequenceGrid.scrollLeft - sequenceGrid.getBoundingClientRect().left;
  let posY = clientY + sequenceGrid.scrollTop - sequenceGrid.getBoundingClientRect().top;

  const maxX = sequenceGrid.scrollWidth - contextMenu.offsetWidth;
  const maxY = sequenceGrid.scrollHeight - contextMenu.offsetHeight;
  
  if (posX > maxX) {
    contextMenu.style.left = (posX - contextMenu.offsetWidth) + 'px';
  } else {
    contextMenu.style.left = posX + 'px';
  };
  if (posY > maxY) {
    contextMenu.style.top = (posY - contextMenu.offsetHeight) + 'px';
  } else {
    contextMenu.style.top = posY + 'px';
  };
};

/**
   * Hides the context menu.
   */
function hideContextMenu() {
  const contextMenu = document.querySelector('.custom-context-menu');
  contextMenu.style.display = 'none';
}