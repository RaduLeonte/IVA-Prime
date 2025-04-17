
const Modals = new class {
    _create(id, body, action) {
        const modalWindow = document.createElement("div");
        modalWindow.id = id;
        modalWindow.classList.add("modal-window");
    
        body.classList.add("modal-body");
        modalWindow.appendChild(body);
    
        const modal = document.querySelector("div.modal");
        modal.style.display = "block";
        modal.appendChild(modalWindow);

        
        const inputElements = modalWindow.querySelectorAll("input[validator], textarea[validator]");
        inputElements.forEach((input) => {
            const validatorType = input.getAttribute("validator");
            Utilities.addInputValidator(input, validatorType);


            input.addEventListener("input", function () {
                const actionButton = document.getElementById(`${id}-action-button`);
    
                const inputFailedValidator = modalWindow.querySelector("[incorrect]") !== null;
                if (inputFailedValidator) {
                    actionButton.setAttribute("disabled", "");
                } else {
                    actionButton.removeAttribute("disabled");
                };
            });
        });
    };


    _createModalBody(title) {
        const modalBody = document.createElement("div");

        const modalTitle = document.createElement("DIV");
        modalTitle.classList.add("modal-title");
        modalTitle.innerText = title;
        modalBody.appendChild(modalTitle)

        return modalBody;
    };


    _createButtons(actionLabel, id, action) {
        const buttonsContainer = document.createElement("div");
        buttonsContainer.classList.add("modal-hgroup");

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

        const cancelButton = document.createElement("span");
        cancelButton.classList.add("button-round", "button-red");
        cancelButton.innerText = "Cancel";
        cancelButton.onclick = `Modals.remove('${id}')`
        buttonsContainer.appendChild(cancelButton);

        cancelButton.addEventListener("click", function (event) {
            Modals.remove(id);
        });
    

        function modalOnEnterKey(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById(`${id}-action-button`).click();
                document.removeEventListener("keydown", modalOnEnterKey);
            };
        };
        document.addEventListener("keydown", modalOnEnterKey);
    
    
        function modalOnEscapeKey(event) {
            if (event.key === "Escape") {
                console.log("escape")
                event.preventDefault();
                Modals.remove(buttonsContainer.closest(".modal-window").id);
                document.removeEventListener("keydown", modalOnEscapeKey);
            };
        };
        document.addEventListener("keydown", modalOnEscapeKey);

        return buttonsContainer;
    };
    


    _createInput(label, id, defaultText="", validator=null, suffix=null) {
        const inputContainer = document.createElement("DIV");
        inputContainer.classList.add("modal-vgroup");

        if (label) {
            const inputLabel = document.createElement("label");
            inputLabel.innerText = label;
            inputContainer.appendChild(inputLabel);
        };

        if (!suffix) {
            const input = document.createElement("input");
            input.setAttribute("type", "text");
            input.setAttribute("id", id);
            input.classList.add("modal-input");
            input.setAttribute("value", defaultText);
            if (validator) input.setAttribute("validator", validator);
            inputContainer.appendChild(input);

            return inputContainer;
        } else {
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

    
    remove(modalWindowId) {
        console.log("Modals.remove ->", modalWindowId)
        const modalWindow = document.getElementById(modalWindowId);
        const modal = modalWindow.parentNode;
        modal.style.display = "none"
        modal.removeChild(modalWindow);
    };


    isActive() {
        return document.getElementById("modal").style.display === "block"
    };


    _createCommonInsertionsDropdown(targetInput) {
        const container = document.createElement("div");
        container.classList.add("modal-hgroup");

        const codonLabel = document.createElement("label");
        codonLabel.innerText = "Commonly inserted sequences:";
        container.appendChild(codonLabel);


        const select = document.createElement("select");
        select.classList.add("common-insertions-dropdown")

        const defaultOption = document.createElement("option");
        defaultOption.textContent = "<No sequence selected>";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.classList.add("common-insertions-group");
        select.appendChild(defaultOption);
    
        const spacePerLevel = 4; // number of non-breaking spaces per depth level
    
        const addEntriesToOptgroup = (entries, optgroup, depth = 1) => {
            entries.forEach(entry => {
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
                    const itemOption = document.createElement("option");
                    itemOption.value = entry.aa;
                    itemOption.setAttribute("feature-label", entry.label);
                    itemOption.textContent = indent + entry.name;
                    optgroup.appendChild(itemOption);
                }
            });
        };
    
        // Loop over top-level groups
        Nucleotides.commonInsertions.forEach(topGroup => {
            if (topGroup.type === "group") {
                const optgroup = document.createElement("optgroup");
                optgroup.label = topGroup.name;
                optgroup.classList.add("common-insertions-group");
    
                addEntriesToOptgroup(topGroup.entries, optgroup, 1);
                select.appendChild(optgroup);
            }
        });


        select.addEventListener("change", (event) => {
            targetInput.value = event.target.value;
        });
        
        container.appendChild(select);

        return container;
    };


    _createDNAInput(inputID, type="text", cssClasses=["modal-input"], disableSpellcheck=false) {
        const dnaGroup = document.createElement("div");
        dnaGroup.classList.add("modal-vgroup");

        const dnaLabel = document.createElement("label");
        dnaLabel.innerText = "DNA sequence:";

        const dnaInput = document.createElement("input");
        dnaInput.type = type;
        dnaInput.id = inputID;
        dnaInput.classList.add(...cssClasses);
        if (disableSpellcheck) dnaInput.setAttribute("spellcheck", false);
        dnaInput.setAttribute("validator", "dna");

        dnaGroup.appendChild(dnaLabel);
        dnaGroup.appendChild(dnaInput);

        return dnaGroup;
    };


    _createAAInput(inputID, type="text", cssClasses=["modal-input"], disableSpellcheck=false) {
        const aaGroup = document.createElement("div");
        aaGroup.classList.add("modal-vgroup");

        const aaLabel = document.createElement("label");
        aaLabel.innerText = "Amino acid sequence:";

        const aaInput = document.createElement("input");
        aaInput.type = type;
        aaInput.id = inputID;
        aaInput.classList.add(...cssClasses);
        if (disableSpellcheck) aaInput.setAttribute("spellcheck", false);
        aaInput.setAttribute("validator", "aa");

        const aaHint = document.createElement("div");
        aaHint.classList.add("modal-hint");
        aaHint.innerText = 'Accepted STOP letter codes: "*", "-", "X".';

        aaGroup.appendChild(aaLabel);
        aaGroup.appendChild(aaInput);
        aaGroup.appendChild(aaHint);

        return aaGroup;
    };


    _createCodonOptimizationDropdown() {
        const codonGroup = document.createElement("div");
        codonGroup.classList.add("modal-vgroup");

        const codonHGroup = document.createElement("div");
        codonHGroup.classList.add("modal-hgroup");

        const codonLabel = document.createElement("label");
        codonLabel.innerText = "Optimize codons for:";
        codonHGroup.appendChild(codonLabel);


        const select = document.createElement("select");
        select.id = "insertion-select-organism";

        const preferredOrganism = UserPreferences.get("preferredOrganism");

        for (const key in Nucleotides.codonWeights) {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = key;
            if (key === preferredOrganism) {
                option.selected = true;
            }
            select.appendChild(option);
        }
        codonHGroup.appendChild(select);

        const codonHint = document.createElement("div");
        codonHint.classList.add("modal-hint");
        codonHint.innerHTML = `
            Codon frequency tables from 
            <a href="https://hive.biochemistry.gwu.edu/review/codon2" target="_blank">CoCoPUTs</a> 
            (<a href="https://doi.org/10.1016/j.jmb.2019.04.021" target="_blank">Alexaki et al. 2019</a>).
        `;

        codonGroup.appendChild(codonHGroup);
        codonGroup.appendChild(codonHint);

        return codonGroup;
    };


    _createTranslateFeatureCheckbox(checkboxID) {
        const translateGroup = document.createElement("div");
        translateGroup.classList.add("modal-hgroup");

        const translateLabel = document.createElement("label");
        translateLabel.innerText = "Translate new feature:";

        const translateCheckbox = document.createElement("input");
        translateCheckbox.type = "checkbox";
        translateCheckbox.id = checkboxID;
        translateCheckbox.name = checkboxID;
        translateCheckbox.checked = false;

        translateGroup.appendChild(translateLabel);
        translateGroup.appendChild(translateCheckbox);

        return translateGroup;
    };


    //#region New file
    createNewFileModal() {
        const body = document.createElement("div");
        body.classList.add("modal-new-file");
        const id = "modal-window-new-file";
    
        body.innerHTML = `
        <div class="modal-title">Create new file</div>

        <div class="modal-vgroup">
            <label>New plasmid name:</label>
            <div class="modal-input-wrapper">
                <input type="text" id="new-file-name-input" class="modal-input modal-input-with-suffix" value="untitled">
                <div class="modal-input-suffix">.gb</div>
            </div>
        </div>
        
        <div class="modal-vgroup modal-new-file-sequence-input">
            <label>DNA Sequence:</label>
            <textarea id="new-file-sequence-input" class="modal-input modal-textarea" spellcheck="false" validator="iupacBases"></textarea>
        </div>

        <div class="modal-hgroup">
            <label>Annotate common features:</label>
            <input type="checkbox" id="new-file-annotate-features-checkbox" name="new-file-annotate-features-checkbox" checked="true">
        </div>

        <div class="modal-hgroup">
            <label>Sequence topology:</label>
            <select id="new-file-topology-select">
                <option value="linear" selected="selected">Linear</option>
                <option value="circular">Circular</option>
            </select>
        </div>
        `;

        const action = FileIO.newFileFromSequence.bind(FileIO);

        body.appendChild(
            this._createButtons("Create file", id, action)
        );
    
        this._create(id, body, action);
    };


    //#region Rename plasmid
    createRenamePlasmidModal(targetPlasmid) {
        const body = document.createElement("div");
        const id = "modal-window-rename-plasmid";
    
        body.innerHTML = `
        <div class="modal-title">Rename plasmid</div>
    
        <div class="modal-vgroup">
            <label>New plasmid name:</label>
            <div class="modal-input-wrapper">
                <input type="text" id="${id}-input" class="modal-input modal-input-with-suffix" value="${targetPlasmid.name}">
                ${targetPlasmid.extension ? `<div class="modal-input-suffix">${targetPlasmid.extension}</div>` : ""}
            </div>
        </div>
        `;

        const action = () => {
            const newName = document.getElementById(`${id}-input`).value;
            targetPlasmid.rename(newName);
        };

        console.log(id)
        body.appendChild(
            this._createButtons("Rename", id, action)
        );
    
        this._create(id, body, action);
    };


    //#region Rename primers
    createRenamePrimersModal(primerSetIndex) {
        const id = "rename-primers";

        const modalBody = this._createModalBody("Rename primers");
        modalBody.classList.add("modal-wide");

        const primerSet = Session.activePlasmid().primers[primerSetIndex];

        // Rename primer set
        const renamePrimerSet = this._createInput("Set name", `${id}-input`, primerSet.title, null, null);
        modalBody.appendChild(renamePrimerSet);

        const individualPrimersContainer = document.createElement("div");
        //individualPrimersContainer.style.marginLeft = "20px";
        modalBody.appendChild(individualPrimersContainer);


        const syncStates = {};
        const updateSyncedPrimers = () => {
            const baseName = document.getElementById(`${id}-input`).value;

            const nrOfInputs = document.getElementById(id).querySelectorAll("input").length;
            for (let i = 0; i < nrOfInputs - 1; i++) {
                const primerNameInput = document.getElementById(`${id}-input${i}`);
                const primerNameInputSync = document.getElementById(`${id}-input${i}-sync`);
                
                if (primerNameInputSync.hasAttribute("active")) {
                    const suffix = primerNameInput.getAttribute("suffix");
                    primerNameInput.value = baseName + suffix;
                };
            };
        };
        renamePrimerSet.addEventListener("input", updateSyncedPrimers);

        for (let i = 0; i < primerSet.primers.length; i++) {
            const primer = primerSet.primers[i];

            const vGroup = document.createElement("div");
            vGroup.classList.add("modal-vgroup");
            individualPrimersContainer.appendChild(vGroup);

            /**
             * Label
             */
            const label = document.createElement("label");
            label.innerText = `${primer.name}:`;
            vGroup.appendChild(label);

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


        const action = () => {
            const newPrimerSetName = document.getElementById(`${id}-input`).value;

            const nrOfInputs = document.getElementById(id).querySelectorAll("input").length;
            const newPrimerNames = [];

            for (let i = 0; i < nrOfInputs - 1; i++) {
                newPrimerNames.push(
                    document.getElementById(`${id}-input${i}`).value
                );
            };

            Session.activePlasmid().renamePrimerSet(primerSetIndex, newPrimerSetName, newPrimerNames);
        };


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
    createInsertionModal(type="insertion") {
        const body = document.createElement("div");
        body.classList.add("modal-insertion");
        const id = "modal-window-insertion";


        // Title
        const modalTitle = document.createElement("div");
        modalTitle.classList.add("modal-title");
        modalTitle.innerText = (type === "insertion") ? "Insert here": "Mutate selection";
        body.appendChild(modalTitle);


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

        const action = () => {
            const selectElement = commonInsertionsDropdown.querySelector(".common-insertions-dropdown");
            const selectedOption = selectElement.options[selectElement.selectedIndex];
            const newFeatureName = (selectedOption.hasAttribute("feature-label")) ? selectedOption.getAttribute("feature-label"): null;
            console.log("newFeatureName -> ", newFeatureName)
            Session.activePlasmid().IVAOperation(
                (type === "insertion") ? "Insertion": "Mutation",
                document.getElementById("insertion-input-dna").value,
                document.getElementById("insertion-input-aa").value,
                document.getElementById("insertion-select-organism").value,
                document.getElementById("insertion-checkbox-translate").checked,
                newFeatureName,
            );
        };

        body.appendChild(
            this._createButtons("Create primers", id, action)
        );
    
        this._create(id, body, action);
    };


    //#region Subcloning 
    createSubcloningModal() {
        const body = document.createElement("div");
        body.classList.add("modal-subcloning");
        const id = "modal-window-subcloning";


        // Modal title
        const modalTitle = document.createElement("div");
        modalTitle.classList.add("modal-title");
        modalTitle.innerText = "Subclone with insertions";
        body.appendChild(modalTitle);


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
    createInsertFromLinearFragmentModal() {
        const body = document.createElement("div");
        body.classList.add("modal-insertion");
        const id = "modal-window-insertion";

        const modalTitle = document.createElement("div");
        modalTitle.classList.add("modal-title");
        modalTitle.innerText = "Insert from linear fragment";
        body.appendChild(modalTitle);


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
    createSetOriginModal(targetPlasmid) {
        const body = document.createElement("div");
        const id = "modal-window-set-origin";

        const seqLength = targetPlasmid.sequence.length;
    
        body.innerHTML = `
        <div class="modal-title">Set new plasmid origin</div>
    
        <div class="modal-vgroup">
            <label>New origin:</label>
            <input type="number" id="${id}-input" class="modal-input" min="1" max="${seqLength} step="1" value="1">
        </div>
        `;

        const action = () => {
            const newOrigin = document.getElementById(`${id}-input`).value;
            targetPlasmid.setOrigin(newOrigin);
        };

        body.appendChild(
            this._createButtons("Set origin", id, action)
        );    
        this._create(id, body, action);
    };


    //#region Set file topology
    createSetFileTopologyModal(targetPlasmid) {
        const body = document.createElement("div");
        const id = "modal-window-set-file-topology";

        const currTopology = targetPlasmid.topology;
        console.log()
    
        body.innerHTML = `
        <div class="modal-title">Set file topology</div>

        <div class="toolbar-panel-section-hgroup-input" style="padding: 10px 0px;height: 25px;">
            <span>
                Linear
            </span>
            <div class="boolean-switch-wrapper">
                <label class="boolean-switch">
                    <input id="${id}-input" type="checkbox" class="boolean-switch-input" ${currTopology === 'circular' ? 'checked="true"': '' }">
                    <span class="boolean-switch-slider"></span>
                </label>
            </div>
            <span>
                Circular.
            </span>
        </div>
        `;

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