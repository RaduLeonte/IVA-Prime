const Modals = new class {
    /**
     * Create modal window.
     * 
     * @param {String} id - Modal id
     * @param {HTMLElement} body - Body HTML
     */
    _create(id, body) {
        // Create window element
        const modalWindow = document.createElement("div");
        modalWindow.id = id;
        modalWindow.classList.add("modal-window");
    
        // Add body
        body.classList.add("modal-body");
        modalWindow.appendChild(body);
    
        // Add modal window to modal container
        const modal = document.querySelector("div.modal");
        modal.style.display = "block";
        modal.appendChild(modalWindow);

        // Add validators to text inputs
        const inputElements = modalWindow.querySelectorAll("input[validator], textarea[validator]");
        inputElements.forEach((input) => {
            // Add validator
            const validatorType = input.getAttribute("validator");
            Utilities.addInputValidator(input, validatorType);

            // Add event listener to re-check validator after every input
            input.addEventListener("input", function () {
                // Select action button of modal window
                const actionButton = document.getElementById(`${id}-action-button`);
                
                // Check to see if there is any input that has failed its validator
                const inputFailedValidator = modalWindow.querySelector("[incorrect]") !== null;
                if (inputFailedValidator) {
                    // If any input fails its validator, disable action buttom
                    actionButton.setAttribute("disabled", "");
                } else {
                    // Otherwise enable it
                    actionButton.removeAttribute("disabled");
                };
            });
        });
    };


    /**
     * Remove modal window and hide modal overlay
     * 
     * @param {String} modalWindowId - ID of modal window to remove
     */
    remove(modalWindowId) {
        const modalWindow = document.getElementById(modalWindowId);
        const modal = modalWindow.parentNode;
        modal.style.display = "none"
        modal.removeChild(modalWindow);
    };


    /**
     * Check if the modal overlay is active
     * 
     * @returns {Boolean}
     */
    isActive() {
        return document.getElementById("modal").style.display === "block"
    };


    /**
     * Create modal title element
     * 
     * @param {String} title - Title text
     * @returns 
     */
    _createModalTitle(title) {
        const modalTitle = document.createElement("DIV");
        modalTitle.classList.add("modal-title");
        modalTitle.innerText = title;

        return modalTitle;
    };


    /**
     * Create action and cancel buttons
     * 
     * @param {String} actionLabel - Text on the action button
     * @param {String} id - Id of modal window
     * @param {Function} action - Action to be perforemd when clicking action button
     * @returns {HTMLElement}
     */
    _createButtons(actionLabel, id, action) {
        // Container
        const buttonsContainer = document.createElement("div");
        buttonsContainer.classList.add("modal-hgroup");


        // Action button
        const actionButton = document.createElement("span");
        actionButton.classList.add("button-round", "button-green");
        actionButton.id = `${id}-action-button`;
        actionButton.innerText = actionLabel;
        buttonsContainer.appendChild(actionButton);

        actionButton.addEventListener("click", function (event) {
            event.preventDefault();
            action();
            Modals.remove(id);
        });


        // Cancel button
        const cancelButton = document.createElement("span");
        cancelButton.classList.add("button-round", "button-red");
        cancelButton.innerText = "Cancel";
        cancelButton.onclick = `Modals.remove('${id}')`
        buttonsContainer.appendChild(cancelButton);

        cancelButton.addEventListener("click", function (event) {
            Modals.remove(id);
        });
    

        /**
         * Press action button on enter key
         * 
         * @param {KeyboardEvent} event 
         */
        function modalOnEnterKey(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById(`${id}-action-button`).click();
                document.removeEventListener("keydown", modalOnEnterKey);
            };
        };
        document.addEventListener("keydown", modalOnEnterKey);
    
    
        /**
         * Close modal window on escape key
         * 
         * @param {KeyboardEvent} event 
         */
        function modalOnEscapeKey(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                Modals.remove(buttonsContainer.closest(".modal-window").id);
                document.removeEventListener("keydown", modalOnEscapeKey);
            };
        };
        document.addEventListener("keydown", modalOnEscapeKey);

        return buttonsContainer;
    };
    

    /**
     * Create a text input
     * 
     * @param {String} label - Label of text input
     * @param {String} id - Id of text input
     * @param {String} defaultText - Default text in the text input
     * @param {String} validator - Validator type 
     * @param {String} suffix - Text suffix
     * @returns 
     */
    _createInput(label, id, defaultText="", validator=null, suffix=null) {
        // Create container
        const inputContainer = document.createElement("DIV");
        inputContainer.classList.add("modal-vgroup");

        // If label given, create label element
        if (label) {
            const inputLabel = document.createElement("label");
            inputLabel.innerText = label;
            inputContainer.appendChild(inputLabel);
        };


        if (!suffix) {
            // Input with no suffix

            const input = document.createElement("input");
            input.setAttribute("type", "text");
            input.setAttribute("id", id);
            input.classList.add("modal-input");
            input.setAttribute("value", defaultText);
            if (validator) input.setAttribute("validator", validator);
            inputContainer.appendChild(input);

            return inputContainer;

        } else {
            // Input with suffix

            const inputWrapper = document.createElement("DIV");
            inputWrapper.classList.add("modal-input-wrapper");
            inputContainer.appendChild(inputWrapper);

            const input = document.createElement("input");
            input.setAttribute("type", "text");
            input.setAttribute("id", id);
            input.classList.add("modal-input", "modal-input-with-suffix");
            input.setAttribute("value", defaultText);
            if (validator) input.setAttribute("validator", validator);
            inputWrapper.appendChild(input);

            const suffix = document.createElement("div");
            suffix.classList.add("modal-input-suffix");
            suffix.innerText = suffix;
            inputWrapper.appendChild(suffix);

            return inputContainer;
        };
    };


    /**
     * Create the dropdown element for common insertions
     * 
     * @param {HTMLElement} targetInput - Text input to populate with text when clicking on option
     * @returns {HTMLElement}
     */
    _createCommonInsertionsDropdown(targetInput) {
        // Main container
        const container = document.createElement("div");
        container.classList.add("modal-hgroup");


        // Label
        const label = document.createElement("label");
        label.innerText = "Commonly inserted sequences:";
        container.appendChild(label);


        // Select element
        const select = document.createElement("select");
        select.classList.add("common-insertions-dropdown");
        container.appendChild(select);

        // Default option
        const defaultOption = document.createElement("option");
        defaultOption.textContent = "<No sequence selected>";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.classList.add("common-insertions-group");
        select.appendChild(defaultOption);
    
        // Nr of spaces per indent level in options tree
        const spacePerLevel = 4;

        /**
         * Recursively populate the dropdown with options
         * 
         * @param {Object[]} entries - List of entries to populate with
         * @param {HTMLElement} optgroup - Parent optgroup
         * @param {Number} depth - Depth level tracker for indentation
         */
        const addEntriesToOptgroup = (entries, optgroup, depth = 1) => {
            // Iterate over entries and append them to the parent optgroup
            entries.forEach(entry => {
                // Current indent
                const indent = "\u00A0".repeat(depth * spacePerLevel);
    
                if (entry.type === "group") {
                    // Render subgroup as a disabled option with indentation
                    const subgroupOption = document.createElement("option");
                    subgroupOption.textContent = indent + entry.name;
                    subgroupOption.disabled = true;
                    subgroupOption.classList.add("common-insertions-group");
                    optgroup.appendChild(subgroupOption);
    
                    // Add entries inside this subgroup
                    addEntriesToOptgroup(entry.entries, optgroup, depth + 1);
                } else if (entry.type === "item") {
                    // Actual item
                    const itemOption = document.createElement("option");
                    if (entry.aa.length >= 60) {
                        itemOption.classList.add("common-insertions-item-long");
                    };
                    itemOption.value = entry.aa;
                    itemOption.setAttribute("feature-label", entry.label);
                    itemOption.textContent = indent + entry.name;
                    optgroup.appendChild(itemOption);
                }
            });
        };
    
        // Iterate over common insertions tree and populate dropdown with top-level optgroups
        Nucleotides.commonInsertions.forEach(topGroup => {
            if (topGroup.type === "group") {
                const optgroup = document.createElement("optgroup");
                optgroup.label = topGroup.name;
                optgroup.classList.add("common-insertions-group");
    
                addEntriesToOptgroup(topGroup.entries, optgroup, 1);
                select.appendChild(optgroup);
            };
        });


        // When selection an option, set the text of the targetInput to the option's value
        select.addEventListener("change", (event) => {
            const insertionSeq = event.target.value;
            targetInput.value = insertionSeq;

            if (insertionSeq.length >= 60) {
                Alerts.warning(
                    "Long insertion sequence",
                    "Insertions of sequences longer than 60 bp will result in long, expensive primers and cannot be guaranteed to succeed. For longer insertions, subcloning or inserting from a linear fragment may be more appropriate.",
                    15,
                    "orange"
                );
            };
        });

        return container;
    };


    /**
     * Create text input for DNA sequences
     * 
     * @param {String} inputID - ID of input
     * @param {String} type - Type of input (text or textarea)
     * @param {String[]} cssClasses - List of CSS classes to add
     * @param {Boolean} disableSpellcheck - Flag to explicitly disable spellcheck
     * @returns {HTMLElement}
     */
    _createDNAInput(inputID, type="text", cssClasses=["modal-input"], disableSpellcheck=false) {
        // Main container
        const dnaGroup = document.createElement("div");
        dnaGroup.classList.add("modal-vgroup");

        // Label
        const dnaLabel = document.createElement("label");
        dnaLabel.innerText = "DNA sequence:";
        dnaGroup.appendChild(dnaLabel);

        // Input
        const dnaInput = document.createElement("input");
        dnaInput.type = type;
        dnaInput.id = inputID;
        dnaInput.classList.add(...cssClasses);
        if (disableSpellcheck) dnaInput.setAttribute("spellcheck", false);
        dnaInput.setAttribute("validator", "dna");
        dnaGroup.appendChild(dnaInput);

        return dnaGroup;
    };


    /**
     * Create text input for AA sequences
     * 
     * @param {String} inputID - ID of input
     * @param {String} type - Type of input (text or textarea)
     * @param {String[]} cssClasses - List of CSS classes to add
     * @param {Boolean} disableSpellcheck - Flag to explicitly disable spellcheck
     * @returns {HTMLElement}
     */
    _createAAInput(inputID, type="text", cssClasses=["modal-input"], disableSpellcheck=false) {
        // Main container
        const aaGroup = document.createElement("div");
        aaGroup.classList.add("modal-vgroup");


        // Label
        const aaLabel = document.createElement("label");
        aaLabel.innerText = "Amino acid sequence:";
        aaGroup.appendChild(aaLabel);


        // Input
        const aaInput = document.createElement("input");
        aaInput.type = type;
        aaInput.id = inputID;
        aaInput.classList.add(...cssClasses);
        if (disableSpellcheck) aaInput.setAttribute("spellcheck", false);
        aaInput.setAttribute("validator", "aa");
        aaGroup.appendChild(aaInput);


        // Hint
        const aaHint = document.createElement("div");
        aaHint.classList.add("modal-hint");
        aaHint.innerText = 'Accepted STOP letter codes: "*", "-", "X".';
        aaGroup.appendChild(aaHint);

        return aaGroup;
    };


    /**
     * Create the organism dropdown selector for codon optimization
     * 
     * @returns {HTMLElement}
     */
    _createCodonOptimizationDropdown() {
        // Main container
        const codonGroup = document.createElement("div");
        codonGroup.classList.add("modal-vgroup");

        // Hgroup for label and select
        const codonHGroup = document.createElement("div");
        codonHGroup.classList.add("modal-hgroup");
        codonGroup.appendChild(codonHGroup);


        // Label
        const codonLabel = document.createElement("label");
        codonLabel.innerText = "Optimize codons for:";
        codonHGroup.appendChild(codonLabel);


        // Select
        const select = document.createElement("select");
        select.id = "insertion-select-organism";


        // Get current user preference 
        const preferredOrganism = UserPreferences.get("preferredOrganism");
        // Iterate over organisms and add them as options
        for (const key in Nucleotides.codonWeights) {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = key;
            if (key === preferredOrganism) option.selected = true;
            select.appendChild(option);
        };
        codonHGroup.appendChild(select);


        // Codon hint
        const codonHint = document.createElement("div");
        codonHint.classList.add("modal-hint");
        codonHint.innerHTML = `
            Codon frequency tables from 
            <a href="https://hive.biochemistry.gwu.edu/review/codon2" target="_blank">CoCoPUTs</a> 
            (<a href="https://doi.org/10.1016/j.jmb.2019.04.021" target="_blank">Alexaki et al. 2019</a>).
        `;
        codonGroup.appendChild(codonHint);


        return codonGroup;
    };


    /**
     * Create the "translate new feature" checkbox
     * 
     * @param {String} checkboxID - ID of checkbox
     * @returns {HTMLElement}
     */
    _createTranslateFeatureCheckbox(checkboxID) {
        // Container
        const translateGroup = document.createElement("div");
        translateGroup.classList.add("modal-hgroup");


        // Label
        const translateLabel = document.createElement("label");
        translateLabel.innerText = "Translate new feature:";
        translateGroup.appendChild(translateLabel);


        // Checkbox
        const translateCheckbox = document.createElement("input");
        translateCheckbox.type = "checkbox";
        translateCheckbox.id = checkboxID;
        translateCheckbox.name = checkboxID;
        translateCheckbox.checked = false;
        translateGroup.appendChild(translateCheckbox);


        return translateGroup;
    };


    //#region New file
    /**
     * New file from sequence modal window
     */
    createNewFileModal() {
        const id = "modal-window-new-file";
        
        const body = document.createElement("div");
        body.classList.add("modal-new-file");

        // Title
        body.appendChild(
            this._createModalTitle("Create new file")
        );
    
        // New plasmid name input group
        const nameGroup = document.createElement("div");
        nameGroup.classList.add("modal-vgroup");
        body.appendChild(nameGroup);
        
        const nameLabel = document.createElement("label");
        nameLabel.textContent = "New plasmid name:";
        nameGroup.appendChild(nameLabel);
        
        const nameInputWrapper = document.createElement("div");
        nameInputWrapper.classList.add("modal-input-wrapper");
        nameGroup.appendChild(nameInputWrapper);

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.id = "new-file-name-input";
        nameInput.classList.add("modal-input", "modal-input-with-suffix");
        nameInput.value = "untitled";
        nameInputWrapper.appendChild(nameInput);

        const nameSuffix = document.createElement("div");
        nameSuffix.classList.add("modal-input-suffix");
        nameSuffix.textContent = ".gb";
        nameInputWrapper.appendChild(nameSuffix);


        // DNA sequence input group
        const sequenceGroup = document.createElement("div");
        sequenceGroup.classList.add("modal-vgroup", "modal-new-file-sequence-input");
        body.appendChild(sequenceGroup);

        const sequenceLabel = document.createElement("label");
        sequenceLabel.textContent = "DNA Sequence:";
        sequenceGroup.appendChild(sequenceLabel);

        const sequenceTextarea = document.createElement("textarea");
        sequenceTextarea.id = "new-file-sequence-input";
        sequenceTextarea.classList.add("modal-input", "modal-textarea");
        sequenceTextarea.spellcheck = false;
        sequenceTextarea.setAttribute("validator", "iupacBases");
        sequenceGroup.appendChild(sequenceTextarea);


        // Annotate features checkbox
        const annotateGroup = document.createElement("div");
        annotateGroup.classList.add("modal-hgroup");
        body.appendChild(annotateGroup);

        const annotateLabel = document.createElement("label");
        annotateLabel.textContent = "Annotate common features:";
        annotateGroup.appendChild(annotateLabel);

        const annotateCheckbox = document.createElement("input");
        annotateCheckbox.type = "checkbox";
        annotateCheckbox.id = "new-file-annotate-features-checkbox";
        annotateCheckbox.name = "new-file-annotate-features-checkbox";
        annotateCheckbox.checked = true;
        annotateGroup.appendChild(annotateCheckbox);


        // Sequence topology dropdown
        const topologyGroup = document.createElement("div");
        topologyGroup.classList.add("modal-hgroup");
        body.appendChild(topologyGroup);
        
        const topologyLabel = document.createElement("label");
        topologyLabel.textContent = "Sequence topology:";
        topologyGroup.appendChild(topologyLabel);
        
        const topologySelect = document.createElement("select");
        topologySelect.id = "new-file-topology-select";
        topologyGroup.appendChild(topologySelect);

        const linearOption = document.createElement("option");
        linearOption.value = "linear";
        linearOption.textContent = "Linear";
        linearOption.selected = true;
        topologySelect.appendChild(linearOption);

        const circularOption = document.createElement("option");
        circularOption.value = "circular";
        circularOption.textContent = "Circular";
        topologySelect.appendChild(circularOption);


        // Action button
        const action = FileIO.newFileFromSequence.bind(FileIO);
        body.appendChild(
            this._createButtons("Create file", id, action)
        );

        // Create the modal
        this._create(id, body, action);
    };


    //#region Rename plasmid
    /**
     * Create the rename plasmid modal window
     * 
     * @param {Plasmid} targetPlasmid - Target plasmid object
     */
    createRenamePlasmidModal(targetPlasmid) {
        const id = "modal-window-rename-plasmid";

        const body = document.createElement("div");

        // Title
        body.appendChild(
            this._createModalTitle("Rename plasmid")
        );
    
        const vgroup = document.createElement("div");
        vgroup.classList.add("modal-vgroup");
        body.appendChild(vgroup);

        const nameLabel = document.createElement("label");
        nameLabel.textContent = "New plasmid name:";
        vgroup.appendChild(nameLabel);

        const inputWrapper = document.createElement("div");
        inputWrapper.classList.add("modal-input-wrapper");
        vgroup.appendChild(inputWrapper);

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.id = `${id}-input`;
        nameInput.classList.add("modal-input", "modal-input-with-suffix");
        nameInput.value = targetPlasmid.name;
        inputWrapper.appendChild(nameInput);


        if (targetPlasmid.extension) {
            const suffixDiv = document.createElement("div");
            suffixDiv.classList.add("modal-input-suffix");
            suffixDiv.textContent = targetPlasmid.extension;
            inputWrapper.appendChild(suffixDiv);
        };


        const action = () => {
            const newName = document.getElementById(`${id}-input`).value;
            targetPlasmid.rename(newName);
        };

        body.appendChild(
            this._createButtons("Rename", id, action)
        );
    
        this._create(id, body, action);
    };


    //#region Rename primers
    /**
     * Creat the reanme primers modal window
     * 
     * @param {Number} primerSetIndex 
     */
    createRenamePrimersModal(primerSetIndex) {
        const id = "rename-primers";

        // Modal window body
        const modalBody = document.createElement("div");
        modalBody.classList.add("modal-wide");

        // Title
        modalBody.appendChild(
            this._createModalTitle("Rename primers")
        );

        // Select primer set to rename
        const primerSet = Session.activePlasmid().primers[primerSetIndex];

        // Rename primer set input
        const renamePrimerSet = this._createInput("Set name", `${id}-input`, primerSet.title, null, null);
        modalBody.appendChild(renamePrimerSet);

        // Container for primer name inputs
        const individualPrimersContainer = document.createElement("div");
        //individualPrimersContainer.style.marginLeft = "20px";
        modalBody.appendChild(individualPrimersContainer);


        /**
         * Update synced primer name inputs based on primer set name input
         */
        const syncStates = {};
        const updateSyncedPrimers = () => {
            // Get name of primer set
            const baseName = document.getElementById(`${id}-input`).value;

            // Iterate over primer name inputs
            const nrOfInputs = document.getElementById(id).querySelectorAll("input").length;
            for (let i = 0; i < nrOfInputs - 1; i++) {
                // Select primer name input
                const primerNameInput = document.getElementById(`${id}-input${i}`);
                
                // Select the sync button
                const primerNameInputSync = document.getElementById(`${id}-input${i}-sync`);
                
                // If the sync button is active, sync the primer name
                if (primerNameInputSync.hasAttribute("active")) {
                    const suffix = primerNameInput.getAttribute("suffix");
                    primerNameInput.value = baseName + suffix;
                };
            };
        };
        // Update synced primer names whenever the user changes the primer set name
        renamePrimerSet.addEventListener("input", updateSyncedPrimers);

        // Iterate over primers in the primer set and create their text inputs
        for (let i = 0; i < primerSet.primers.length; i++) {
            // Select primer
            const primer = primerSet.primers[i];

            // Container
            const vGroup = document.createElement("div");
            vGroup.classList.add("modal-vgroup");
            individualPrimersContainer.appendChild(vGroup);

            // Label 
            const label = document.createElement("label");
            label.innerText = `${primer.name}:`;
            vGroup.appendChild(label);

            // Hgroup for sync button and text input
            const hGroup = document.createElement("div");
            hGroup.classList.add("modal-hgroup");
            hGroup.style.height = "40px";
            individualPrimersContainer.appendChild(hGroup);


            /** 
             * Sync button
             */
            syncStates[i] = true;
            const syncToggle = document.createElement("div");
            syncToggle.id = `${id}-input${i}-sync`;
            syncToggle.classList.add(
                "modal-input-sync",
                "toolbar-button",
                "footer-button",
            );
            syncToggle.setAttribute("active", "");
            hGroup.appendChild(syncToggle);

            const syncIcon = document.createElement("span");
            syncIcon.classList.add("modal-input-sync-icon");
            syncToggle.appendChild(syncIcon);

            // Sync toggle click handler
            syncToggle.addEventListener("click", () => {
                syncStates[i] = !syncStates[i];

                if (syncStates[i]) {
                    syncToggle.setAttribute("active", "")
                    updateSyncedPrimers();
                } else {
                    syncToggle.removeAttribute("active");
                };
            });

            /**
             * Input
             */
            const input = document.createElement("input");
            input.type = "text";
            input.id = `${id}-input${i}`;
            input.classList.add("modal-input");
            input.value = primer.label;
            input.style.flexGrow = 1;
            input.setAttribute(
                "suffix",
                {
                    "Forward primer": "_fwd",
                    "Reverse primer": "_rev",
                    "Vector forward primer": "_vec_fwd",
                    "Vector reverse primer": "_vec_rev",
                }[primer.name]
            );
            hGroup.appendChild(input);
        };


        /**
         * On action, get the new names from the text inputs and pass them to the plasmid
         */
        const action = () => {
            // Prime set name
            const newPrimerSetName = document.getElementById(`${id}-input`).value;

            // Iterate over the primer text inputs and get their values
            const nrOfInputs = document.getElementById(id).querySelectorAll("input").length;
            const newPrimerNames = [];
            for (let i = 0; i < nrOfInputs - 1; i++) {
                newPrimerNames.push(
                    document.getElementById(`${id}-input${i}`).value
                );
            };

            // Rename primer set
            Session.activePlasmid().renamePrimerSet(primerSetIndex, newPrimerSetName, newPrimerNames);
        };


        // Action and cancel buttons
        modalBody.appendChild(
            this._createButtons(
                "Rename",
                id,
                action,
            )
        );
    
        this._create(id, modalBody, action);
    };


    //#region Insertion
    /**
     * Create the modal window for insertions and mutations
     * 
     * @param {String} type - Type of insertion modal window ("insertion" or "mutation") 
     */
    createInsertionModal(type="insertion") {
        const id = "modal-window-insertion";


        const body = document.createElement("div");
        body.classList.add("modal-insertion");


        // Title
        body.appendChild(
            this._createModalTitle((type === "insertion") ? "Insert here": "Mutate selection")
        );


        // Create text inputs
        const dnaSeqInput = this._createDNAInput("insertion-input-dna");
        const aaSeqInput = this._createAAInput("insertion-input-aa");
        const commonInsertionsDropdown = this._createCommonInsertionsDropdown(aaSeqInput.querySelector(".modal-input"));
        body.appendChild(commonInsertionsDropdown);
        body.appendChild(dnaSeqInput);
        body.appendChild(aaSeqInput);


        // Codon optimization dropdown
        body.appendChild(
            this._createCodonOptimizationDropdown()
        );


        // Translate feature checkbox
        body.appendChild(
            this._createTranslateFeatureCheckbox("insertion-checkbox-translate")
        );

        // Linear fragment hint
        const linFragHint = document.createElement("div");
        linFragHint.classList.add("modal-hgroup", "lin-frag-hint");
        linFragHint.id = "lin-frag-hint";

        const linFragSpan = document.createElement("span");
        linFragSpan.classList.add("lin-frag-hint-span");
        linFragSpan.innerHTML = `
            The sequence you are trying to insert is very long. We recommend generating and ordering a linear fragment of dsDNA with overhangs to use as the insert. 
            In the context menu, select "Insert from linear fragment" instead. An explanation of how insertions from linear fragments work can be found in the 
            <a href="/about#lin-frag" target="_blank" class="underlined-link">About</a> page.
        `;
        linFragHint.appendChild(linFragSpan);
        body.appendChild(linFragHint);

        
        // Add event listeners to constantly check if the sequences are too long
        // If they are too long, show the hint about using linear fragments
        [dnaSeqInput, aaSeqInput].forEach((input) => {
            input.addEventListener("input", function (e) {
                const linFragHint = document.getElementById("lin-frag-hint");
                if (input.value && input.value.length > 400) {
                    linFragHint.setAttribute("visible", "");
                } else {
                    linFragHint.removeAttribute("visible")
                };
            });
        });

        
        /**
         * Action
         */
        const action = () => {
            // Get new feature name if the user selection a common insertion
            const selectElement = commonInsertionsDropdown.querySelector(".common-insertions-dropdown");
            const selectedOption = selectElement.options[selectElement.selectedIndex];
            const newFeatureName = (selectedOption.hasAttribute("feature-label")) ? selectedOption.getAttribute("feature-label"): null;
            
            // Perform IVA operation
            Session.activePlasmid().IVAOperation(
                (type === "insertion") ? "Insertion": "Mutation",
                document.getElementById("insertion-input-dna").value,
                document.getElementById("insertion-input-aa").value,
                document.getElementById("insertion-select-organism").value,
                document.getElementById("insertion-checkbox-translate").checked,
                newFeatureName,
            );
        };


        // Action and cancel buttons
        body.appendChild(
            this._createButtons("Create primers", id, action)
        );
    
        this._create(id, body, action);
    };


    //#region Subcloning
    /**
     * Creat the subcloning with insertions modal window
     */
    createSubcloningModal() {
        const id = "modal-window-subcloning";


        const body = document.createElement("div");
        body.classList.add("modal-subcloning");


        // Modal title
        body.appendChild(
            this._createModalTitle("Subclone with insertions")
        );


        // 5' end
        const modalSubtitle5Prime = document.createElement("div");
        modalSubtitle5Prime.classList.add("modal-subcloning-subtitle");
        modalSubtitle5Prime.innerText = "5' end insertion:";
        body.appendChild(modalSubtitle5Prime);


        const dnaSeqInput5Prime = this._createDNAInput("insertion-input-5dna");
        const aaSeqInput5Prime = this._createAAInput("insertion-input-5aa");
        const commonInsertionsDropdown5Prime = this._createCommonInsertionsDropdown(aaSeqInput5Prime.querySelector(".modal-input"));
        body.appendChild(commonInsertionsDropdown5Prime);
        body.appendChild(dnaSeqInput5Prime);
        body.appendChild(aaSeqInput5Prime);


        // 3' end
        const modalSubtitle3Prime = document.createElement("div");
        modalSubtitle3Prime.classList.add("modal-subcloning-subtitle");
        modalSubtitle3Prime.innerText = "3' end insertion:";
        body.appendChild(modalSubtitle3Prime);

        const dnaSeqInput3Prime = this._createDNAInput("insertion-input-3dna");
        const aaSeqInput3Prime = this._createAAInput("insertion-input-3aa");
        const commonInsertionsDropdown3Prime = this._createCommonInsertionsDropdown(aaSeqInput3Prime.querySelector(".modal-input"));
        body.appendChild(commonInsertionsDropdown3Prime);
        body.appendChild(dnaSeqInput3Prime);
        body.appendChild(aaSeqInput3Prime);


        // Codon optimization dropdown
        body.appendChild(
            this._createCodonOptimizationDropdown()
        );


        // Translate feature checkbox
        body.appendChild(
            this._createTranslateFeatureCheckbox("insertion-checkbox-translate")
        );


        const action = () => {
            Session.activePlasmid().IVAOperation(
                "Subcloning",
                [
                    document.getElementById("insertion-input-5dna").value,
                    document.getElementById("insertion-input-3dna").value,
                ],
                [
                    document.getElementById("insertion-input-5aa").value,
                    document.getElementById("insertion-input-3aa").value,
                ],
                document.getElementById("insertion-select-organism").value,
                document.getElementById("insertion-checkbox-translate").checked,
            );
        };


        body.appendChild(
            this._createButtons("Create primers", id, action)
        );


        this._create(id, body, action);
    };


    //#region Insert from linear fragment
    /**
     * Create insert from linear fragment modal window
     */
    createInsertFromLinearFragmentModal() {
        const id = "modal-window-insertion";


        const body = document.createElement("div");
        body.classList.add("modal-insertion");


        // Modal title
        body.appendChild(
            this._createModalTitle("Insert from linear fragment")
        );


        // New plasmid name
        const newPlasmidNameVGroup = document.createElement("div");
        newPlasmidNameVGroup.classList.add("modal-vgroup");
        body.appendChild(newPlasmidNameVGroup);

        const newPlasmidNameLabel = document.createElement("label");
        newPlasmidNameLabel.innerText = "New plasmid name:";
        newPlasmidNameVGroup.appendChild(newPlasmidNameLabel);

        const newPlasmidNameInputWrapper = document.createElement("div");
        newPlasmidNameInputWrapper.classList.add("modal-input-wrapper");
        newPlasmidNameVGroup.appendChild(newPlasmidNameInputWrapper)

        const newPlasmidNameInput = document.createElement("input");
        newPlasmidNameInput.setAttribute("type", "text")
        newPlasmidNameInput.id = "lin-frag-input-name";
        newPlasmidNameInput.classList.add("modal-input", "modal-input-with-suffix");
        newPlasmidNameInput.setAttribute("value", "Linear fragment");
        newPlasmidNameInputWrapper.appendChild(newPlasmidNameInput);

        const newPlasmidNameInputSuffix = document.createElement("div");
        newPlasmidNameInputSuffix.classList.add("modal-input-suffix");
        newPlasmidNameInputSuffix.innerText = ".fasta";
        newPlasmidNameInputWrapper.appendChild(newPlasmidNameInputSuffix);


        body.appendChild(
            this._createDNAInput("insertion-input-dna", "textarea", ["modal-input", "modal-textarea"], true)
        );


        body.appendChild(
            this._createAAInput("insertion-input-aa", "textarea", ["modal-input", "modal-textarea"], true)
        );


        // Codon optimization dropdown
        body.appendChild(
            this._createCodonOptimizationDropdown()
        );
        

        // Translate feature checkbox
        body.appendChild(
            this._createTranslateFeatureCheckbox("insertion-checkbox-translate")
        );


        const action = () => {
            Session.activePlasmid().IVAOperation(
                "Linear fragment",
                document.getElementById("insertion-input-dna").value,
                document.getElementById("insertion-input-aa").value,
                document.getElementById("insertion-select-organism").value,
                document.getElementById("insertion-checkbox-translate").checked,
                null,
                document.getElementById("lin-frag-input-name").value,
            );
        };


        body.appendChild(
            this._createButtons("Create primers and linear fragment", id, action)
        );


        this._create(id, body, action);
    };


    //#region Set origin
    /**
     * Create the set plasmid origin modal window
     * 
     * @param {Plasmid} targetPlasmid - Target plasmid object
     */
    createSetOriginModal(targetPlasmid) {
        const id = "modal-window-set-origin";

        const body = document.createElement("div");

        body.appendChild(
            this._createModalTitle("Set new plasmid origin")
        )

        //Input
        const vGroup = document.createElement("div");
        vGroup.classList.add("modal-vgroup");
        body.appendChild(vGroup);

        const label = document.createElement("label");
        label.innerText = "New origin:";
        vGroup.appendChild(label);

        const input = document.createElement("input");
        input.setAttribute("type", "number");
        input.id = `${id}-input`;
        input.classList.add("modal-input");
        input.setAttribute("min", "1");
        input.setAttribute("max", targetPlasmid.sequence.length);
        input.setAttribute("step", "1");
        input.setAttribute("value", "1");
        vGroup.appendChild(input);


        const action = () => {
            targetPlasmid.setOrigin(document.getElementById(`${id}-input`).value);
        };


        body.appendChild(
            this._createButtons("Set origin", id, action)
        );    


        this._create(id, body, action);
    };


    //#region Set file topology
    /**
     * Create the set file topology modal window
     * 
     * @param {Plasmid} targetPlasmid - Target plasmid 
     */
    createSetFileTopologyModal(targetPlasmid) {
        const body = document.createElement("div");
        const id = "modal-window-set-file-topology";

        const currTopology = targetPlasmid.topology;
    
        // Modal title
        body.appendChild(
            this._createModalTitle("Set file topology")
        );

        // HGroup container
        const hgroup = document.createElement("div");
        hgroup.classList.add("toolbar-panel-section-hgroup-input");
        hgroup.style.padding = "10px 0px";
        hgroup.style.height = "25px";
        body.appendChild(hgroup);

        // "Linear" label
        const linearLabel = document.createElement("span");
        linearLabel.textContent = "Linear";
        hgroup.appendChild(linearLabel);

        // Switch wrapper
        const switchWrapper = document.createElement("div");
        switchWrapper.classList.add("boolean-switch-wrapper");
        hgroup.appendChild(switchWrapper);

        const switchLabel = document.createElement("label");
        switchLabel.classList.add("boolean-switch");
        switchWrapper.appendChild(switchLabel);

        const switchInput = document.createElement("input");
        switchInput.id = `${id}-input`;
        switchInput.type = "checkbox";
        switchInput.classList.add("boolean-switch-input");
        if (currTopology === "circular") switchInput.checked = true;
        switchLabel.appendChild(switchInput);

        const switchSlider = document.createElement("span");
        switchSlider.classList.add("boolean-switch-slider");
        switchLabel.appendChild(switchSlider);


        // "Circular." label
        const circularLabel = document.createElement("span");
        circularLabel.textContent = "Circular.";
        hgroup.appendChild(circularLabel);


        const action = () => {
            const newToplogy = (document.getElementById(`${id}-input`).checked)
                ? "circular"
                : "linear";
            targetPlasmid.setTopology(newToplogy);
        };


        body.appendChild(
            this._createButtons("Set topology", id, action)
        );    


        this._create(id, body, action);
    };
};