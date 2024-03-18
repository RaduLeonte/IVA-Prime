/**
 *  Custom right click context menu.
 */
// Wait for document to load
document.addEventListener('DOMContentLoaded', function () {
  // Right click context menu logic while clicking on the content grid
  const contextMenu = document.querySelector(".custom-context-menu");

  document.getElementById("content").addEventListener('contextmenu', function (event) {
    event.preventDefault(); // Prevent default right click menu
    if (plasmidDict[currentlyOpenedPlasmid]["fileSequence"] !== "") {
      const contextMenu = document.querySelector('.custom-context-menu');
      contextMenu.style.display = "block";
      insertionPosition = plasmidDict[currentlyOpenedPlasmid]["basePosition"];
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
      console.log('Copyting selection.');
      copySelectionToClipboard(currentlyOpenedPlasmid, null);
    
    /**
     * Copy complementary strand
     */
    } else if (menuItemId === 'copy-complement') {
      console.log('Copyting selection.');
      copySelectionToClipboard(currentlyOpenedPlasmid, "complement");
    
    /**
     * Copy reverse complement
     */
    } else if (menuItemId === 'copy-rev-complement') {
      console.log('Copyting selection.');
      copySelectionToClipboard(currentlyOpenedPlasmid, "revcomplement");
    
    /**
     * Insert here
     */
    } else if (menuItemId === 'insertion') {
      console.log('Insertion selected');
      showPopupWindow("Insert here:", "Insertion"); // Show the popup window for insertions/replacements
    
    /**
     * Delete selection
     */
    } else if (menuItemId === 'deletion') {
      console.log('Deletion selected');
      //createDeletionPrimers(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]); // Create deletion primers
      createReplacementPrimers("", "", "", plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"], "Deletion");
    
    /**
     * Mutate selection
     */
    } else if (menuItemId === 'mutation') {
      console.log('Mutation selected');
      showPopupWindow("Mutate selection to:", "Mutation"); // Show the popup window for insertions/replacements
    
    /**
     * Mark selection as subcloning target
     */
    } else if (menuItemId === 'mark-for-subcloning') {
      console.log('Marking selection for subcloning', plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]);
      markSelectionForSubcloning(currentlyOpenedPlasmid, plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]);
    
      /**
     * Subclone into selection
     */
    } else if (menuItemId === 'subcloning') {
      console.log('Subcloning selected');
      createSubcloningPrimersNew(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"], "", "", "", "", null);

    /**
     * Subclone into selection with insertion
     */
    } else if (menuItemId === 'subcloning-with-insertion') {
      console.log('Subcloning selected');
      showPopupWindow("Subclone with insertions:", "Subcloning");

    /**
     * Begin translation at first ATG
     */
    } else if (menuItemId === 'begin-translation') {
      console.log('Beginning translation');
      // Start translation logic
      if (plasmidDict[currentlyOpenedPlasmid]["fileSequence"].slice(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] - 1, plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"] + 2) === "ATG") { // If we clicked on ATG, start translation there
        startTranslation(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"]);
      } else { // Else search for the first ATG then start there
        startTranslation(plasmidDict[currentlyOpenedPlasmid]["fileSequence"].indexOf("ATG", plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"]) + 1);
      };
    
    /**
     * Translate current selection
     */
    } else if (menuItemId === 'translate-selection') {
      const translateSpanStart = Math.min(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]);
      const translateSpanEnd = Math.max(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]) - 3;
      
      const targetTable = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
      const targetGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"];
      translateSpan("fwd", translateSpanStart, translateSpanEnd, targetTable, targetGridStructure, currentlyOpenedPlasmid);
    
    /**
     * Reverse ranslate current selection
     */
    } else if (menuItemId === 'translate-selection-rev') {
      const translateSpanStart = Math.min(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]);
      const translateSpanEnd = Math.max(plasmidDict[currentlyOpenedPlasmid]["selectionStartPos"], plasmidDict[currentlyOpenedPlasmid]["selectionEndPos"]);

      const targetTable = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
      const targetGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"];
      translateSpan("comp", translateSpanStart + 1, translateSpanEnd - 1, targetTable, targetGridStructure, currentlyOpenedPlasmid);
    };

    // Hide the menu once done
    hideContextMenu();
  });


  /**
   * 
   */
  function handleContextMenu(clientX, clientY) {
    // Record cursor position
    insertionPosition = plasmidDict[currentlyOpenedPlasmid]["basePosition"];
  
    // Select all the menu items
    const copySelectionMenuItem = document.getElementById('copy-selection');
    const copyComplementSelectionMenuItem = document.getElementById('copy-complement');
    const copyRevComplementSelectionMenuItem = document.getElementById('copy-rev-complement');

    const insertionMenuItem = document.getElementById('insertion');
    const deletionMenuItem = document.getElementById('deletion');
    const mutationMenuItem = document.getElementById('mutation');

    const markForSubcloningMenuItem = document.getElementById('mark-for-subcloning');
    const subcloningMenuItem = document.getElementById('subcloning');
    if (subcloningOriginPlasmidIndex !== null) {
      subcloningMenuItem.innerHTML = subcloningMenuItem.innerHTML.replace(/\((.*)\)$/, `(${subcloningOriginSpan[0]}-${subcloningOriginSpan[1]} from ${plasmidDict[subcloningOriginPlasmidIndex]["fileName"]})`);
    } else {
      subcloningMenuItem.innerHTML = subcloningMenuItem.innerHTML.replace(/\((.*)\)$/, `(<em>no region marked for subcloning</em>)`);
    };
    const subcloningWithInsertionMenuItem = document.getElementById('subcloning-with-insertion');

    const beginTranslationMenuItem = document.getElementById('begin-translation');
    const translateSelectionMenuItem = document.getElementById('translate-selection');
    const translateSelectionRevMenuItem = document.getElementById('translate-selection-rev');

    // Enable or disable menu items based on if the user is making a selection
    if (plasmidDict[currentlyOpenedPlasmid]["selectedText"]) {
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
    if (subcloningOriginSpan) {
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
  
  console.log("positionContextMenu", clientX, clientY, sequenceGrid.scrollLeft, sequenceGrid.scrollTop, sequenceGrid.getBoundingClientRect().left, sequenceGrid.getBoundingClientRect().top);
  let posX = clientX + sequenceGrid.scrollLeft - sequenceGrid.getBoundingClientRect().left;
  let posY = clientY + sequenceGrid.scrollTop - sequenceGrid.getBoundingClientRect().top;

  const maxX = sequenceGrid.scrollWidth - contextMenu.offsetWidth;
  const maxY = sequenceGrid.scrollHeight - contextMenu.offsetHeight;
  console.log("positionContextMenu", posX, posY, maxX, maxY, posX > maxX, posY > maxY, sequenceGrid.scrollHeight)
  
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