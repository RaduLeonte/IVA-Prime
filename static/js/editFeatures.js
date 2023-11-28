/**
 * Enable editing functionality to file name elements
 */
function enableEditingOfFileNames(pNr) {
  const editableElements = document.getElementById("header-list").querySelectorAll('.editable');
  editableElements.forEach(element => {enableElementEditing(element, pNr)});
};


/**
 * Enable editing functionality only to sidebar elements
 * */
function enableSidebarEditing(pNr) {
  const targetSidebar = (pNr === 1) ? document.getElementById("sidebar-table"):  document.getElementById("sidebar-table2");
  const editableElements = targetSidebar.querySelectorAll('.editable');
  editableElements.forEach(element => {enableElementEditing(element, pNr)});
};


/**
 * Enable editing functionality to annotations
 * */
function enableAnnotationEditing(pNr) {
  const targetGrid = (pNr === 1) ? document.getElementById("sequence-grid"):  document.getElementById("sequence-grid2");
  const editableElements = targetGrid.querySelectorAll('.editable');
  editableElements.forEach(element => {enableElementEditing(element, pNr)});
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
function enableElementEditing(element, pNr) {
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
          if (element.tagName === "TD") {updateFeaturesDict(element, pNr)};
        };
      });
  
      input.addEventListener('blur', () => {
        if (element.tagName === "A") {input.value = input.value + "." + fileExtension}
        updateElementText(element, input.value, originalText);       
        if (element.tagName === "TD") {updateFeaturesDict(element, pNr)};
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
function updateFeaturesDict(cell, pNr) {
    const currFeatures = (pNr === 1) ? features: features2;
    if (cell.id === "Annotations") {
        const newContent = cell.textContent.replace("...", "")
        if (currFeatures[cell.getAttribute("feature-id")]["label"] !== newContent) {
            currFeatures[cell.getAttribute("feature-id")]["label"] = newContent;
            createSideBar(pNr);
            makeContentGrid(pNr);
        };
    } else if (cell.id.includes("sidebar")) {
        console.log("Editable cells:", cell, cell.parentElement.children[0].innerText, cell.id.replace("sidebar-"), cell.textContent)
        currFeatures[cell.parentElement.children[0].innerText][cell.id.replace("sidebar-", "")] = cell.textContent;
        createSideBar(pNr);
        if (cell.id === "sidebar-label") {
            makeContentGrid(pNr);
        };
    };
    enableSidebarEditing(pNr);
};

document.addEventListener('DOMContentLoaded', function() {
  enableEditingOfFileNames(1);
});