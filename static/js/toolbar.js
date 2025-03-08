const Toolbar = new class {
    constructor() {
        this.equationImages = {
            "TmAlgorithm": {
                "oligoCalc": "/static/assets/equations/oligoCalc%20equation.png",
                "nnSantaLucia": "/static/assets/equations/nnSantaLucia%20equation.png"
            },
            "saltCorr": {
                "SchildkrautLifson": "/static/assets/equations/SchildkrautLifson%20equation.png",
                "Owczarzy": "/static/assets/equations/Owczarzy%20equation.png"
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
        
        if (seq.length > 0 && Nucleotides.isNucleotideSequence(seq)) {
            tmSpan.textContent = Nucleotides.getMeltingTemperature(seq).toFixed(2);
            infoSpan.textContent = `(${UserPreferences.get("TmAlgorithm")}, ${UserPreferences.get("primerConc")} nM)`;

        } else {
            tmSpan.textContent = "--";
            infoSpan.textContent = "--";

        };

    };
};