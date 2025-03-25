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

        this.scrollTop = 0;
        
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
        //this.generateViews();

        
        this.stateHistory = [];

        this.stateIndex = 0;

        this.previousCell = null;

        this.saveState("Create plasmid");
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

        Toolbar.updateUndoRedoButtonsStates();
    };


    /**
     * 
     * @param {*} indices 
     */
    setSelectionIndices(indices, selectedFeatureID = null) {
        this.selectionIndices = indices;
        this.selectedFeatureID = selectedFeatureID;

        Utilities.removeUserSelection();
        PlasmidViewer.updateFooterSelectionInfo();
    };


    clearSelectionIndices() {
        this.selectionIndices = null;
        this.selectedFeatureID = null;

        PlasmidViewer.updateFooterSelectionInfo();
    };


    /**
     * 
     * @returns 
     */
    getSelectionIndices() {
        return this.selectionIndices;
    };


    getSelectedFeatureID() {
        return this.selectedFeatureID;
    };


    /**
     *  Iterate over features and assign them to rows so that they do not overlap.
     */
    checkFeatureOverlap() {
        this.features = Utilities.sortFeaturesDictBySpan(this.features);
        for (const [featureID, featureDict] of Object.entries(this.features)) {
            featureDict["level"] = 0;
        };

        let levelTracker = {};

        for (const [featureID1, featureDict1] of Object.entries(this.features)) {
            const label1 = featureDict1["label"];
            const [span1Start, span1End] = featureDict1["span"];
            for (const [featureID2, featureDict2] of Object.entries(this.features)) {
                if (featureID1 === featureID2) continue; // Skip self-comparison

                const label2 = featureDict2["label"];
                const [span2Start, span2End] = featureDict2["span"];

                if (span1Start < span2Start && span1End < span2Start) {
                    // Feature1 is before Feature2 -> No overlap and break inner loop
                    //console.log("Plasmid.checkFeatureOverlap -> No overlap, break loop","\n",
                    //    label1, featureDict1["level"], [span1Start, span1End], "\n",
                    //    label2, featureDict2["level"], [span2Start, span2End]
                    //);
                    break;
                };

                if (span2Start < span1Start && span2End < span1Start) {
                    // Feature 2 is before Feature 1 -> No overlap, don't break inner loop
                    //console.log(
                    //    "Plasmid.checkFeatureOverlap -> No overlap 2","\n",
                    //    label1, level1, [span1Start, span1End], "\n",
                    //    label2, level2, [span2Start, span2End]
                    //);
                    continue;
                };

                if (featureDict1["level"] !== featureDict2["level"]) {
                    // Features are on different levels and could not possibly overlap
                    //console.log("Plasmid.checkFeatureOverlap -> Different levels", "\n",
                    //    label1, featureDict1["level"], [span1Start, span1End], "\n",
                    //    label2, featureDict2["level"], [span2Start, span2End]
                    //);
                    continue;
                };


                let featureToMove, spanToMove;
                if ((span1End - span1Start) >= (span2End - span2Start)) {
                    featureToMove = featureDict2;
                    spanToMove = [span2Start, span2End];
                } else {
                    featureToMove = featureDict1;
                    spanToMove = [span1Start, span1End];
                }

                let newLevel = featureToMove["level"] + 1;

                // Ensure the new level is not occupied at this span range
                while (levelTracker[newLevel] && levelTracker[newLevel].some(existingSpan =>
                    Math.max(existingSpan[0], spanToMove[0]) < Math.min(existingSpan[1], spanToMove[1])
                )) {
                    newLevel += 1; // Keep moving up until there's space
                }

                featureToMove["level"] = newLevel;

                // Register the new occupied level for this span
                if (!levelTracker[newLevel]) {
                    levelTracker[newLevel] = [];
                }
                levelTracker[newLevel].push(spanToMove);

                console.log("Plasmid.checkFeatureOverlap -> Overlap detected, move feature up", "\n",
                    featureToMove["label"], featureToMove["level"], spanToMove
                );
            };
        };
    };


    /**
     * Save current state of plasmid.
     * 
     * Save:
     * - name
     * - sequence
     * - complementary sequence
     * - features
     * - topology
     * - primers
     * 
     * States:
     * 
     *   [ {},    {},    {}, ...]
     *     0      1      2
     *     |      |____________|
     *     |             |
     *  Current        Prev.
     *   state        states
     * 
     * If we are in a previous state and we save a new state,
     * overwrite preceding states and new state will be 0.
     *  [ {},    {},    {}, ...]
     *     0      1      2
     *                   |      |____________|
     *                   |             |
     *                Current        Prev.
     *                 state        states
     * 
     * 
     * @param {string} actionDescription - Description of the action that caused the checkpoint.
     */
    saveState(actionDescription) {
        const currState = {
            actionDescription: actionDescription,
            name: this.name,
            sequence: this.sequence,
            complementarySequence: this.complementarySequence,
            topology: this.topology,
            primers: structuredClone(this.primers),
            features: structuredClone(this.features),
        };

        if (this.stateIndex !== 0) {
            this.stateHistory.splice(0, this.stateIndex);
        };

        this.stateHistory.unshift(currState);

        if (this.stateHistory.length > 100) {
            this.stateHistory.pop();
        };

        this.stateIndex = 0;

        
        console.log(`Plasmid.saveState -> ${this.index} Saving state: "${actionDescription}"`);
        Toolbar.updateUndoRedoButtonsStates();
    };


    /**
     * Load specific state from the state history.
     * 
     * @param {int} stateIndex - Index of state to be loaded [-100, 0] 
     */
    loadState(stateIndex) {
        console.log(`Plasmid.loadState -> Loading state: ${stateIndex} (curr:${this.stateIndex})`)
    
        const stateToLoad = this.stateHistory[stateIndex];

        this.name = stateToLoad.name;
        this.sequence = stateToLoad.sequence;
        this.complementarySequence = stateToLoad.complementarySequence;
        this.topology = stateToLoad.topology;
        this.primers = stateToLoad.primers;
        this.features = stateToLoad.features;

        PlasmidViewer.deselectBases();
        PlasmidViewer.redraw();
        Sidebar.update();

        this.stateIndex = stateIndex;

        if (Session.subcloningOriginPlasmidIndex === this.index) Session.removeMarkForSubcloning();

        Toolbar.updateUndoRedoButtonsStates();
    };


    /**
     * Load the previous state of the plasmid.
     */
    undo() {
        // Return immediately if we're on the earliest
        //  state (stateHistory.length - 1)
        if (this.stateIndex  >= this.stateHistory.length - 1) return;

        this.loadState(this.stateIndex + 1);
    };


    /**
     * Load the next state of the plasmid.
     */
    redo() {
        // Return immediately if we're on 
        // the latest state (0)
        if (this.stateIndex <= 0) return;

        this.loadState(this.stateIndex - 1);
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

        if (Session.subcloningOriginPlasmidIndex === this.index) Session.removeMarkForSubcloning();

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

        if (Session.subcloningOriginPlasmidIndex === this.index) Session.removeMarkForSubcloning();

        this.saveState("Change plasmid origin");
    };


    setTopology(newTopology) {
        console.log(`Plasmid.setTopology -> ${this.topology} => ${newTopology}`);

        this.topology = newTopology;

        if (Session.activePlasmidIndex == this.index) {
            PlasmidViewer.deselectBases();
            PlasmidViewer.redraw();
            Sidebar.update();
        };


        this.saveState(`Change file topology to ${newTopology}`);
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
        const span1 = parseInt(collapsibleContent.querySelector("#span-start-input").value);
        const span2 = parseInt(collapsibleContent.querySelector("#span-end-input").value)
        this.features[featureID].span = [
            Math.min(span1, span2),
            Math.max(span1, span2),
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

        this.sortFeatures();

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

        console.log("newFeature", span, Nucleotides.reverseComplementary(this.sequence.slice(span[0] - 1, span[1])))
        if (translated) {
            newFeatureDict.translation = Nucleotides.translate(
                directionality === "fwd"
                ? this.sequence.slice(span[0] - 1, span[1])
                : Nucleotides.reverseComplementary(this.sequence.slice(span[0] - 1, span[1]))
            );
            newFeatureDict.translated = true;
        };

        this.features[Utilities.newUUID()] = newFeatureDict;
        this.sortFeatures();

        PlasmidViewer.deselectBases();
        PlasmidViewer.redraw();
        Sidebar.update();

        if (!label) {
            this.saveState(`Add new feature at [${span[0]}, ${span[1]}]`);
        } else if (label === "New translation") {
            this.saveState(`Add new ${(directionality === "fwd") ? "forward": "reverse"} translation at [${span[0]}, ${span[1]}]`);
        };
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


    newTranslationAtFirstStart(strand="fwd") {
        if (!this.selectionIndices || this.selectionIndices === null || this.selectionIndices[1] !== null) return;

        const cursorIndex = this.selectionIndices[0];
        
        const sequenceToSearch = (strand === "fwd")
        ? this.sequence.slice(cursorIndex - 1)
        : this.complementarySequence.slice(0, cursorIndex - 1).split("").reverse().join("");
        
        console.log(`Plasmid.newTranslationAtFirstStart ->`, sequenceToSearch);

        const pattern = /(ATG)((?:[ATCG]{3})*?)(TAA|TAG|TGA)/;

        const match = pattern.exec(sequenceToSearch);
        if (!match) {
            Alerts.warning("Failure: New translation at first START codon", "No coding sequence was found.");
            return;
        };

        const span = (strand === "fwd") 
        ? [cursorIndex + match.index, cursorIndex + match.index + match[0].length - 1]
        : [sequenceToSearch.length - match.index - match[0].length + 1, sequenceToSearch.length - match.index];

        console.log(`Plasmid.newTranslationAtFirstStart ->`, strand, cursorIndex, span);
        
        this.newFeature(span, strand, "New translation", "CDS", null, true);
    
        this.saveState(`New translation at first START (starting pos: ${cursorIndex})`);
    };


    IVAOperation(operationType, insertionSeqDNA="", insertionSeqAA="", targetOrganism=null, translateFeature=false) {
        if (this.selectionIndices === null) {return};
        console.log(`Plasmid.IVAOperation ->`, operationType, insertionSeqDNA, insertionSeqAA, targetOrganism, translateFeature);
        console.log(`Plasmid.IVAOperation -> this.selectionIndices=${this.selectionIndices}`);

        if (targetOrganism !== UserPreferences.get("preferredOrganism")) UserPreferences.set("preferredOrganism", targetOrganism);

        if (insertionSeqAA) {
            if (typeof insertionSeqAA === "string"){
                insertionSeqAA = insertionSeqAA.replace("-", "*").replace("X", "*")
            } else {
                insertionSeqAA = insertionSeqAA.map(seq => seq.replace("-", "*").replace("X", "*"))
            };
        };

        try {
            let seqToInsert;
            let primerSet;
            if (operationType !== "Subcloning") {
                seqToInsert = (insertionSeqAA && insertionSeqAA !== null && insertionSeqAA !== "" && targetOrganism !== null)
                ? Nucleotides.optimizeAA(insertionSeqAA, targetOrganism)
                : insertionSeqDNA;
    
                primerSet = Primers.generateSet(
                    operationType,
                    this.selectionIndices,
                    this.sequence,
                    seqToInsert,
                );
            } else {
                const seq5PrimeDNA = (typeof insertionSeqDNA !== "string") ? insertionSeqDNA[0]: "";
                const seq3PrimeDNA = (typeof insertionSeqDNA !== "string") ? insertionSeqDNA[1]: "";
                
                const seq5PrimeAA = (typeof insertionSeqAA !== "string") ? insertionSeqAA[0]: "";
                const seq3PrimeAA = (typeof insertionSeqAA !== "string") ? insertionSeqAA[1]: "";
    
                const seq5Prime = (seq5PrimeAA && seq5PrimeAA !== null && seq5PrimeAA !== "" && targetOrganism !== null)
                ? Nucleotides.optimizeAA(seq5PrimeAA, targetOrganism)
                : seq5PrimeDNA;
    
                const seq3Prime = (seq3PrimeAA && seq3PrimeAA !== null && seq3PrimeAA !== "" && targetOrganism !== null)
                ? Nucleotides.optimizeAA(seq3PrimeAA, targetOrganism)
                : seq3PrimeDNA;
    
                const subclonignOriginPlasmid = Session.getPlasmid(Session.subcloningOriginPlasmidIndex);
                const subcloningOriginSpan = Session.subcloningOriginSpan;
                const subcloningTarget = subclonignOriginPlasmid.sequence.slice(subcloningOriginSpan[0] - 1, subcloningOriginSpan[1])
                const subcloningSequenceFull = seq5Prime + subcloningTarget + seq3Prime;
                seqToInsert = subcloningSequenceFull;
    
                primerSet = Primers.generateSubcloningSet(
                    this.selectionIndices,
                    this.sequence,
                    seq5Prime,
                    seq3Prime,
                );
            };
    
    
            this.primers.push(primerSet);
    
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

            this.saveState(`IVA Operation: ${operationType}`);

        } catch(error) {
            switch (true) {
                case (error instanceof AmbiguousBaseError):
                    handleError(error);
                    break;

                case (error instanceof OutOfBasesError):
                    handleError(error);
                    break;

                default: {
                    throw error;
                };
            };
        };
    };


    /**
     * Insert new sequence into plasmid sequence
     * 
     * @param {Array<Number>} sliceRange - Section to delete 
     * @param {String} newSequence - New sequence to insert
     */
    sliceSequence(sliceRange, newSequence) {
        if (sliceRange[1] === null) sliceRange = [sliceRange[0], sliceRange[0]-1];

        this.sequence = this.sequence.slice(0, sliceRange[0] - 1) + newSequence + this.sequence.slice(sliceRange[1]);
        this.complementarySequence = Nucleotides.complementary(this.sequence);

        if (Session.subcloningOriginPlasmidIndex === this.index) Session.removeMarkForSubcloning();
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
                    //console.log(
                    //    "Plasmid.shiftFeatures ->",
                    //    this.features[featureID]["label"],
                    //    overlapType,
                    //    featureSpan,
                    //    this.features[featureID]["span"],
                    //)
                    break;
    
                case "inside":
                    this.features[featureID]["span"] = [spanStart, spanEnd + shiftAmount];
                    //console.log(
                    //    "Plasmid.shiftFeatures ->",
                    //    this.features[featureID]["label"],
                    //    overlapType,
                    //    featureSpan,
                    //    this.features[featureID]["span"],
                    //)
                    break;
    
                case "delete":
                    //console.log(
                    //    "Plasmid.shiftFeatures ->",
                    //    this.features[featureID]["label"],
                    //    overlapType,
                    //    featureSpan,
                    //)
                    delete this.features[featureID];
                    break;

                default:
                    //console.log(
                    //    "Plasmid.shiftFeatures ->",
                    //    this.features[featureID]["label"],
                    //    "leave alone",
                    //    featureSpan,
                    //)
                    break;
            };
        };
    };
};