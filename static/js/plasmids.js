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
        this.index = (index !== null) ? index: Session.nextFreeIndex();
        this.name = name;
        this.extension = extension;
        this.additionalInfo = additionalInfo;
        this.sequence = sequence;
        this.complementarySequence = Nucleotides.complementary(sequence);
        this.features = features;
        this.topology = topology;

        this.scrollTop = 0; // Plasmid scroll level
    
        this.selectionIndices = null; // Selection range
        
        this.primers = []; // Generated primers
        this.operationNr = 1; // Nr of operations done
        this.deletionMarks = []; // Deletion markings

        // Check feature overlap and assign feature levels to describe how they stack
        this.checkFeatureOverlap();

        // Init views (circular, linear, grid)
        this.views = {
            "circular": null,
            "linear": null,
            "grid": null,
        };

        this.stateHistory = []; // Array holding state objects
        this.stateIndex = 0; // State history tracker

        // Create initial state
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


    // #region Selection
    /**
     * Set the current selection indices of the plasmid or 
     * the currently selected featureID
     * @param {Array<Number>} indices 
     */
    setSelectionIndices(indices, selectedFeatureID = null) {
        this.selectionIndices = indices;
        this.selectedFeatureID = selectedFeatureID;

        Utilities.removeUserSelection(); // Unselect conventionally selected text
        PlasmidViewer.updateFooterSelectionInfo(); // Update footer
    };
    /**
     * Reset the selection indices
     */
    clearSelectionIndices() {
        this.selectionIndices = null;
        this.selectedFeatureID = null;

        PlasmidViewer.updateFooterSelectionInfo();  // Update footer
    };


    /**
     * Return the current selection indices
     * @returns {Array<Number>}
     */
    getSelectionIndices() {
        return this.selectionIndices;
    };
    /**
     * Return the ID of the currently selected feature
     * @returns {String}
     */
    getSelectedFeatureID() {
        return this.selectedFeatureID;
    };
    /**
     * Returns true if a selection exists
     * @returns {Boolean}
     */
    selectionExists() {
        return this.selectionIndices && this.selectionIndices !== null && this.selectionIndices[0] !== null;
    };
    /**
     * Returns true if the the selection is a single base
     * @returns {Boolean}
     */
    selectionIsSingle() {
        return this.selectionIndices !== null && this.selectionIndices[1] === null;
    };
    /**
     * Returns true if the selection is a range
     * @returns {Boolean}
     */
    selectionIsRange() {
        return this.selectionIndices !== null && this.selectionIndices[1] !== null;
    };
    // #endregion Selection 


    // #region Undo/Redo
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
    STATE_PROPERTIES = [
        "name", "sequence", "complementarySequence", "topology", "primers", "features", "deletionMarks"
    ]
    saveState(actionDescription) {
        console.log(`Plasmid.saveState -> ${this.index} Saving state: "${actionDescription}"`);
        // State dictionary
        const currentState = {
            actionDescription
        };

        // Iterate over the state properties and save them to the state dict, making deep clones where necessary
        for (const property of this.STATE_PROPERTIES) {
            const value = this[property];
            currentState[property] = (typeof value === 'object' && value !== null) ? structuredClone(value) : value;
        };

        // If we're not on the latest state, delete all newer state to have this state be the newest one
        if (this.stateIndex !== 0) {
            this.stateHistory.splice(0, this.stateIndex);
        };

        // Add this state as the first entry in the list
        this.stateHistory.unshift(currentState);

        // Delete oldest state if we reach the cap
        if (this.stateHistory.length > 100) {
            this.stateHistory.pop();
        };

        // Reset state index
        this.stateIndex = 0;

        // Update toolbar buttons
        Toolbar.updateUndoRedoButtonsStates();
    };


    /**
     * Load specific state from the state history.
     * 
     * @param {int} stateIndex - Index of state to be loaded [-100, 0] 
     */
    loadState(stateIndex) {
        console.log(`Plasmid.loadState -> Loading state: ${stateIndex} (curr:${this.stateIndex})`)
    
        // Get state to load
        const stateToLoad = this.stateHistory[stateIndex];

        // Iterate over properties and load them
        for (const property of this.STATE_PROPERTIES) {
            this[property] = stateToLoad[property];
        };

        // Deselect
        PlasmidViewer.deselectBases();
        // Redraw plasmid
        PlasmidViewer.redraw();
        // Update sidebar
        Sidebar.update();

        // Update state tracker
        this.stateIndex = stateIndex;

        // If there is a subcloning marking in this plasmid, remove it
        if (Session.subcloningOriginPlasmidIndex === this.index) Session.removeMarkForSubcloning();

        // Update toolbar buttons
        Toolbar.updateUndoRedoButtonsStates();
    };


    /**
     * Load the previous state of the plasmid.
     */
    undo() {
        // Return immediately if we're on the earliest state (stateHistory.length - 1)
        if (this.stateIndex  >= this.stateHistory.length - 1) return;

        this.loadState(this.stateIndex + 1);
    };
    /**
     * Load the next state of the plasmid.
     */
    redo() {
        // Return immediately if we're on the latest state (0)
        if (this.stateIndex <= 0) return;

        this.loadState(this.stateIndex - 1);
    };
    // #endregion Undo/Redo


    // #region Plasmid actions
    /**
     * Rename the plasmid.
     * 
     * @param {string} newName - New plasmid name 
     */
    rename(newName) {
        // Update plasmid property
        this.name = newName;

        // Update plasmid tab
        const plasmidTab = document.querySelector(`div#plasmid-tab-${this.index}`);
        plasmidTab.firstElementChild.innerText = this.name + this.extension
        
        // If we're renaming the currently active plasmid, redraw the circular and linear
        // views since they display the plasmid name
        if (Session.activePlasmidIndex == this.index) {
            PlasmidViewer.redraw(["circular", "linear"]);
        };

        // Save
        this.saveState("Rename plasmid")
    };


    /**
     * Flip the plasmid sequence.
     */
    flip() {
        // Flip sequence
        const flippedSequence = this.complementarySequence.split("").reverse().join("");
        const flippedCompSequence = this.sequence.split("").reverse().join("");
        this.sequence = flippedSequence;
        this.complementarySequence = flippedCompSequence;

        // Flip features
        const sequenceLength = flippedSequence.length;
        Object.entries(this.features).forEach(([featureId, featureDict]) => {
            const currentSpan = featureDict["span"];

            const newSpan = [
                sequenceLength - currentSpan[1] + 1,
                sequenceLength - currentSpan[0] + 1
            ];

            this.features[featureId]["span"] = newSpan;
            this.features[featureId]["directionality"] = (featureDict["directionality"] == "fwd") ? "rev": "fwd";
        });
        // Sort features
        this.sortFeatures();

        // If this is the currently active plasmid, redraw
        // TO DO: Keep selection
        if (Session.activePlasmidIndex == this.index) {
            PlasmidViewer.deselectBases();
            PlasmidViewer.redraw();
            Sidebar.update();
        };

        // If there is a subcloning marking in this plasmid, remove it
        // TO DO: Keep subcloning marking
        if (Session.subcloningOriginPlasmidIndex === this.index) Session.removeMarkForSubcloning();

        // Save
        this.saveState("Flip plasmid")
    };


    /**
     * Set the plasmid origin and shift numbering of bases accordingly.
     * 
     * @param {int} newOrigin - Index of the base to be the new origin.
     */
    setOrigin(newOrigin) {
        // Convert sequence index to array index
        newOrigin = parseInt(newOrigin) - 1;

        // Shift sequences
        this.sequence = this.sequence.slice(newOrigin) + this.sequence.slice(0, newOrigin);
        this.complementarySequence = Nucleotides.complementary(this.sequence);

        // Shift features
        Object.entries(this.features).forEach(([featureId, featureDict]) => {
            const currentSpan = featureDict["span"];

            const newSpan = [
                currentSpan[0] - newOrigin,
                currentSpan[1] - newOrigin
            ];

            this.features[featureId]["span"] = newSpan;
        });
        // Sort
        this.sortFeatures();

        // Redraw
        // TO DO: Keep selection
        if (Session.activePlasmidIndex == this.index) {
            PlasmidViewer.deselectBases();
            PlasmidViewer.redraw();
            Sidebar.update();
        };
        // Remove subcloning marking
        // TO DO: Keep subcloning marking
        if (Session.subcloningOriginPlasmidIndex === this.index) Session.removeMarkForSubcloning();

        this.saveState("Change plasmid origin");
    };


    /**
     * Set the topology of the plasmid
     * 
     * @param {String} newTopology - "linear" | "circular" 
     */
    setTopology(newTopology) {
        // Save var
        this.topology = newTopology;

        // Redraw
        // TO DO: Keep selection
        if (Session.activePlasmidIndex == this.index) {
            PlasmidViewer.deselectBases();
            PlasmidViewer.redraw();
            Sidebar.update();
        };

        // Save
        this.saveState(`Change file topology to ${newTopology}`);
    };
    // #endregion Plasmid actions


    // #region Features
    /**
     *  Iterate over features and assign them to rows so that they do not overlap.
     */
    checkFeatureOverlap() {
        // Sort features
        this.features = Utilities.sortFeaturesDictBySpan(this.features);

        // Set all feature levels to 0
        for (const [featureID, featureDict] of Object.entries(this.features)) {
            featureDict["level"] = 0;
        };

        // Iterate over features
        let levelTracker = {}; // Keep track of occupied levels
        for (const [featureID1, featureDict1] of Object.entries(this.features)) {
            const [span1Start, span1End] = featureDict1["span"];

            // Compare against all other features
            for (const [featureID2, featureDict2] of Object.entries(this.features)) {
                // Skip self-comparison
                if (featureID1 === featureID2) continue;

                const [span2Start, span2End] = featureDict2["span"];

                // If feature1 is upstream of feature2 -> stop comparing
                // as features are always sorted and there will never be
                // another feature that could possibly overlap
                if (span1Start < span2Start && span1End < span2Start) {
                    break;
                };

                // If feature1 is downstream of feature2 -> no overlap, pass
                if (span2Start < span1Start && span2End < span1Start) {
                    continue;
                };

                // If the features are on different levels -> no overlap, pass
                if (featureDict1["level"] !== featureDict2["level"]) {
                    continue;
                };

                // Features are overlapping
                let featureToMove, spanToMove;
                // Figure out which feature is longer and move the shorter one
                if ((span1End - span1Start) >= (span2End - span2Start)) {
                    // Feature 2 is shorter
                    featureToMove = featureDict2;
                    spanToMove = [span2Start, span2End];
                } else {
                    // Feature 1 is shorter
                    featureToMove = featureDict1;
                    spanToMove = [span1Start, span1End];
                }

                // Increment level
                let newLevel = featureToMove["level"] + 1;

                // Ensure the new level is not occupied at this span range
                while (levelTracker[newLevel] && levelTracker[newLevel].some(existingSpan =>
                    Math.max(existingSpan[0], spanToMove[0]) < Math.min(existingSpan[1], spanToMove[1])
                )) {
                    // Keep moving up until there's space
                    newLevel += 1;
                };

                // Set new feature level
                featureToMove["level"] = newLevel;

                // Register the new occupied level for this span
                if (!levelTracker[newLevel]) {
                    levelTracker[newLevel] = [];
                };
                levelTracker[newLevel].push(spanToMove);
            };
        };
    };


    /**
     * Sorts the plasmid's features by span
     */
    sortFeatures() {
        this.features = Utilities.sortFeaturesDictBySpan(this.features);
        this.checkFeatureOverlap();
    };


    /**
     * Update feature properties from fields in the collapsible header.
     * 
     * @param {String} featureID - UUID of feature to be updated
     */
    updateFeatureProperties(featureID) {
        // Select sidebar element
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
     * Create new feature annotation.
     * 
     * @param {Array<Number>} span - Span to annotated 
     * @param {String} directionality - "fwd" | "rev" Directionality of annotation 
     * @param {String} label - Label/name
     * @param {String} type - Annotation type (CDS, primer, misc_feature etc.)
     * @param {String} color - Hex color of annotation 
     * @param {Boolean} translated - Flag to translate feature or not 
     * @param {String} note - Note/comment 
     */
    newFeature(span, directionality="fwd", label=null, type=null, color=null, translated=false, note="") {
        // Initialized feature dict
        const newFeatureDict = {
            label: (label) ? label: "New feature",
            type: (type) ? type: (translated) ? "CDS": "misc_feature",
            directionality: directionality,
            span: span,
            color: (color) ? color: Utilities.getRandomDefaultColor(),
            note: note,
        };

        // Translate span if necessary
        if (translated) {
            newFeatureDict.translation = Nucleotides.translate(
                directionality === "fwd"
                ? this.sequence.slice(span[0] - 1, span[1])
                : Nucleotides.reverseComplementary(this.sequence.slice(span[0] - 1, span[1]))
            );
            newFeatureDict.translated = true;
        };

        // Add feature
        this.features[Utilities.newUUID()] = newFeatureDict;
        this.sortFeatures();

        PlasmidViewer.deselectBases();
        PlasmidViewer.redraw();
        Sidebar.update();

        // Save
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

        this.sortFeatures();

        if (Session.activePlasmidIndex === this.index) {
            PlasmidViewer.deselectBases();
            PlasmidViewer.redraw();
            Sidebar.update();
        };

        this.saveState(`Delete feature: "${featureLabel}"`);
    };


    /**
     * Start a new translation at the first START codon until a STOP codon is encountered.
     * 
     * @param {String} strand - "fwd" | "rev" Top or bottom strand respectively 
     * @returns 
     */
    newTranslationAtFirstStart(strand="fwd") {
        // Check if selection exists
        if (!this.selectionExists()) return;

        // Get starting position
        const cursorIndex = this.selectionIndices[0];
        
        // Select appropriate strand sequence
        const sequenceToSearch = (strand === "fwd")
        ? this.sequence.slice(cursorIndex - 1)
        : this.complementarySequence.slice(0, cursorIndex - 1).split("").reverse().join("");
        

        // Regex pattern: ATG, followed by DNA codons, terminated by a STOP codon
        const pattern = /(ATG)((?:[ATCG]{3})*?)(TAA|TAG|TGA)/;

        // Find first match
        const match = pattern.exec(sequenceToSearch);
        if (!match) {
            Alerts.warning("Failure: New translation at first START codon", "No coding sequence was found.");
            return;
        };

        // Determine span of translation
        const span = (strand === "fwd") 
        ? [cursorIndex + match.index, cursorIndex + match.index + match[0].length - 1]
        : [sequenceToSearch.length - match.index - match[0].length + 1, sequenceToSearch.length - match.index];

        // Create translation
        this.newFeature(span, strand, "New translation", "CDS", null, true);
    
        // Save
        this.saveState(`New translation at first START (starting pos: ${cursorIndex})`);
    };

    /**
     * Insert new sequence into plasmid sequence
     * 
     * @param {Array<Number>} sliceRange - Section to delete 
     * @param {String} newSequence - New sequence to insert
     */
    sliceSequence(sliceRange, newSequence) {
        // Adjust slice range for pure insertions
        if (sliceRange[1] === null) sliceRange = [sliceRange[0], sliceRange[0]-1];

        // Slice sequences and insert new sequence
        this.sequence = this.sequence.slice(0, sliceRange[0] - 1) + newSequence + this.sequence.slice(sliceRange[1]);
        this.complementarySequence = Nucleotides.complementary(this.sequence);

        // Remove subcloning marking
        if (Session.subcloningOriginPlasmidIndex === this.index) Session.removeMarkForSubcloning();
    };


    /**
     * Shift features after a sequence-altering operation
     * 
     * @param {Array<Number>} sliceRange - Range that was sliced 
     * @param {String} newSequence - New sequence that was inserted
     */
    shiftFeatures(sliceRange, newSequence) {
        // Adjust slice range for pure insertions
        if (sliceRange[1] === null) sliceRange = [sliceRange[0], sliceRange[0]];

        const [sliceRangeStart, sliceRangeEnd] = sliceRange;
        const isSimpleInsertion = (sliceRangeStart === sliceRangeEnd)

        const shiftAmount = (isSimpleInsertion)
            ? newSequence.length
            : newSequence.length - (sliceRange[1] - sliceRange[0] + 1);

        // Iterate over features and decide what to do with them
        for (let featureID in this.features) {
            const [spanStart, spanEnd] = this.features[featureID]["span"];
    
            // Decide the kind of overlap that operation had with the feature
            let overlapType = null;
            if (isSimpleInsertion) {
                // Simple insertions
                if (sliceRangeStart <= spanStart) overlapType = "shift"; // Insertion is upstream of feature
                else if (sliceRangeStart < spanEnd) overlapType = "inside"; // Insertion is inside feature
            } else {
                // Mutations/replacements
                if (sliceRangeStart === spanStart && sliceRangeEnd === spanEnd) {
                    overlapType = "delete"; // Exact replacement
                } else if (sliceRangeEnd < spanStart) {
                    overlapType = "shift"; // Operation is upstream of feature
                } else if (sliceRangeStart > spanEnd) {
                    overlapType = null; // Operation is downstream of feature
                } else if (sliceRangeStart >= spanStart && sliceRangeEnd <= spanEnd) {
                    overlapType = "inside"; // Operation is fully inside feature
                } else if (sliceRangeStart <= spanStart && sliceRangeEnd >= spanEnd) {
                    overlapType = "delete"; // Operation encompases feature
                } else {
                    overlapType = "delete"; // Default
                };
            };
    
            // Apply the determined action
            switch (overlapType) {
                case "shift":
                    // Shift feature position based on inserted length
                    this.features[featureID]["span"] = [spanStart + shiftAmount, spanEnd + shiftAmount];
                    break;
    
                case "inside":
                    // Adjust feature span
                    this.features[featureID]["span"] = [spanStart, spanEnd + shiftAmount];
                    break;
    
                case "delete":
                    // Delete feature
                    delete this.features[featureID];
                    break;

                default:
                    // Pass
                    break;
            };
        };
    };


    /**
     * Shift deletion markings after a sequence-altering operation
     * 
     * @param {Array<Number>} sliceRange - Range that was sliced 
     * @param {String} newSequence - New sequence that was inserted
     */
    shiftDeletionMarks(sliceRange, newSequence) {
        // Adjust slice range for pure insertions
        if (sliceRange[1] === null) sliceRange = [sliceRange[0], sliceRange[0]];

        const [sliceRangeStart, sliceRangeEnd] = sliceRange;
        const isSimpleInsertion = (sliceRangeStart === sliceRangeEnd);
        
        const shiftAmount = (isSimpleInsertion)
            ? newSequence.length
            : newSequence.length - (sliceRange[1] - sliceRange[0] + 1);

        // Iterate over deletion marks
        const newDeletionMarks = [];
        for (let i = 0; i < this.deletionMarks.length; i++) {
            // Deletion mark position index
            let deletionMarkPos =  this.deletionMarks[i];
            
            // Decide the kind of overlap that operation had with the deletion mark
            let overlapType = null;
            if (isSimpleInsertion) {
                // There was an insertion upstream of the deletion mark, shift it
                if (sliceRangeStart <= deletionMarkPos) overlapType = "shift";
            } else {
                // Sequence changed upstream, shift the deletion mark
                if (sliceRangeEnd < deletionMarkPos) {
                    overlapType = "shift";
                // Sequence changed downstream, do not change deletion mark
                } else if (sliceRangeStart > deletionMarkPos) {
                    overlapType = null;
                // Deletion mark is inside the changed sequence, delete it
                } else if (sliceRangeStart <= deletionMarkPos && deletionMarkPos <= sliceRangeEnd) {
                    overlapType = "delete";
                };
            };
    
            // Apply the determined action
            switch (overlapType) {
                case "shift":
                    // Shift deletion mark
                    newDeletionMarks.push(deletionMarkPos + shiftAmount);
                    break;

                case "delete":
                    // Delete (don't add to new array)
                    break;

                default:
                    // Push deletion mark as is
                    newDeletionMarks.push(deletionMarkPos);
                    break;
            };
        };

        // Save adjusted deletion marks
        this.deletionMarks = newDeletionMarks;
    };
    // #endregion Features

    // #region IVA Operation
    /**
     * Perform IVA Operation and generate primers
     * 
     * @param {String} operationType - IVA Operation type (Insertion | Deletion | Mutation | Subcloning)
     * @param {String | Array<String>} insertionSeqDNA - DNA sequence to be inserted (or array of two sequences [5', 3'] for subcloning)
     * @param {String | Array<String>} insertionSeqAA - AA sequence to be inserted (or array of two sequences [5', 3'] for subcloning)
     * @param {String | null} targetOrganism - Target organism for codon optimization
     * @param {Boolean} translateFeature - Flag for translation newly generated annotation
     */
    IVAOperation(operationType, insertionSeqDNA="", insertionSeqAA="", targetOrganism=null, translateFeature=false, linFragName="Linear Fragment") {
        if (!this.selectionExists()) {return};
        console.log(`Plasmid.IVAOperation ->`, operationType, insertionSeqDNA, insertionSeqAA, targetOrganism, translateFeature);
        console.log(`Plasmid.IVAOperation -> this.selectionIndices=${this.selectionIndices}`);

        const operationRange = this.selectionIndices;

        // Update organism preference for codon optimization
        if (targetOrganism !== UserPreferences.get("preferredOrganism")) UserPreferences.set("preferredOrganism", targetOrganism);

        // Sanitize AA sequence stop codons
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
            switch(operationType) {
                case "Subcloning":
                    // Get 5' and 3' sequences from the arrays
                    const seq5PrimeDNA = (typeof insertionSeqDNA !== "string") ? insertionSeqDNA[0]: "";
                    const seq3PrimeDNA = (typeof insertionSeqDNA !== "string") ? insertionSeqDNA[1]: "";
                    
                    const seq5PrimeAA = (typeof insertionSeqAA !== "string") ? insertionSeqAA[0]: "";
                    const seq3PrimeAA = (typeof insertionSeqAA !== "string") ? insertionSeqAA[1]: "";
        
                    // Optimize AA sequences if available
                    const seq5Prime = (seq5PrimeAA && seq5PrimeAA !== null && seq5PrimeAA !== "" && targetOrganism !== null)
                    ? Nucleotides.optimizeAA(seq5PrimeAA, targetOrganism)
                    : seq5PrimeDNA;
                    const seq3Prime = (seq3PrimeAA && seq3PrimeAA !== null && seq3PrimeAA !== "" && targetOrganism !== null)
                    ? Nucleotides.optimizeAA(seq3PrimeAA, targetOrganism)
                    : seq3PrimeDNA;
        
                    // Get subcloning target from source plasmid
                    const subclonignOriginPlasmid = Session.getPlasmid(Session.subcloningOriginPlasmidIndex);
                    const subcloningOriginSpan = Session.subcloningOriginSpan;
                    const subcloningTarget = subclonignOriginPlasmid.sequence.slice(subcloningOriginSpan[0] - 1, subcloningOriginSpan[1])
                    const subcloningSequenceFull = seq5Prime + subcloningTarget + seq3Prime;
                    seqToInsert = subcloningSequenceFull;
        
                    // Generate primers
                    primerSet = Primers.generateSubcloningSet(
                        operationRange,
                        this.sequence,
                        seq5Prime,
                        seq3Prime,
                    );

                    break;

                case "Linear fragment":
                    // If there is an AA sequence, optimize it, otherwise use given DNA sequence
                    seqToInsert = (insertionSeqAA && insertionSeqAA !== null && insertionSeqAA !== "" && targetOrganism !== null)
                    ? Nucleotides.optimizeAA(insertionSeqAA, targetOrganism)
                    : insertionSeqDNA;
                    
                    if (linFragName.trim().length === 0) linFragName = "Linear fragment";

                    // Generate primers
                    primerSet = Primers.insertFromLinearFragment(
                        operationRange,
                        this.sequence,
                        seqToInsert,
                        linFragName,
                        translateFeature,
                    );
                    break;

                default:
                    // If there is an AA sequence, optimize it, otherwise use given DNA sequence
                    seqToInsert = (insertionSeqAA && insertionSeqAA !== null && insertionSeqAA !== "" && targetOrganism !== null)
                    ? Nucleotides.optimizeAA(insertionSeqAA, targetOrganism)
                    : insertionSeqDNA;
        
                    // Generate primers
                    primerSet = Primers.generateSet(
                        operationType,
                        operationRange,
                        this.sequence,
                        seqToInsert,
                    );
                    break;
            };
    
            // Save primers 
            this.primers.push(primerSet);
    
            // Adjust sequence
            this.sliceSequence(operationRange, seqToInsert);
            // Adjust features and deletion marks
            this.shiftFeatures(operationRange, seqToInsert);
            this.shiftDeletionMarks(operationRange, seqToInsert);
    
            if (operationType !== "Deletion") {
                // For non-deletions, create a new feature annotation for the inserted sequence
                this.newFeature(
                    [operationRange[0], operationRange[0]+seqToInsert.length-1],
                    "fwd",
                    operationType,
                    null,
                    "#c83478",
                    translateFeature,
                    ""
                );
            } else {
                // Deletion operations ->  add deletion mark
                this.deletionMarks.push(operationRange[0]);

                // Redraw
                PlasmidViewer.deselectBases();
                PlasmidViewer.redraw();
                Sidebar.update();
            };

            // Save
            this.saveState(`IVA Operation: ${operationType}`);

        } catch(error) {
            switch (true) {
                case (error instanceof AmbiguousBaseError):
                case (error instanceof OutOfBasesError):
                    handleError(error);
                    break;

                default: {
                    throw error;
                };
            };
        };
    };


    getNextOperationIndex() {
        return this.primers.length;
    };

    renamePrimerSet(primerSetIndex, newPrimerSetName, newPrimerNames) {
        this.primers[primerSetIndex].title = newPrimerSetName;

        for (let i = 0; i < newPrimerNames.length; i++) {
            this.primers[primerSetIndex].primers[i].label = newPrimerNames[i];
        };

        Sidebar.updatePrimersTable();
    };
    // #endregion IVA Operations


    incrementPrimerSequence(primerSetIndex, primerIndex, direction, increment) {
        console.log("Plasmid.incrementPrimerSequence ->", primerSetIndex, primerIndex, direction, increment);

        const targetPrimerSet = this.primers[primerSetIndex];
        console.log(JSON.stringify(targetPrimerSet, (key, value) => {
            return key === "primers" | key === "currentPlasmidSequence" ? undefined : value;
        }, 2));

        const plasmidSequence = targetPrimerSet.currentPlasmidSequence;

        const targetPrimer = targetPrimerSet.primers[primerIndex];
        console.log(JSON.stringify(targetPrimer, null, 2));


        const targetPrimerRegion = (direction === "5'")
            ? targetPrimer.regions.find(r => r.sequence !== "")
            : targetPrimer.regions[targetPrimer.regions.length - 1];
        console.log(JSON.stringify(targetPrimerRegion, null, 2));

        const regionSequence = targetPrimerRegion.sequence;
        const targetStrand = (targetPrimerRegion.direction === "fwd") ? "top": "bottom";

        
        let startPos = targetPrimerRegion.start;
        console.log(startPos);

        const directionMap = {
            "5'": { top: -1, bottom: 1 },
            "3'": { top: 1, bottom: -1 },
        };
        const offset = directionMap[direction]?.[targetStrand] ?? 0;
        startPos += offset * regionSequence.length;


        let newBase = Utilities.repeatingSlice(targetSequence, startPos - 1, startPos);
        if (targetStrand === "bottom") newBase = Nucleotides.complementary(newBase);
        console.log(
            startPos,
            Utilities.repeatingSlice(targetSequence, startPos - 1, startPos + 4),
            newBase
        );
    };
};