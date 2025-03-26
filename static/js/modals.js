
const Modals = new class {
    create(id, body, action) {
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
    
    
        document.getElementById(`${id}-action-button`).addEventListener("click", function (event) {
            event.preventDefault();
            action();
            Modals.remove(id);
        });
    
    
        document.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById(`${id}-action-button`).click();
            };
        });
    
    
        function onEscapeKey(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                Modals.remove(id);
                document.removeEventListener("keydown", onEscapeKey);
            };
        };
        document.addEventListener("keydown", onEscapeKey);
    };

    
    remove(modalWindowId) {
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


    createNewFileModal() {
        const body = document.createElement("div");
        body.classList.add("modal-new-file");
        const id = "modal-window-new-file";
    
        body.innerHTML = `
        <div class="modal-title">New File</div>

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
        
        
        <div class="modal-hgroup">
            <span class="button-round button-green" id="${id}-action-button">Create File</span>
            <span class="button-round button-red" onclick="Modals.remove('${id}')">Cancel</span>
        </div>
        `;

        const action = FileIO.newFileFromSequence.bind(FileIO);
    
        this.create(id, body, action);
    };


    createRenamePlasmidModal(targetPlasmid) {
        const body = document.createElement("div");
        const id = "modal-window-rename-plasmid";
    
        body.innerHTML = `
        <div class="modal-title">Rename Plasmid</div>
    
        <div class="modal-vgroup">
            <label>New plasmid name:</label>
            <div class="modal-input-wrapper">
                <input type="text" id="${id}-input" class="modal-input modal-input-with-suffix" value="${targetPlasmid.name}">
                ${targetPlasmid.extension ? `<div class="modal-input-suffix">${targetPlasmid.extension}</div>` : ""}
            </div>
        </div>
        
        
        <div class="modal-hgroup">
            <span class="button-round button-green" id="${id}-action-button">Rename</span>
            <span class="button-round button-red" onclick="Modals.remove('${id}')">Cancel</span>
        </div>
        `;

        const action = () => {
            const newName = document.getElementById("modal-window-rename-plasmid-input").value;
            targetPlasmid.rename(newName);
        };
    
        this.create(id, body, action);
    };


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
        
        <div class="modal-hgroup">
            <span class="button-round button-green" id="${id}-action-button">Create primers</span>
            <span class="button-round button-red" onclick="Modals.remove('${id}')">Cancel</span>
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
    
        this.create(id, body, action);
    };


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

        
        
        <div class="modal-hgroup">
            <span class="button-round button-green" id="${id}-action-button">Create primers</span>
            <span class="button-round button-red" onclick="Modals.remove('${id}')">Cancel</span>
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
    
        this.create(id, body, action);
    };


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

        
        <div class="modal-hgroup">
            <span class="button-round button-green" id="${id}-action-button">Create primers and linear fragment</span>
            <span class="button-round button-red" onclick="Modals.remove('${id}')">Cancel</span>
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
    
        this.create(id, body, action);
    };


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
        
        
        <div class="modal-hgroup">
            <span class="button-round button-green" id="${id}-action-button">Set origin</span>
            <span class="button-round button-red" onclick="Modals.remove('${id}')">Cancel</span>
        </div>
        `;

        const action = () => {
            const newOrigin = document.getElementById(`${id}-input`).value;
            targetPlasmid.setOrigin(newOrigin);
        };
    
        this.create(id, body, action);
    };


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
        
        
        <div class="modal-hgroup">
            <span class="button-round button-green" id="${id}-action-button">Set topology</span>
            <span class="button-round button-red" onclick="Modals.remove('${id}')">Cancel</span>
        </div>
        `;

        const action = () => {
            const newToplogy = (document.getElementById(`${id}-input`).checked)
                ? "circular"
                : "linear";
            targetPlasmid.setTopology(newToplogy);
        };
    
        this.create(id, body, action);
    };
};