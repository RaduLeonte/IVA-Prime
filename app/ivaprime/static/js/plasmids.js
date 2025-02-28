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
        
        this.selectionIndices = null;
        
        this.primers = [];
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

        Utilities.removeUserSelection();
        PlasmidViewer.updateFooterSelectionInfo();
    };


    clearSelectionIndices() {
        this.selectionIndices = null;
        PlasmidViewer.updateFooterSelectionInfo();
    };


    /**
     * 
     * @returns 
     */
    getSelectionIndices() {
        return this.selectionIndices;
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

        this.sortFeatures();

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

        this.sortFeatures();

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
     * Sorts the plasmid's features by span
     */
    sortFeatures() {
        this.features = Utilities.sortFeaturesDictBySpan(this.features);
        this.checkFeatureOverlap();
    };


    newFeature(span, directionality="fwd", label=null, type=null, color=null, translated=false, note="") {
        const newFeatureDict = {
            label: (label) ? label: "New feature",
            type: (type) ? type: (translated) ? "CDS": "misc_feature",
            directionality: directionality,
            span: span,
            color: (color) ? color: Utilities.getRandomDefaultColor(),
            note: note,
        };

        if (translated) {
            newFeatureDict.translation = Nucleotides.translate(
                directionality === "fwd"
                ? this.sequence.slice(...span)
                : Nucleotides.reverseComplementary(this.sequence).slice(...span)
            );
        };

        this.features[Utilities.newUUID()] = newFeatureDict;
        this.sortFeatures();

        PlasmidViewer.deselectBases();
        PlasmidViewer.redraw();
        Sidebar.update();
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


    IVAOperation(operationType, insertionSeqDNA="", insertionSeqAA="", targetOrganism=null, translateFeature=false) {
        if (this.selectionIndices === null) {return};
        console.log(`Plasmid.IVAOperation -> this.selectionIndices=${this.selectionIndices}`);

        const seqToInsert = (insertionSeqAA && insertionSeqAA !== null && insertionSeqAA !== "" && targetOrganism !== null)
        ? Nucleotides.optimizeAA(insertionSeqAA, targetOrganism)
        : insertionSeqDNA;

        const primersSet = Primers.generateSet(
            operationType,
            this.selectionIndices,
            this.sequence,
            seqToInsert,
        );

        this.primers.push(primersSet);

        this.sliceSequence(this.selectionIndices, seqToInsert);

        this.shiftFeatures(this.selectionIndices, seqToInsert);

        if (operationType !== "Deletion") {
            this.newFeature(
                [this.selectionIndices[0], this.selectionIndices[0]+seqToInsert.length-1],
                "fwd",
                operationType,
                null,
                "#c83478",
                translateFeature,
                ""
            );
        } else {
            PlasmidViewer.deselectBases();
            PlasmidViewer.redraw();
            Sidebar.update();
        };
    };


    /**
     * Insert new sequence into plasmid sequence
     * 
     * @param {Array<Number>} sliceRange - Section to delete 
     * @param {String} newSequence - New sequence to insert
     */
    sliceSequence(sliceRange, newSequence) {
        if (sliceRange[1] === null) sliceRange = [sliceRange[0], sliceRange[0]];

        this.sequence = this.sequence.slice(0, sliceRange[0] - 1) + newSequence + this.sequence.slice(sliceRange[1]);
        this.complementarySequence = Nucleotides.complementary(this.sequence);
    };


    shiftFeatures(sliceRange, newSequence) {
        if (sliceRange[1] === null) sliceRange = [sliceRange[0], sliceRange[0]];

        const [sliceRangeStart, sliceRangeEnd] = sliceRange;
        const isSimpleInsertion = (sliceRangeStart === sliceRangeEnd)

        for (let featureID in this.features) {
            const featureSpan = this.features[featureID]["span"];
            const [spanStart, spanEnd] = featureSpan;
    
            //// Adjust indices for pure insertions
            //if (sliceRangeStart === sliceRangeEnd) {
            //    sliceRangeStart++;
            //    sliceRangeEnd++;
            //} else {
            //    sliceRangeStart++;
            //};
    
            let overlapType = null;
            if (isSimpleInsertion) {
                if (sliceRangeStart <= spanStart) overlapType = "shift";
                else if (sliceRangeStart < spanEnd) overlapType = "inside";
            } else {
                if (sliceRangeStart === spanStart && sliceRangeEnd === spanEnd) {
                    overlapType = "delete"; // Exact replacement
                } else if (sliceRangeEnd < spanStart) {
                    overlapType = "shift"; // New feature is completely before old
                } else if (sliceRangeStart > spanEnd) {
                    overlapType = null; // New feature is completely after old
                } else if (sliceRangeStart >= spanStart && sliceRangeEnd <= spanEnd) {
                    overlapType = "inside"; // Fully inside old feature
                } else if (sliceRangeStart <= spanStart && sliceRangeEnd >= spanEnd) {
                    overlapType = "delete"; // Encompasses old feature
                } else {
                    overlapType = "delete"; // Overlapping cases
                };
            };
    
            // Apply the determined action
            const shiftAmount = (isSimpleInsertion)
            ? newSequence.length
            : newSequence.length - (sliceRange[1] - sliceRange[0] + 1);
            switch (overlapType) {
                case "shift":
                    // Shift feature position based on inserted length
                    this.features[featureID]["span"] = [spanStart + shiftAmount, spanEnd + shiftAmount];
                    console.log(
                        "Plasmid.shiftFeatures ->",
                        this.features[featureID]["label"],
                        overlapType,
                        featureSpan,
                        this.features[featureID]["span"],
                    )
                    break;
    
                case "inside":
                    this.features[featureID]["span"] = [spanStart, spanEnd + shiftAmount];
                    console.log(
                        "Plasmid.shiftFeatures ->",
                        this.features[featureID]["label"],
                        overlapType,
                        featureSpan,
                        this.features[featureID]["span"],
                    )
                    break;
    
                case "delete":
                    console.log(
                        "Plasmid.shiftFeatures ->",
                        this.features[featureID]["label"],
                        overlapType,
                        featureSpan,
                    )
                    delete this.features[featureID];
                    break;

                default:
                    console.log(
                        "Plasmid.shiftFeatures ->",
                        this.features[featureID]["label"],
                        "leave alone",
                        featureSpan,
                    )
                    break;
            };
        };
    };
};