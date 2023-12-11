

/**
 * Enable editing functionality only to sidebar elements
 * */
function enableSidebarEditing() {
  const targetSidebar = document.getElementById("sidebar-table");
  const editableElements = targetSidebar.querySelectorAll('.editable');
  editableElements.forEach(element => {enableElementEditing(element)});
};



/**
 * Find if element has a before or after element
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
 * Add event listener for editing
 */
function enableElementEditing(element) {
  // Add click event listener to ::after element
  const afterOrBefore = getAfterOrBeforeElement(element);
  const pseudoElement = afterOrBefore ? element : element.querySelector(afterOrBefore);
  if (pseudoElement) {
    pseudoElement.addEventListener('click', () => {
      const originalText = element.textContent;
      console.log("Editable elements:", element, element.tagName, originalText)
      const input = document.createElement('input');
      input.classList.add("editable-input");
      input.classList.add("wrap-text");
      input.type = 'text';
      let fileExtension = null;
      if (element.tagName === "TD" && element.id === "Annotations") {
        input.value = originalText.replaceAll("...", "");
      } else if (element.tagName === "TD") {
        input.value = originalText
      } else if (element.tagName === "A") {
        fileExtension = /(?:\.([^.]+))?$/.exec(originalText)[1];
        console.log(fileExtension)
        input.value = originalText.replace("." + fileExtension, "");
      } else {
        input.value = originalText;
      };
      
      
      // Save the edited content when Enter is pressed
      input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
          if (element.tagName === "A") {input.value = input.value + "." + fileExtension}
          updateElementText(element, input.value, originalText);
          if (element.tagName === "TD") {updateFeaturesDict(element)};
        };
      });
  
      input.addEventListener('blur', () => {
        if (element.tagName === "A") {input.value = input.value + "." + fileExtension}
        updateElementText(element, input.value, originalText);       
        if (element.tagName === "TD") {updateFeaturesDict(element)};
      });
      
      element.textContent = '';
      element.appendChild(input);
      input.focus();
    });
  };
};


/**
 * Update the target element's text 
 */
function updateElementText(e, newText, originalText) {
  if (e.tagName === "TD" && e.id !== "Annotations") {
    e.textContent = newText;
  } else if (e.tagName === "TD" && e.id === "Annotations") {
    e.textContent = (newText !== "") ? newText.replaceAll("...", ""): originalText.replaceAll("...", "");
  } else if (e.tagName === "A") {
    e.textContent = (newText !== "") ? newText: originalText;
  } else if (e.id === "primers-type" || e.id === "primer-id") {
    e.textContent = (newText !== "") ? newText: originalText;
    if (originalText !== newText && newText !== "") {e.setAttribute("edited", true)};
  } else {
    e.textContent = newText;
  };
};


/**
 *  Update the features dict with the data currently in the sidebar table or in the annotations
 */
function updateFeaturesDict(cell) {
    const currFeatures = plasmidDict[currentlyOpenedPlasmid]["fileFeatures"];
    if (cell.id.includes("sidebar")) {
        console.log("Editable cells:", cell, cell.parentElement.children[0].innerText, cell.id.replace("sidebar-"), cell.textContent)
        currFeatures[cell.parentElement.children[0].innerText][cell.id.replace("sidebar-", "")] = cell.textContent;
        plasmidDict[currentlyOpenedPlasmid]["sidebarTable"] = createSidebarTable(currentlyOpenedPlasmid);
        if (cell.id === "sidebar-label") {
          plasmidDict[currentlyOpenedPlasmid]["contentGrid"] = makeContentGrid(currentlyOpenedPlasmid);
        };
        updateSidebarAndGrid(currentlyOpenedPlasmid);
    };
    enableSidebarEditing();
};