const Toolbar = new class {
    constructor() {
        document.addEventListener("click", function (event) {
            if (!event.target.closest(".toolbar-panel") && !event.target.closest(".toolbar")) {
                Toolbar.hideAllPanels();
            };
        });

        document.addEventListener("DOMContentLoaded", function() {
            Toolbar.populateSettings();
        });
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
        Toolbar.hideAllPanels();

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
};