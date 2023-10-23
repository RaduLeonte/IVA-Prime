function enableSequenceGridFeatureEditing(pNr) {
    const editableCells = document.querySelectorAll('.editable');

    editableCells.forEach(cell => {
      cell.addEventListener('dblclick', () => {
        const originalText = cell.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalText.replace("...", "");
        
        // Save the edited content when Enter is pressed
        input.addEventListener('keyup', (event) => {
          if (event.key === 'Enter') {
            updateFeaturesDict(cell, input, pNr);
          };
        });

        input.addEventListener('blur', () => {
            updateFeaturesDict(cell, input, pNr);
        });
        
        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
      });
    });
};

function updateFeaturesDict(cell, input, pNr) {
    cell.textContent = input.value;
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
};