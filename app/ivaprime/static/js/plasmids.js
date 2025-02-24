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
        this.complementarySequence = Nucleotides.complementary(sequence);
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
        
        this.stateHistory = [];

        this.stateIndex = 0;

        this.previousCell = null;


        this.saveState("Create plasmid")
    };


    /**
     * Creates the different views and saves them
     */
    generateViews(views=null) {
        views = (views != null) ? views: ["circular", "linear", "grid"];

        const drawFunctions = {
            "circular": PlasmidViewer.drawCircular.bind(PlasmidViewer),
            "linear": PlasmidViewer.drawLinear.bind(PlasmidViewer),
            "grid": PlasmidViewer.drawGrid.bind(PlasmidViewer),
        };
        views.forEach(view => {
            this.views[view] = drawFunctions[view](
                this.name,
                this.sequence,
                this.complementarySequence,
                this.features,
                this.topology
            );
        });
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
        featuresTableContainer.id = "features-table";
        featuresTableContainer.classList.add("features-table");

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
            collapsibleHeader.style.color = Utilities.getTextColorBasedOnBg(currFeatureColor) // Text color
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
            <input id="label-input" value="${feature.label}">
            <div class="clr-field" style="color: ${currFeatureColor};">
                <button type="button" aria-labelledby="clr-open-label"></button>
                <input id="color-input" type="text" class="coloris" data-coloris value="${currFeatureColor}"></div>
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
            <input type="number" id="span-start-input" min="1" max="${spanEndMax}" value="${spanStart}">
            <span> .. </span> 
            <input type="number" id="span-end-input" min="1" max="${spanEndMax}" value="${spanEnd}">
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
            <select id="directionality-select">
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
            <input type="checkbox" id="translated-checkbox" checked="${(feature.translation === "" || feature.translation === null || (typeof feature.translation) === 'undefined') ? false: true}">
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
            <select id="type-select" onchange="
            if (this.options[this.selectedIndex].value=='customOption') {
                toggleInputInSelect(this, this.nextElementSibling);
                this.selectedIndex='0'}
                ">
            </select><input id="type-input" name="browser" style="display: none;" disabled="disabled" onblur="
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
            <textarea id="note-text-area" spellcheck="false">${feature.note}</textarea>
            </div>
            `;
            collapsibleContent.appendChild(noteDiv);

            /**
             * Update info buttons
             */
            const updateButtonDiv = document.createElement("DIV");
            updateButtonDiv.classList.add("collapsible-content-hgroup");
            updateButtonDiv.innerHTML = `
            <span class="round-button update-feature-button" onClick="Session.getPlasmid(${this.index}).updateFeatureProperties('${featureID}')">Update</span>
            <span class="round-button remove-feature-button" onClick="Session.getPlasmid(${this.index}).removeFeature('${featureID}')">Remove</span>
            `;
            collapsibleContent.appendChild(updateButtonDiv);


            featureDiv.appendChild(collapsibleHeader);
            featureDiv.appendChild(collapsibleContent);
            featuresTableContainer.appendChild(featureDiv);


            collapsibleHeader.onclick = function() {
                Sidebar.toggleCollapsibleHeader(this)
            };
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


    /**
     * Save current state of plasmid.
     * 
     * @param {string} actionDescription - Description of the action that caused the checkpoint.
     */
    saveState(actionDescription) {
        console.log(`Plasmid.saveState -> ${this.index} Saving state: "${actionDescription}"`)
    };


    /**
     * Load specific state from the state history.
     * 
     * @param {int} stateIndex - Index of state to be loaded [-100, 0] 
     */
    loadState(stateIndex) {
        console.log(`Plasmid.loadState -> ${this.index} Loading state: ${stateIndex}`)
    };


    /**
     * Load the previous state of the plasmid.
     */
    undo() {
        // Return immediately if we're on the last possible state
        if ((this.stateIndex*-1 + 1) == this.stateHistory.length) {return};

        this.loadState(this.stateIndex - 1);
    };


    /**
     * Load the next state of the plasmid.
     */
    redo() {
        // Return immediately if we're on the lastest state
        if (this.stateIndex == 0) {return};

        this.loadState(this.stateIndex + 1);
    };


    /**
     * Rename the plasmid.
     * 
     * @param {string} newName - New plasmid name 
     */
    rename(newName) {
        console.log(`Plasmid.rename -> ${this.index} ${newName}`)
        this.name = newName;

        const plasmidTab = document.querySelector(`div#plasmid-tab-${this.index}`);
        plasmidTab.firstElementChild.innerText = this.name + this.extension
        
        if (Session.activePlasmidIndex == this.index) {
            PlasmidViewer.redraw(["circular", "linear"]);
        };

        this.saveState("Rename plasmid")
    };


    /**
     * Flip the plasmid sequence.
     */
    flip() {
        console.log(`Plasmid.flip -> ${this.index}`);

        // Flip sequence
        const flippedSequence = this.complementarySequence.split("").reverse().join("");
        const flippedCompSequence = this.sequence.split("").reverse().join("");
        this.sequence = flippedSequence;
        this.complementarySequence = flippedCompSequence;

        const sequenceLength = flippedSequence.length;

        // Flip features
        Object.entries(this.features).forEach(([featureId, featureDict]) => {
            const currentSpan = featureDict["span"];

            const newSpan = [
                sequenceLength - currentSpan[1] + 1,
                sequenceLength - currentSpan[0] + 1
            ];

            this.features[featureId]["span"] = newSpan;
            this.features[featureId]["directionality"] = (featureDict["directionality"] == "fwd") ? "rev": "fwd";
        });
        this.features = Utilities.sortFeaturesDictBySpan(this.features);

        if (Session.activePlasmidIndex == this.index) {
            PlasmidViewer.deselectBases();
            PlasmidViewer.redraw();
            Sidebar.update();
        };

        this.saveState("Flip plasmid")
    };


    /**
     * Set the plasmid origin and shift numbering of bases accordingly.
     * 
     * @param {int} newOrigin - Index of the base to be the new origin.
     */
    setOrigin(newOrigin) {
        newOrigin = parseInt(newOrigin) - 1;
        console.log(`Plasmid.setorigin -> ${this.index} newOrigin=${newOrigin}`);


        this.sequence = this.sequence.slice(newOrigin) + this.sequence.slice(0, newOrigin);
        this.complementarySequence = Nucleotides.complementary(this.sequence);

        Object.entries(this.features).forEach(([featureId, featureDict]) => {
            const currentSpan = featureDict["span"];

            const newSpan = [
                currentSpan[0] - newOrigin,
                currentSpan[1] - newOrigin
            ];

            this.features[featureId]["span"] = newSpan;
        });
        this.features = Utilities.sortFeaturesDictBySpan(this.features);

        if (Session.activePlasmidIndex == this.index) {
            PlasmidViewer.deselectBases();
            PlasmidViewer.redraw();
            Sidebar.update();
        };

        this.saveState("Change plasmid origin");
    };


    /**
     * Update feature properties from fields in the collapsible header.
     * 
     * @param {String} featureID - UUID of feature to be updated
     */
    updateFeatureProperties(featureID) {
        const collapsibleContent = document.getElementById(featureID).querySelector(".collapsible-content");
        
        // Label
        this.features[featureID].label = collapsibleContent.querySelector("#label-input").value;

        // Color
        this.features[featureID].color = collapsibleContent.querySelector("#color-input").value;

        // Directionality
        this.features[featureID].directionality = collapsibleContent.querySelector("#directionality-select").value;

        // Span
        this.features[featureID].span = [
            collapsibleContent.querySelector("#span-start-input").value,
            collapsibleContent.querySelector("#span-end-input").value,
        ];

        // Translated
        if (collapsibleContent.querySelector("#translated-checkbox").checked === true) {
            const targetSequence = (this.features[featureID].directionality === "fwd")
            ? this.sequence.slice(
                this.features[featureID].span[0] - 1,
                this.features[featureID].span[1]
            )
            : Nucleotides.complementary(
                this.sequence.slice(
                    this.features[featureID].span[0] - 1,
                    this.features[featureID].span[1]
                )
            ).split("").reverse().join("");

            this.features[featureID].translation = Nucleotides.translate(targetSequence);
        } else {
            delete this.features[featureID].translation;
        };

        // Type
        this.features[featureID].type = 
            (collapsibleContent.querySelector("#type-select").disabled === false)
            ? collapsibleContent.querySelector("#type-select").value
            : collapsibleContent.querySelector("#type-input").value;

        // Note
        this.features[featureID].note = collapsibleContent.querySelector("#note-text-area").value;

        if (Session.activePlasmidIndex == this.index) {
            PlasmidViewer.deselectBases();
            PlasmidViewer.redraw();
            Sidebar.update();
        };

        this.saveState(`Changed feature properties.`);
    };


    /**
     * Delete a feature from the features dict and reload plasmid.
     * 
     * @param {String} featureID - UUID of feature to be deleted
     */
    removeFeature(featureID) {
        const featureLabel = this.features[featureID].label;
        delete this.features[featureID];

        if (Session.activePlasmidIndex == this.index) {
            PlasmidViewer.deselectBases();
            PlasmidViewer.redraw();
            Sidebar.update();
        };

        this.saveState(`Delete feature: "${featureLabel}"`);
    };
};