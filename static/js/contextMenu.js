const ContextMenu = new class {
    constructor() {
        /**
         * Context menu structure
         */
        // TO DO: Show keyboard shortcuts for the actions
        // TO DO: Add menu item to add common features to plasmid or specific selected range
        this.structure = [

            { section: "IVA Cloning Operations", items: [
                {
                    item: "Insert here",
                    conditions: {all: ["single"]},
                    action: () => Modals.createInsertionModal("insertion")
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
                    item: "Insert from linear fragment",
                    conditions:  {any: ["single", "range", "feature"]},
                    action: () => Modals.createInsertFromLinearFragmentModal()
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
            ]},


            { separator: "" },


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


            { separator: "" },


            {
                item: "Copy selection",
                conditions: {any: ["range", "feature"]},
                action: () => Utilities.copySequence()
            },

            { submenu: "Copy special", items: [
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
            ] },


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

        // Initialize context menu
        document.addEventListener("DOMContentLoaded", function () {
            // Store reference
            ContextMenu.contextMenu = document.getElementById("context-menu");
            
            // Init
            ContextMenu._initialize();
            
            // Store references to menu items
            ContextMenu.items = ContextMenu.contextMenu.querySelectorAll(".context-menu-item");
        });
    };


    _initialize() {
        // Go through menu structure recursively and populate the menu with items
        this._createMenuItems(this.structure, this.contextMenu);


        // Add context menu event listener
        const gridViewContainer = document.getElementById("grid-view-container");
        gridViewContainer.addEventListener("contextmenu", function (event) {
            event.preventDefault();
            event.stopPropagation();
            ContextMenu.show(event);
        });
    
        // Hide menu when clicking outside of it
        document.addEventListener("click", function (event) {
            // If click is inside menu, return
            if (ContextMenu.contextMenu.contains(event.target)) return;

            ContextMenu.hide();
        });


        // Hide menu if open a context menu somewhere else
        document.addEventListener("contextmenu", function (event) {
            if (
                gridViewContainer.contains(event.target) // If opening menu inside grid view
                || ContextMenu.contextMenu.contains(event.target) // If attempting to open menu inside menu
            ) {
                return;
            };
            
            ContextMenu.hide();
        });
    };


    /**
     * Recursively populate parent menu element with items following the specified menu structure.
     * 
     * @param {Object} menuStructure - Menu structure detailing how to populate parent element
     * @param {HTMLElement} parent - Parent element to populate with items
     */
    _createMenuItems(menuStructure, parent) {
        menuStructure.forEach(entry => {
            // Section
            if (entry.section) {
                // Create section container
                const sectionContainer = document.createElement("div");
                sectionContainer.classList.add("context-menu-section");
    
                // Create section title
                const sectionTitle = document.createElement("div");
                sectionTitle.classList.add("context-menu-section-title");
                sectionTitle.textContent = entry.section;
                sectionContainer.appendChild(sectionTitle);
    
                // Create section items container
                const sectionItemsContainer = document.createElement("div");
                sectionItemsContainer.classList.add("context-menu-section-items");
    
                // Recursively create menu items inside the section items container
                this._createMenuItems(entry.items, sectionItemsContainer);
                
                sectionContainer.appendChild(sectionItemsContainer);
                parent.appendChild(sectionContainer);

            // Separator
            } else if (entry.separator !== undefined) {
                // Create separator (only if explicitly defined)
                const separator = document.createElement("div");
                separator.classList.add("context-menu-separator");
                parent.appendChild(separator);

            // Menu item
            } else if (entry.item) {
                // Create menu item
                const menuItem = document.createElement("div");
                menuItem.classList.add("context-menu-item");
                menuItem.innerHTML = entry.item;

                menuItem.setAttribute("conditions", JSON.stringify(entry.conditions))

                // Attach click event for regular menu items
                menuItem.addEventListener("click", () => {
                    ContextMenu.hide();
                    entry.action();
                });

                parent.appendChild(menuItem);

            // Submenu
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
                this._createMenuItems(entry.items, submenu);

                // Append submenu to the menu item
                menuItem.appendChild(submenu);
                parent.appendChild(menuItem);

                // Handle dynamic submenu positioning
                menuItem.addEventListener("mouseenter", function () {
                    ContextMenu._positionSubmenu(menuItem, submenu);
                    submenu.setAttribute("visible", "");
                });
                menuItem.addEventListener("mouseleave", function () {
                    submenu.removeAttribute("visible");
                });
            };
        });
    };


    /**
     * Position submenu relative to the menuItem that spawns it.
     * 
     * @param {HTMLElement} menuItem - Reference to menu html element that spawns the submenu
     * @param {HTMLElement} submenu - Reference to the submenu element that is to be positioned
     */
    _positionSubmenu(menuItem, submenu) {
        // Get dimensions
        const menuRect = menuItem.getBoundingClientRect();
        const submenuWidth = submenu.offsetWidth;
        const submenuHeight = submenu.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
    
        // Initial coordinates
        let leftPos = menuRect.width;
        let topPos = 0;
        
        // If the submenu would be outside of viewport, position it on the other side
        if (menuRect.right + submenuWidth > viewportWidth) {
            leftPos = -submenuWidth;
        };
        if (menuRect.bottom + submenuHeight > viewportHeight) {
            topPos = -submenuHeight + menuRect.height + 2;
        };
    
        // Set positions
        submenu.style.left = `${leftPos}px`;
        submenu.style.top = `${topPos}px`;
    };


    /**
     * Show the context menu.
     * 
     * @param {MouseEvent} event - Event triggering context menu
     */
    show(event) {
        this._checkMenuItemsConditions();
        this._position(event.clientX, event.clientY);
    };


    /**
     * Enable/disable menu items based on current selection.
     */
    _checkMenuItemsConditions() {
        // Find out what type of selection was made
        const activePlasmid = Session.activePlasmid();
        const selectionState = {
            "single": activePlasmid.selectionIsSingle(),
            "range": activePlasmid.selectionIsRange(),
            "feature": activePlasmid.getSelectedFeatureID() !== null,
            "subcloningTarget": Session.isSubcloningRegionMarked(),
        };

        
        // Iterate over menu items and check if the conditions for the
        // item to be active are met
        this.items.forEach(item => {
            // Assert that item has defined conditions
            if (!item.hasAttribute("conditions")) return;

            // Parse conditions
            const conditions = [JSON.parse(item.getAttribute("conditions"))];
            
            // Iterate over conditions
            const conditionsMet = conditions.every(condition => {
                // If "any" exists, at least one of the conditions must be true
                const anyValid = condition.any ? condition.any.some(key => selectionState[key]) : true;
                
                // If "all" exists, all of them must be true
                const allValid = condition.all ? condition.all.every(key => selectionState[key]) : true;
                
                // The condition is valid if both rules are satisfied
                return anyValid && allValid;
            });


            // Enable/disable menu item
            if (conditionsMet) {
                item.removeAttribute("disabled");
            } else {
                item.setAttribute("disabled", "")
            };
        });
    };


    /**
     * Position the context menu at the specified coordinates.
     * 
     * @param {Number} posX - X position of mouse
     * @param {Number} posY - Y position of mouse
     */
    _position(posX, posY) {
        // Position context menu
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Get menu size
        const menuWidth = this.contextMenu.offsetWidth;
        const menuHeight = this.contextMenu.offsetHeight;


        // If the menu would be off the screen, position it on
        // the other side
        if (posX + menuWidth > viewportWidth) {
            posX -= menuWidth;
        };
        if (posY + menuHeight > viewportHeight) {
            posY -= menuHeight;
        };

        // Clamp
        posX = Math.max(0, posX);
        posY = Math.max(0, posY);

        // Set position and make it visible
        this.contextMenu.style.top = `${posY}px`;
        this.contextMenu.style.left = `${posX}px`;
        this.contextMenu.setAttribute("visible", "");
    };


    /**
     * Hide the context menu
     */
    hide() { this.contextMenu.removeAttribute("visible") };

};