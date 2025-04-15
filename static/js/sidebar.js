const Sidebar = new class {
    constructor() {
        this.primerRegionsClasses = {
            "INS": "primer-sequence-ins",
            "HR": "primer-sequence-hr",
            "TBR": "primer-sequence-tbr",
            "subHR": "primer-sequence-subhr",
            "subTBR": "primer-sequence-subtbr",
        };
        this.baseClasses = {
            "INS": "base-primer-ins",
            "HR": "base-primer-hr",
            "TBR": "base-primer-tbr",
            "subHR": "base-primer-subhr",
            "subTBR": "base-primer-subtbr",
        };


        /**
         * Sidebar resizing
         */
        this.isResizing = false;

        document.addEventListener("DOMContentLoaded", function () {
            document.getElementById("sidebar-resizer").addEventListener("mousedown", function () {
                console.log(`Sidebar.resizeSidebar -> started`);
                Sidebar.isResizing = true;
                document.getElementById("viewer").style.display = "none";
                document.addEventListener("mousemove", Sidebar.resizeSidebar);
                document.addEventListener("mouseup", Sidebar.stopResizeSidebar);
            });
        });
    };

    resizeSidebar(event) {
        if (!Sidebar.isResizing) return;

        let minWidth = window.innerWidth * 0.15;
        let maxWidth = window.innerWidth * 0.5;

        let newWidth = event.clientX;
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;
        
        document.getElementById("content-wrapper").style.gridTemplateColumns = `${newWidth}px auto 45px`;
    };

    stopResizeSidebar() {
        Sidebar.isResizing = false;
        document.getElementById("viewer").style.display = "block";
        PlasmidViewer.redraw();
        Utilities.removeUserSelection();

        document.removeEventListener("mousemove", Sidebar.resizeSidebar);
        document.removeEventListener("mouseup", Sidebar.stopResizeSidebar);
        console.log(`Sidebar.resizeSidebar -> done`);
    };


    /**
     * Update sidebar.
     */
    update() {
        this.updatePrimersTable();
        this.updateFeaturesTable();
    };


    generatePrimersTable(plasmidIndex=null) {
        const primerSets = (plasmidIndex) ? Session.getPlasmid(plasmidIndex).primers: Session.activePlasmid().primers;
        //console.log(`Sidebar.updatePrimersTable -> primers=\n${JSON.stringify(primersSets, null, 2)}`);

        return this.createPrimersTableContainer(primerSets);
    };


    createPrimersTableContainer(primerSets) {
        const primersTable = document.createElement("DIV");
        primersTable.id = "primers-table";
        primersTable.classList.add("primers-table");

        for (let i = 0; i < primerSets.length; i++) {
            const primerSet = primerSets[i];

            primersTable.appendChild(
                this._createPrimerSetContainer(
                    i,
                    primerSet,
                )
            )
        };

        return primersTable;
    };


    _createPrimerSetContainer(primerSetIndex, primerSet) {
        const primerSetContainer = document.createElement("DIV");
        primerSetContainer.classList.add("primers-set");

        /**
         * Header
         */
        const primerSetHeader = document.createElement("DIV");
        primerSetHeader.classList.add("primers-set-header");
        primerSetContainer.appendChild(primerSetHeader);

        const primerSetHeaderTitle = document.createElement("span");
        primerSetHeaderTitle.classList.add("primers-set-header-title");
        primerSetHeaderTitle.innerText = primerSet.title;
        primerSetHeader.appendChild(primerSetHeaderTitle);

        const primerSetHeaderRenameButton = document.createElement("div");
        primerSetHeaderRenameButton.classList.add(
            "toolbar-button",
            "footer-button",
            "primers-set-header-rename-button",
        );
        primerSetHeaderRenameButton.title = "Rename primers";
        primerSetHeaderRenameButton.appendChild(document.createElement("span"))
        primerSetHeader.appendChild(primerSetHeaderRenameButton);

        primerSetHeaderRenameButton.onclick = function() {
            Modals.createRenamePrimersModal(i);
        };
            

        /**
         * Body
         */
        const primerSetBody = document.createElement("DIV");
        primerSetBody.classList.add("primers-set-body");
        primerSetContainer.appendChild(primerSetBody);

        /** Primer set HR info */
        const hrInfo = document.createElement("DIV");
        hrInfo.classList.add("primers-set-hr-info");
        //hrInfo.innerHTML = "<span>HR Info</span>";
        primerSetBody.appendChild(hrInfo);

        const primersContainer = document.createElement("DIV");
        primersContainer.classList.add("primers-container"); 
        primerSetBody.appendChild(primersContainer);

        primerSet.primers.forEach((primer, primerIndex) => {
            primersContainer.appendChild(
                this._createPrimerContainer(
                    primerSetIndex,
                    primerIndex,
                    primer,
                )
            );
        });

        return primerSetContainer;
    };


    _createPrimerContainer(primerSetIndex, primerIndex, primer) {
        const primerContainer = document.createElement("DIV");
        primerContainer.classList.add("primer-container");

        /** Primer header */
        const primerHeader = document.createElement("DIV");
        primerHeader.classList.add("primer-header");
        primerContainer.appendChild(primerHeader);

        const primerTitle = document.createElement("DIV");
        primerTitle.classList.add("primer-title");
        primerTitle.innerText = primer.label;
        primerHeader.appendChild(primerTitle);

        const primerHeaderButtonsContainer = document.createElement("DIV");
        primerHeaderButtonsContainer.classList.add("primer-header-buttons-container");
        primerHeader.appendChild(primerHeaderButtonsContainer);


        /** Copy primer button */
        const copyPrimerButton = document.createElement("span");
        copyPrimerButton.classList.add("primer-copy-button", "toolbar-button", "primer-header-button"),
        copyPrimerButton.title = "Copy sequence to clipboard";
        copyPrimerButton.appendChild(document.createElement("span"));
        primerHeaderButtonsContainer.appendChild(copyPrimerButton);

        copyPrimerButton.onclick = function() {
            const primerRegionSpans = primerSequence.querySelectorAll("span");
            const combinedSequence = Array.from(primerRegionSpans).map(span => span.textContent).join("");
            Utilities.copyToClipboard(combinedSequence);
        };


        const highlightPrimerButton = document.createElement("DIV");
        highlightPrimerButton.classList.add("primer-highlight-button","toolbar-button", "primer-header-button");
        highlightPrimerButton.title = "Highlight primer sequence";
        highlightPrimerButton.appendChild(document.createElement("span"));
        primerHeaderButtonsContainer.appendChild(highlightPrimerButton);

        highlightPrimerButton.onclick = function(event) {
            if (!highlightPrimerButton.hasAttribute("active")) {
                highlightPrimerButton.setAttribute("active", "");
                Sidebar.highlightPrimerBindingSite(event.target);
            } else {
                highlightPrimerButton.removeAttribute("active");
                Sidebar.unhighlightPrimerBindingSite(event.target);
                //Sidebar.unhighlightPrimerBindingSites();
            };
        };

        /** Increment primer sequence buttons */
        const incrementPrimerButtonsWrapper = document.createElement("DIV");
        incrementPrimerButtonsWrapper.classList.add("primer-increment-buttons-wrapper");
        primerContainer.appendChild(incrementPrimerButtonsWrapper); // Append

        const incrementPrimerButtonsLabel = document.createElement("DIV");
        incrementPrimerButtonsLabel.classList.add("primer-increment-buttons-label");
        incrementPrimerButtonsLabel.innerText = "Adjust primer sequences: "
        incrementPrimerButtonsWrapper.appendChild(incrementPrimerButtonsLabel); // Append

        const incrementPrimerButtonsContainer = document.createElement("DIV");
        incrementPrimerButtonsContainer.classList.add("primer-increment-buttons-container");
        incrementPrimerButtonsWrapper.appendChild(incrementPrimerButtonsContainer); // Append

        // Add 5' button set
        incrementPrimerButtonsContainer.appendChild(
            this._createIncrementPrimerButtonSet(
                primerSetIndex,
                primerIndex,
                "5'",
                [
                    { increment: 1, title: "Increment primer in the 5' direction" },
                    { increment: -1, title: "Increment primer in the 3' direction" }
                ],
            )
        );

        const divider = document.createElement("DIV");
        divider.classList.add("primer-increment-buttons-divider")
        incrementPrimerButtonsContainer.appendChild(divider);

        // Add 3' button set
        incrementPrimerButtonsContainer.appendChild(
            this._createIncrementPrimerButtonSet(
                primerSetIndex,
                primerIndex,
                "3'", 
                [
                    { increment: 1, title: "Increment primer in the 3' direction" },
                    { increment: -1, title: "Increment primer in the 5' direction" }
                ],
            )
        );

        

        const primerSequence = document.createElement("DIV");
        primerSequence.classList.add("primer-sequence-regions");
        primerContainer.appendChild(primerSequence);


        /** Primer sequence */
        let totalPrimerLength = 0;
        primer.regions.forEach(region => {
            if (region.sequence.length === 0) {return};

            const regionSequence = document.createElement("span");
            regionSequence.classList.add("primer-sequence");
            regionSequence.classList.add(this.primerRegionsClasses[region.type]);
            regionSequence.setAttribute("type", region.type);
            regionSequence.setAttribute("start", region.start);
            regionSequence.setAttribute("direction", region.direction);
            regionSequence.innerText = region.sequence;
            primerSequence.appendChild(regionSequence);

            //regionSequence.addEventListener("mouseenter", (event) => {
            //    this.highlightPrimerBindingSite(event.target);
            //});
            //regionSequence.addEventListener("mouseleave", () => {
            //    this.unhighlightPrimerBindingSites();
            //});

            totalPrimerLength += region.sequence.length;
        });

        /** Primer info */
        const primerInfo = document.createElement("DIV");
        primerInfo.classList.add("primer-info")
        const TBRSequence = primer.regions[primer.regions.length - 1].sequence;
        primerInfo.innerHTML = `
        <div>
            <span>TBR</span> ${TBRSequence.length} nt (${Nucleotides.getMeltingTemperature(TBRSequence).toFixed(2)} °C)
        </div>
        <div>
            <span>Total</span> ${totalPrimerLength} nt
        </div>
        `;
        primerContainer.appendChild(primerInfo);

        return primerContainer;
    };


    _createIncrementPrimerButtonSet(primerSetIndex, primerIndex, direction, buttons) {
        const container = document.createElement("DIV");
        container.classList.add("primer-increment-buttons-container");
    
        const labelDiv = document.createElement("DIV");
        labelDiv.classList.add("primer-increment-label");
        labelDiv.innerText = direction;
        container.appendChild(labelDiv);

        const buttonsToRender = direction === "5'" ? buttons: [...buttons].reverse();
    
        buttonsToRender.forEach(({ increment, title }) => {
            const button = document.createElement("span");
            button.classList.add("primer-increment-button", `primer-increment-${(increment === 1) ? "plus": "minus"}`, "toolbar-button");
            button.title = title;
            button.appendChild(document.createElement("span"));
            
            button.onclick = function () {
                Session.activePlasmid().incrementPrimerSequence(
                    primerSetIndex,
                    primerIndex,
                    direction,
                    increment,
                )
            };
            
            container.appendChild(button);
        });
    
        return container;
    };


    /**
     * Update the sidebar with the current primers.
     */
    // TO DO: Hr info
    // TO DO: Extend primer sequence buttons
    // TO DO: download primers button
    updatePrimersTable() {
        const primersTable = this.generatePrimersTable();

        // Update sidebar table
        const primersTableContainer = document.getElementById("primers-table-container");
        const prevPrimersTable = document.getElementById("primers-table");
        if (prevPrimersTable) {
            primersTableContainer.removeChild(prevPrimersTable)
        };
        primersTableContainer.appendChild(primersTable);

        return;
    };


    highlightPrimerBindingSite(sender) {
        const primersContainer = sender.closest(".primer-container");

        const primerSequence = primersContainer.querySelector(".primer-sequence-regions").innerText;
        const primerRegions = primersContainer.querySelectorAll(".primer-sequence")
        
        const direction = primerRegions[0].getAttribute("direction")

        // Find binding site starting index
        const activePlasmid = Session.activePlasmid();
        if (!activePlasmid) return;
        
        let sequence = {"fwd": activePlasmid.sequence, "rev": activePlasmid.complementarySequence}[direction];
        const query = {"fwd": primerSequence, "rev": primerSequence.split("").reverse().join("")}[direction];;
        
        let indices = [];
        if (Session.activePlasmid().topology === "linear") {
            let index = sequenceRepeating.indexOf(query);
            while (index !== -1) {
                indices.push(index);
                index = sequence.indexOf(query, index + 1);
            };
        } else {
            const sequenceLength = sequence.length;
            const sequenceRepeating = sequence.repeat(3);
            let index = sequenceRepeating.indexOf(query);
            while (index !== -1) {
                const resultSpan = [index - sequenceLength, index + query.length - sequenceLength]
                if (resultSpan[1] >= 0 && resultSpan[1] <= sequenceLength ) {
                    indices.push(index - sequenceLength);
                };
                index = sequenceRepeating.indexOf(query, index + 1);
            };
        };

        let index = indices[0]
        primerRegions.forEach((primerRegion) => {
            const type = primerRegion.getAttribute("type");
            const baseClass = this.baseClasses[type];

            const primerRegionSequence = primerRegion.innerText;
            PlasmidViewer.highlightBases(
                [index + 1, index + primerRegionSequence.length],
                baseClass,
                direction,
            );
            index += primerRegionSequence.length;
        });

        sender.setAttribute("highlighted-strand", direction)
        sender.setAttribute("highlighted-range", [indices[0] + 1, indices[0] + primerSequence.length]);
    };


    unhighlightPrimerBindingSite(sender) {
        const highlightedStrand = sender.getAttribute("highlighted-strand");
        
        let highlightedRange = sender.getAttribute("highlighted-range").split(",").map((v) => parseInt(v));
        if (!highlightedRange || !highlightedRange[0]) return;
        const plasmidSequenceLength = Session.activePlasmid().sequence.length;
        //highlightedRange = highlightedRange.map((v) => v + plasmidSequenceLength);
        //highlightedRange = highlightedRange.map((v) => (v % plasmidSequenceLength) + plasmidSequenceLength) % plasmidSequenceLength);
        
        
        const classes = Object.values(this.baseClasses);
        // Iterate over highlight classes
        for (let i = 0; i < classes.length; i++) {
            const targetClass = classes[i];
            const basesWithClass = PlasmidViewer.highlightedBases[targetClass];
            if (!basesWithClass) continue;

            for (let j = 0; j < basesWithClass.length; j++) {
                const base = basesWithClass[j];
                const baseIndex = parseInt(base.getAttribute("base-index"));
                
                const parentStrandGroup = base.closest('#strand-fwd, #strand-rev');
                if (!parentStrandGroup.id.includes(highlightedStrand)) {
                    continue;
                };
                
                //console.log(baseIndex, highlightedRange, highlightedRange.map(v => v + plasmidSequenceLength))
                if (
                    (highlightedRange[0] <= baseIndex && baseIndex <= highlightedRange[1])
                    || (highlightedRange[0] + plasmidSequenceLength <= baseIndex && baseIndex <= highlightedRange[1] + plasmidSequenceLength)
                ) {
                    base.classList.remove(targetClass);
                };
            };
        };
        //console.log(highlightedRange)
    };


    unhighlightPrimerBindingSites() {
        const classes = Object.values(this.baseClasses);
        for (let i = 0; i < classes.length; i++) {
            PlasmidViewer.unhighlightBases(classes[i]);
        };
    };


    /**
     * Update the sidebar with the current features table.
     */
    updateFeaturesTable() {
        const features = Session.activePlasmid().features;

        // Create feature table container
        const featuresTable = document.createElement("DIV");
        featuresTable.id = "features-table";
        featuresTable.classList.add("features-table");

        // Iterate over the features and populate the container
        for (const [featureID, featureDict] of Object.entries(features)) {
            // Skip source feature type
            if (featureDict["type"] && featureDict["type"].includes("source")) continue;
            if (featureID && featureID.includes("LOCUS")) continue;

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
            const currFeatureColor = (featureDict["color"]) ? featureDict["color"]: featureDict["ivaprimeColor"];
            collapsibleHeader.style.color = Utilities.getTextColorBasedOnBg(currFeatureColor) // Text color
            collapsibleHeader.style.backgroundColor = currFeatureColor;
            collapsibleHeader.innerText = featureDict["label"];

            collapsibleHeader.addEventListener("mouseenter", () => {
                PlasmidViewer.addFeatureHover(featureID);
            });

            collapsibleHeader.addEventListener("mouseleave", () => {
                PlasmidViewer.removeFeatureHover(featureID);
            });

            let collapsibleHeaderClickTimeout;
            collapsibleHeader.addEventListener("click", (e) => {
                if (collapsibleHeaderClickTimeout) {return};

                const targetElement = e.currentTarget;

                collapsibleHeaderClickTimeout = setTimeout(() => {
                    Sidebar.toggleCollapsibleHeader(targetElement);
                    collapsibleHeaderClickTimeout = null;
                }, 150);
            });

            collapsibleHeader.addEventListener("dblclick", () => {
                clearTimeout(collapsibleHeaderClickTimeout);
                collapsibleHeaderClickTimeout = null;
                PlasmidViewer.selectFeature(featureID);
                PlasmidViewer.scrollToFeature(featureID);
            });

            /**
             * Collapsible content
             */
            const collapsibleContent = document.createElement("DIV");
            collapsibleContent.classList.add("collapsible-content");
            //collapsibleContent.style.display = "none";

            /**
             * Label
             */
            const labelDiv = document.createElement("DIV");
            labelDiv.classList.add("collapsible-content-hgroup");
            labelDiv.innerHTML = `
            <label class="collapsible-content-hgroup-label">Label</label>
            <div class="collapsible-content-hgroup-input">
            <input id="label-input" value="${featureDict["label"]}">
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
            spanDiv.classList.add("collapsible-content-hgroup");
            
            const [spanStart, spanEnd] = featureDict["span"];
            const spanEndMax = Session.activePlasmid().sequence.length;
            
            const spanLabel = document.createElement("label");
            spanLabel.classList.add("collapsible-content-hgroup-label");
            spanLabel.textContent = "Span";

            const inputContainer = document.createElement("DIV");
            inputContainer.classList.add("collapsibe-content-hgroup-input");

            const startInput = document.createElement("input");
            startInput.type = "number";
            startInput.id = "span-start-input";
            startInput.min = "1";
            startInput.max = spanEndMax;
            startInput.value = spanStart;
            Utilities.addInputValidator(startInput, "integer");

            const separator = document.createElement("span");
            separator.textContent = " .. ";

            const endInput = document.createElement("input");
            endInput.type = "number";
            endInput.id = "span-end-input";
            endInput.min = "1";
            endInput.max = spanEndMax;
            endInput.value = spanEnd;
            Utilities.addInputValidator(endInput, "integer");

            inputContainer.appendChild(startInput);
            inputContainer.appendChild(separator);
            inputContainer.appendChild(endInput);
            spanDiv.appendChild(spanLabel);
            spanDiv.appendChild(inputContainer);
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
            const featureDirection = featureDict["directionality"];
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
            const featureIsTranslated = (featureDict["translation"] === "" || featureDict["translation"] === null || (typeof featureDict["translation"]) === 'undefined') ? false: true
            const translateDiv = document.createElement("DIV");
            translateDiv.classList.add("collapsible-content-hgroup");
            translateDiv.innerHTML = `
            <label class="collapsible-content-hgroup-label">Translate</label>
            <div class="collapsible-content-hgroup-input">
                <input type="checkbox" id="translated-checkbox" name="translated-checkbox" checked="${featureIsTranslated}">
            </div>
            `;
            /**
             * <div class="collapsible-content-hgroup-input">
                <input type="checkbox" id="translated-checkbox" name="translated-checkbox" checked="${featureIsTranslated}">
                <label for="translated-checkbox" class="custom-checkbox"></label>
            </div>
             */
            translateDiv.getElementsByTagName("input")[0].checked = featureIsTranslated;
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
                if (defaultTypes[i] === featureDict["type"]) {
                    newOption.setAttribute('selected','selected');
                };
                select.add(newOption, undefined);
            };
            if (!defaultTypes.includes(featureDict["type"])) {
                let newOption = new Option(featureDict["type"], featureDict["type"]);
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
            <textarea id="note-text-area" spellcheck="false">${featureDict["note"]}</textarea>
            </div>
            `;
            collapsibleContent.appendChild(noteDiv);

            /**
             * Update info buttons
             */
            const updateButtonDiv = document.createElement("DIV");
            updateButtonDiv.classList.add("collapsible-content-hgroup");

            // Create the update button
            const updateButton = document.createElement("SPAN");
            updateButton.classList.add("button-round", "button-green", "update-feature-button");
            updateButton.textContent = "Update";
            updateButton.onclick = function () {
                if (!collapsibleContent.querySelector("[incorrect]")) {
                    Session.getPlasmid(Session.activePlasmidIndex).updateFeatureProperties(featureID);
                };
            };

            // Create the remove button
            const removeButton = document.createElement("SPAN");
            removeButton.classList.add("button-round", "button-red", "remove-feature-button");
            removeButton.textContent = "Remove";
            removeButton.onclick = function () {
                Session.getPlasmid(Session.activePlasmidIndex).removeFeature(featureID);
            };

            function checkInputsValidation() {
                const inputFailedValidator = collapsibleContent.querySelector("[incorrect]") !== null;
            
                if (inputFailedValidator) {
                    updateButton.setAttribute("disabled", "");
                } else {
                    updateButton.removeAttribute("disabled");
                };
            };
            collapsibleContent.querySelectorAll("input").forEach(input => {
                input.addEventListener("input", checkInputsValidation);
            });

            // Append buttons to the div
            updateButtonDiv.appendChild(updateButton);
            updateButtonDiv.appendChild(removeButton);
            collapsibleContent.appendChild(updateButtonDiv);


            featureDiv.appendChild(collapsibleHeader);
            featureDiv.appendChild(collapsibleContent);
            featuresTable.appendChild(featureDiv);
        };

        // Update sidebar table
        const featuresTableContainer = document.getElementById("features-table-container");
        const currFeaturesTable = document.getElementById("features-table");
        if (currFeaturesTable) {
            featuresTableContainer.removeChild(currFeaturesTable)
        };
        featuresTableContainer.appendChild(featuresTable);
    };


    /**
     * Expand collapsible header in features table.
     * 
     * @param {Object} targetHeader - Target header.
     */
    toggleCollapsibleHeader(targetHeader) {
        console.log("Sidebar.toggleCollapsibleHeader", targetHeader)
        const targetContent = targetHeader.nextElementSibling;
    
        // Toggle active class
        targetHeader.classList.toggle("collapsible-header-active");
        
        /**
         * Expand.
         */
        targetContent.toggleAttribute("visible");
        return;
    };


    /**
     * Close all collapsible headers.
     */
    closeAllCollapsibleHeaders() {
        for (const header of document.querySelectorAll(".collapsible-header-active")) {
            header.classList.toggle("collapsible-header-active");
            const content = header.nextElementSibling;
            content.style.display = "none";
            content.style.maxHeight = null; 
        };
    };
};