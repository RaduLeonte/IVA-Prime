const KeyboardShortcuts = new class {
    constructor() {
        /**
         * Document
         */
        document.addEventListener("keydown", function(event) {
            const key = event.key.toLowerCase();
            const ctrlOrCmd = event.ctrlKey || event.metaKey;

            // CTRL+ A -> Select entire plasmid sequence
            if (ctrlOrCmd && key === "a") {
                KeyboardShortcuts.selectAll(event);
                return;
            };


            // Delete -> Delete selection (IVA Operation)
            if (key === "delete") {
                KeyboardShortcuts.deleteSelection(event);
                return;
            };


            // CTRL + SHIFT + X/V -> Subcloning (IVA Operation) 
            if (ctrlOrCmd && event.shiftKey && key === "x") {
                KeyboardShortcuts.markSelectionForSubcloning(event);
                return;
            };
            if (ctrlOrCmd && event.shiftKey && key === "v") {
                KeyboardShortcuts.subcloneIntoSelection(event);
                return;
            };


            // Arrows -> Navigation with selection cursor(s)
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
                KeyboardShortcuts.handleArrowNavigation(event);
                return;
            };


            // CTRL + F -> Focus search bar
            if (ctrlOrCmd && key === "f") {
                KeyboardShortcuts.focusSearchBar(event);
                return;
            };

            // CTRL + C -> Copy sequence to clipboard from selection
            if (ctrlOrCmd && key === "c") {
                if (!Session.activePlasmid().selectionIsRange()) return;
                
                event.preventDefault();

                // CTRl + C -> Top strand 5'->3'
                if (!event.shiftKey && !event.altKey) {
                    Utilities.copySequence();
                    return;
                };

                // CTRl + Shift + C -> Bottom strand 5'->3'
                if (event.shiftKey && !event.altKey) {
                    Utilities.copySequence("reverse complement");
                    return;
                };

                // CTRl + Alt + C -> Top strand 3'->5'
                if (!event.shiftKey && event.altKey) {
                    Utilities.copySequence("reverse");
                    return;
                };

                // CTRl + Shift + Alt + C -> Bottom strand 3'->5'
                if (event.shiftKey && event.altKey) {
                    Utilities.copySequence("complement");
                    return;
                };
            };

            // F2 -> Rename current plasmid
            if (key === "f2") {
                KeyboardShortcuts.renamePlasmid(event);
                return;
            };
        });
    };


    /**
     * 
     * @param {*} event 
     * @returns 
     */
    selectAll(event) {
        // Only select everything if there is already a selection
        if (Session.activePlasmid().getSelectionIndices() == null) return;
        
        // Check that there is no modal active
        if (Modals.isActive()) return;

        console.log("KeyboardShortcuts.selectAll ->")
        event.preventDefault();
        PlasmidViewer.selectAll();
    };


    /**
     * 
     * @param {*} event 
     * @returns 
     */
    deleteSelection(event) {
        // Check that there is a selected range
        const selectionIndices = Session.activePlasmid().getSelectionIndices();
        if (!Session.activePlasmid().selectionIsRange()) return;
                
        // Check that there is no modal active
        if (Modals.isActive()) return;

        event.preventDefault();
        Session.activePlasmid().IVAOperation("Deletion");
    };


    /**
     * 
     * @param {*} event 
     * @returns 
     */
    markSelectionForSubcloning(event) {
        // Check that there is a selected range
        if (!Session.activePlasmid().selectionIsRange()) return;
    
        // Check that there is no modal active
        if (Modals.isActive()) return;

        event.preventDefault();
        Session.markForSubcloning();
    };


    /**
     * 
     * @param {*} event 
     * @returns 
     */
    subcloneIntoSelection(event) {
        // Check that there is a selected range
        if (Session.activePlasmid().getSelectionIndices() == null) return;

        // Check that there is a marked region
        if (!Session.isSubcloningRegionMarked()) return;

        // Check that there is no modal active
        if (Modals.isActive()) return;

        event.preventDefault();
        Session.activePlasmid().IVAOperation("Subcloning", "", "", null, true)
    };


    /**
     * 
     * @param {*} event 
     */
    handleArrowNavigation(event) {
        // Check that there is no focused element (inputs mainly)
        if (
            document.activeElement &&
            document.activeElement !== document.body &&
            document.activeElement !== document.documentElement
        ) return;

        if (Modals.isActive()) return;
            
        if (!Session.activePlasmid()) return;
        
        const selectionIndices = Session.activePlasmid().getSelectionIndices();
        if (!selectionIndices) return;
        
        event.preventDefault();

        let baseIndexToScrollTo;

        // Two cursors present
        if (selectionIndices[1] !== null) {
            let newSelectionSpan;
            switch(event.key) {
                case "ArrowLeft":
                    newSelectionSpan = (!event.altKey)
                        ? [selectionIndices[0], Math.max(selectionIndices[0], selectionIndices[1] - 1)]
                        : [selectionIndices[0] - 1, selectionIndices[1]]

                    break;

                case "ArrowRight":
                    newSelectionSpan = (!event.altKey)
                        ? [selectionIndices[0], selectionIndices[1] + 1]
                        : [Math.min(selectionIndices[0] + 1, selectionIndices[1]), selectionIndices[1]]

                    break;

                case "ArrowUp":
                    newSelectionSpan = (!event.altKey)
                        ? [selectionIndices[0], Math.max(selectionIndices[0], selectionIndices[1] - PlasmidViewer.basesPerLine)]
                        : [selectionIndices[0] - PlasmidViewer.basesPerLine, selectionIndices[1]]
                    break;

                case "ArrowDown":
                    newSelectionSpan = (!event.altKey)
                        ? [selectionIndices[0], selectionIndices[1] + PlasmidViewer.basesPerLine]
                        : [Math.min(selectionIndices[0] + PlasmidViewer.basesPerLine, selectionIndices[1]), selectionIndices[1]]
                    break;
            };

            baseIndexToScrollTo = (!event.altKey)
                ? newSelectionSpan[1]
                : newSelectionSpan[0];

            // Select new range
            if (newSelectionSpan){
                PlasmidViewer.selectBases(
                    [
                        Math.max(1, newSelectionSpan[0]),
                        Math.min(newSelectionSpan[1], Session.activePlasmid().sequence.length)
                    ],
                );
            };

            // Scroll to new cursor position
            const baseToScrollTo = PlasmidViewer.baseRectsMap["fwd"][baseIndexToScrollTo - 1];
            baseToScrollTo.scrollIntoView(
                {
                    behavior: "smooth",
                    block: "center",
                }
            );
            return;
        };

        // Single cursor
        let baseIndex = selectionIndices[0];
        let newIndex = baseIndex;
        switch(event.key) {
            case "ArrowLeft":
                newIndex--;
                break;

            case "ArrowRight":
                newIndex++;
                break;

            case "ArrowUp":
                newIndex -= PlasmidViewer.basesPerLine;
                break;

            case "ArrowDown":
                newIndex += PlasmidViewer.basesPerLine;
                break;

            };

        if (event.shiftKey) {
            // If user presses shift, turn selection into range
            const newSpan = [Math.min(baseIndex, newIndex), Math.max(baseIndex, newIndex)];
            PlasmidViewer.selectBases(
                [
                    Math.max(1, newSpan[0]),
                    Math.min(newSpan[1], Session.activePlasmid().sequence.length) - 1,
                ],
            );

            baseIndexToScrollTo = newSpan[1];

        } else {
            // Move cursor
            newIndex = Math.min(Math.max(1, newIndex), Session.activePlasmid().sequence.length + 1);
            PlasmidViewer.selectBase(newIndex);

            baseIndexToScrollTo = newIndex;
        };

        // Scroll to new cursor position
        const baseToScrollTo = PlasmidViewer.baseRectsMap["fwd"][baseIndexToScrollTo - 1];
        baseToScrollTo.scrollIntoView(
            {
                behavior: "smooth",
                block: "center",
            }
        );
    };


    /**
     * 
     * @param {*} event 
     * @returns 
     */
    focusSearchBar(event) {
        // Check that there is no modal active
        if (Modals.isActive()) return;

        event.preventDefault();
        document.getElementById("search-bar").focus();
    };


    /**
     * 
     * @param {*} event 
     */
    renamePlasmid(event) {
        // Check that there is no modal active
        if (Modals.isActive()) return;

        event.preventDefault();
        PlasmidTabs.renamePlasmid(Session.activePlasmidIndex);
    };
};