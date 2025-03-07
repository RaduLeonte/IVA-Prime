const Toolbar = new class {
    constructor() {
        document.addEventListener("click", function (event) {
            if (!event.target.closest(".toolbar-panel") && !event.target.closest(".toolbar")) {
                Toolbar.hideAllPanels();
            };
        });
    };


    togglePanel(id, button) {
        const panel = document.getElementById(id);
        if (!panel) return;

        if (!panel.hasAttribute("visible")) {
            this.hideAllPanels();
            this.showPanel(panel, button)
        } else {
            this.hidePanel(panel);
        };
    };


    showPanel(panel, button) {
        this.positionPanel(panel, button);
        panel.setAttribute("visible", "");
    };


    positionPanel(panel, button) {
        const buttonRect = button.getBoundingClientRect();
        const toolbar = document.querySelector(".toolbar");
        const toolbarRect = toolbar.getBoundingClientRect();

        const panelHeight = panel.offsetHeight;
        const viewportHeight = window.innerHeight;

        let x = toolbarRect.left + 2;
        let y = buttonRect.top + window.scrollY

        if (y + panelHeight > viewportHeight) {
            const footer = document.querySelector(".footer");
            const footerRect = footer.getBoundingClientRect();
            y = footerRect.top + 2 - panelHeight;
        };

        console.log(panel, panelHeight, viewportHeight, x, y)

        panel.style.top = `${y}px`;
        panel.style.left = `${x}px`;
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
};