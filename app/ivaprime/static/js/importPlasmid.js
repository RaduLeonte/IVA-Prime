/**
 * Project class.
 */
const Project = new class {
  constructor() {
      this.plasmids = {}; // Dictionary of imported plasmid files

      this.activePlasmidIndex = null; // Currently active plasmid file

      this.subcloningOriginIndex = null; // Index of plasmid from where the subcloning originates
      this.subcloningOriginSpan = null; // Span of subcloning target in origin plasmid
  };

  
  /**
   * 
   * @returns 
   */
  nextFreeIndex() {
    const entriesList = Object.keys(this.plasmids);
    if (entriesList.length !== 0) {
      return parseInt(entriesList[entriesList.length - 1]) + 1;
    } else {
      return 0;
    };
  };


  /**
   * 
   * @param {*} newPlasmid 
   */
  addPlasmid(newPlasmid) {
    // Check if index was given
    const currIndex = newPlasmid.index;
    // Add plasmid object to dict
    this.plasmids[currIndex] = newPlasmid;
    
    // Create a new tab
    const plasmidTabsList = document.getElementById("plasmid-tabs-list");
    const plasmidTabId = "plasmid-tab-" + currIndex;
    let liElement = document.getElementById(plasmidTabId);
    // Check if tab element already exists and
    if (!liElement) {
      liElement = document.createElement("LI");
      plasmidTabsList.appendChild(liElement);
    };
    liElement.id = "plasmid-tab-" + currIndex;
    liElement.innerHTML = `
    <a href="#" onclick="switchPlasmidTab(${currIndex})" oncontextmenu="togglePlasmidTabDropdownMenu(event, ${currIndex})">${newPlasmid.name}</a>
    <a class="plasmid-tab-dropdown" href="#"  onclick="togglePlasmidTabDropdownMenu(event, ${currIndex})" oncontextmenu="togglePlasmidTabDropdownMenu(event, ${currIndex})">▼</a>
    `;
    liElement.classList.add("plasmid-tab");

    // If there are no currently opened tabs
    if (Object.keys(this.plasmids).length - 1 === 0) {
      liElement.classList.add("plasmid-tab-selected");
      this.activePlasmidIndex = currIndex;
    };

    this.plasmids[currIndex].makeContentGrid();
    this.plasmids[currIndex].createSidebarTable();

    //this.plasmids[currIndex].savePrimers();
    this.plasmids[currIndex].saveProgress();

    // If there are no currently opened tabs
    if (Object.keys(this.plasmids).length - 1 === 0) {
      initiateSearchFunctionality();
      switchPlasmidTab(currIndex);
      updateAnnotationTrianglesWidth();
    };
  };


  /**
   * Return active plasmid object
   * 
   * @returns {Plasmid}
   */
  activePlasmid() {
    return this.plasmids[this.activePlasmidIndex];
  };


  getPlasmid(index) {
    return this.plasmids[index];
  }
};


/**
 * Plasmid class.
 */
class Plasmid {
  constructor(
    index,
    name,
    extension,
    sequence,
    features,
    additionalInfo
  ) {
    this.index = (index !== null) ? index: Project.nextFreeIndex();
    this.name = name;
    this.extension = extension;
    this.additionalInfo = additionalInfo;
    this.sequence = sequence;
    this.complementarySequence = getComplementaryStrand(sequence);
    this.features = features;
    this.translations = {"forward": [], "reverse": []};
    this.selectedText = "";
    this.selectionStartPos = null;
    this.selectionEndPos = null;
    this.primers = null;
    this.operationNr = 1;

    this.sidebarTable = null;
    this.contentGrid = null;
    this.history = [];

    this.historyTracker = 0;

    this.previousCell = null;
  };


  /**
   * 
   */
  savePrimers() {
    this.primers = document.querySelector('.sidebar-content').innerHTML.replace("&quot;", "'");
  };


  /**
   * 
   */
  saveProgress() {
    const toSave = [
      this.sequence,
      JSON.parse(JSON.stringify(this.features)),
      this.primers,
      this.sidebarTable,
      this.contentGrid,
      this.translations
    ];

    const currentInstance = this.historyTracker;
    let currentFileHistory = this.history;
    if (currentInstance === 0) {
        // We're on the newest version, extend the list
        this.history.push(toSave);
    } else {
        // We're somewhere in the past, rewrite history
        let slicedFileHistory = currentFileHistory.slice(0, currentFileHistory.length + currentInstance);
        slicedFileHistory.push(toSave)
        
        this.history = slicedFileHistory;
    };

    // Once we have 2 instances in the file history, enable the undo button
    this.historyTracker = 0;
    refreshUndoRedoButtons();
  };


  /**
   * 
   * @returns 
   */
  createSidebarTable() {
    let currFeatures = this.features;

    // Set table headers
    const sidebarDiv = document.createElement("DIV");
    sidebarDiv.id = "sidebar-table";
    sidebarDiv.classList.add("sidebar-table");

    // Iterate over the features and populate the table
    for (const featureID in currFeatures) {
      const feature = currFeatures[featureID];
      // Skip LOCUS and source
      if (!featureID.includes("LOCUS") && feature.type && !feature.type.includes("source")) {

        // Create a new table row
        const featureDiv = document.createElement("DIV");
        featureDiv.id = featureID;

        const collapsibleHeader = document.createElement("BUTTON");
        collapsibleHeader.type = "button";
        collapsibleHeader.classList.add("collapsible-header");
        collapsibleHeader.style.backgroundColor = feature.ivaprimeColor;
        //collapsibleHeader.style.borderLeft = `5px solid ${feature.ivaprimeColor}`;
        collapsibleHeader.innerText = feature.label;

        const collapsibleContent = document.createElement("DIV");
        collapsibleContent.classList.add("collapsible-content");
        collapsibleContent.style.display = "none";

        /**
         * Label
         */
        const labelDiv = document.createElement("DIV");
        labelDiv.classList.add("collapsible-content-hgroup");
        labelDiv.innerHTML = `
        <label class="collapsible-content-hgroup-label">Label</label>
        <div class="collapsible-content-hgroup-input">
          <input id="labelInput" value="${feature.label}">
          <div class="clr-field" style="color: ${feature.ivaprimeColor};">
            <button type="button" aria-labelledby="clr-open-label"></button>
            <input id="colorInput" type="text" class="coloris" data-coloris value="${feature.ivaprimeColor}"></div>
          </div>
        </div>
        `;
        collapsibleContent.appendChild(labelDiv);


        /**
         * Span
         */
        const spanDiv = document.createElement("DIV");
        const [spanStart, spanEnd] = removeNonNumeric(feature.span).split("..").map(Number);
        const spanEndMax = Project.activePlasmid().sequence.length;
        console.log(feature.span, [spanStart, spanEnd])
        spanDiv.classList.add("collapsible-content-hgroup");
        spanDiv.innerHTML = `
        <label class="collapsible-content-hgroup-label">Span</label>
        <div class="collapsible-content-hgroup-input">
          <input type="number" id="spanStartInput" min="1" max="${spanEndMax}" value="${spanStart}">
          <span> .. </span> 
          <input type="number" id="spanEndInput" min="1" max="${spanEndMax}" value="${spanEnd}">
        </div>
        `;
        collapsibleContent.appendChild(spanDiv);

        /**
         * Direction
         */
        const directionDiv = document.createElement("DIV");
        directionDiv.classList.add("collapsible-content-hgroup");
        directionDiv.innerHTML = `
        <label class="collapsible-content-hgroup-label">Direction</label>
        <div class="collapsible-content-hgroup-input">
          <select id="directionSelect">
            <option value="fwd">Forward</option>
            <option value="rev">Reverse</option>
          </select>
        </div>`;
        const options = directionDiv.getElementsByTagName("option");
        const featureDirection = (!feature.span.includes("complement")) ? "fwd": "rev";
        for (let i = 0; i < options.length; i++) {
          const option = options[i];
          if (option.value === featureDirection) {
            option.setAttribute('selected','selected');
          }
        };
        
        collapsibleContent.appendChild(directionDiv);


        /**
         * Translate feature
         */
        const translateDiv = document.createElement("DIV");
        translateDiv.classList.add("collapsible-content-hgroup");
        translateDiv.innerHTML = `
        <label class="collapsible-content-hgroup-label">Translate</label>
        <div class="collapsible-content-hgroup-input">
        <input type="checkbox" id="translateCheckbox" checked="${(feature.translation === "" || feature.translation === null || (typeof feature.translation) === 'undefined') ? false: true}">
        </div>
        `;
        translateDiv.getElementsByTagName("input")[0].checked = (feature.translation === "" || feature.translation === null  || (typeof feature.translation) === 'undefined') ? false: true;
        collapsibleContent.appendChild(translateDiv);


        /**
         * Feature type
         */
        const typeDiv = document.createElement("DIV");
        typeDiv.classList.add("collapsible-content-hgroup");
        typeDiv.innerHTML = `
        <label class="collapsible-content-hgroup-label">Feature type</label>
        <div class="collapsible-content-hgroup-input">
          <select id="typeSelect" onchange="
          if (this.options[this.selectedIndex].value=='customOption') {
            toggleInputInSelect(this, this.nextElementSibling);
            this.selectedIndex='0'}
            ">
          </select><input id="typeInput" name="browser" style="display: none;" disabled="disabled" onblur="
          if (this.value === '') {
            toggleInputInSelect(this, this.previousElementSibling);}
          ">
        </div>
        `;
        const defaultTypes = [
          "CDS",
          "misc_feature",
          "primer_bind",
          "promoter",
          "protein_bind",
          "source",
          "terminator"
        ];
        const select = typeDiv.getElementsByTagName("select")[0];
        for (let i = 0; i < defaultTypes.length; i++) {
          let newOption = new Option(defaultTypes[i], defaultTypes[i]);
          if (defaultTypes[i] === feature.type) {
            newOption.setAttribute('selected','selected');
          };
          select.add(newOption, undefined);
        };
        if (!defaultTypes.includes(feature.type)) {
          let newOption = new Option(feature.type, feature.type);
          newOption.setAttribute('selected','selected');
          select.add(newOption, undefined);
        };
        const customOption = new Option("Custom type", "customOption");
        select.add(customOption, undefined);

        collapsibleContent.appendChild(typeDiv);


        /**
         * Note
         */
        const noteDiv = document.createElement("DIV");
        noteDiv.classList.add("collapsible-content-hgroup");
        noteDiv.innerHTML = `
        <label class="collapsible-content-hgroup-label">Note</label>
        <div class="collapsible-content-hgroup-input">
          <textarea id="noteTextArea" spellcheck="false">${feature.note}</textarea>
        </div>
        `;
        collapsibleContent.appendChild(noteDiv);

        /**
         * Update info button
         */
        const updaetButtonDiv = document.createElement("DIV");
        updaetButtonDiv.classList.add("collapsible-content-hgroup");
        updaetButtonDiv.innerHTML = `
        <button class="update-feature-btn" onClick="updateFeatureProperties(this)">Update</button>
        <button class="update-feature-btn remove-feature-btn" onClick="removeFeatureButton(this)">Remove</button>
        `;
        collapsibleContent.appendChild(updaetButtonDiv);


        featureDiv.appendChild(collapsibleHeader);
        featureDiv.appendChild(collapsibleContent);
        sidebarDiv.appendChild(featureDiv);


        collapsibleHeader.addEventListener("click", function() {
          expandCollapsibleHeader(featureID, scroll=true);
        });
      };
    };

    this.sidebarTable = sidebarDiv;
  };


  /**
   * 
   * 
   */
  checkAnnotationOverlap() {
    let maximumOverlap = 0;
    let currFeatures = this.features
    
    // Iterate over all features and add their spans to a list
    const spansList = [];
    Object.entries(currFeatures).forEach(([key, value]) => {
      if (value.span && !key.includes("source")) { // Exclude source

        // Get the current span and push it to the spans list
        const spanList = removeNonNumeric(value.span);
        const range = spanList.split("..").map(Number);
        const rangeStart = range[0];
        const rangeEnd = range[1];
        spansList.push([rangeStart, rangeEnd])
      };
    });

    // Check each span against the rest
    for (let i = 0; i < spansList.length; i++) {
      // Get the i-th span
      const [startA, endA] = spansList[i];
      let currentOverlap = 0;
      // Check against every other span to see how many it overlaps
      for (let j = 0; j < spansList.length; j++) {
        if (i !== j) { // Excludes itself
          const [startB, endB] = spansList[j]; // Overlap to cehck against
          
          // Increment the current overlap if they do overlap
          if (startA >= startB && startA <= endB) {
            currentOverlap++;
          } else if (endA >= startB && endA <= endB) {
            currentOverlap++;
          };
        };
      };

      // IF a new maximum overlap was found, replace the previous one
      if (currentOverlap > maximumOverlap) {
        maximumOverlap = currentOverlap;
      };
    };
    // Increase once more for good measure
    maximumOverlap++;

    // Adjust the grid structure according to maximumOverlap
    let count = 0;
    let listInsertPos = 0;
    let currentGridStructure = this.gridStructure;
    if (!currentGridStructure) {
      // Default grid structure
      // TO DO: Add an amino acids row for each row of annotations
      currentGridStructure = [
        "Forward Strand",
        "Complementary Strand",
        "Amino Acids",
        "Annotations",
        "Spacer"
      ];
    };
    // Count how many rows are already dedicated to annotations
    for (let i = 0; i < currentGridStructure.length; i++) {
      if (currentGridStructure[i] === "Annotations") {
        count++;
      };
    };
      
    listInsertPos = currentGridStructure.indexOf("Annotations");
    // If more rows are needed, append them
    if (count < maximumOverlap) {
      for (let i = 0; i < maximumOverlap - count; i++) {
        currentGridStructure.splice(listInsertPos, 0 , "Annotations")
      };
    } else if (count > maximumOverlap) {
      let difference = count - maximumOverlap
      for (let i = currentGridStructure.length - 1; i >= 0; i--) {
        if (currentGridStructure[i] === "Annotations") {
            currentGridStructure.splice(i, 1);
            difference--;
            if (difference === 0) {
                break;
            };
        };
      };
    };

    return currentGridStructure;
  };


  /**
   * 
   * @returns 
   */
  makeContentGrid() {
    // Init variables
    let currSequence = this.sequence;
    let currComplementarySequence = this.complementarySequence;
    let currFeatures = this.features;
    
    const currentGridId = "sequence-grid-" + this.index;
    let sequenceGrid = document.createElement("TABLE");
    sequenceGrid.id = currentGridId;
    sequenceGrid.classList.add("sequence-grid");

    let gridHeight = 0;
    const newGridStructure = this.checkAnnotationOverlap();
    this.gridStructure = JSON.parse(JSON.stringify(newGridStructure));
    let currGridStructure = this.gridStructure;

    // Create the grid
    let currGridStructureLength = currGridStructure.length; // How many rows per line 
    // Sequence length / gridWidth rounded up to the nearest multiple to see how many lines are needed
    // Multiply with the amount of rows per line to get the total amount of table rows
    gridHeight = Math.ceil(currSequence.length / gridWidth) * currGridStructureLength;

    // Clear previous grid contents
    sequenceGrid.innerHTML = '';
    // Iterate over each row 
    for (let i = 0; i < gridHeight; i++) {
      let row = sequenceGrid.rows[i]; // Get the corresponding row$
      // If the row doesn't exist, create a new one
      if (!row) {
        row = sequenceGrid.insertRow(i);
      } ;
      row.id = currGridStructure[i % currGridStructureLength] + "-row";

      if (currGridStructure[i % currGridStructureLength] === "Spacer") {
        const cell = document.createElement('td');
        cell.id = currGridStructure[i % currGridStructureLength];
        cell.classList.add(currGridStructure[i % currGridStructureLength].replace(" ", ""));
        cell.colSpan = gridWidth;
        // Append the cell to the row
        row.appendChild(cell);
      } else {
        // Populate the sequence cells with the corresponding base
        for (let j = 0; j < gridWidth; j++) {
          const cell = document.createElement('td'); // Create the cell
          let currentChar = ""
          let linesCreated = Math.floor(i / currGridStructureLength) // Check how many "lines" have been created so far
    
          if ((i + 1) % currGridStructureLength === 1) { // If we're on the forward strand
            currentChar = currSequence[linesCreated*gridWidth + j] // Add the corrseponding char
          } else if ((i + 1) % currGridStructureLength === 2) {// If we're on the comlpementary strand
            currentChar = currComplementarySequence[linesCreated*gridWidth + j]
          };
          // If we've run out of bases to add add nothing
          if (!currentChar) {
            currentChar = ""
          };
    
          // Insert the base to the cell's text content
          cell.textContent = currentChar;
          // Add a cell id to distinguish the cells
          cell.id = currGridStructure[i % currGridStructureLength];
          // Add a cell class
          cell.classList.add(currGridStructure[i % currGridStructureLength].replace(" ", ""));
          if (cell.id === "Forward Strand" && currentChar !== "") {
            cell.classList.add("forward-strand-base");
          };
    
          // Append the cell to the row
          row.appendChild(cell);
        };
      }
    };

    
    let recentColor = ""
    // Delete previous translations
    this.translations = {"forward": [], "reverse": []};
    // Iterate over the features and create the annotatations
    Object.entries(currFeatures).forEach(([key, value]) => {
      if (value.span && value.type && !value.type.includes("source")) { // If the feature includes a span and is not "source"
        // Get the current feature's span
        const direction = (value.span.includes("complement")) ? "left": "right";
        const spanList = removeNonNumeric(value.span);
        const range = spanList.split("..").map(Number);
        const rangeStart = range[0];
        const rangeEnd = range[1];
        let annotText = (value.label) ? value.label: key;
        if (Math.abs(rangeEnd - rangeStart) < 3) {
          annotText = annotText.slice(0, 3)
        };
        
        // Check if color for this item already exists
        const globalColors = Array.from(window.getComputedStyle(document.documentElement))
                                  .filter(name => name.startsWith('--')) // Filter only variables
                                  .map(name => name.trim()); // Trim any extra whitespace
        const annotationColorVariable = this.index + key + "-annotation-color";

        // If color not in list, add generate one and add it
        let annotColor;
        if (!value["ivaprimeColor"]) {
          annotColor = generateRandomUniqueColor(recentColor);
          recentColor = annotColor;
          value["ivaprimeColor"] = annotColor;
          value["color"] = annotColor;
        } else {
          annotColor = value["ivaprimeColor"];
          value["color"] = annotColor;
        };
        
        document.documentElement.style.setProperty(`--${annotationColorVariable}`, annotColor);

        // Make the annotation at the specified indices
        makeAnnotation(rangeStart - 1, rangeEnd - 1, annotText, key, annotationColorVariable, sequenceGrid, currGridStructure);


        const triangleID = key;
        const featureCells = [];
        for (let rowIdx = 0; rowIdx < sequenceGrid.rows.length; rowIdx++) {
          for (let colIdx = 0; colIdx < sequenceGrid.rows[rowIdx].cells.length; colIdx++) {
              const cell = sequenceGrid.rows[rowIdx].cells[colIdx];
              const featureId = cell.getAttribute("feature-id");
      
              // Check if the cell has the attribute "feature-id" with the value "terminator"
              if (featureId === triangleID) {
                featureCells.push({ row: rowIdx, col: colIdx });
              };
          };
        } ;

        if (featureCells.length > 0) {
          let lowestCell = featureCells[0];
          let highestCell = featureCells[0];
      
          for (const cell of featureCells) {
              if (cell.row < lowestCell.row || (cell.row === lowestCell.row && cell.col < lowestCell.col)) {
                  lowestCell = cell;
              };
              if (cell.row > highestCell.row || (cell.row === highestCell.row && cell.col > highestCell.col)) {
                  highestCell = cell;
              };
          };
    

          if (direction === "left") {
            const targetRow = sequenceGrid.rows[lowestCell.row];
            const targetCell = targetRow.cells[lowestCell.col];
            const newCell = document.createElement("td");
            // Copy attributes from targetCell to newCell
            newCell.id = targetCell.id;
            newCell.class = targetCell.class;
            newCell["feature-id"] = targetCell["feature-id"];
            newCell.colSpan = 1;
            // Append the new cell right before the target cell
            targetRow.insertBefore(newCell, targetCell);

            if (targetCell.colSpan > 1) {
              targetCell.colSpan--;
            } else {
              targetRow.removeChild(targetCell);
            };
            createFilledTriangle(
              key,
              annotationColorVariable,
              "left",
              lowestCell.row,
              lowestCell.col,
              sequenceGrid,
              this.index
            );
          } else {
            const targetRow = sequenceGrid.rows[highestCell.row];
            const targetCell = targetRow.cells[highestCell.col];
            const newCell = document.createElement("td");
            // Copy attributes from targetCell to newCell
            newCell.id = targetCell.id;
            newCell.class = targetCell.class;
            newCell["feature-id"] = targetCell["feature-id"];
            newCell.colSpan = 1;
            // Append the new cell right after the target cell
            targetRow.insertBefore(newCell, targetCell.nextSibling);

            let colPos = highestCell.col;
            if (targetCell.colSpan > 1) {
              targetCell.colSpan--;
              colPos++;
            } else {
              targetRow.removeChild(targetCell);
            };
            createFilledTriangle(
              key,
              annotationColorVariable,
              "right",
              highestCell.row,
              colPos,
              sequenceGrid,
              this.index
            );
          };
        };

        // Check if feature needs to be translated
        if ((currFeatures[key]["translation"]) || (currFeatures[key]["note"] && (currFeatures[key]["note"].includes(" translation: ")))) {
          const targetStrand = (!value.span.includes("complement")) ? "fwd": "comp";
          translateSpan(
            targetStrand,
            parseInt(rangeStart),
            (targetStrand === "fwd") ? parseInt(rangeEnd): parseInt(rangeEnd) + 1,
            sequenceGrid,
            currGridStructure,
            this.index,
            this.sequence
          );
        };
      };
    });


    // Clean up cells that are not longer in a tr
    cleanLostCells(sequenceGrid);
    addCellSelection(sequenceGrid, this.index);
    addCellBorderOnHover(sequenceGrid, this.index);

    this.contentGrid = sequenceGrid;
  };

};


/**
 * 
 */
function expandCollapsibleHeader(featureID, scroll=false) {
  const targetHeader = document.getElementById(featureID).firstChild;
  const content = targetHeader.nextElementSibling;

  if (content.style.display === "none") {
    /**
     * Expand
     */
    closeCollapsibleHeaders();
    targetHeader.classList.toggle("collapsible-header-active");
    content.style.display = "block";
    content.style.maxHeight = content.scrollHeight + "px"; 
  
    if (scroll == true) {
      scrollToAnnotation(targetHeader.parentElement.id);
      targetHeader.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    };
  } else {
    /**
     * Close
     */
    targetHeader.classList.toggle("collapsible-header-active");
    content.style.display = "none";
    content.style.maxHeight = null; 
  };

};

/**
 * 
 */
function closeCollapsibleHeaders() {
  for (const header of document.querySelectorAll(".collapsible-header-active")) {
    header.classList.toggle("collapsible-header-active");
    const content = header.nextElementSibling;
    content.style.display = "none";
    content.style.maxHeight = null; 
  };
};


/**
 * 
 * @param {*} hideObj 
 * @param {*} showObj 
 */
function toggleInputInSelect(hideObj, showObj){
  console.log(hideObj)
  hideObj.disabled = true;		
  hideObj.style.display = 'none';
  console.log(showObj)
  showObj.disabled = false;	
  showObj.style.display = 'inline';
  showObj.focus();
};


/**
 * 
 * @param {*} btn 
 */
function updateFeatureProperties(btn) {
  // Current file features
  const currPlasmid = Project.activePlasmid();
  const parentDiv = btn.parentElement.parentElement;
  const featureID = parentDiv.parentElement.id;
  
  
  Project.activePlasmid().features[featureID].label = parentDiv.querySelectorAll("#labelInput")[0].value;
  console.log("updateFeatureProperties", Project.activePlasmid().features[featureID].label)

  Project.activePlasmid().features[featureID].color = parentDiv.querySelectorAll("#colorInput")[0].value;
  Project.activePlasmid().features[featureID].ivaprimeColor = parentDiv.querySelectorAll("#colorInput")[0].value;

  const direction = parentDiv.querySelectorAll("#directionSelect")[0].value;
  const spanStart = parentDiv.querySelectorAll("#spanStartInput")[0].value;
  const spanEnd = parentDiv.querySelectorAll("#spanEndInput")[0].value;
  Project.activePlasmid().features[featureID].span = (direction === "fwd") ? spanStart + ".." + spanEnd: "complement(" + spanStart + ".." + spanEnd + ")";

  if (parentDiv.querySelectorAll("#translateCheckbox")[0].checked === true) {
    const targetSequence = (direction === "fwd") ? currPlasmid.sequence.slice(spanStart - 1, spanEnd): getComplementaryStrand(currPlasmid.sequence.slice(spanStart - 1, spanEnd)).split("").reverse().join("");
    console.log("updateFeatureProperties", targetSequence);
    const translatedSequence = translateSequence(targetSequence);
    Project.activePlasmid().features[featureID].translation = translatedSequence;
    console.log("updateFeatureProperties", translatedSequence);
  } else {
    delete Project.activePlasmid().features[featureID].translation;
  };

  Project.activePlasmid().features[featureID].type = (parentDiv.querySelectorAll("#typeSelect")[0].disabled === false) ? parentDiv.querySelectorAll("#typeSelect")[0].value: parentDiv.querySelectorAll("#typeInput")[0].value;
  
  Project.activePlasmid().features[featureID].note = parentDiv.querySelectorAll("#noteTextArea")[0].value;

  
  // Refresh sidebar table
  currPlasmid.makeContentGrid();
  currPlasmid.createSidebarTable();
  
  updateSidebarAndGrid();
  currPlasmid.saveProgress();

  if (parentDiv.querySelectorAll("#translateCheckbox")[0].checked === true) {
    translateSpan(
      direction,
      parseInt(spanStart),
      (direction === "fwd") ? parseInt(spanEnd): parseInt(spanEnd) + 1,
      document.getElementById("sequence-grid-" + Project.activePlasmidIndex),
      Project.activePlasmid().gridStructure,
      Project.activePlasmidIndex
    );
  };
};


/**
 * 
 * @param {*} featureID 
 */
function removeFeature(featureID) {
    delete Project.activePlasmid().features[featureID];
  
    // Refresh sidebar table
    Project.activePlasmid().makeContentGrid();
    Project.activePlasmid().createSidebarTable();
    updateSidebarAndGrid();
    Project.activePlasmid().saveProgress();
};

function removeFeatureButton(btn) {
  // Current file features
  const parentDiv = btn.parentElement.parentElement;
  const featureID = parentDiv.parentElement.id;

  removeFeature(featureID)
};



function getUUID() {
  const uuidSegments = [];

  for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
          uuidSegments[i] = '-';
      } else if (i === 14) {
          uuidSegments[i] = '4'; // The version 4 UUID identifier
      } else if (i === 19) {
          // The first character of this segment should be 8, 9, A, or B
          uuidSegments[i] = (Math.random() * 4 + 8 | 0).toString(16);
      } else {
          // Generate a random hex digit
          uuidSegments[i] = (Math.random() * 16 | 0).toString(16);
      };
  };

  // Combine the segments into a single string
  return uuidSegments.join('');
};



function addNewFeature(newFeatureLabel, featureSpanStart, featureSpanEnd, direction="fwd", featureColor=null, newFeatureType="misc_feature", translateFeature=false, newFeatureNote="") {
  const currPlasmid = Project.activePlasmid();
  const newFeatureID = getUUID();

  const newFeatureSpan = (direction === "fwd") ? featureSpanStart + ".." + featureSpanEnd: "complement(" + featureSpanStart + ".." + featureSpanEnd + ")";
  const newFeatureColor = (featureColor === null) ? generateRandomUniqueColor(): featureColor;

  Project.activePlasmid().features[newFeatureID] = {
    type: newFeatureType,
    label: newFeatureLabel,
    span: newFeatureSpan,
    color: newFeatureColor,
    note: newFeatureNote,
  };

  if (translateFeature === true) {
    const targetSequence = (direction === "fwd") ? currPlasmid.sequence.slice(spanStart - 1, spanEnd): getComplementaryStrand(currPlasmid.sequence.slice(spanStart - 1, spanEnd)).split("").reverse().join("");
    const translatedSequence = translateSequence(targetSequence);
    Project.activePlasmid().features[newFeatureID].translation = translatedSequence;
  };

  Project.activePlasmid().features = sortBySpan(Project.activePlasmid().features);

  // Refresh sidebar table
  currPlasmid.makeContentGrid();
  currPlasmid.createSidebarTable();
  updateSidebarAndGrid();
  currPlasmid.saveProgress();
};


/**
 * On window load.
 */
window.onload = function() {
  /**
   * New file
   */
  const newFileWindow = document.createElement('div');
  newFileWindow.id = 'new-file-window';
  newFileWindow.className = 'popup-window popup-window-new-file';
  newFileWindow.innerHTML = `
    <h2 id="popUpWindowHeader">New File</h2>
    
    <div class="popup-window-hgroup">
      <label for="new-file-name-input">File name:</label>
      <input type="text" id="new-file-name-input" class="popup-window-input" value="untitled">
    </div>
    
    <div class="popup-window-hgroup" style="flex-grow: 1">
      <label for="new-file-sequence-input">DNA Sequence:</label>
      <textarea id="new-file-sequence-input" class="popup-window-input popup-window-textarea" spellcheck="false"></textarea>
    </div>

    <div class="popup-window-vgroup">
      <input type="checkbox" id="annotate-common-features-checkbox" name="annotate-common-features-checkbox" checked="true">
      <label for="annotate-common-features-checkbox">Annotate common features</label>
    </div>
    
    <div class="popup-window-vgroup">
      <button id="create-new-file-button">Create File</button>
      <button id="cancel-button">Cancel</button>
    </div>
  `;
  newFileWindow.style.display = 'none';
  document.body.appendChild(newFileWindow);

  function createNewFile() {
    // Hide the popup window
    const newFileName = document.getElementById("new-file-name-input").value;
    const newFileSequence = document.getElementById("new-file-sequence-input").value;
    const detectCommonFeatures = document.getElementById("annotate-common-features-checkbox").checked;

    hidePopupWindow();
    document.getElementById("new-file-name-input").value = "untitled";
    document.getElementById("new-file-sequence-input").value = "";

    newFileFromSequence(newFileName, newFileSequence, detectCommonFeatures);
  };

  // Button listeners
  newFileWindow.addEventListener('click', function (event) {
    // Creat new file button
    if (event.target.id === 'create-new-file-button') {
      createNewFile();

    } else if (event.target.id === 'cancel-button') {
      // Hide the popup window
      hidePopupWindow();
      document.getElementById("new-file-name-input").value = "untitled";
      document.getElementById("new-file-sequence-input").value = "";
    };
  });


  /**
   * On Enter, proceed
   */
  newFileWindow.addEventListener('keypress', function(event) {
    if (event.key === "Enter" && document.getElementById("new-file-window").style.display !== "none") {  
      event.preventDefault();
      event.stopPropagation();
      createNewFile();
    };
  });

  function showNewFileWindow() {
    const newFileWindow = document.getElementById("new-file-window");
    newFileWindow.style.display = '';
    document.getElementById("new-file-sequence-input").focus();
  };

  const newFileButton = '#new-file-btn a';
  document.querySelector(newFileButton).addEventListener('click', function (event) {
    event.preventDefault();
    showNewFileWindow();
  });


  /**
  * Import file
  */
  const targetButton = '#import-btn a';
  document.querySelector(targetButton).addEventListener('click', function (event) {
    event.preventDefault();
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', function(event) {
      handleFileSelect(
        event,
        plasmidIndex=Project.nextFreeIndex(),
        serverFile=null
      );
    });
    fileInput.click();
  });


  /**
  * Import demo
  */
  const demoButton = document.getElementById("import-demo-btn");
  demoButton.addEventListener('click', function() {
    handleFileSelect(
      null,
      plasmidIndex=Project.nextFreeIndex(),
      serverFile="\\static\\plasmids\\pET-28a(+).dna"
    );
  });
};



/**
 * Handles file selection functionality.
 */
async function handleFileSelect(event, plasmidIndex=0, serverFile=null, ) {
  if (serverFile) {
    const response = await fetch(serverFile);
    const blob = await response.blob();
    const file = new File([blob], serverFile.split('\\').pop());
    importFile(file, plasmidIndex);
  } else {
    importQueue(event.target.files)
  };
};

/** 
 * Drag and drop import
 */
function importDragOver(event) {
  event.preventDefault();
  document.body.classList.add('drag-import-overlay');
};

function importDragLeave(event) {
  event.preventDefault();
  document.body.classList.remove('drag-import-overlay');
};

async function importDrop(event) {
  event.preventDefault();
  document.body.classList.remove('drag-import-overlay');

  importQueue(event.dataTransfer.files);
};


function importQueue(filesList) {
  const startingPlasmidIndex = Project.nextFreeIndex();
  addLoadingCursor();
  let importTasks = []
  for (let i = 0; i < filesList.length; i++) {
    importTasks.push(importFile(filesList[i], startingPlasmidIndex + i));
  };
  
  Promise.all(importTasks).then(() => removeLoadingCursor())
};


function addLoadingCursor() {
  const loadingCoveringDiv = document.createElement('div');
  loadingCoveringDiv.id = "loading-covering-div";
  loadingCoveringDiv.style.position = 'fixed';
  loadingCoveringDiv.style.top = '0';
  loadingCoveringDiv.style.left = '0';
  loadingCoveringDiv.style.width = '100vw';
  loadingCoveringDiv.style.height = '100vh';
  loadingCoveringDiv.style.backgroundColor = 'transparent'; // Make it invisible
  loadingCoveringDiv.style.zIndex = '9999'; // Set a high z-index to ensure it covers other elements
  loadingCoveringDiv.style.cursor = 'wait'; // Set cursor to wait icon
  loadingCoveringDiv.addEventListener('mouseenter', function() {
      this.style.cursor = 'wait';
  });
  document.body.appendChild(loadingCoveringDiv);
};


function removeLoadingCursor() {
  const loadingCoveringDiv = document.getElementById("loading-covering-div")
  if (loadingCoveringDiv && loadingCoveringDiv.parentNode) {
    loadingCoveringDiv.parentNode.removeChild(loadingCoveringDiv);
  };
};


/**
 * Sanitize DNA sequence
 */
function sanitizeDNASequence(input) {
  return input.toUpperCase().trim().replace(/[\r\n\t\s]+/g, "");
};



/**
 * Imports and parses given file object
 */
function importFile(file, plasmidIndex=null) {
  const disclaimer = document.getElementById("disclaimer");
  if (disclaimer) {
    disclaimer.parentElement.removeChild(disclaimer)
  };

  return new Promise((resolve, reject) => {
    file.name = file.name.match(/[^\\/]*$/)[0];
    const fileExtension =  /\.([0-9a-z]+)(?:[\?#]|$)/i.exec(file.name)[0]; // Fish out file extension of the file
    // If the file has an acceptable file extension start parsing
    const acceptedFileExtensions = [".gbk", ".gb", ".dna"]
    if (acceptedFileExtensions.includes(fileExtension)) {
      // Initialise file reader
      const reader = new FileReader();
  
      // Define reader
      if (fileExtension === ".dna") {
        reader.onload = function(e) {
          let fileContent = e.target.result;
          // Depending on file extension pass the file content to the appropiate parser
          let parsedFile = null;
          parsedFile = parseDNAFile(fileContent);
  
          Project.addPlasmid(new Plasmid(
            plasmidIndex,
            file.name,
            fileExtension,
            parsedFile.fileSequence,
            parsedFile.fileFeatures,
            parsedFile.fileAdditionalInfo
          ));
        };
        // Run reader
        reader.readAsArrayBuffer(file);

      } else {
        reader.onload = function(e) {
          let fileContent = e.target.result;
          // Depending on file extension pass the file content to the appropiate parser
          let parsedFile = null;
          parsedFile = parseGBFile(fileContent);
  
          Project.addPlasmid(new Plasmid(
            plasmidIndex,
            file.name,
            fileExtension,
            parsedFile.fileSequence,
            parsedFile.fileFeatures,
            parsedFile.fileAdditionalInfo
          ));
        };
        // Run reader
        reader.readAsText(file);
      };
    };

    setTimeout(() => {
      resolve();
    }, 1); 
  });
};


/**
 * Load common features
 */
let commonFeatures;
function loadCommonFeatures() {
    fetch('static/commonFeatures.json')
    .then(response => response.json())
    .then(json => {
        commonFeatures = json;
    });
};
document.addEventListener('DOMContentLoaded', loadCommonFeatures);


/**
 * Create a new plasmid from user input
 */
function newFileFromSequence(newFileName, newFileSequence, detectCommonFeatures) {
  newFileSequence = sanitizeDNASequence(newFileSequence);
  const newFileComplementarySequence = getComplementaryStrand(newFileSequence);

  let newFileFeatures = {
    "LOCUS": {
      label: "",
      note: "",
      span: ""
    }
  };
  
  // Detect common features
  if (detectCommonFeatures === true) {
    // Once for forward strand, then complementary strand
    const foundFeatures = [];
    for (let i = 0; i < 2; i++) {
      const currentSequence = (i === 0) ? newFileSequence: newFileComplementarySequence.split("").reverse().join("");
      const readingFrames = [
        translateSequence(currentSequence),
        translateSequence(currentSequence.slice(1) + currentSequence.slice(0, 1)),
        translateSequence(currentSequence.slice(2) + currentSequence.slice(0, 2))
      ];

      for (const commonFeatureIndex in commonFeatures) {
        const commonFeatureDict = commonFeatures[commonFeatureIndex];
        const featureLabel = commonFeatureDict["label"];
        const featureSequenceType = commonFeatureDict["sequence type"];
        const featureSequence = commonFeatureDict["sequence"];
        const regex = new RegExp(featureSequence, 'g');
        let match;

        const similarFeatures = [];
        // Iterate over the values in the dictionary
        Object.values(newFileFeatures).forEach((feature) => {
          if (feature.label == featureLabel) {
            similarFeatures.push(removeNonNumeric(feature.span).split(".."));
          };
        });
        console.log("similarFeatures", featureLabel, similarFeatures);

        if (featureSequenceType === "AA") {
          for (let j = 0; j < readingFrames.length; j++) {
            while ((match = regex.exec(readingFrames[j])) !== null) {
              const newFeatureId = getUUID();
              const startIndex = (i === 0) ? match.index*3 + j + 1: currentSequence.length - j - match.index*3 - featureSequence.length*3 + 1;
              const endIndex = startIndex + featureSequence.length*3 - 1;
              const newFeatureSpan = (i === 0) ? startIndex + ".." + endIndex: "complement(" + startIndex + ".." + endIndex + ")";
              
              let canAdd = true;

              Object.values(similarFeatures).forEach((existingSpan) => {
                if (existingSpan[0] <= startIndex && endIndex <= existingSpan[1]) {
                  console.log("similarFeatures overlap", featureLabel, [startIndex, endIndex], existingSpan)
                  canAdd = false;
                };
              });

              if (canAdd) {
                newFileFeatures[newFeatureId] = {
                  label: featureLabel,
                  type: commonFeatureDict["type"],
                  span: newFeatureSpan,
                  translation: featureSequence,
                  note: (commonFeatureDict["note"] !== null) ? commonFeatureDict["note"]: ""
                };
              };
            };
          };

        } else if (featureSequenceType === "DNA") {
          while ((match = regex.exec(currentSequence)) !== null) {
            const newFeatureId = getUUID();
            const startIndex = (i === 0) ? match.index + 1: currentSequence.length - match.index - featureSequence.length + 1;
            const endIndex = startIndex + featureSequence.length - 1;
            const newFeatureSpan = (i === 0) ? startIndex + ".." + endIndex: "complement(" + startIndex + ".." + endIndex + ")";
            
            
            let canAdd = true;

            Object.values(similarFeatures).forEach((existingSpan) => {
              if (existingSpan[0] <= startIndex && endIndex <= existingSpan[1]) {
                console.log("similarFeatures overlap", featureLabel, [startIndex, endIndex], existingSpan)
                canAdd = false;
              };
            });

            if (canAdd) {
              newFileFeatures[newFeatureId] = {
                label: featureLabel,
                type: commonFeatureDict["type"],
                span: newFeatureSpan,
                note: (commonFeatureDict["note"] !== null) ? commonFeatureDict["note"]: ""
              };
            };
          };
        };
      };
    };

    newFileFeatures = sortBySpan(newFileFeatures);
  };

  Project.addPlasmid(new Plasmid(
    null,
    newFileName + ".gb",
    ".gb",
    newFileSequence,
    newFileFeatures,
    null
  ));
};


/**
 * Genebank file parser.
 * 
 * 
 * TO DO:
 * - fix joined features
 */
function parseGBFile(fileContent) {
  const headerNrSpaces = 12;
  // Extract header
  let currFileHeader = fileContent.substring(0, fileContent.indexOf("FEATURES")).split('\n');

  function parseTextToDict(lines) {
    const propertiesDict = {};
    const references = [];
    const stack = [{ depth: 0, dict: propertiesDict }];

    lines.forEach(line => {
        const depth = line.search(/\S|$/); // Count leading spaces
        const trimmedLine = line.trim();

        if (!trimmedLine) return; // Skip empty lines

        const [key, ...valueParts] = trimmedLine.split(/\s+/);
        const value = valueParts.join(' ');

        // Find the appropriate depth level in the stack
        while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
            stack.pop();
        };

        // Get the current dictionary from the top of the stack
        const currentDict = stack.length > 0 ? stack[stack.length - 1].dict : propertiesDict;

        if (key === 'REFERENCE') {
            // Handle REFERENCE separately
            const referenceEntry = {"REFERENCE": {value, children: {} }};
            references.push(referenceEntry);
            // Push the new reference entry onto the stack
            stack.push({ depth, dict: referenceEntry["REFERENCE"].children });
        } else {
            // Add the new entry to the current dictionary
            currentDict[key] = { value, children: {} };
            // Push the new dictionary and its depth onto the stack
            stack.push({ depth, dict: currentDict[key].children });
        };
    });

    // Add references at the end of the dictionary
    propertiesDict.references = references;

    return propertiesDict;
  };
  
  currFileHeader.shift();
  let newLines = [];
  currFileHeader.map(line => {
    const match = line.match(/^\s*/);
    const leadingSpaces = match ? match[0].length : 0;
    if (leadingSpaces < 12) {
      newLines.push(line);
    } else {
      newLines[newLines.length - 1] += line;
    };
  });

  const fileAdditionalInfo = parseTextToDict(newLines)

  const fileSequence = extractGBSequence(fileContent);
  const fileComplementarySequence = getComplementaryStrand(fileSequence);
  const fileFeatures = extractGBFeatures(fileContent);
  return {
    fileSequence,
    fileComplementarySequence,
    fileFeatures,
    fileAdditionalInfo
  };
};


/**
 * Extracts the sequence from the end of the file.
 * Data is structure as:
 * ORIGIN      
      1 tcaatattgg ccattagcca tattattcat tggttatata gcataaatca atattggcta
      61 ttggccattg catacgttgt atctatatca taatatgtac atttatattg gctcatgtcc
    121 aatatgaccg ccatgttggc attgattatt gactagttat taatagtaat caattacggg
  */
function extractGBSequence(input) {
  // Find "ORIGIN" and delete everything before the sequence
  input = input.substring(input.indexOf("ORIGIN") + "ORIGIN".length);
  // Regular expressions to get the sequence out
  let output = input.replace(/\n/g, '').replace(/\/\//g, '').split(' ').filter(x => !/\d/.test(x));
  output = output.join('').toUpperCase().trim().replace(/[\r\n]+/g, "");
  return output;
};
    
  
/**
 * Extracts the features.
 * Data structure:
 * regulatory      1..742
                   /regulatory_class="promoter"
                    /note="CMV immediate/early promoter"
                    /label="CMV immediate/early promoter regulatory"
    intron          857..989
                    /note="chimeric intron"
                    /label="chimeric intron"
    regulatory      1033..1052
                    /regulatory_class="promoter"
                    /note="T7 RNA polymerase promoter"
                    /label="T7 RNA polymerase promoter regulatory"
  */
function extractGBFeatures(input) {
  // Convert file content to list of lines
  const inputLines = input.split('\n').map(line => line.trim()).filter(line => line);
  
  const featuresDict = {}; // initialise features dict

  // Add LOCUS feature which is defined on the first line
  const firstLine = inputLines[0];
  const locusNote = firstLine.trim();
  featuresDict['LOCUS'] = { note: locusNote.replace("LOCUS ", ""), span: "", label: ""};

  // Start deleting lines until we find the lines with "FEATURES"
  while (inputLines.length > 0 && !inputLines[0].includes("FEATURES")) {
      inputLines.shift(); // Remove the first item
  };
  inputLines.shift(); // Remove the line with "FEATURES"
  

  // Iterate over the remaining lines and group the lines based on what feature they belong to
  const featureList = [];
  let currentFeature = '';
  for (const line of inputLines) {
    if (line.includes('..')) { // If the line has .., then its probalby the line with the span
      if (currentFeature !== '') {
        featureList.push(currentFeature); // If this is not the first loop, send the feature with the lines collected so far
      };
      currentFeature = ''; // Reset
    };
    if (line === "ORIGIN") {break};
    // Add the current line to the current feature
    currentFeature += line + '\n';
  };
  
  // If theres still a feature not yet pushed, push it
  if (currentFeature !== '') {
    featureList.push(currentFeature);
  };
  
  // Iterate over the list of features and parse them into a dict
  for (const feature of featureList) {
    // Split current feature into a list of lines
    const oldLines = feature.split('\n').map(line => line.trim()).filter(line => line);
    let lines = [];
    let lineToAppend = "";
    for (l in oldLines) {
      if(l !== 0 && oldLines[l].includes("/")) {
        lines.push(lineToAppend);
        lineToAppend = oldLines[l];
      } else {
        lineToAppend += oldLines[l];
      };
    };
    lines.push(lineToAppend);

    // Ignore joined features for now
    if (!lines[0].includes("join")) {
      // Get feature name
      const featureId = getUUID();
      const featureType = lines[0].substring(0, lines[0].indexOf(' '));
      
      // Start collecting info about the feature, starting with the span
      // Span is always on the first line
      const featureInfo = {
        type: featureType,
        span: lines[0].includes('complement') ? lines[0].substring(lines[0].indexOf('complement')) : lines[0].replace(featureType, '').trim(),
      };
    
      // Iterate over the rest of the lines and save the properties to the feature info dict
      for (let j = 1; j < lines.length; j++) {
        const property = lines[j];
        const propertyName = property.substring(0, property.indexOf('=')).replace('/', '').replace('"', '');
        const propertyBody = property.substring(property.indexOf('=') + 1).replace(/"/g, '').trim();
    
        featureInfo[propertyName] = propertyBody;
      };
    
      // Add the feature info dict to the features dict
      featuresDict[featureId] = featureInfo;
    };
  };
  
  // Return the dict
  return featuresDict;
};


/**
 * Return the index of the matching subarray of bytes in the input byteArray.
 */
function findSubarrayIndex(byteArray, subarray) {
  for (let i = 0; i <= byteArray.length - subarray.length; i++) {
    let match = true;
    for (let j = 0; j < subarray.length; j++) {
      if (byteArray[i + j] !== subarray[j]) {
        match = false;
        break;
      };
    };
    if (match) {
      return i;
    };
  };
  return -1;
};


/**
 * Snapgene file parser.
 */
function parseDNAFile(fileArrayBuffer) {
  const arrayBuf = new Uint8Array(fileArrayBuffer);
  let fileContent = new TextDecoder().decode(arrayBuf);

  const sequenceLengthHex = Array.from(arrayBuf.slice(20, 24)).map(byte => (byte.toString(16)));
  const sequenceLength = parseInt(sequenceLengthHex.join(" ").replace(/\s/g, ''), 16);
  console.log("parseDNAFile ->", sequenceLength, sequenceLengthHex, arrayBuf.slice(20, 24));
  
  const sequenceStartIndex = 25;
  let sequenceBA = arrayBuf.slice(sequenceStartIndex, sequenceStartIndex + sequenceLength);
  let fileSequence = new TextDecoder().decode(sequenceBA).toUpperCase().replace(/[^TACGN]/gi, ''); // Convert to string and only keep ACTG
  let fileComplementarySequence = getComplementaryStrand(fileSequence); // Create complementary strand


  const xmlParser = new DOMParser();

  /**
   * Extract features
   */
  // Extract XML tree
  let featuresXMLString = fileContent.slice(fileContent.indexOf("<Features"), fileContent.indexOf("</Feature></Features>") + "</Feature></Features>".length);
  const featuresXMLDoc = xmlParser.parseFromString(featuresXMLString, 'text/xml');
  
  // Initialize dict and iterate over all feature elements in the object
  let featuresDict = {};
  const featuresList = featuresXMLDoc.getElementsByTagName('Feature');
  for (let i = 0; i < featuresList.length; i++) {
      const feature = featuresList[i]; // Current feature
      const featureId = getUUID();

      // All the feature properties
      const featureInfo = {}
      featureInfo["type"] = feature.getAttribute('type');
      featureInfo["label"] = feature.getAttribute('name'); // Display name
      const spanDirectionality = feature.getAttribute('directionality');
      featureInfo["span"] = "";
      featureInfo["note"] = "";

      // Iterate over children to find properties
      const featureChildren = feature.children;
      for (let j = 0; j < featureChildren.length; j++) {
          const child = featureChildren[j]; // Current child
          const childName = child.nodeName; // Get the node name

          // Nodes with the name "Segment" contain:
          // span, color, type, translated
          if (childName === "Segment") {
              let currSpan = child.getAttribute('range').split("-"); // Get span and split into list
              // Add span to feature info
              featureInfo["span"] = currSpan[0] + ".." + currSpan[1];
              if (spanDirectionality !== "1") {
                featureInfo["span"] = "complement(" + featureInfo["span"] + ")";
              };
              // Extract color
              featureInfo["color"] = child.getAttribute('color');
          };
          // Nodes with the name "Q" contain:
          // feature name, "V" nodes (contains the note text or a number)
          if (childName === "Q") {
              const subNoteName = child.getAttribute('name'); // Get name
              let subNoteEntry = "";
              // If the V node is an int
              if (child.children[0].attributes.getNamedItem("int")) {
                  subNoteEntry = child.children[0].getAttribute("int");
              }
              // If the V node has text
              if (child.children[0].attributes.getNamedItem("text")) {
                  subNoteEntry = child.children[0].getAttribute("text"); // Get text entry
                  subNoteEntry = new DOMParser().parseFromString(subNoteEntry, 'text/html').body.textContent; // Sometimes the text contains html
              }
              // Save note to the dict
              featureInfo[subNoteName] = subNoteEntry;
          };
      };
      featureInfo["note"] = featureInfo["note"].trim();

      // Append feature info the corresponding feature in the dict
      featuresDict[featureId] = featureInfo;
  };

  /**
   * Extract primers
   */
  // Extract XML tree
  let primersXMLString = fileContent.slice(fileContent.indexOf("<Primers"), fileContent.indexOf("</Primer></Primers>") + "</Primer></Primers>".length);
  const primersXMLDoc = xmlParser.parseFromString(primersXMLString, 'text/xml');

  const primersList = primersXMLDoc.getElementsByTagName('Primer');
  for (let i = 0; i < primersList.length; i++) {
      const primer = primersList[i]; // Current feature
      const primerId = getUUID();

      // All the feature properties
      const primerInfo = {};
      primerInfo["type"] = "primer_bind";
      primerInfo["label"] = primer.getAttribute('name'); // Display name
      primerInfo["note"] = (primer.getAttribute('description') && primer.getAttribute('description') !== undefined) ? primer.getAttribute('description').replace("<html><body>", "").replace("</body></html>", ""): "";
      const primerBindingSite = primer.getElementsByTagName("BindingSite")[0];
      const primerSpanDirection = primerBindingSite.getAttribute('boundStrand');
      const primerSpanString = primerBindingSite.getAttribute('location').replace("-", "..");
      const primerSpanList = removeNonNumeric(primerSpanString).split("..").map(Number);
      console.log("parseDNAFile", primerSpanList)

      primerInfo["span"] = (primerSpanDirection == "0") ? `${primerSpanList[0] + 1}..${primerSpanList[1] + 1}`: `complement(${primerSpanList[0] + 1}..${primerSpanList[1] + 1})`;
      console.log("parseDNAFile", primerInfo["span"])
      primerInfo["phosphorylated"] = primer.hasAttribute("phosphorylated");

      // Append feature info the corresponding feature in the dict
      featuresDict[primerId] = primerInfo;
  };

  console.log(featuresDict)
  const fileFeatures = sortBySpan(featuresDict);

  /**
   * Additional info to keep when exporting back to .dna
   */
  // TO DO: Keep unknown bytes, restriction enzyme list, notes info, primers etc
  let fileAdditionalInfo = {};
  return {
    fileSequence,
    fileComplementarySequence,
    fileFeatures,
    fileAdditionalInfo
  };
};


/**
 * 
 */
function splitStringByMaxLength(inputString, maxLength) {
  const words = inputString.split(' ');
  const result = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxLength) {
      if (currentLine) {
        currentLine += ' ' + word;
      } else {
        currentLine = word;
      }
    } else {
      result.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    result.push(currentLine);
  }

  return result;
};


/**
 * Remove file extension from string
 * 
 * @param {string} inputString 
 * @returns {string}
 */
function removeExtension(inputString) {
  const fileExtensionMatch = inputString.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/i);
  const outputName = (fileExtensionMatch) ? inputString.replace(fileExtensionMatch[0], "") : inputString;
  return outputName;
};


/**
 * FASTA file exporter.
 */
function exportFASTAFile(plasmidIndex) {
  // Output file name
  const plasmid = Project.getPlasmid(plasmidIndex)
  const outputFileExtension = "fasta";
  const outputFileName = removeExtension(plasmid.name);
  
  // Init variables
  let outputFileContent = "";

  // Select target sequence and features
  const currSequence = plasmid.sequence;

  outputFileContent += ">" + outputFileName + "\n";
  outputFileContent += "currSequence";

  // Send for download
  downloadFile(outputFileName, outputFileContent, outputFileExtension);
};


/**
 * GB file exporter.
 * TO DO:
 * - rn scrubs most info in the header
 */
function exportGBFile(plasmidIndex) {
  const currPlasmid = Project.getPlasmid(plasmidIndex);

  // Output file name
  const outputFileExtension = "gb";
  const outputFileName = removeExtension(currPlasmid.name);
  
  // Init variables
  let outputFileContent = "";
  let currLine = "";

  // Select target sequence and features
  const currSequence = currPlasmid.sequence;
  const currFeatures = currPlasmid.features;


  /**
   * File header
   */

  // Apend the header
  const headerNrSpaces = 12; // Descriptor width
  const headerValueSpaces = 68; // Descriptor value width
  
  // Iterate over entries
  let truncatedName = outputFileName;
  const truncatedNameLength = 16;
  if (truncatedName.length > truncatedNameLength) {
    // Truncate longer strings
    truncatedName = truncatedName.substring(0, truncatedNameLength);
  } else if (truncatedName.length < truncatedNameLength) {
      // Fill shorter strings with text
      truncatedName = truncatedName + " ".repeat(truncatedNameLength - truncatedName.length);
  };

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const currentDate = new Date();
  const day = currentDate.getDate().toString().padStart(2, '0');
  const month = months[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const fileHeaderDate = `${day}-${month}-${year}`;
  outputFileContent += "LOCUS       " + truncatedName + "        " + currSequence.length + " bp DNA     circular SYN " + fileHeaderDate + "\n";

  /**
   * File header boilerplate
   */
  // Check if header can be reused
  let fileHeader;
  if ((currPlasmid.extension === ".gbk" || currPlasmid.extension === ".gb") &&  currPlasmid.additionalInfo !== null) {
    fileHeader = currPlasmid.additionalInfo;
  } else {
    fileHeader = {
      "DEFINITION": {
        "value": ".",
        "children": {}
      },
      "ACCESSION": {
        "value": ".",
        "children": {}
      },
      "VERSION": {
        "value": ".",
        "children": {}
      },
      "KEYWORDS": {
        "value": ".",
        "children": {}
      },
      "SOURCE": {
        "value": "synthetic DNA construct",
        "children": {
          "ORGANISM": {
            "value": "synthetic DNA construct",
            "children": {}
          }
        }
      },
      "references": []
    };
  };

  const referencesSoFar = fileHeader["references"].length;
  fileHeader["references"].push({
    "REFERENCE": {
      "value": `${referencesSoFar+1} (bases 1 to ${currSequence.length})`,
      "children": {
        "AUTHORS": {
          "value": ".",
          "children": {}
        },
        "TITLE": {
          "value": "Direct Submission",
          "children": {}
        },
        "JOURNAL": {
          "value": "Exported with IVA Prime :) \nhttps://www.ivaprime.com",
          "children": {}
        }
      }
    }
  });
  fileHeader["references"].push({
    "REFERENCE": {
      "value": `${referencesSoFar+2} (bases 1 to ${currSequence.length})`,
      "children": {
        "AUTHORS": {
          "value": ".",
          "children": {}
        },
        "TITLE": {
          "value": "Direct Submission",
          "children": {}
        },
        "JOURNAL": {
          "value": "SnapGene Viewer",
          "children": {}
        }
      }
    }
  });
  console.log(fileHeader);

  const maxValueLenth = 80;
  const maxKeyLength = 12;
  let fileHeaderString = "";

  function recursiveDictPrint(dict, depth) {
    Object.keys(dict).forEach(key => {
      if (key !== "references") {
        fileHeaderString += " ".repeat(depth) + key + " ".repeat(maxKeyLength - key.length - depth);
        
        const valueLines = dict[key]["value"].split("\n");
        let valueLinesToAdd = [];
        for (let i = 0; i < valueLines.length; i++) {
          const valueLine = valueLines[i]
          for (let j = 0; j < valueLine.length; j += maxValueLenth) {
            valueLinesToAdd.push(valueLine.substring(j, j + maxValueLenth));
          };
        }
        for (let i = 0; i < valueLinesToAdd.length; i++) {
          if (i !== 0) {
            fileHeaderString += "            ";
          };
          fileHeaderString += valueLinesToAdd[i] + "\n"
        };

        recursiveDictPrint(dict[key]["children"], depth+2)
      } else {
        dict[key].forEach((reference) => {
          recursiveDictPrint(reference, depth)
      });
      }
    });
  };

  recursiveDictPrint(fileHeader, 0);

  console.log(fileHeaderString)

  outputFileContent += fileHeaderString;
  /**
   * File features
   */
  const featureTitleShift = 5;
  const featureTitleWidth = 16;
  const featureValueWidth = 58;
  outputFileContent += "FEATURES             Location/Qualifiers\n";
  const entries = Object.entries(currFeatures);
  for (const [key, value] of entries) {
    if (key !== "LOCUS") {
      const featureType = value["type"];
      outputFileContent += " ".repeat(featureTitleShift) + featureType + " ".repeat(featureTitleWidth - featureType.length) + value["span"] + "\n";
      const featureInfo = Object.entries(value);
      for (const [propertyName, propertyValue] of featureInfo) {
        if (!["span", "color", "ivaprimeColor", "type", "phosphorylated"].includes(propertyName) && propertyValue !== "") {
          let featureToAppend;
          if (propertyName === "label" || propertyName === "codon_start" || propertyName === "direction") {
            featureToAppend = "/" + propertyName + "=" + propertyValue + "";
          } else {
            featureToAppend = "/" + propertyName + "=\"" + propertyValue + "\"";
          };
          for (let i = 0; i < featureToAppend.length; i += featureValueWidth) {
            outputFileContent += " ".repeat(featureTitleWidth + featureTitleShift) + featureToAppend.slice(i, i + featureValueWidth) + "\n";
          };
        };
      };

      /**
       * /note="color: black; sequence: 
                     aggccccaaggggttatgctagttattgctcagcggtggcagcagccaa; added: 
                     2024-05-20"
       */
      if (featureType == "primer_bind" ||featureType == "primer") {
        const boundStrand = (!value["span"].includes("complement")) ? "0": "1";
        const primerSpan = removeNonNumeric(value["span"]).split("..").map(Number).map(function(x) { return x-1 });;
        const primerSequence = (boundStrand == "0") ? currSequence.slice(primerSpan[0], primerSpan[1] + 1): getComplementaryStrand(currSequence.slice(primerSpan[0], primerSpan[1])).split("").reverse().join("");
        let featureToAppend = `/note="color: black; sequence: ${primerSequence}"`;
        for (let i = 0; i < featureToAppend.length; i += featureValueWidth) {
          outputFileContent += " ".repeat(featureTitleWidth + featureTitleShift) + featureToAppend.slice(i, i + featureValueWidth) + "\n";
        };
      }
    };
  };
  outputFileContent.replace("     primer_bind     ", "     primer          ");


  /**
   * File sequence
   */
  outputFileContent += "ORIGIN\n";
  let seqIndex = 1;
  let lastIndex = Math.floor(currSequence.length / 60) * 60 + 1;
  while (currSequence.slice(seqIndex)) {
    currLine = "";
    currLine +=  " ".repeat(lastIndex.toString().length + 1 - seqIndex.toString().length) + seqIndex

    for (let i = 0; i < 6; i++) {
      currLine += " " + currSequence.slice(seqIndex - 1 + i*10, seqIndex - 1 + i*10 + 10).toLowerCase();
    }

    outputFileContent += currLine + "\n";
    seqIndex += 60;
  };
  outputFileContent += "//\n";

  // Send for download
  downloadFile(
    outputFileName,
    outputFileContent,
    outputFileExtension
  );
};


/**
 * DNA file exporter.
 */
async function exportDNAFile(plasmidIndex) {
  const currPlasmid = Project.getPlasmid(plasmidIndex);

  // Output file name
  const outputFileExtension = "dna"
  const outputFileName =  removeExtension(currPlasmid.name);

  // Select target sequence and features
  const currSequence = currPlasmid.sequence;
  const currFeatures = currPlasmid.features;

  // XML parser
  const xmlParser = new DOMParser();
  // XML serializer
  const xmlSerializer = new XMLSerializer();


  /**
   * Integer to 4 bytes hex
   */
  function inToHexBytes(number) {
    const buffer = new ArrayBuffer(4); // 4 bytes
    const view = new DataView(buffer);
    view.setUint32(0, number, false); // true means little-endian (least significant byte first)

    // Convert the DataView to a string
    const byteArray = new Uint8Array(buffer);
    const byteString = Array.from(byteArray).map(byte => byte.toString(16).padStart(2, '0')).join(' ');

    return byteString;
  };


  function addBytes(byteString) {
    const bytesToAdd = byteString.split(' ').map(hex => parseInt(hex, 16));
    outputBytes.push(...bytesToAdd);
  };


  function stringToBytes(inputString) {
    const encoder = new TextEncoder('utf-8');
    const bytes = encoder.encode(inputString);
  
    const byteArray = [];
    for (let i = 0; i < bytes.length; i++) {
      const byteHex = bytes[i].toString(16).padStart(2, '0');
      byteArray.push(byteHex);
    };
  
    return byteArray.join(' ');
  };


  /**
   * Fil header
   */
  const outputBytes = []
  // File magic bytes (19)
  addBytes("09 00 00 00 0e 53 6e 61 70 47 65 6e 65 00 01 00 0f 00");
  // Version byte?
  // SnapGene 6.0.3 -> 11
  // SnapGene 7.1.1 -> 13
  addBytes("13");
  // File type designation byte (unknown 00, dna 01, rna 20, prot 15)
  addBytes("00");

  // sequence length +1 (4 bytes)
  console.log("exportDNAFile", inToHexBytes(currSequence.length + 1))
  addBytes(inToHexBytes(currSequence.length + 1));

  // plasmid type byte (ss+lin = 00, ss+circ=01, ds+lin=02, ds+circ=03)
  addBytes("03");

  /**
   * Sequence bytes
   */
  addBytes(stringToBytes(currSequence.toLowerCase()));
  console.log("exportDNAFile", currSequence.length, currSequence)
  console.log("exportDNAFile", stringToBytes(currSequence.toLowerCase()).length, stringToBytes(currSequence.toLowerCase()))
  // Stop byte sequence
  addBytes("02");

  /**
   * Filler bytes, some info about restriction enzymes but other wise not sure
   * seem to be necessary to keep compatibility with earlier versions
   */
  const fillerBytesResponse = await fetch("/static/dnaFillerBytes.txt")
  const dnaFillerBytes =  await fillerBytesResponse.text();
  addBytes(dnaFillerBytes);

  
  /**
   * Alignable sequences
   */
  // length
  addBytes("00 00 00 2d"); //(default xml length)
  // content
  const defaultAlignableSequencesXML = "<AlignableSequences trimStringency=\"Medium\"/>";
  addBytes(stringToBytes(defaultAlignableSequencesXML));
  // stop byte
  addBytes("08");


  /**
   * Additional sequence properties
   */
  const defaultAdditionalSequenceProperties = "<AdditionalSequenceProperties><UpstreamStickiness>0</UpstreamStickiness><DownstreamStickiness>0</DownstreamStickiness><UpstreamModification>FivePrimePhosphorylated</UpstreamModification><DownstreamModification>FivePrimePhosphorylated</DownstreamModification></AdditionalSequenceProperties>";
  // Add length
  console.log("exportDNAFile", inToHexBytes(defaultAdditionalSequenceProperties.length))
  addBytes(inToHexBytes(defaultAdditionalSequenceProperties.length));
  // Add xml string
  addBytes(stringToBytes(defaultAdditionalSequenceProperties));
  // Stop byte
  addBytes("0a");


  /**
   * FEATURES
   */
  // Create an XML document
  const nrOfFeatures = Object.keys(currFeatures).filter(item => item !== "LOCUS" && currFeatures[item]["type"] !== "primer_bind").length;

  // Create the XML document with the correct root structure
  const featuresXMLDoc = xmlParser.parseFromString(
    '<?xml version="1.0" ?><Features nextValidID="' + nrOfFeatures + '"></Features>',
    'application/xml'
  );

  // Ensure the "Features" element is correctly added as the root element
  const featuresXMlRoot = featuresXMLDoc.documentElement;
  let i = 0;
  for (const key in currFeatures) {
    if (key !== "LOCUS") {
      const value = currFeatures[key];

      if (key === "source") {1
        // Feature
        const xmlFeatureElement = featuresXMLDoc.createElement('Feature');
        xmlFeatureElement.setAttribute('recentID', i + "");
        i++;
        xmlFeatureElement.setAttribute('name', "source");
        xmlFeatureElement.setAttribute('type', "source");
        xmlFeatureElement.setAttribute('allowSegmentOverlaps', "0");
        xmlFeatureElement.setAttribute('consecutiveTranslationNumbering', "1");
        xmlFeatureElement.setAttribute('visible', "0");

        // Segment
        const xmlSegmentElement = featuresXMLDoc.createElement('Segment');
        xmlSegmentElement.selfClosing = true;
        xmlSegmentElement.setAttribute('range', removeNonNumeric(value["span"]).replace("..", "-"));
        if (value["color"]) {
          xmlSegmentElement.setAttribute('color', value["color"]);
        } else {
          xmlSegmentElement.setAttribute('color', "#ffffff");
        };
        xmlSegmentElement.setAttribute('type', "standard");

        xmlFeatureElement.appendChild(xmlSegmentElement) // Append

        // Q mol_type
        if (value["mol_type"]) {
          const xmlQmoltype = featuresXMLDoc.createElement('Q');
          xmlQmoltype.setAttribute('name', "mol_type");

          const xmlVmoltype = featuresXMLDoc.createElement('V');
          xmlVmoltype.selfClosing = true;
          xmlVmoltype.setAttribute('predef', value["mol_type"]);

          xmlQmoltype.appendChild(xmlVmoltype) // Apend
          xmlFeatureElement.appendChild(xmlQmoltype) // Apend
        };

        // Q organism
        if (value["organism"]) {
          const xmlQOrganism = featuresXMLDoc.createElement('Q');
          xmlQOrganism.setAttribute('name', "organism");

          const xmlVOrganism = featuresXMLDoc.createElement('V');
          xmlVOrganism.selfClosing = true;
          xmlVOrganism.setAttribute('text', value["organism"]);

          xmlQOrganism.appendChild(xmlVOrganism) // Apend
          xmlFeatureElement.appendChild(xmlQOrganism) // Apend
        };
        
        featuresXMlRoot.appendChild(xmlFeatureElement);
      } else if (value["type"] !== "primer_bind" && value["type"] !== "primer") {
        // Feature
        const xmlFeatureElement = featuresXMLDoc.createElement('Feature');
        xmlFeatureElement.setAttribute('recentID', i + "");
        i++;
        xmlFeatureElement.setAttribute('name', value["label"]);
        xmlFeatureElement.setAttribute('directionality', (!value["span"].includes("complement")) ? "1": "2");
        xmlFeatureElement.setAttribute('readingFrame', (!value["span"].includes("complement")) ? "1": "-1");
        xmlFeatureElement.setAttribute('type', value["type"]);
        xmlFeatureElement.setAttribute('allowSegmentOverlaps', "0");
        xmlFeatureElement.setAttribute('consecutiveTranslationNumbering', "1");

        // Segment
        const xmlSegmentElement = featuresXMLDoc.createElement('Segment');
        xmlSegmentElement.selfClosing = true;
        xmlSegmentElement.setAttribute('range', removeNonNumeric(value["span"]).replace("..", "-"));
        if (value["color"]) {
          xmlSegmentElement.setAttribute('color', value["color"]);
        } else {
          xmlSegmentElement.setAttribute('color', "#ffffff");
        };
        xmlSegmentElement.setAttribute('type', "standard");

        // If feature is translated, add segment attribute
        if (value["translation"]) {
          xmlSegmentElement.setAttribute('translated', "1");
        };

        xmlFeatureElement.appendChild(xmlSegmentElement) // Append

        // Q Label
        if (value["label"]) {
          const xmlQLabel = featuresXMLDoc.createElement('Q');
          xmlQLabel.setAttribute('name', "label");

          const xmlVLabel = featuresXMLDoc.createElement('V');
          xmlVLabel.selfClosing = true;
          xmlVLabel.setAttribute('text', value["label"]);

          xmlQLabel.appendChild(xmlVLabel) // Apend
          xmlFeatureElement.appendChild(xmlQLabel) // Apend
        };

        // Q Note
        if (value["note"]) {
          const xmlQNote = featuresXMLDoc.createElement('Q');
          xmlQNote.setAttribute('name', "note");

          const xmlVNote = featuresXMLDoc.createElement('V');
          xmlVNote.selfClosing = true;
          xmlVNote.setAttribute('text', value["note"]);

          xmlQNote.appendChild(xmlVNote) // Apend
          xmlFeatureElement.appendChild(xmlQNote) // Apend
        };

        // Q Translation
        if (value["translation"]) {
          const xmlQCodonStart = featuresXMLDoc.createElement('Q');
          xmlQCodonStart.setAttribute('name', "codon_start");

          const xmlVCodonStart = featuresXMLDoc.createElement('V');
          xmlVCodonStart.selfClosing = true;
          xmlVCodonStart.setAttribute('int', "1");

          xmlQCodonStart.appendChild(xmlVCodonStart) // Apend
          xmlFeatureElement.appendChild(xmlQCodonStart) // Apend

          const xmlQTranslatable = featuresXMLDoc.createElement('Q');
          xmlQTranslatable.setAttribute('name', "transl_table");

          const xmlVTranslatable = featuresXMLDoc.createElement('V');
          xmlVTranslatable.selfClosing = true;
          xmlVTranslatable.setAttribute('int', "1");

          xmlQTranslatable.appendChild(xmlVTranslatable) // Apend
          xmlFeatureElement.appendChild(xmlQTranslatable) // Apend

          const xmlQTranslation = featuresXMLDoc.createElement('Q');
          xmlQTranslation.setAttribute('name', "translation");

          const xmlVTranslation = featuresXMLDoc.createElement('V');
          xmlVTranslation.selfClosing = true;
          xmlVTranslation.setAttribute('text', value["translation"]);

          xmlQTranslation.appendChild(xmlVTranslation) // Apend
          xmlFeatureElement.appendChild(xmlQTranslation) // Apend
        };

        featuresXMlRoot.appendChild(xmlFeatureElement);
      };
    };
  };

  // Serialize the XML tree to a string
  const featuresXMLString = xmlSerializer.serializeToString(featuresXMLDoc).replace(/[\n\r]/g, '').replace(" encoding=\"UTF-8\"", "");

  const emptyFeaturesXML = "<?xml version=\"1.0\"?><Features nextValidID=\"1\"><Feature recentID=\"0\" name=\"Feature 1\" type=\"misc_feature\" allowSegmentOverlaps=\"0\" consecutiveTranslationNumbering=\"1\"><Segment range=\"2-3\" color=\"#a6acb3\" type=\"standard\"/></Feature></Features>";
  // length
  addBytes(inToHexBytes(featuresXMLString.length + 1));
  // content
  addBytes(stringToBytes(featuresXMLString));
  // stop byte
  addBytes("0a 05");



  /**
   * Primers
   */
  const nrOfPrimers = Object.keys(currFeatures).filter(item => currFeatures[item]["type"] == "primer_bind" || currFeatures[item]["type"] == "primer").length;

  // Create the XML document with the correct root structure
  const primersXMLDoc = xmlParser.parseFromString(
    '<?xml version="1.0" ?><Primers nextValidID="' + nrOfPrimers + '"></Primers>',
    'application/xml'
  );

  // Ensure the "Features" element is correctly added as the root element
  const primersXMLRoot = primersXMLDoc.documentElement;

  const xmlHybridizationParamsElement = primersXMLDoc.createElement('HybridizationParams');
  xmlHybridizationParamsElement.selfClosing = true;
  xmlHybridizationParamsElement.setAttribute('minContinuousMatchLen', "10");
  xmlHybridizationParamsElement.setAttribute('allowMismatch', "1");
  xmlHybridizationParamsElement.setAttribute('minMeltingTemperature', "40");
  xmlHybridizationParamsElement.setAttribute('showAdditionalFivePrimeMatches', "1");
  xmlHybridizationParamsElement.setAttribute('minimumFivePrimeAnnealing', "15");
  primersXMLRoot.appendChild(xmlHybridizationParamsElement)


  const currPrimers = {};
  for (const [key, value] of Object.entries(currFeatures)) {
    // Check if the value matches the specific value
    if (value["type"] === "primer_bind") {
        // Add the key-value pair to the new dictionary
        currPrimers[key] = value;
    };
  };
  i = 0;
  for (const key in currPrimers) {
    if (key !== "LOCUS") {
      const value = currPrimers[key];
      if (key !== "source" && value["type"] == "primer_bind") {
        // Primer
        const xmlPrimerElement = primersXMLDoc.createElement('Primer');
        xmlPrimerElement.setAttribute('recentID', i + "");i++;
        xmlPrimerElement.setAttribute('name', value["label"]);
        const boundStrand = (!value["span"].includes("complement")) ? "0": "1";
        const primerSpan = removeNonNumeric(value["span"]).split("..").map(Number).map(function(x) { return x-1 });;
        const primerSequence = (boundStrand == "0") ? currSequence.slice(primerSpan[0], primerSpan[1] + 1): getComplementaryStrand(currSequence.slice(primerSpan[0], primerSpan[1] + 1)).split("").reverse().join("");
        xmlPrimerElement.setAttribute('sequence', primerSequence.toLowerCase());
        if (value["phosphorylated"] == true) {
          xmlPrimerElement.setAttribute('phosphorylated', "1");
        };
        xmlPrimerElement.setAttribute('description', "<html><body>" + value["note"] + "</body></html>");
        xmlPrimerElement.setAttribute('dateAdded', "2024-05-20T12:51:58Z");


        // BindingSite
        const xmlBindingSiteElement = primersXMLDoc.createElement('BindingSite');
        xmlBindingSiteElement.setAttribute('simplified', "1");
        xmlBindingSiteElement.setAttribute('location', primerSpan.join("-"));
        xmlBindingSiteElement.setAttribute('boundStrand', boundStrand);
        xmlBindingSiteElement.setAttribute('annealedBases', primerSequence.toLowerCase());
        xmlBindingSiteElement.setAttribute('meltingTemperature', Math.round(getMeltingTemperature(primerSequence, meltingTempAlgorithmChoice)));

        // Component
        const xmlComponentElement = primersXMLDoc.createElement('Component');
        xmlComponentElement.selfClosing = true;
        xmlComponentElement.setAttribute('hybridizedRange', primerSpan.join("-"));
        xmlComponentElement.setAttribute('bases', primerSequence.toLowerCase());

        xmlBindingSiteElement.appendChild(xmlComponentElement);

        const xmlBindingSiteElementSimplified = xmlBindingSiteElement.cloneNode(true);
        xmlBindingSiteElement.removeAttribute('simplified');

        xmlPrimerElement.appendChild(xmlBindingSiteElement);
        xmlPrimerElement.appendChild(xmlBindingSiteElementSimplified);
        primersXMLRoot.appendChild(xmlPrimerElement);
      };
    };
  };

  // Serialize the XML tree to a string
  const primersXMLString = xmlSerializer.serializeToString(primersXMLDoc).replace(/[\n\r]/g, '').replace(" encoding=\"UTF-8\"", "");

  // Now, xmlString contains the XML structure as a string
  //downloadFile('featuresXMLTree', xmlString, 'xml');

  const emptyPrimersXML = "<?xml version=\"1.0\"?><Primers nextValidID=\"1\"><HybridizationParams minContinuousMatchLen=\"10\" allowMismatch=\"1\" minMeltingTemperature=\"40\" showAdditionalFivePrimeMatches=\"1\" minimumFivePrimeAnnealing=\"15\"/></Primers>";
  // length
  // testing adding 1 to the length
  addBytes(inToHexBytes(primersXMLString.length + 1));
  // content
  addBytes(stringToBytes(primersXMLString));
  // stop byte
  addBytes("0a 06");

  /**
   * NOTES
   */
  // Universally unique identifier
  let uuid = getUUID();
  if (!uuid) {
    uuid = "00000000-0000-0000-0000-000000000000"
  };
  // Time and date
  const currentTime = Date.now();
  const currentDate = new Date(currentTime);
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds  = currentDate.getSeconds().toString().padStart(2, '0');
  const timeHMS = `${hours}:${minutes}:${seconds}`

  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString()
  const day = currentDate.getDate().toString()
  const dateYMD = `${year}.${month}.${day}`;

  // added line feeds \n
  const notesXML = `<Notes>
<UUID>${uuid}</UUID>
<Type>Natural</Type>
<Created UTC=\"${timeHMS}\">${dateYMD}</Created>
<LastModified UTC=\"${timeHMS}\">${dateYMD}</LastModified>
<SequenceClass>UNA</SequenceClass>
<TransformedInto>unspecified</TransformedInto>
<References>
<Reference journalName="Exported with IVA Prime :) &lt;a href='https://www.ivaprime.com'>https://www.ivaprime.com&lt;/a>" type="Journal Article" journal="Exported with IVA Prime :) &lt;a href='https://www.ivaprime.com'>https://www.ivaprime.com&lt;/a>" title="Direct Submission"/>
<Reference journalName="SnapGene Viewer" type="Journal Article" journal="SnapGene Viewer" title="Direct Submission"/>
</References>
</Notes>`;
  // length
  addBytes(inToHexBytes(notesXML.length + 1));
  // content
  addBytes(stringToBytes(notesXML));
  // stop byte
  addBytes("0a 0d");
  
  /**
   * Closing bytes
   */
  //                                             this byte is set to 00 in newer versions (7.1.1)
  //                                             |
  const closingBytes = "00 00 01 59 01 00 00 00 01 00 00 4b 00 00 00 00 00 00 00 00 00 03 55 6e 69 71 75 65 20 36 2b 20 43 75 74 74 65 72 73 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 19 ff 00 64 00 00 00 00 00 54 48 4f 00 ff fe 00 00 00 00 00 00 00 00 00 00 00 00 01 01 01 01 00 01 00 45 00 00 00 00 00 00 00 00 00 00 00 00 01 00 00 01 ff ff ff ff 01 59 01 f4 01 01 3f 00 50 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 1c 00 00 00 33 3c 3f 78 6d 6c 20 76 65 72 73 69 6f 6e 3d 22 31 2e 30 22 3f 3e 3c 45 6e 7a 79 6d 65 56 69 73 69 62 69 6c 69 74 69 65 73 20 76 61 6c 73 3d 22 22 2f 3e 0a 0e 00 00 00 29 3c 3f 78 6d 6c 20 76 65 72 73 69 6f 6e 3d 22 31 2e 30 22 3f 3e 3c 43 75 73 74 6f 6d 45 6e 7a 79 6d 65 53 65 74 73 2f 3e 0a";
  addBytes(closingBytes);

  // Send for download
  downloadFile(outputFileName, outputBytes, outputFileExtension);
};


/**
 * Get user browser
 */
function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserName;
  let browserVersion;

  // Check for Chrome
  if (userAgent.indexOf("Chrome") > -1) {
    browserName = "Chrome";
    browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)[1];
  }
  // Check for Firefox
  else if (userAgent.indexOf("Firefox") > -1) {
    browserName = "Firefox";
    browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)[1];
  }
  // Check for Safari
  else if (userAgent.indexOf("Safari") > -1) {
    browserName = "Safari";
    browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)[1];
  }
  // Check for Edge
  else if (userAgent.indexOf("Edg") > -1) {
    browserName = "Edge";
    browserVersion = userAgent.match(/Edg\/(\d+\.\d+)/)[1];
  }
  // Check for Internet Explorer
  else if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident") > -1) {
    browserName = "Internet Explorer";
    browserVersion = userAgent.match(/(?:MSIE|rv:)\s?(\d+\.\d+)/)[1];
  }
  // Default to unknown
  else {
    browserName = "Unknown";
    browserVersion = "Unknown";
  }

  return {
    browserName,
    browserVersion,
  };
};


/**
 * Download file.
 */
function downloadFile(downloadFileName, downloadFileContent, downloadFileType) {
  // Create a Blob
  let blob = null;
  if (downloadFileType === "dna") {
    const byteArray = new Uint8Array(downloadFileContent);
    blob = new Blob([byteArray]);
  } else {
    blob = new Blob([downloadFileContent], { type: "text/plain" });
  };

  saveAs(blob, downloadFileName + "." + downloadFileType);
};


/**  
 * Remove everything but numbers and ".." in order to have a clean span
*/
function removeNonNumeric(inputString) {
  const cleanedString = inputString.replace(/[^\d.]/g, '');
  return cleanedString;
};


/**
 * 
 * 
 */
window.addEventListener('resize', function () {
  let resizeTimeout;
  clearTimeout(resizeTimeout);
  document.getElementById("file-content").style.display = "none";

  resizeTimeout = setTimeout(function() {
    document.getElementById("file-content").style.display = "block";
    updateAnnotationTrianglesWidth();
  }, 1000);
});


/**
 * Creates the annoations from the span's start to the end, breaking the feature up into
 * multiple if it spans multiple lines.
 * 
 * TO DO:
 * - at the moment it is very slow, maybe find a better way
 * - !!find a way to make this rescale on window resize
 */
function makeAnnotation(rStart, rEnd, text, featureId, annotationColorVariable, targetTable, currGridStructure) {

  // Convert from sequence coords to table coords
  let row = (Math.floor(rStart / gridWidth)) * currGridStructure.length;
  let col = rStart - (row/currGridStructure.length)*gridWidth;
  row += currGridStructure.indexOf("Annotations");


  // Annotaiton span length
  const annotationSpan = rEnd - rStart + 1;
  let currentSpan = annotationSpan; // Current span to draw
  let carryOver = annotationSpan; // Carry over for next line
  
  let i = 0; // Iteration counter
  // Draw until there is no more carry over
  while (carryOver > 0) {
    // If the feature spans multiple lines, add "..." to the beginning of the feature
    if (i != 0) {
        text = "..." + text.replace("...", "");
    };

    // Merge the corresponding cells to draw the annoation
    if (col + currentSpan >= gridWidth) {
      // If the currenspan would not fit on the line, draw it until we reach the end and
      // put the rest into carry over
      // Calculate carry over
      carryOver = col + currentSpan - gridWidth;
      // Calculate length of the current annoation
      currentSpan = gridWidth - col;
      // Merge the corresponding cells and create the annotaion
      mergeCells(row, col, 1, currentSpan, text + "...", featureId, annotationColorVariable, targetTable,currGridStructure);
      // Adjust the current span
      currentSpan = carryOver;
      // Increment the row
      row = row + currGridStructure.length;
      // Reset cell index
      col = 0;
    } else if (currentSpan === gridWidth) {
      // If the currentspan covers exactly the current line there is some weird behaviour
      // so fill in the current line and one additional cell in the the following row
      mergeCells(row, col, 1, currentSpan, text, featureId, annotationColorVariable, targetTable,currGridStructure);
      mergeCells(row + currGridStructure.length, col, 1, 1, text, featureId, annotationColorVariable, targetTable,currGridStructure);
      // Set carry over to 0 to signify that we're done
      carryOver = 0;
    } else {
      // The annotation can be fully drawn on the current row
      mergeCells(row, col, 1, currentSpan, text, featureId, annotationColorVariable, targetTable, currGridStructure);
      // Set carry over to 0 to signify that we're done
      carryOver = 0;
    };
    // Increment iteration counter
    i++;
  };
};


/**
 * Draws the annotation by merging the specified cells, adding th text and adding the color.
 * 
 */
function mergeCells(row, col, rowspan, colspan, text, featureId, annotationColorVariable, targetTable, currGridStructure) {
  // Adjust row and col
  let occupiedCellsList = [];
  let occupiedCellsCounter = 0;
  for (let i = 0; i < currGridStructure.length; i++) {
    if (currGridStructure[i] === "Annotations") {
      // Find already occupied cells
      occupiedCellsList = [];
      occupiedCellsCounter = 0;
      if (targetTable.rows[row].cells.length === 1) {
        row++;
      } else {
        for (let i = 0; i < targetTable.rows[row].cells.length; i++) {
          if (targetTable.rows[row].cells[i].attributes.hasOwnProperty('feature-id')) {
            let currColSpan = parseInt(targetTable.rows[row].cells[i].colSpan);
            occupiedCellsCounter++;
            for (let i = 0; i <  currColSpan; i++) {
              occupiedCellsList.push(true);
            };
          } else {
            occupiedCellsList.push(false);
          };
        };
        
        if (occupiedCellsList.slice(col, col + colspan).every(value => value !== true)) {
          break;
        } else {
          row++;
        };
      };
    };
  };
  
  let nrOccupiedCells = occupiedCellsList.slice(0, col).filter(value => value === true).length;
  if (nrOccupiedCells === occupiedCellsList.length-1){
    row++;
  };

  // Adjust row and col
  occupiedCellsList = [];
  occupiedCellsCounter = 0;
  for (let i = 0; i < currGridStructure.length; i++) {
    if (currGridStructure[i] === "Annotations") {
      // Find already occupied cells
      occupiedCellsList = [];
      occupiedCellsCounter = 0;
      for (let i = 0; i < targetTable.rows[row].cells.length; i++) {
        if (targetTable.rows[row].cells[i].attributes.hasOwnProperty('feature-id')) {
          let currColSpan = parseInt(targetTable.rows[row].cells[i].colSpan);
          occupiedCellsCounter++;
          for (let i = 0; i <  currColSpan; i++) {
            occupiedCellsList.push(true);
          };
        } else {
          occupiedCellsList.push(false);
        };
      };
      
      if (occupiedCellsList.slice(col, col + colspan - 1).every(value => value !== true)) {
        break;
      } else {
        row++;
      };
    };
  };

  nrOccupiedCells = occupiedCellsList.slice(0, col).filter(value => value === true).length;


  if (nrOccupiedCells !== 0) {
    col -= nrOccupiedCells;
    col += occupiedCellsCounter;
  };
  let mainCell = targetTable.rows[row].cells[col];
  mainCell.rowSpan = rowspan;
  mainCell.colSpan = colspan;
  //mainCell.classList.add("editable")
  mainCell.style.backgroundColor = "var(--" + annotationColorVariable + ")";
  // Add text to the center of the merged cell
  if (text.length > colspan)  {
    if (colspan <= 3) {
      text = "";
      for (let l = 0; l < colspan; l++) {
        text += ".";
      };
    } else {
      text = text.slice(0, colspan - 3).replace(/\./g, "") + "...";
    };
  };
  const textNode = document.createTextNode(text);
  mainCell.appendChild(textNode);
  mainCell.style.textAlign = 'center';
  mainCell.setAttribute("feature-id", featureId)

  // Remove extra cells
  colspan--;
  for (let j = 0; j < colspan; j++) {
    const cell = targetTable.rows[row].cells[col + 1];
    if (cell) {
      cell.parentNode.removeChild(cell);
    };
  };
};


/**
 * Generates a random color that was not used recently.
 */
//const defaultAnnotationColors = [
//  "#FFB6C1",
//  "#FFDAB9",
//  "#FFA07A",
//  "#87CEFA",
//  "#FF69B4",
//  "#90EE90"
//];
const defaultAnnotationColors = [
  "#ff7a8e",
  "#bc99ee",
  "#ff8756",
  "#5aa8d9",
  "#f45ba8",
  "#74e374"
];
function generateRandomUniqueColor(recentColor="") {

  const remainingColors = defaultAnnotationColors.filter(color => color !== recentColor);
  const randomIndex = Math.floor(Math.random() * remainingColors.length);
  const randomColor = remainingColors[randomIndex];

  return randomColor;
};


/**
 * Function that translates the input codon into its corresponding amino acid.
 */
function translateCodon(codon) {
  const codonTable = {
    'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
    'TGT': 'C', 'TGC': 'C',
    'GAT': 'D', 'GAC': 'D',
    'GAA': 'E', 'GAG': 'E',
    'TTT': 'F', 'TTC': 'F',
    'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
    'CAT': 'H', 'CAC': 'H',
    'ATT': 'I', 'ATC': 'I', 'ATA': 'I',
    'AAA': 'K', 'AAG': 'K',
    'TTA': 'L', 'TTG': 'L', 'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
    'ATG': 'M',
    'AAT': 'N', 'AAC': 'N',
    'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
    'CAA': 'Q', 'CAG': 'Q',
    'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R', 'AGA': 'R', 'AGG': 'R',
    'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S', 'AGT': 'S', 'AGC': 'S',
    'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
    'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
    'TGG': 'W',
    'TAT': 'Y', 'TAC': 'Y',
    'TAA': '*', 'TAG': '*', 'TGA': '*'
  };

  return codonTable[codon] || '';
};


/**
 * Convert sequence indices to table coordinates
 */
function seqIndexToCoords(inputIndex, targetRow, inputGridStructure) {
  let outputRow = (Math.floor((inputIndex - 0.5) / gridWidth))*inputGridStructure.length + targetRow;
  let outputIndex = inputIndex - Math.floor((inputIndex - 0.5) / gridWidth)*gridWidth - 1;
  return [outputRow, outputIndex];
};


/**
 * Starts a translation at the specified position and populates the amino acid row with the translation.
 * 
 * TO DO:
 * - add an option to start translating immediately or inside selected text
 */
function startTranslation(codonPos) {
  // Select the corresponding features and sequence
  const currPlasmid = Project.activePlasmid();
  let currSequence = currPlasmid.sequence;
  let currGridStructure = currPlasmid.gridStructure;
  let currTable = document.getElementById("sequence-grid-" + Project.activePlasmidIndex);

  // Convert to table coordinates based on the row order in the grid structure
  const rowIndexAA = currGridStructure.indexOf("Amino Acids");
  let tableCoords = seqIndexToCoords(codonPos, rowIndexAA, currGridStructure);

  // Get the row and column, increment the column by 1 because the amino acids are
  // displayed in the middle cell of a group of 3 cells
  let row = tableCoords[0];
  let col = tableCoords[1] + 1;

  // Start translating until a stop codon is encountered
  let aaIndex = 1;
  while (true) {
    // Select current codon
    let codon = repeatingSlice(currSequence, codonPos - 1, codonPos + 2);
    // Get the corresponding amino acid
    let aminoAcid = translateCodon(codon);

    // Fill the cells
    fillAACells(row, col, aminoAcid, currTable, currGridStructure, aaIndex);
    aaIndex++;
    // Jump to next position
    col += 3;
    codonPos += 3;
    // If we've jumped off of the table go to the next row
    if (col > gridWidth) {
      col -= gridWidth;
      row += currGridStructure.length;
    };
    // If the last displayed amino acid was a stop codon or we've reached the end of the sequence, stop
    if (aminoAcid === "-" || codonPos > currSequence.length){
      break;
    };
  };
};


/**
 * Translate specific span
 */
/**
 * 
 * @param {*} targetStrand - "fwd" || any string
 * @param {*} rangeStart 
 * @param {*} rangeEnd 
 * @param {*} targetTable 
 * @param {*} currGridStructure 
 * @param {*} plasmidIndex 
 */
function translateSpan(targetStrand, rangeStart, rangeEnd, targetTable, currGridStructure, plasmidIndex) {
  console.log("translateSpan", targetStrand, rangeStart, rangeEnd, targetTable, currGridStructure, plasmidIndex)
  
  // Select the corresponding features and sequence
  const currPlasmid = Project.getPlasmid(plasmidIndex);
  const currSequence = (targetStrand === "fwd") ? currPlasmid.sequence: currPlasmid.complementarySequence;

  const codonStartPos = (targetStrand === "fwd") ? rangeStart: rangeEnd - 1;
  const codonEndPos = (targetStrand === "fwd") ? rangeEnd + 1: rangeStart + 1;
  let codonPos = codonStartPos;
  const dir = (targetStrand === "fwd") ? 1: -1;

  // Convert to table coordinates based on the row order in the grid structure
  let tableCoords = seqIndexToCoords(codonStartPos, currGridStructure.indexOf("Amino Acids"), currGridStructure);

  // Get the row and column, increment the column by 1 because the amino acids are
  // displayed in the middle cell of a group of 3 cells
  let row = tableCoords[0];
  let col = tableCoords[1] + 1*dir;
  console.log("translateSpan", row, col);


  // Start translating until a stop codon is encountered
  let aaIndex = 1;
  let translatedSequence = "";
  while (true) {
    // Select current codon
    let codon = repeatingSlice(currSequence, codonPos - 1, codonPos + 2);
    if (targetStrand !== "fwd") {
      codon = repeatingSlice(currSequence, codonPos - 3, codonPos).split("").reverse().join("");
    };
    // Get the corresponding amino acid
    let aminoAcid = translateCodon(codon);
    translatedSequence += aminoAcid;

    // Fill the cells
    fillAACells(row, col, aminoAcid, targetTable, currGridStructure, aaIndex);
    aaIndex++;
    // Jump to next position
    col += 3*dir;
    codonPos += 3*dir;
    // If we've jumped off of the table go to the next row
    if (col > gridWidth || col < 0) {
      col -= gridWidth*dir;
      row += currGridStructure.length*dir;
    };
    // If the last displayed amino acid was a stop codon or we've reached the end of the sequence, stop
    const breakCondition = (codonEndPos - codonPos)*dir <= 0;
    if (codonPos > currSequence.length || breakCondition) {
      break;
    };
  };

  const translationSpan = (targetStrand === "fwd") ? [rangeStart, rangeEnd]: [rangeEnd, rangeStart];
  const translationDict = {"span": translationSpan, "sequence": translatedSequence}
  const targetDict = (targetStrand === "fwd") ? "forward": "reverse";
  
  Project.getPlasmid(plasmidIndex).translations[targetDict].push(translationDict);

  return translatedSequence;
};


/**
 * 
 */
function translateSequence(inputSequence) {
  let outputSequence = "";
  for (let i = 0; i < inputSequence.length - (inputSequence.length % 3); i += 3) {
    outputSequence += translateCodon(inputSequence.slice(i, i+3))
  };

  return outputSequence;
};


/**
 * Merge 3 cells in the amino acids row in order to display the amino acid.
 * 
 */
function fillAACells(row, col, text, targetTable, currGridStructure, aaIndex) {
  //console.log("fillAACells", row, col, text, aaIndex)

  // Select the middle cell
  if (col < 0) {
    row -= currGridStructure.length;
    col = col + gridWidth;
  };
  let mainCell = targetTable.rows[row].cells[col];
  if (!mainCell) { // If the cell does not exist, try the next row over at the beginning
    row += currGridStructure.length;
    col = col - gridWidth;

    mainCell = targetTable.rows[row].cells[col];
  };
  //console.log("fillAACells", mainCell)

  // Select the left and right cells
  const leftCell = targetTable.rows[row].cells[col-1];
  const rightCell = targetTable.rows[row].cells[col+1];
  // Check and clear text in leftCell
  if (leftCell && leftCell.textContent) {
    leftCell.textContent = '';
  };

  // Check and clear text in rightCell
  if (rightCell && rightCell.textContent) {
    rightCell.textContent = '';
  };

  // Add text to the center of the merged cell
  mainCell.textContent = text;
  mainCell.style.textAlign = 'center';
  mainCell.setAttribute("aaIndex", aaIndex);
};


/**
 * 
 */
function createFilledTriangle(featureID, annotationColorVariable, orientation, row, col, targetTable) {
  // Select the table cell using the row and col indices
  let cell = targetTable.rows[row].cells[col];
  if (!cell) {
    const newCell = document.createElement("td")
    newCell.id = "Test"
    targetTable.rows.appendChild(newCell);
    cell = targetTable.rows[row].cells[col];
  };
  cell.classList.add("triangle-cell");
  cell.setAttribute("feature-id", featureID)

  // Create a div element for the triangle
  const triangle = document.createElement("div");
  triangle.id = featureID + "-triangle"

  //triangle.style.width = 0 + "px";
  triangle.style.height = 0 + "px";
  triangle.style.borderTop = "var(--triangle-height) solid transparent";
  triangle.style.borderBottom = "var(--triangle-height) solid transparent";
  if (orientation === "right") {
    triangle.style.borderLeft = `var(--triangle-width) var(--${annotationColorVariable}) solid`;
  } else {
    triangle.style.borderRight = `var(--triangle-width) var(--${annotationColorVariable}) solid`;
    //triangle.style.position = "absolute";
    triangle.style.right = "0px";
    triangle.style.top = "0px";
  };

  const styleElement = document.createElement('style');
  const borderClasName = "cell-borders-" + featureID;
  const dynamicCSS = `
    .${borderClasName} {
      border-right: 3px solid var(--${annotationColorVariable});
      border-left: 3px solid var(--${annotationColorVariable});
    }
  `;
  styleElement.textContent = dynamicCSS;
  document.head.appendChild(styleElement);
  cell.classList.add(borderClasName);

  // Add the triangle div to the table cell
  cell.appendChild(triangle);
};


/**
 * Update the global variables controlling the width of annotation triangles
 */
function updateAnnotationTrianglesWidth() {
  const randomCell = document.getElementById("Forward Strand");
  if (randomCell) {
     document.documentElement.style.setProperty('--triangle-width', (randomCell.offsetWidth - 4) + 'px');
  };
};


/**
 * Clean up cells that dont have a parent tr
 */
function cleanLostCells(targetTable) {
  let cells = targetTable.querySelectorAll("td"); // Select all table cells (td elements)

  cells.forEach(function (cell) {
    if (!cell.parentElement || cell.parentElement.tagName.toLowerCase() !== "tr") {
      // If the cell is not a child of a <tr> element, remove it
      cell.remove();
    };
  });
};


/**
 * Configure Coloris color picker
 */
Coloris({
  el: '.coloris',
  wrap: true,
  theme: 'polaroid',
  swatches: defaultAnnotationColors,
  closeButton: true,
  closeLabel: 'Save',
});