const Toolbar = new class {
    constructor() {
        this.equationImages = {
            "TmAlgorithm": {
                "oligoCalc": "/static/assets/equations/oligoCalc_equation.png",
                "nnSantaLucia": "/static/assets/equations/nnSantaLucia_equation.png"
            },
            "saltCorr": {
                "SchildkrautLifson": "/static/assets/equations/SchildkrautLifson_equation.png",
                "Owczarzy": "/static/assets/equations/Owczarzy_equation.png"
            },
        };

        document.addEventListener("DOMContentLoaded", function() {
            Toolbar.populateSettings();

            Toolbar.updateEquationImage("TmAlgorithm", "meltingTempAlgorithmEquationImage");
            Toolbar.updateEquationImage("saltCorr", "saltCorrectionEquationImage");

            const calcinput1 = document.getElementById("tm-calc-input1");
            calcinput1.addEventListener("input", function () {
                Toolbar.calculatePrimerTm(this.value, 1)
            });
            const calcinput2 = document.getElementById("tm-calc-input2");
            calcinput2.addEventListener("input", function () {
                Toolbar.calculatePrimerTm(this.value, 2)
            });
        });

        document.addEventListener("click", function (event) {
            if (!event.target.closest(".toolbar-panel") && !event.target.closest(".toolbar")) {
                Toolbar.hideAllPanels();
            };
        });
    };

    updateEquationImage(selectId, imageId) {

        const selectElement = document.getElementById(selectId);
        const imageElement = document.getElementById(imageId);

        if (selectElement && imageElement) {
            selectElement.addEventListener("change", function () {
                const selectedValue = this.value;
                if (Toolbar.equationImages[selectId] && Toolbar.equationImages[selectId][selectedValue]) {
                    imageElement.src = Toolbar.equationImages[selectId][selectedValue];
                }
            });

            // Initial update to set the correct image on page load
            const selectedValue = selectElement.value;
            if (Toolbar.equationImages[selectId][selectedValue]) {
                imageElement.src = Toolbar.equationImages[selectId][selectedValue];
            };
        };
    };


    togglePanel(id, button, alignBottomRight=false) {
        const panel = document.getElementById(id);
        if (!panel) return;

        if (!panel.hasAttribute("visible")) {
            this.hideAllPanels();
            this.showPanel(panel, button, alignBottomRight)
        } else {
            this.hidePanel(panel);
        };
    };


    showPanel(panel, button, alignBottomRight) {
        this.positionPanel(panel, button, alignBottomRight);
        panel.setAttribute("visible", "");
    };


    positionPanel(panel, button, alignBottomRight) {
        const buttonRect = button.getBoundingClientRect();
        const toolbar = document.querySelector(".toolbar");
        const toolbarRect = toolbar.getBoundingClientRect();
        const footer = document.querySelector(".footer");
        const footerRect = footer.getBoundingClientRect();

        const panelHeight = panel.offsetHeight;
        const viewportHeight = window.innerHeight;

        let x = toolbarRect.left + 2;
        let y = buttonRect.top + window.scrollY

        if (alignBottomRight) {
            y = buttonRect.bottom - window.scrollY - panelHeight;
            y = viewportHeight - buttonRect.bottom

            panel.style.bottom = `${y}px`;
            panel.style.left = `${x}px`;
            panel.style.top = `auto`;
        } else {
            if (y + panelHeight > viewportHeight) {
                y = footerRect.top + 2 - panelHeight;
            };

            panel.style.top = `${y}px`;
            panel.style.left = `${x}px`;
        };

    };


    hidePanel(panel) {
        panel.removeAttribute("visible");
    };


    hideAllPanels() {
        const panels = document.querySelectorAll(".toolbar-panel");
        for(let i = 0; i < panels.length; i++) {
            this.hidePanel(panels[i])
        };
    };


    toggleAdvancedSettings(header) {
        header.toggleAttribute("collapsed");
        header.nextElementSibling.toggleAttribute("collapsed");
    };


    applyToAllInputs(action) {
        const settingsPanel = document.getElementById("toolbar-panel-settings");
        const inputs = settingsPanel.querySelectorAll("input, select");

        let preferences = {};

        inputs.forEach((element) => {
            const prefName = element.id || element.name;
            if (!prefName) return;

            const value = action(element, prefName);
            if (value !== undefined) {
                preferences[prefName] = value;
            };
        });

        return preferences;
    }


    populateSettings() {
        const preferences = this.applyToAllInputs((element, prefName) => {
            const storedValue = UserPreferences.get(prefName);
            if (storedValue !== undefined) {
                element.type === "checkbox"
                    ? element.checked = storedValue
                    : element.value = storedValue;
            };
        });

        this.attachValidationListeners();

        Utilities.updateTheme();
    };


    updateSettings() {
        Toolbar.hideAllPanels();

        const preferences = this.applyToAllInputs((element) => {
            return element.type === "checkbox"
                ? element.checked
                : element.value;
        });

        UserPreferences.setBulk(preferences);

        Utilities.updateTheme();
    };


    resetToDefaultSettings() {
        const preferences = this.applyToAllInputs((element, prefName) => {
            const defaultValue = UserPreferences.defaultSettings[prefName];
            if (defaultValue !== undefined) {
                element.type === "checkbox"
                    ? element.checked = defaultValue
                    : element.value = defaultValue;
                return defaultValue;
            };
        });

        UserPreferences.setBulk(preferences);

        Utilities.updateTheme();

        let inputEvent = new Event('input', { bubbles: false, });
        document.getElementById("toolbar-panel-settings").querySelectorAll("input[validator]").forEach(function (input) {
            input.dispatchEvent(inputEvent);
        });
    };


    attachValidationListeners() {
        const settingsPanel = document.getElementById("toolbar-panel-settings");
        const inputs = settingsPanel.querySelectorAll("input, select");

        inputs.forEach((element) => {
            element.addEventListener("input", this.checkValidationState);
        });

        this.checkValidationState();
    };

    checkValidationState() {
        const settingsPanel = document.getElementById("toolbar-panel-settings");
        const updateButton = document.getElementById("update-settings-button");


        const inputFailedValidator = settingsPanel.querySelector("[incorrect]") !== null;

        if (inputFailedValidator) {
            updateButton.setAttribute("disabled", "");
        } else {
            updateButton.removeAttribute("disabled");
        };
    };


    calculatePrimerTm(seq, index) {
        const tmSpan = document.getElementById(`tm-calc-tm${index}`);
        const infoSpan = document.getElementById(`tm-calc-info${index}`);
        
        if (seq.length > 0 && Nucleotides.isNucleotideSequence(seq) && /^[ATCG]*$/i.test(seq)) {
            tmSpan.textContent = Nucleotides.getMeltingTemperature(seq).toFixed(2);
            infoSpan.textContent = `(${UserPreferences.get("TmAlgorithm")}, ${UserPreferences.get("primerConc")} nM)`;

        } else {
            tmSpan.textContent = "--";
            infoSpan.textContent = "--";

        };

        this.calculatePrimerOverlap();
    };


    updateUndoRedoButtonsStates() {
        const activePlasmid = Session.activePlasmid();
        if (!activePlasmid) return;

        const stateIndex = activePlasmid.stateIndex;
        const stateHistoryLength = activePlasmid.stateHistory.length;

        const undoButton = document.getElementById("undo-button");
        const redoButton = document.getElementById("redo-button");

        console.log("Toolbar.updateUndoRedoButtonsStates ->", stateIndex, stateHistoryLength);

        if (stateIndex >= stateHistoryLength - 1) {
            // We're on the earliest state, disalbe redo button
            undoButton.setAttribute("disabled", "");

            undoButton.setAttribute(
                "title",
                `Undo (Ctrl + Z)`,
            );
        } else {
            undoButton.removeAttribute("disabled");

            undoButton.setAttribute(
                "title",
                `Undo: ${activePlasmid.stateHistory[stateIndex].actionDescription} (Ctrl + Z)`,
            );
        };

        if (stateIndex <= 0) {
            // We're on latest state, disable redo button
            redoButton.setAttribute("disabled", "");

            redoButton.setAttribute(
                "title",
                `Redo (Ctrl + Shift + Z)`,
            );
        } else {
            redoButton.removeAttribute("disabled");

            redoButton.setAttribute(
                "title",
                `Redo: ${activePlasmid.stateHistory[stateIndex - 1].actionDescription} (Ctrl + Shift + Z)`,
            );
        };
    };


    calculatePrimerOverlap(seq1 = null, seq2 = null) {
        const primer1 = (seq1) ? seq1 : document.getElementById("tm-calc-input1").value;
        if (!/^[ATCG]*$/i.test(primer1) || primer1.trim().length === 0) return;

        const primer2 = (seq2) ? seq2 : document.getElementById("tm-calc-input2").value;
        if (!/^[ATCG]*$/i.test(primer2) || primer2.trim().length === 0) return;

        const primer2RC = Nucleotides.reverseComplementary(primer2);

        console.log(primer1, primer2RC)
        
        const minLength = Math.min(primer1.length, primer2RC.length);
        let overlap = 0;
        for (let i = minLength; i > 0; i--) {
            if (primer2RC.slice(-i) === primer1.slice(0, i)) {
                overlap = i;
                break;
            };
        };
        const primer2Rev = primer2.split("").reverse().join("")

        const overlappingSequence = primer1.slice(0, overlap);

        const svgWrapper = document.getElementById("tm-overlap-svg-wrapper");
        if (svgWrapper.firstElementChild) {
            svgWrapper.removeChild(svgWrapper.firstElementChild);
        };

        const overlapTmSpan = document.getElementById("tm-calc-overlap-tm");
        const overlapLengthSpan = document.getElementById("tm-calc-overlap-length");
        const overlapInfoSpan = document.getElementById("tm-calc-overlap-info");
        if (overlap === 0) {
            overlapTmSpan.textContent = "--";
            overlapLengthSpan.textContent = "";
            overlapInfoSpan.textContent = "--";
        } else {
            overlapTmSpan.textContent = Nucleotides.getMeltingTemperature(overlappingSequence).toFixed(2);
            overlapLengthSpan.textContent = `(${overlap} bp)`
            overlapInfoSpan.textContent = `(${UserPreferences.get("TmAlgorithm")}, ${UserPreferences.get("primerConc")} nM)`;
        };
        

        const maxLength = 40;
        const primer1Truncated = primer1.slice(0, Math.min(maxLength, primer1.length));
        const primer2Truncated = primer1.slice(-Math.min(maxLength, primer2.length));

        const maxWidth = primer2Truncated.length + primer1Truncated.length - overlap;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgWrapper.appendChild(svg);
        svg.id = "toolbar-panel-tm-overlap-svg";
        svg.classList.add("toolbar-panel-tm-overlap-svg");
        
        
        const scaleFactor = 14; // Font size in px
        svg.setAttribute("viewBox", `0 0 ${maxWidth*scaleFactor} ${2*scaleFactor}`);

        const primer1Offset = primer2Truncated.length - overlap;
        for (let i = 0; i < primer1.length; i++) {
            svg.appendChild(PlasmidViewer._text(
                [(i + 0.5 + primer1Offset)*scaleFactor, 0*scaleFactor],
                primer1.slice(i, i+1),
                null,
                "toolbar-panel-tm-overlap-text",
                "middle",
                "1em"
            ))
        };
        for (let i = 0; i < primer2Rev.length; i++) {
            svg.appendChild(PlasmidViewer._text(
                [(i + 0.5)*scaleFactor, 1*scaleFactor],
                primer2Rev.slice(i, i+1),
                null,
                "toolbar-panel-tm-overlap-text",
                "middle",
                "1em"
            ))
        };
    };
};