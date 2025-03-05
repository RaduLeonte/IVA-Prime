
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
            <textarea id="new-file-sequence-input" class="modal-input modal-textarea" spellcheck="false"></textarea>
        </div>

        <div class="modal-hgroup">
            <label>Annotate common features:</label>
            <input type="checkbox" id="new-file-annotate-features-checkbox" name="annotate-common-features-checkbox" checked="true">
        </div>

        <div class="modal-hgroup">
            <label>Sequence topology:</label>
            <select id="new-file-topology-select">
                <option value="linear" selected="selected">Linear</option>
                <option value="circular">Circular</option>
            </select>
        </div>
        
        
        <div class="modal-hgroup">
            <span class="round-button modal-button-action" id="${id}-action-button">Create File</span>
            <span class="round-button modal-button-cancel" onclick="removeModalWindow('${id}')">Cancel</span>
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
            <span class="round-button modal-button-action" id="${id}-action-button">Rename</span>
            <span class="round-button modal-button-cancel" onclick="removeModalWindow('${id}')">Cancel</span>
        </div>
        `;

        const action = () => {
            const newName = document.getElementById("modal-window-rename-plasmid-input").value;
            targetPlasmid.rename(newName);
        };
    
        this.create(id, body, action);
    };
};