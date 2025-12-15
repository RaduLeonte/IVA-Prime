const ContextMenu = new class {
    constructor() {
        this.structure = [
            { section: "<span class='context-menu-icon context-menu-icon-iva-operations'>IVA Cloning Operations</span>", items: [
                {
                    item: "Insert here",
                    conditions: {all: ["single"]},
                    action: () => Modals.createInsertionModal("insertion")
                },
                {
                    item: "Insert from linear fragment",
                    conditions:  {any: ["single", "range", "feature"]},
                    action: () => Modals.createInsertFromLinearFragmentModal()
                },
                {
                    item: "Delete selection",
                    conditions: {any: ["range", "feature"]},
                    action: () => Session.activePlasmid().IVAOperation("Deletion")
                },
                {
                    item: "Mutate selection",
                    conditions: {any: ["range", "feature"]},
                    action: () => Modals.createInsertionModal("mutation")
                },

                { separator: "" },

                {
                    item: "Mark selection for subcloning",
                    conditions:  {any: ["range", "feature"]},
                    action: () => Session.markForSubcloning()
                },
                {
                    item: "Unmark subcloning target",
                    conditions:  {all: ["subcloningTarget"]},
                    action: () => Session.removeMarkForSubcloning()
                },
                {
                    item: "Subclone into selection",
                    conditions: {any: ["single", "range", "feature"], all: ["subcloningTarget"]},
                    action: () => Session.activePlasmid().IVAOperation("Subcloning", "", "", null, true)
                },
                {
                    item: "Subclone with insertion(s) into selection",
                    conditions:  {any: ["single", "range", "feature"], all: ["subcloningTarget"]},
                    action: () => Modals.createSubcloningModal()
                },

                { separator: "" },

                {
                    item: "Modify plasmid to reflect operation",
                    checkboxID:  "modifyPlasmidAfterOperation",
                    action: () => {
                        const newState = !UserPreferences.get("modifyPlasmidAfterOperation");
                        UserPreferences.set("modifyPlasmidAfterOperation", newState);
                        document.getElementById("modifyPlasmidAfterOperation").checked = newState;
                    }
                },
            ]},

            { separator: "" },

            { section: "<span class='context-menu-icon context-menu-icon-features'>Feature Annotations</span>", items: [
                {
                    item: "Annotate selection",
                    conditions: {all: ["range"]},
                    action: () => Session.activePlasmid().newFeature(Session.activePlasmid().getSelectionIndices())
                },
                {
                    item: "Delete feature annotation",
                    conditions: {all: ["feature"]},
                    action: () => Session.activePlasmid().removeFeature(Session.activePlasmid().getSelectedFeatureID())
                },
                {
                    item: "Annotate common features in selection",
                    conditions: {all: ["range"]},
                    action: () => Session.activePlasmid().detectCommonFeatures(Session.activePlasmid().getSelectionIndices())
                },
            ]},


            { separator: "" },

            { section: "<span class='context-menu-icon context-menu-icon-copy'>Copy to clipboard</span>", items: [
                { 
                    submenu: "Copy nucleotides",
                    items: [
                        {
                            item: "<p>Copy forward</p><p>(top strand, 5'->3')</p>",
                            conditions: {any: ["range", "feature"]},
                            action: () => Utilities.copySequence()
                        },
                        {
                            item: "<p>Copy reverse</p><p>(top strand, 3'->5')</p>",
                            conditions: {any: ["range", "feature"]},
                            action: () => Utilities.copySequence("reverse")
                        },
                        {
                            item: "<p>Copy reverse complement</p><p>(bottom strand, 5'->3')</p>",
                            conditions: {any: ["range", "feature"]},
                            action: () => Utilities.copySequence("reverse complement")
                        },
                        {
                            item: "<p>Copy complement</p><p>(bottom strand, 3'->5')</p>",
                            conditions: {any: ["range", "feature"]},
                            action: () => Utilities.copySequence("complement")
                        },
                    ]
                },
    
                { 
                    submenu: "Copy amino acids",
                    items: [
                        {
                            item: "Copy amino acids (forward)",
                            conditions: {any: ["range", "feature"]},
                            action: () => Utilities.copyAASequence()
                        },
            
                        {
                            item: "Copy amino acids (reverse)",
                            conditions: {any: ["range", "feature"]},
                            action: () => Utilities.copyAASequence("reverse")
                        },
                    ]
                },
            ]},



            { separator: "" },

            { submenu: "Translate", items: [
                {
                    item: "Begin translation at first START codon (5'->3')",
                    conditions: {all: ["single"]},
                    action: () => Session.activePlasmid().newTranslationAtFirstStart("fwd")
                },
                {
                    item: "Begin translation at first START codon (3'->5')",
                    conditions: {all: ["single"]},
                    action: () => Session.activePlasmid().newTranslationAtFirstStart("rev")
                },
                {
                    item: "Translate selection (5'->3')",
                    conditions: {any: ["range", "feature"]},
                    action: () => Session.activePlasmid().newFeature(
                        Session.activePlasmid().getSelectionIndices(),
                        "fwd",
                        "New translation",
                        "CDS",
                        null,
                        true
                    )
                },
                {
                    item: "Translate selection (3'->5')",
                    conditions: {any: ["range", "feature"]},
                    action: () => Session.activePlasmid().newFeature(
                        Session.activePlasmid().getSelectionIndices(),
                        "rev",
                        "New translation",
                        "CDS",
                        null,
                        true
                    )
                },
            ] },

            { separator: "" },

            { submenu: "Edit plasmid", items: [
                {
                    item: "Flip plasmid",
                    conditions: {},
                    action: () => Session.activePlasmid().flip()
                },
                {
                    item: "Set new plasmid origin",
                    conditions: {all: ["single"]},
                    action: () => Session.activePlasmid().setOrigin(Session.activePlasmid().getSelectionIndices()[0])
                },
            ] },
        ];

        document.addEventListener("DOMContentLoaded", function () {
            ContextMenu.initialize();
        });
    };


    initialize() {
        function createMenuItems(menuStructure, parent) {
            menuStructure.forEach(entry => {
                if (entry.section) {
                    // Create section container
                    const sectionContainer = document.createElement("div");
                    sectionContainer.classList.add("context-menu-section");
        
                    // Create section title
                    const sectionTitle = document.createElement("div");
                    sectionTitle.classList.add("context-menu-section-title");
                    sectionTitle.innerHTML = entry.section;
                    sectionContainer.appendChild(sectionTitle);
        
                    // Create section items container
                    const sectionItemsContainer = document.createElement("div");
                    sectionItemsContainer.classList.add("context-menu-section-items");
        
                    // Recursively create menu items inside the section items container
                    createMenuItems(entry.items, sectionItemsContainer);
                    
                    sectionContainer.appendChild(sectionItemsContainer);
                    parent.appendChild(sectionContainer);

                } else if (entry.separator !== undefined) {
                    // Create separator (only if explicitly defined)
                    const separator = document.createElement("div");
                    separator.classList.add("context-menu-separator");
                    parent.appendChild(separator);

                } else if (entry.item) {
                    // Create menu item
                    const menuItem = document.createElement("div");
                    menuItem.classList.add("context-menu-item");
                    menuItem.innerHTML = entry.item;

                    if (entry.checkboxID !== undefined) {
                        // Add checkbox
                        const checkbox = document.createElement("input");
                        checkbox.classList.add("context-menu-checkbox");
                        checkbox.id = entry.checkboxID;
                        checkbox.type = "checkbox";
                        checkbox.checked = UserPreferences.get("modifyPlasmidAfterOperation");
                        menuItem.insertBefore(checkbox, menuItem.firstChild);
                    };

                    if (entry.conditions) {
                        menuItem.setAttribute("conditions", JSON.stringify(entry.conditions))
                    };

                    // Attach click event for regular menu items
                    menuItem.addEventListener("click", () => {
                        if (menuItem.hasAttribute("disabled")) {
                            // Prevent action and optionally stop event propagation
                            e.stopPropagation();
                            e.preventDefault();
                            return;
                        };
                        if (entry.checkboxID == undefined) {
                            // If it's not a checkbox, hide the menu on click
                            ContextMenu.hide();
                        };
                        entry.action();
                    });

                    parent.appendChild(menuItem);

                } else if (entry.submenu) {
                    // Create parent item for submenu
                    const menuItem = document.createElement("div");
                    menuItem.classList.add("context-menu-item", "context-menu-has-submenu");
                    menuItem.textContent = entry.submenu;

                    // Create submenu container
                    const submenu = document.createElement("div");
                    submenu.classList.add("context-menu");
                    submenu.classList.add("context-submenu");

                    // Recursively create submenu items
                    createMenuItems(entry.items, submenu);

                    // Append submenu to the menu item
                    menuItem.appendChild(submenu);
                    parent.appendChild(menuItem);

                    // Handle dynamic submenu positioning
                    menuItem.addEventListener("mouseenter", function () {
                        positionSubmenu(menuItem, submenu);
                        submenu.setAttribute("visible", "");
                    });
                    menuItem.addEventListener("mouseleave", function () {
                        submenu.removeAttribute("visible");
                    });
                }
            });
        };


        function positionSubmenu(menuItem, submenu) {
            // Get dimensions
            const menuRect = menuItem.getBoundingClientRect();
            const submenuWidth = submenu.offsetWidth;
            const submenuHeight = submenu.offsetHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
        
            let leftPos = menuRect.width;
            let topPos = 0;
            
            if (menuRect.right + submenuWidth > viewportWidth) {
                leftPos = -submenuWidth;
            };
            if (menuRect.bottom + submenuHeight > viewportHeight) {
                topPos = -submenuHeight + menuRect.height + 2;
            };
        
            // Set final position
            submenu.style.left = `${leftPos}px`;
            submenu.style.top = `${topPos}px`;
        };
        

        const contextMenu = document.getElementById("context-menu");
        createMenuItems(ContextMenu.structure, contextMenu);

        const gridViewContainer = document.getElementById("grid-view-container");
        gridViewContainer.addEventListener("contextmenu", function (e) {
            e.preventDefault();
            e.stopPropagation();
            ContextMenu.show(e);
        });
    
        document.addEventListener("click", function (e) {
            if (contextMenu.contains(e.target)) {
                return;
            };

            ContextMenu.hide();
        });

        document.addEventListener("contextmenu", function (e) {
            if (gridViewContainer.contains(e.target) || contextMenu.contains(e.target)) {
                return;
            };
            
            ContextMenu.hide();
        });
    };


    show(e) {
        const contextMenu = document.getElementById("context-menu");
        
        // Enable/disable menu options based on selection state
        const selectionIndices = Session.activePlasmid().getSelectionIndices();
        const selectedFeatureID = Session.activePlasmid().getSelectedFeatureID();
        

        const selectionState = {
            "single": (selectionIndices !== null && selectionIndices.filter(i => i !== null).length === 1 && selectedFeatureID === null) ? true: false,
            "range": (selectionIndices !== null && selectionIndices.filter(i => i !== null).length > 1 && selectedFeatureID === null) ? true: false,
            "feature": (selectedFeatureID !== null) ? true: false,
            "subcloningTarget": (Session.subcloningOriginPlasmidIndex !== null && Session.subcloningOriginSpan !== null) ? true: false,
        };

        
        const menuItems = contextMenu.querySelectorAll(".context-menu-item");
        menuItems.forEach(menuItem => {
            if (!menuItem.hasAttribute("conditions")) {return};

            const conditions = [JSON.parse(menuItem.getAttribute("conditions"))];
            
            const conditionsMet = conditions.every(condition => {
                // If "any" exists, at least one of the conditions must be true
                const anyValid = condition.any ? condition.any.some(key => selectionState[key]) : true;
                // If "all" exists, all of them must be true
                const allValid = condition.all ? condition.all.every(key => selectionState[key]) : true;
                // The condition is valid if both rules are satisfied
                return anyValid && allValid;
            });

            if (conditionsMet) {
                menuItem.removeAttribute("disabled");
            } else {
                menuItem.setAttribute("disabled", "")
            };
        });


        // Position context menu
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const menuWidth = contextMenu.offsetWidth;
        const menuHeight = contextMenu.offsetHeight;

        let posX = e.clientX;
        let posY = e.clientY
        ;
        if (posX + menuWidth > viewportWidth) {
            posX -= menuWidth;
        };
        if (posY + menuHeight > viewportHeight) {
            posY -= menuHeight;
        };

        posX = Math.max(0, posX);
        posY = Math.max(0, posY);

        contextMenu.style.top = `${posY}px`;
        contextMenu.style.left = `${posX}px`;
        contextMenu.setAttribute("visible", "");
    };


    hide() {
        document.getElementById("context-menu").removeAttribute("visible");
    };
}