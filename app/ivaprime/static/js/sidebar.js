const Sidebar = new class {

    /**
     * Update sidebar.
     */
    update() {
        this.updatePrimersTable();
        this.updateFeaturesTable();
    };

    /**
     * Update the sidebar with the current primers.
     */
    updatePrimersTable() {
        const primersSets = Session.activePlasmid().primers;
        console.log(`Sidebar.updatePrimersTable -> primers=\n${JSON.stringify(primersSets, null, 2)}`);

        const primersTable = document.createElement("DIV");
        primersTable.id = "primers-table";
        primersTable.classList.add("primers-table");

        let primersSetCounter = 1;
        primersSets.forEach(primersSet => {
            const primersSetContainer = document.createElement("DIV");
            primersSetContainer.classList.add("primers-set");
            primersTable.appendChild(primersSetContainer);

            const setTitle = document.createElement("DIV");
            setTitle.innerHTML = `<span>${primersSetCounter}.</span> <span>${primersSet["title"]}</span>`;
            setTitle.classList.add("primers-set-title");
            primersSetContainer.appendChild(setTitle);

            const hrInfo = document.createElement("DIV");
            hrInfo.innerHTML = "<span>HR Info</span>";
            primersSetContainer.appendChild(hrInfo);

            const primersContainer = document.createElement("DIV");
            primersSetContainer.appendChild(primersContainer);

            primersSet["primers"].forEach(primer => {
                const primerContainer = document.createElement("DIV");
                primersContainer.appendChild(primerContainer);

                const primerTitle = document.createElement("DIV");
                primerTitle.innerText = primer["name"]
                primerContainer.appendChild(primerTitle);

                const primerSequence = document.createElement("DIV");
                primersContainer.appendChild(primerSequence);

                let totalPrimerLength = 0;
                primer["regions"].forEach(region => {
                    const regionSequence = document.createElement("span");
                    regionSequence.classList.add("primer-sequence");
                    regionSequence.classList.add(region["class"]);
                    regionSequence.innerText = region["sequence"];
                    primerSequence.appendChild(regionSequence);

                    totalPrimerLength += region["sequence"].length;
                });

                const primerInfo = document.createElement("DIV");
                const TBRSequence = primer["regions"][primer["regions"].length - 1]["sequence"];
                primerInfo.innerHTML = `
                <div>
                    <span>TBR</span> ${TBRSequence.length} nt (${Nucleotides.getMeltingTemperature(TBRSequence).toFixed(2)} °C)
                </div>
                <div>
                    <span>Total</span> ${totalPrimerLength} nt
                </div>
                `;
                primersContainer.appendChild(primerInfo);
                

                
            });
            primersSetCounter++;
        });

        // Update sidebar table
        const primersTableContainer = document.getElementById("primers-table-container");
        const prevPrimersTable = document.getElementById("primers-table");
        if (prevPrimersTable) {
            primersTableContainer.removeChild(prevPrimersTable)
        };
        primersTableContainer.appendChild(primersTable);

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