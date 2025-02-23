const Sidebar = new class {

    /**
     * Update sidebar.
     */
    update() {
        this.updatePrimers();
        this.updateFeaturesTable();
    };

    /**
     * Update the sidebar with the current primers.
     */
    updatePrimers() {
        return;
    };


    /**
     * Update the sidebar with the current features table.
     */
    updateFeaturesTable() {
        Session.activePlasmid().generateFeaturesTable();

        // Update sidebar table
        const featuresTableContainer = document.getElementById("features-table-container");
        const currFeaturesTable = document.getElementById("features-table");
        if (currFeaturesTable) {
            featuresTableContainer.removeChild(currFeaturesTable)
        };
        featuresTableContainer.appendChild(Session.activePlasmid().featuresTable);
    };

    /**
     * Expand collapsible header in features table.
     * 
     * @param {Object} targetHeader - Target header.
     */
    toggleCollapsibleHeader(targetHeader) {
        console.log("Sidebar.toggleCollapsibleHeader", targetHeader)
        const targetContent = targetHeader.nextElementSibling;
    
        // Toggle active class
        targetHeader.classList.toggle("collapsible-header-active");
        
        /**
         * Expand.
         */
        if (targetContent.style.display === "none") {
            // Close all others.
            //FeaturesTable.closeAllCollapsibleHeaders();
            targetContent.style.display = "block";
            targetContent.style.maxHeight = targetContent.scrollHeight + "px"; 
        
            /**
         * Close
         */
        } else {
            targetContent.style.display = "none";
            targetContent.style.maxHeight = null; 
        };
    };

    /**
     * Close all collapsible headers.
     */
    closeAllCollapsibleHeaders() {
        for (const header of document.querySelectorAll(".collapsible-header-active")) {
            header.classList.toggle("collapsible-header-active");
            const content = header.nextElementSibling;
            content.style.display = "none";
            content.style.maxHeight = null; 
        };
    };
};