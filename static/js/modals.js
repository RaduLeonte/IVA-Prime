
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

    getOrganismOptions() {
        let options = "";
        const preferredOrganism = UserPreferences.get("preferredOrganism");
        for (const key in Nucleotides.codonWeights) {
            if (key === preferredOrganism) {
                options += `<option value="${key}" selected="selected">${key}</option>\n`;
            } else {
                options += `<option value="${key}">${key}</option>\n`;
            };
        };
        return options;
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

    
        body.innerHTML = `
        <div class="modal-title">${(type === "insertion") ? "Insert here": "Mutate selection"}</div>

        <div class="modal-vgroup">
            <label>DNA sequence:</label>
            <input type="text" id="insertion-input-dna" class="modal-input" value="" validator="dna">
        </div>

        <div class="modal-vgroup">
            <label>Amino acid sequence:</label>
            <input type="text" id="insertion-input-aa" class="modal-input" value="" validator="aa">
            <div class="modal-hint">
                Accepted STOP letter codes: "*", "-", "X".
            </div>
        </div>
        

        <div class="modal-vgroup">
            <div class="modal-hgroup">
                <label>Optimize codons for:</label>
                <select id="insertion-select-organism">${this.getOrganismOptions()}</select>
            </div>
            <div class="modal-hint">
                Codon frequency tables from <a href="https://hive.biochemistry.gwu.edu/review/codon2" target="_blank">CoCoPUTs</a> (<a href="https://doi.org/10.1016/j.jmb.2019.04.021" target="_blank">Alexaki et al. 2019</a>).
            </div>
        </div>


        <div class="modal-hgroup">
            <label>Translate new feature:</label>
            <input type="checkbox" id="insertion-checkbox-translate" name="insertion-checkbox-translate" checked="false">
        </div>


        <div id="lin-frag-hint" class="modal-hgroup lin-frag-hint">
            <span class="lin-frag-hint-span">
                The sequence you are trying to insert is very long. We recommend generating and ordering a linear fragment of dsDNA with overhangs to use as the insert. In the context menu, select "Insert from linear fragment" instead. An explanation of how insertions from linear fragments work can be found in the <a href="/about#lin-frag" target="_blank" class="underlined-link">About</a> page.
            </span>
        </div>
        `;

        const dnaSeqInput = body.querySelector("#insertion-input-dna");
        const aaSeqInput = body.querySelector("#insertion-input-aa");

        [dnaSeqInput, aaSeqInput].forEach((input) => {
            input.addEventListener("input", function (e) {
                const linFragHint = document.getElementById("lin-frag-hint");
                if (input.value.length > 400) {
                    linFragHint.setAttribute("visible", "");
                } else {
                    linFragHint.removeAttribute("visible")
                };
            });
        });

        const action = () => {
            Session.activePlasmid().IVAOperation(
                (type === "insertion") ? "Insertion": "Mutation",
                document.getElementById("insertion-input-dna").value,
                document.getElementById("insertion-input-aa").value,
                document.getElementById("insertion-select-organism").value,
                document.getElementById("insertion-checkbox-translate").checked,
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
    
        body.innerHTML = `
        <div class="modal-title">Subclone with insertions</div>


        <div class="modal-subcloning-subtitle">5' end insertion:</div>

        <div class="modal-vgroup">
            <label>DNA sequence:</label>
            <input type="text" id="insertion-input-5dna" class="modal-input" value="" validator="dna">
        </div>

        <div class="modal-vgroup">
            <label>Amino acid sequence:</label>
            <input type="text" id="insertion-input-5aa" class="modal-input" value="" validator="aa">
            <div class="modal-hint">
                Accepted STOP letter codes: "*", "-", "X".
            </div>
        </div>


        <div class="modal-subcloning-subtitle">3' end insertion:</div>

        <div class="modal-vgroup">
            <label>DNA sequence:</label>
            <input type="text" id="insertion-input-3dna" class="modal-input" value="" validator="dna">
        </div>

        <div class="modal-vgroup">
            <label>Amino acid sequence:</label>
            <input type="text" id="insertion-input-3aa" class="modal-input" value="" validator="aa">
            <div class="modal-hint">
                Accepted STOP letter codes: "*", "-", "X".
            </div>
        </div>
        

        <div class="modal-vgroup">
            <div class="modal-hgroup">
                <label>Optimize codons for:</label>
                <select id="insertion-select-organism">${this.getOrganismOptions()}</select>
            </div>
            <div class="modal-hint">
                Codon frequency tables from <a href="https://hive.biochemistry.gwu.edu/review/codon2" target="_blank">CoCoPUTs</a> (<a href="https://doi.org/10.1016/j.jmb.2019.04.021" target="_blank">Alexaki et al. 2019</a>).
            </div>
        </div>


        <div class="modal-hgroup">
            <label>Translate new feature:</label>
            <input type="checkbox" id="insertion-checkbox-translate" name="insertion-checkbox-translate" checked="false">
        </div>
        `;

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

        body.innerHTML = `
        <div class="modal-title">Insert from linear fragment</div>

        <div class="modal-vgroup">
            <label>New plasmid name:</label>
            <div class="modal-input-wrapper">
                <input type="text" id="lin-frag-input-name" class="modal-input modal-input-with-suffix" value="Linear fragment">
                <div class="modal-input-suffix">.fasta</div>
            </div>
        </div>


        <div class="modal-vgroup lin-frag-sequence-input">
            <label>DNA Sequence:</label>
            <textarea id="insertion-input-dna" class="modal-input modal-textarea" spellcheck="false" validator="dna"></textarea>
        </div>

        <div class="modal-vgroup">
            <div class="modal-vgroup lin-frag-sequence-input">
                <label>Amino acid sequence:</label>
                <textarea id="insertion-input-aa" class="modal-input modal-textarea" spellcheck="false" validator="aa"></textarea>
            </div>
            <div class="modal-hint">
                Accepted STOP letter codes: "*", "-", "X".
            </div>
        </div>
        
        <div class="modal-vgroup">
            <div class="modal-hgroup">
                <label>Optimize codons for:</label>
                <select id="insertion-select-organism">${this.getOrganismOptions()}</select>
            </div>
            <div class="modal-hint">
                Codon frequency tables from <a href="https://hive.biochemistry.gwu.edu/review/codon2" target="_blank">CoCoPUTs</a> (<a href="https://doi.org/10.1016/j.jmb.2019.04.021" target="_blank">Alexaki et al. 2019</a>).
            </div>
        </div>


        <div class="modal-hgroup">
            <label>Translate new feature:</label>
            <input type="checkbox" id="insertion-checkbox-translate" name="insertion-checkbox-translate" checked="false">
        </div>
        `;

        const action = () => {
            Session.activePlasmid().IVAOperation(
                "Linear fragment",
                document.getElementById("insertion-input-dna").value,
                document.getElementById("insertion-input-aa").value,
                document.getElementById("insertion-select-organism").value,
                document.getElementById("insertion-checkbox-translate").checked,
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