
/**
 * Enable editing functionality to all editable sidebar elements
 */
function enableSidebarEditing() {
  const targetSidebar = document.getElementById("sidebar-table");
  const editableElements = targetSidebar.querySelectorAll('.editable');
  editableElements.forEach(element => {
    enableElementEditing(element);
  });
};


/**
 * Enable editing functionality only to primer id elements
 */
function enablePrimerIDEditing() {
  const editableElements = document.querySelector('.sidebar-content').querySelectorAll('.editable');
  editableElements.forEach(element => {
    enableElementEditing(element);
  });
};


/**
 * Find if element has a before or after pseduoelement.
 * 
 * @param {Object} element
 * @returns {string} - "::after", "::before", or null
 */
function getAfterOrBeforeElement(element) {
  const afterElement = window.getComputedStyle(element, '::after');
  const beforeElement = window.getComputedStyle(element, '::before');

  if (afterElement.content !== 'none') {
    return '::after';
  } else if (beforeElement.content !== 'none') {
    return '::before';
  } else {
    return null;
  };
};


/**
 * Add event listener for editing to the specified element
 * 
 * @param {Object} element 
 */
function enableElementEditing(element) {
  // Add click event listener to ::after or ::before element
  const afterOrBefore = getAfterOrBeforeElement(element);
  const pseudoElement = afterOrBefore ? element : element.querySelector(afterOrBefore);

  // If pseudo element exists, add listeners
  if (pseudoElement) {
    // Click to activate
    pseudoElement.addEventListener('click', () => {
      // Save original text
      const originalText = element.textContent;
      
      // Create and display input element
      const input = document.createElement('input');
      input.classList.add("editable-input");
      input.classList.add("wrap-text");
      input.type = 'text';
      let fileExtension = null;

      if (element.tagName === "TD" && element.id === "Annotations") {
        // When editing annotation ribbon, remove dots
        input.value = originalText.replaceAll("...", "");
      } else if (element.tagName === "TD") {
        input.value = originalText
      } else if (element.tagName === "A") {
        // When editing plasmid name, hide the file extension
        fileExtension = /(?:\.([^.]+))?$/.exec(originalText)[1];
        input.value = originalText.replace("." + fileExtension, "");
      } else {
        input.value = originalText;
      };
      
      
      // Save the edited content when Enter is pressed
      input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
          // If editing plasmid name, add the file extension back
          if (element.tagName === "A") {
            input.value = input.value + "." + fileExtension
          };

          // Modify inner text of the element
          updateElementText(element, input.value, originalText);

          // If sidebar table cell was edited, refresh features dict
          if (element.tagName === "TD") {
            updateFeaturesDict(element)
          };
        };
      });
  
      input.addEventListener('blur', () => {
        // If editing plasmid name, add the file extension back
        if (element.tagName === "A") {
          input.value = input.value + "." + fileExtension
        };

        // Modify inner text of the element
        updateElementText(element, input.value, originalText); 

        // If sidebar table cell was edited, refresh features dict
        if (element.tagName === "TD") {
          updateFeaturesDict(element)
        };
      });
      
      // Display temporary input element and focus it
      element.textContent = '';
      element.appendChild(input);
      input.focus();
    });
  };
};


/**
 * Update the target element's inner text.
 * 
 * @param {Object} e - Event 
 * @param {string} newText - New text to be added
 * @param {string} originalText - Original text of the element
 */
function updateElementText(e, newText, originalText) {
  if (e.tagName === "TD" && e.id !== "Annotations") {
    // If the element is a sidebar table cell
    e.textContent = newText;
  } else if (e.tagName === "TD" && e.id === "Annotations") {
    // If the element is an annotation ribbon cell
    e.textContent = (newText !== "") ? newText.replaceAll("...", ""): originalText.replaceAll("...", "");
  } else if (e.tagName === "A") {
    // If the element is a link
    e.textContent = (newText !== "") ? newText: originalText;
  } else if (e.id === "primers-type") {
    // When editing the primer pair headline, automatically change the individual forward and reverse
    // primer ids
    // Change text content to new text
    e.textContent = (newText !== "") ? newText: originalText;
    
    // If the text has changed
    if (originalText !== newText && newText !== "") {
      // Mark element as previously edited
      e.setAttribute("edited", true)
      
      // Update individual primer ids with ids generated using the headline
      const modDiv = e.parentElement;
      const primerDivsList = modDiv.querySelectorAll("#primer-div");
      let primerCounter = 0;
      primerDivsList.forEach(function(pDiv) {
        const primerIdElement = pDiv.firstElementChild;
        const primerDirection = (primerCounter % 2 === 0) ? "_fwd": "_rev";
        const vectorPrimerString = (primerCounter > 1) ? "_vec": "";
        primerIdElement.textContent = newText + vectorPrimerString + primerDirection;
        primerIdElement.setAttribute("edited", true)
        primerCounter++;
      });
    };

  } else if (e.id === "primer-id") {
    // Mark primer ids as edited after editing
    e.textContent = (newText !== "") ? newText: originalText;
    if (originalText !== newText && newText !== "") {
      e.setAttribute("edited", true)
    };
  } else {
    e.textContent = newText;
  };

  // If something has changed, create checkpoint
  if (originalText !== newText && newText !== "") {
    savePrimers();
    saveProgress(currentlyOpenedPlasmid);
  };
};


/**
 *  Update the features dict with the data currently in the sidebar table or in the annotations
 * 
 * @param {Object} cell 
 */
function updateFeaturesDict(cell) {
  // Current file features
  const currFeatures = plasmidDict[currentlyOpenedPlasmid]["fileFeatures"];
  
  // If the cell stems from the sidebar, update that specific entry in the fileFeatures dict
  if (cell.id.includes("sidebar")) {
      currFeatures[cell.parentElement.children[0].innerText][cell.id.replace("sidebar-", "")] = cell.textContent;
      
      // Refresh sidebar table
      plasmidDict[currentlyOpenedPlasmid]["sidebarTable"] = createSidebarTable(currentlyOpenedPlasmid);
      
      // If a feature label was changed, also redraw the content grid
      if (cell.id === "sidebar-label") {
        plasmidDict[currentlyOpenedPlasmid]["contentGrid"] = makeContentGrid(currentlyOpenedPlasmid);
      };
      updateSidebarAndGrid(currentlyOpenedPlasmid);
  };

  // Reenable sidebar editing after redrawing
  enableSidebarEditing();
};