/**
 * Session class.
 */
const Session = new class {
    constructor() {
        // Dictionary of imported plasmid files
        this.plasmids = {};
  
        // Currently active plasmid file
        this.activePlasmidIndex = null;
  
        // Index of plasmid from where the subcloning originates
        this.subcloningOriginIndex = null;
        // Span of subcloning target in origin plasmid
        this.subcloningOriginSpan = null;
    };
  
    
    /**
     * Get the next available index for a new plasmid.
     * 
     * @returns - Index.
     */
    nextFreeIndex() {
      const entriesList = Object.keys(this.plasmids);

      // There are no plasmids yet, return 0
      if (entriesList.length == 0) {
        return 0;
      }

      // Get the last plasmid in the list and return its index + 1
      return parseInt(entriesList[entriesList.length - 1]) + 1;
    };
  
  
    /**
     * Add a new plasmid to the session.
     * 
     * @param {Object} newPlasmid - Plasmid to be added.
     */
    addPlasmid(newPlasmid) {
      // Check if index was given
      const currIndex = newPlasmid.index;
      // Add plasmid object to session
      this.plasmids[currIndex] = newPlasmid;
      
      // Create a new tab
      PlasmidTabs.new(currIndex, newPlasmid.name + newPlasmid.extension);
    };
  
  
    /**
     * Return active plasmid object
     * 
     * @returns {Plasmid} - Active plasmid
     */
    activePlasmid() {
      return this.plasmids[this.activePlasmidIndex];
    };
  
    /**
     * Returns plasmid by index.
     * 
     * @param {int} index - Index of plasmid to be retrieved.
     * @returns - Plasmid matching specified index.
     */
    getPlasmid(index) {
      return this.plasmids[index];
    };
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
        topology,
        additionalInfo
    ) {
        // Plasmid index, generate new one if none given
        this.index = (index !== null) ? index: Session.nextFreeIndex();
        this.name = name;
        this.extension = extension;
        this.additionalInfo = additionalInfo;
        this.sequence = sequence;
        this.complementarySequence = nucleotides.complementary(sequence);
        this.features = features;
        this.topology = topology;
        this.translations = {"forward": [], "reverse": []};
        this.selectedText = "";
        this.selectionStartPos = null;
        this.selectionEndPos = null;
        this.primers = null;
        this.operationNr = 1;

        this.contentGrid = null;
        this.featuresTable = null;
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
     * Creates the feature table HTML and saves it to featuresTable.
     */
    generateFeatureTable() {
        // Select features
        let currFeatures = this.features;

        // Create feature table container
        const featuresTableContainer = document.createElement("DIV");
        featuresTableContainer.id = "feature-table";
        featuresTableContainer.classList.add("feature-table");

        // Iterate over the features and populate the container
        for (const featureID in currFeatures) {
            // Select current feature
            const feature = currFeatures[featureID];
            
            // Skip LOCUS feature (gb)
            if (featureID.includes("LOCUS")) {continue};

            // Skip source feature type
            if (feature.type && feature.type.includes("source")) {continue};


            /**
             * Create new feature container
             */
            const featureDiv = document.createElement("DIV");
            featureDiv.id = featureID;

            /**
             * Collapsible header
             */
            const collapsibleHeader = document.createElement("BUTTON");
            collapsibleHeader.type = "button";
            collapsibleHeader.classList.add("collapsible-header");
            const currFeatureColor = (feature.color) ? feature.color: feature.ivaprimeColor;
            collapsibleHeader.style.backgroundColor = currFeatureColor;
            collapsibleHeader.innerText = feature.label;

            /**
             * Collapsible content
             */
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
            <div class="clr-field" style="color: ${currFeatureColor};">
                <button type="button" aria-labelledby="clr-open-label"></button>
                <input id="colorInput" type="text" class="coloris" data-coloris value="${currFeatureColor}"></div>
            </div>
            </div>
            `;
            collapsibleContent.appendChild(labelDiv);


            /**
             * Span
             */
            const spanDiv = document.createElement("DIV");
            const [spanStart, spanEnd] = feature.span;
            const spanEndMax = Session.activePlasmid().sequence.length;
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
             * Directionality
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
            const featureDirection = feature.directionality;
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                if (option.value === featureDirection) {
                    option.setAttribute('selected','selected');
                };
            };
            collapsibleContent.appendChild(directionDiv);


            /**
             * Translate feature checkbox
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
            //const customOption = new Option("Custom type", "customOption");
            //select.add(customOption, undefined);
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
             * Update info buttons
             */
            const updateButtonDiv = document.createElement("DIV");
            updateButtonDiv.classList.add("collapsible-content-hgroup");
            updateButtonDiv.innerHTML = `
            <a href="#" class="round-button update-feature-button" onClick="updateFeatureProperties(this)">Update</a>
            <a href="#" class="round-button remove-feature-button" onClick="removeFeatureButton(this)">Remove</a>
            `;
            collapsibleContent.appendChild(updateButtonDiv);


            featureDiv.appendChild(collapsibleHeader);
            featureDiv.appendChild(collapsibleContent);
            featuresTableContainer.appendChild(featureDiv);


            collapsibleHeader.onclick = function() {FeaturesTable.toggleCollapsibleHeader(this)}
        };

        this.featuresTable = featuresTableContainer;
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
 * Sort the features dict by span so that the features appear
 * in order in the sidebar.
 * 
 * @param {Object} inputDict - Dictionary to be sorted.
 * @returns {Object} - Sorted dictionary.
 */
function sortBySpan(inputDict) {
    // Convert the dictionary to an array of key-value pairs
    const valueKey = "span";
    const features = Object.entries(inputDict);

    // Sort the array based on the first number in the value key
    features.sort((a, b) => {
        const rangeStartA = a[1][valueKey][0];
        const rangeStartB = b[1][valueKey][0];
        return rangeStartA - rangeStartB;
    });

    // Convert the sorted array back to a dictionary and return
    return Object.fromEntries(features);
};