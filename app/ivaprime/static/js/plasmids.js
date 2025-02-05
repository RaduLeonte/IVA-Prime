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
    /**
     * @param {int} index - Index of plasmid
     * @param {string} name - Name of plasmid
     * @param {string} extension - File extension including period
     * @param {string} sequence - Nucleotide sequence of plasmid
     * @param {Object} features - Dictionary of features
     * @param {"linear" | "circular"} topology - Topology of plasmid
     * @param {any} additionalInfo - Additional info to keep track of (for exporting back to same file type)
     */
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
        this.selectionIndices = null;
        
        this.primers = null;
        this.operationNr = 1;

        // Check feature overlap and assign feature levels
        // to describe how they stack
        this.checkFeatureOverlap();

        // Generate views (circular, linear, grid)
        this.views = {
            "circular": null,
            "linear": null,
            "grid": null,
        };
        this.generateViews();

        // Generate sidebar
        this.featuresTable = null;
        this.generateFeaturesTable();
        
        this.history = [];

        this.historyTracker = 0;

        this.previousCell = null;
    };

    /**
     * Creates the different views and saves them
     */
    generateViews() {
        this.views = PlasmidViewer.draw(
            this.name,
            this.sequence,
            this.complementarySequence,
            this.features,
            this.topology
        );
    };


    /**
     * 
     * @param {*} indices 
     */
    setSelectionIndices(indices) {
        this.selectionIndices = indices;
    };


    /**
     * 
     * @returns 
     */
    getSelectionIndices() {
        return this.selectionIndices;
    };


    /**
     * Creates the feature table HTML and saves it to featuresTable.
     */
    generateFeaturesTable() {
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
            collapsibleHeader.style.color = PlasmidViewer.getTextColorBasedOnBg(currFeatureColor) // Text color
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
            const spanEndMax = this.sequence.length;
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
     * Case 1: S1 < S2 && E1 < S2 && E1 < E2
     * S1------------------E1
     *                         S2------E2
     * 
     * Case 2: S1 < S2 && E1 >= S2 && E1 < E2 -> Overlap
     * S1------------------E1
     *                  S2------E2
     * 
     * Case 3: S1 < S2 && E1 >= S2 && E1 >= E2 -> Overlap
     * S1--------------------------------E1
     *                         S2--------E2
     */
    checkFeatureOverlap() {
        for (const [featureID, featureDict] of Object.entries(this.features)) {
            featureDict["level"] = 0;
        };

        for (const [featureID, featureDict] of Object.entries(this.features)) {
            const featureSpan = featureDict["span"];
            console.log("checkFeatureOverlap:", featureDict["label"], featureSpan);
            for (const [featureID2, featureDict2] of Object.entries(this.features)) {
                if (featureID === featureID2) {continue};

                const featureSpan2 = featureDict2["span"]

                // Check if features are even on the same level
                if (featureDict["level"] !== featureDict2["level"]) {continue};
                
                // No overlap
                if (
                    (featureSpan[0] < featureSpan2[0] && featureSpan[1] < featureSpan2[0]) ||
                    (featureSpan[0] > featureSpan2[1] && featureSpan[1] > featureSpan2[1])
                ) {continue};

                // Overlap detected, move 
                console.log("Overlap", featureDict["label"], featureSpan, featureDict2["label"], featureSpan2);
                featureDict2["level"] += 1;
            };
        };
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