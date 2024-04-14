/**
 * Display the primers for the operation in the sidebar
 * 
 * @param {string} primersType - "Insertion", "Deletion", "Subcloning with Insertion" etc
 * @param {Object.<string, Object>} primersDict - Dictionary containing all primer info
 * 
 * @returns {void} 
 */
function displayPrimers(operationType, primersList) {
    console.log("displayPrimers", operationType, primersList)
    
    // Select sidebar element
    const sidebarContentDiv = document.querySelector('.sidebar-content');

    // Change sidebar headline if it still has the default text
    let element = document.getElementById("primers-div-headline");
    if (element.textContent === "Primers will appear here.") {
        element.textContent = "Primers:";
    };

    /**
     * Operation main div
     */
    const modDiv = document.createElement("div");
    modDiv.id = "mod-div"

    /**
     * Opearation headline
     */
    const operationHeadline = document.createElement('h3');
    operationHeadline.id = 'primers-type';
    operationHeadline.setAttribute("primers-type", operationType.toLowerCase());
    operationHeadline.classList.add("editable");
    enableElementEditing(operationHeadline, 1);
    operationHeadline.setAttribute("edited", false);
    operationHeadline.textContent = Project.activePlasmid().operationNr + '. ' + operationType;
    Project.activePlasmid().operationNr = parseInt(Project.activePlasmid().operationNr) + 1;
    modDiv.appendChild(operationHeadline);

    /**
     * Homologous region info
     */
    const homologousRegionInfo = document.createElement("div");
    homologousRegionInfo.ind = "homologous-region-info"
    if (primersList.length === 2) {
        let fullSequence = "";
        for (let i = 0; i < primersList[0]["primerRegions"].length; i++) {
            if (primersList[0]["primerRegions"][i] !== null) {
                fullSequence += primersList[0]["primerRegions"][i][0];
            };
        };
        const overlappingSequence = fullSequence.slice(0, primersList[0]["homologousRegionLengths"]);
        const overlappingSequenceTm = getMeltingTemperature(overlappingSequence, "oligoCalc");
        console.log("displayPrimers", overlappingSequence, overlappingSequenceTm)
        homologousRegionInfo.innerHTML = `
            <p class="homologous-region-info" onmouseover="highlightHomologousRegion(this, [0, 1])" onmouseout="highlightHomologousRegion(this, [0, 1])">Homologous region: <span id="operation-info-homo-length">${overlappingSequence.length}</span> bp, <span id="operation-info-homo-tm">${overlappingSequenceTm.toFixed(2)}</span> C</p>
        `;
    } else if (primersList.length === 4) {
        let fullSequences = [];
        for (i in [0, 2]) {
            let fullSequence = "";
            for (let j = 0; j < primersList[i]["primerRegions"].length; j++) {
                if (primersList[i]["primerRegions"][j] !== null) {
                    fullSequence += primersList[i]["primerRegions"][j][0];
                };
            };
            fullSequences.push(fullSequence);
        };
        const overlappingSequences = [
            fullSequences[0].slice(0, primersList[0]["homologousRegionLengths"]),
            fullSequences[1].slice(0, primersList[2]["homologousRegionLengths"])
        ];
        const overlappingSequencesTm = [
            getMeltingTemperature(overlappingSequences[0], "oligoCalc"),
            getMeltingTemperature(overlappingSequences[1], "oligoCalc")
        ];

        homologousRegionInfo.innerHTML = `
            <p class="homologous-region-info" onmouseover="highlightHomologousRegion(this, [0, 3])" onmouseout="highlightHomologousRegion(this, [0, 3])">5' Homologous region: <span>${overlappingSequences[0].length}</span> bp, <span id="operation-info-homo-tm">${overlappingSequencesTm[0].toFixed(2)}</span> C</p>
            <p class="homologous-region-info" onmouseover="highlightHomologousRegion(this, [1, 2])" onmouseout="highlightHomologousRegion(this, [1, 2])">3' Homologous region: <span>${overlappingSequences[1].length}</span> bp, <span id="operation-info-homo-tm">${overlappingSequencesTm[1].toFixed(2)}</span> C</p>
        `;
    };
    modDiv.appendChild(homologousRegionInfo);


    // Iterate over each primer in the primerDict
    for (const primerDict of primersList) {
        /**
         * Primer main div
         */
        const primerDiv = document.createElement("div");
        primerDiv.id = "primer-div";
        const primerDirection = primerDict["primerName"].toLowerCase().includes("forward") ? "fwd": "rev";
        primerDiv.setAttribute("direction", primerDirection);

        /**
         * Primer name
         */
        const primerHeader = document.createElement('h4');
        primerHeader.textContent = primerDict["primerName"] + ":";
        primerHeader.classList.add("editable")
        primerHeader.setAttribute("edited", false);
        primerHeader.id = "primer-id";
        enableElementEditing(primerHeader, 1)
        primerDiv.appendChild(primerHeader);

        /**
         * Primer sequence
         */
        const primerSequence = document.createElement('p');
        primerSequence.classList.add("primer-sequence")
        primerSequence.id = 'primer-sequence';

        const homologousRegionSpan = document.createElement('span');
        homologousRegionSpan.id = "homologous-region";
        homologousRegionSpan.classList.add((primersList.length === 2) ? "homologous-region-orange": "homologous-region-cyan");
        const remainingSpan = document.createElement('span');
        // Add spans for each region in the primer sequence
        let fullPrimerSequence = "";
        let remainingHRLength = primerDict["homologousRegionLengths"];
        const primerRegionTypes = ["homo", "ins", "tbr"];
        for (let j = 0; j < primerDict["primerRegions"].length; j++) {
            const primerRegion = primerDict["primerRegions"][j]
            if (primerRegion !== null) {
                if (primerRegion[0] !== "") {
                    const regionSequence = primerRegion[0];
                    const regionColorClass = primerRegion[1];
    
                    const regionSpan = document.createElement('span');
                    fullPrimerSequence += primerRegion[0];
                    regionSpan.classList.add("primer-span")
                    regionSpan.classList.add(regionColorClass);
                    regionSpan.setAttribute("primer-span-type", primerRegionTypes[j]);

                    const tempElement = document.createElement('div');
                    tempElement.classList.add(regionColorClass);
                    document.body.appendChild(tempElement);
                    const regionColor = window.getComputedStyle(tempElement).getPropertyValue('background-color');
                    document.body.removeChild(tempElement);
                    console.log("regionCOlor", regionColor)
                    regionSpan.setAttribute("onmouseover", `primerRegionHover("${regionSequence}", "${primerDirection}", "${regionColor}")`);
                    regionSpan.setAttribute("onmouseout", "removePrimerRegionHighlight()");

        
                    console.log("displayPrimers", regionSequence.length, remainingHRLength)
                    if (regionSequence.length <= remainingHRLength) {
                        // If homologous region not spent, add the full length to the homologous span
                        regionSpan.textContent = regionSequence;
                        homologousRegionSpan.appendChild(regionSpan);
                        remainingHRLength -= regionSequence.length;
                    } else {
                        const homologousSequenceLength = remainingHRLength - regionSequence.length;
                        console.log("displayPrimers", [0, homologousSequenceLength], [homologousSequenceLength])
                        
                        // Only part of the sequence is in the homologous region, split it
                        regionSpan.textContent = regionSequence.slice(0, homologousSequenceLength);
                        console.log("displayPrimers", regionSpan.textContent)

                        homologousRegionSpan.appendChild(regionSpan);
    
                        const regionSpan2 = document.createElement('span');
                        regionSpan2.textContent = regionSequence.slice(homologousSequenceLength);
                        console.log("displayPrimers", regionSpan2.textContent)
                        regionSpan2.classList.add("primer-span");
                        regionSpan2.classList.add(regionColorClass);
                        regionSpan2.setAttribute("primer-span-type", primerRegionTypes[j]);
                        regionSpan2.setAttribute("onmouseover", `primerRegionHover("${regionSequence}", "${primerDirection}", "${regionColor}")`);
                        regionSpan2.setAttribute("onmouseout", "removePrimerRegionHighlight()");
                        remainingSpan.appendChild(regionSpan2);
    
                        remainingHRLength -= regionSequence.length;
                    };
                };
            };
        };
        primerSequence.appendChild(homologousRegionSpan);
        primerSequence.appendChild(remainingSpan);

        

        /**
         * Copy primer sequence button
         */
        const copyPrimerSequenceButton = document.createElement("a");
        copyPrimerSequenceButton.href = "#";
        copyPrimerSequenceButton.setAttribute("onClick", "copyPrimerSequenceToClipboard(this)");
        copyPrimerSequenceButton.classList.add("copy-primer-btn");
        copyPrimerSequenceButton.style.backgroundImage = "url('/static/assets/icons/copy_icon.svg')";
        primerSequence.appendChild(copyPrimerSequenceButton);

        /**
         * Template binding region and total primer info
         */
        const tbrSequence = primerDict["primerRegions"].pop()[0];
        const tbrTM = getMeltingTemperature(tbrSequence, meltingTempAlgorithmChoice).toFixed(2);
        console.log("displayPrimers", tbrSequence, tbrTM);
        const primerInfo = document.createElement('div');
        primerInfo.innerHTML = `
            <p>TBR: <span id="primer-info-tbr-length">${tbrSequence.length}</span> bp, <span id="primer-info-tbr-tm">${tbrTM}</span> C</p>
            <p>Total: <span id="primer-info-total-length">${fullPrimerSequence.length}</span> bp</p>
        `;
        primerInfo.classList.add("primer-info");

        // Append divs
        primerDiv.appendChild(primerSequence);
        primerDiv.appendChild(primerInfo);
        modDiv.append(primerDiv);
    };

    // Append new div to sidebar
    sidebarContentDiv.appendChild(modDiv);
    // Update the primers
    Project.activePlasmid().savePrimers();
    // Add hover effects to the different regions in the primer sequences
    // TO DO: Maybe add a click effect that takes you to that position
    
    // Reset selection
    Project.activePlasmid().selectedText = "";
    clearSelection(Project.activePlasmidIndex, true)
};


/**
 * Converts the primers from the sidebar html element into a 2d array.
 * 
 * @param {number} plasmidIndex - Index of the target plasmid
 * @param {boolean} includeColumnNames - Specify wether to include column names in the first row
 * @returns {Array<Array<any>>} - 2d array of primer id/name and primer sequence
 */
function getPrimersAsTable(plasmidIndex, includeColumnNames=false) {
    // Create dummy html element and save the target plasmid's primers to it
    const sidebarDiv = document.createElement("div");
    sidebarDiv.innerHTML = Project.getPlasmid(plasmidIndex).primers;
    
    // Select all mod divs in the dummy element
    const modDivs = sidebarDiv.querySelectorAll('#mod-div');

    // Iterate over primers and add them to the 2d array
    let tableData = [];
    if (includeColumnNames === true) {tableData.push(["Primer Name", "Primer Sequence"])};
    for (var i = 0; i < modDivs.length; i++) {
        // Get current mod div info
        const currentDiv = modDivs[i];
        const h3Div = currentDiv.querySelector("#primers-type");
        const modType = h3Div.getAttribute("primers-type").replace(" ", "_");
        const primerDivs = currentDiv.querySelectorAll("#primer-div");
        
        // Iterate over primers in current div and add the name and sequence
        for (var j = 0; j < primerDivs.length; j++) {
            // Current primer and info
            const currPrimerDiv = primerDivs[j]
            const primerIdDiv = currPrimerDiv.querySelector("#primer-id");
            const primerDirection = currPrimerDiv.getAttribute("direction");
            let primerId = ""

            // Check if the name was edited by the user to decide if default nomenclature should be used
            const h3Edited = currentDiv.querySelector("#primers-type").getAttribute("edited");
            const modIndex = (h3Edited === true) ? "": currentDiv.innerText.split(" ")[0].replace(".", "");
            const idEdited = primerIdDiv.getAttribute("edited");
            const subcloningVectorSuffix = (primerIdDiv.innerText.toLowerCase().includes("vector")) ? "_vec": "";
            if (idEdited === "true") {
                // id edited -> use individual ids
                primerId = primerIdDiv.innerText;
            } else if (h3Edited === "true") {
                // h3 edited but not id -> generate id from use-defined h3
                primerId = h3Div.innerText + subcloningVectorSuffix + "_" + primerDirection;
            } else {
                // Not edited -> default naming
                primerId = modType + modIndex + subcloningVectorSuffix + "_" + primerDirection;
            };

            // Append primer id and sequence to table
            const primerSeq = currPrimerDiv.querySelector("#primer-sequence").innerText;
            tableData.push([primerId, primerSeq])
        };
    };

    return tableData;
};


/**
 * Compile primers from the sidebar into different formats and download the file
 */
// TO DO: Pass fileName and html content instead of setting them inside the the functions
const exportPrimersDict = {
    /**
     * Export to plain text file
     * 
     * @param {string} fileName - Name of plasmid file without extension
     * @param {number} plasmidIndex - Index of target plasmid
     * @param {string} primersHTML - Inner HTML of primers
     */
    txt : (fileName, plasmidIndex, primersHTML) => {
        // Get file name and primers from the html element
        const containerDiv = document.createElement("div");
        containerDiv.innerHTML = primersHTML;

        // Iterate over children of the html element and populate the string to be saved to txt
        let textContent = "";
        let firstLine = true;
        for (const childDiv of containerDiv.children) {
            // Add new line separator between operations
            if (firstLine === false) {textContent += "\n"}

            // Iterate over primer sets
            if (childDiv.id === "mod-div") {
                // Iterate over html elements
                for (const subDiv of childDiv.children) {
                    if (subDiv.id === "primers-type") {
                        // Add operation headline
                        textContent += subDiv.innerText + "\n";
                    } else if (subDiv.id === "primer-div") {
                        // Add primer sequence and primer info

                        // Save current element to dummy div
                        const tempDiv = document.createElement("div");
                        tempDiv.innerHTML = subDiv.innerHTML;
                        // Combine text contents of dummy div into a list
                        let tempList = []
                        for (const subsubDiv of tempDiv.children) {
                            tempList.push(subsubDiv.innerText);
                        };
                        
                        // [primer name]: [primer sequence]
                        textContent += `${tempList[0]} ${tempList[1]}\n`;
                        // Primer info
                        textContent += `${tempList.slice(2, tempList.length).join("").split(";").map((item) => item.trim()).join("; ")}\n\n`;
                    };
                };
            };

            firstLine = false;
        };

        // Create blob and download it
        downloadBlob(new Blob([textContent], { type: 'text/plain' }), fileName + ".txt");
    },
    /**
     * Export to Microsoft Word file
     * 
     * @param {string} fileName - Name of plasmid file without extension
     * @param {number} plasmidIndex - Index of target plasmid
     * @param {string} primersHTML - Inner HTML of primers
     */
    doc : (fileName, plasmidIndex, primersHTML) => {
        // Get file name and primers from the html element
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = primersHTML;
        document.body.appendChild(tempContainer);

        function iterate(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tempElement = document.createElement(node.tagName);
                node.classList.forEach(className => {
                    tempElement.classList.add(className)
                });
                document.body.appendChild(tempElement);
                const styles = window.getComputedStyle(tempElement);
                for (let key in styles) {
                    if (["color", "background-color", "font-weight", "font-family"].includes(key)){
                        let prop = key.replace(/\-([a-z])/g, v => v[1].toUpperCase());
                        node.style[prop] = styles[key];
                    };
                };
                document.body.removeChild(tempElement);

                node.childNodes.forEach(iterate);
            };
        };
        iterate(tempContainer);
        
        // Create blob using html-docx.js and download it
        const blob = window.htmlDocx.asBlob(tempContainer.innerHTML);
        document.body.removeChild(tempContainer);
        downloadBlob(blob, fileName + ".docx");
    },
    /**
     * Export to csv file
     * 
     * @param {string} fileName - Name of plasmid file without extension
     * @param {number} plasmidIndex - Index of target plasmid
     * @param {string} primersHTML - Inner HTML of primers
     */
    csv : (fileName, plasmidIndex, primersHTML) => {
        // Get file name and primers from the html element as 2d array
        const tableData = getPrimersAsTable(plasmidIndex, includeColumnNames=true);

        // Convert 2d array to 1d
        let csvLines = tableData.map(function(row) {
            return row.map(function(cell) {
                return '"' + String(cell).replace(/"/g, '""') + '"';
            }).join(',');
        });
        // 1d array to string
        const textContent = csvLines.join('\n');

        // Create blob and download it
        downloadBlob(new Blob([textContent], { type: 'text/plain' }), fileName + ".csv");
    },
    /**
     * Export to Excel file
     * 
     * @param {string} fileName - Name of plasmid file without extension
     * @param {number} plasmidIndex - Index of target plasmid
     * @param {string} primersHTML - Inner HTML of primers
     */
    xlsx: (fileName, plasmidIndex, primersHTML) => {
        addLoadingCursor();
        // Get file name and primers from the html element as 2d array
        const tableData = getPrimersAsTable(plasmidIndex, includeColumnNames=true);

        // Create excel file using xlsx-populate
        XlsxPopulate.fromBlankAsync()
        .then((workbook) => {
            // Iterate over primers and add the entries to the sheet
            for (let i = 0; i < tableData.length; i++) {
                const currentRow = tableData[i]
                for (let j = 0; j < currentRow.length; j++) {
                    const targetCell = numberToColumn(j + 1) + (i + 1);
                    workbook.sheet(0).cell(targetCell).value(currentRow[j]);
                };
            };

            // Return blob
            return workbook.outputAsync();
        })
        .then((blob) => {
            // Create blob using html-docx.js and download it
            downloadBlob(blob, fileName);
            removeLoadingCursor();
        })
    },
    /**
     * Export to Microsynth order form
     * 
     * @param {string} fileName - Name of plasmid file without extension
     * @param {number} plasmidIndex - Index of target plasmid
     * @param {string} primersHTML - Inner HTML of primers
     */
    microsynth: (fileName, plasmidIndex, primersHTML) => {
        addLoadingCursor();
        // Get file name and primers from the html element as 2d array
        const tableData = getPrimersAsTable(plasmidIndex, includeColumnNames = false);
        
        // Create a list of rows to append to the microsynth form
        let primerList = [];
        for (i = 0; i < tableData.length; i++) {
            const primerId = tableData[i][0];
            const primerSeq = tableData[i][1];
            /**
             * Row to push
             * Columns:
             *  A. DNA Oligo Name -> primer id
             *  B. DNA Sequence (5' -> 3') -> primer sequence
             *  C. Length -> sequence length
             *  D. DNA Purification -> "DES"
             *  E. DNA Scale -> "GEN" for 60 bp or less, otherwise "0.04"
             *  F. 5' Modification -> _
             *  G. Inner Modification (5) -> _
             *  H. Inner Modification (6) -> _
             *  I. Inner Modification (7) -> _
             *  J. Inner Modification (8) -> _
             *  K. 3' Modification -> _
             *  L. Physical Condition -> "Dried"
             *  M. Datasheet -> "Standard"
             *  N. Aliquots -> "No"
             */
            primerList.push(
                [
                    primerId,
                    primerSeq,
                    null,
                    "DES",
                    (primerSeq.length <= 60) ? "GEN": 0.04,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    "Dried",
                    "Standard",
                    "No"
                ]
            );
        };

        // Fetch default file and modify using xlsx-populate
        fetch("/static/MicrosynthUploadFormDNA.xlsx")
        .then((result) => result.arrayBuffer())
        .then((arrayBuffer) => {
            return XlsxPopulate.fromDataAsync(arrayBuffer);
        })
        .then((workbook) => {
            // Iterate over primers and add the entries to the sheet
            for (let i = 0; i < primerList.length; i++) {
                const currentRow = primerList[i]
                for (let j = 0; j < currentRow.length; j++) {
                    if (currentRow[j] !== null) {
                        const targetCell = numberToColumn(j + 1) + (i + 2);
                        workbook.sheet(1).cell(targetCell).value(currentRow[j]);
                    };
                };
            };

            // Return blob
            return workbook.outputAsync();
        })
        .then((blob) => {
            // Create blob using html-docx.js and download it
            downloadBlob(blob, fileName + " microsynth order form");
            removeLoadingCursor();
        })
    } 
};


/**
 * Create a temporary link to download blob
 * 
 * @param {Blob} blob 
 * @param {string} outputFileName 
 */
function downloadBlob(blob, outputFileName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = outputFileName;
    link.click();
};


/**
 * Converts integer to spreadsheet style column index
 * 1 -> A
 * 2 -> B
 * 27 -> AA etc
 * 
 * @param {number} index 
 * @returns {string}
 */
function numberToColumn(index) {
    let columnIndex = '';
    while (index > 0) {
        let remainder = (index - 1) % 26;
        columnIndex = String.fromCharCode(65 + remainder) + columnIndex;
        index = Math.floor((index - remainder) / 26);
    };
    return columnIndex;
};



/**
 * Highlights span corresponding to the homologous region
 * 
 * @param {Element} source - DOM element that triggered the event
 * @param {Array<number>} indices - List of indices that specify which primers to be affected
 */
function highlightHomologousRegion(source, indices) {
    const targets = source.parentElement.parentElement.querySelectorAll("#homologous-region");
    for (let i = 0; i < targets.length; i++)  {
        if (indices.includes(i)) {
            targets[i].classList.toggle("homologous-region-hover");
        };
    };
};


/**
 * Highlights where the primer sequence is in the plasmid sequence.
 * 
 * @param {string} primerRegionSequence - Sequence to be searched
 * @param {string} direction - Direction of sequence "fwd"|"rev"
 * @param {string} backgroundColor - Color to be applied to search results
 */
function primerRegionHover(primerRegionSequence="", direction="fwd", backgroundColor="white") {
    if (primerRegionSequence.length > 0) {
        // Grid structure and sequence of currently opened plasmid
        const currPlasmid = Project.activePlasmid();
        const currSequence = (direction === "fwd") ? currPlasmid.sequence: currPlasmid.complementarySequence;
    
        // Reverse sequence if direction is reverse
        const searchQuery = (direction === "fwd") ? primerRegionSequence: primerRegionSequence.split('').reverse().join('');
        // Strand 0 for forward, 1 for reverse
        const targetStrand = (direction === "fwd") ? 0: 1;
        highlightOccurences(
            targetStrand,
            currSequence,
            searchQuery,
            null,
            backgroundColor
        );
    };
};


/**
 * Remove background color from highlighted cells
 */
// TO DO: Change the function to not iterate over every single cell, make dedicated classes and search for those instead
function removePrimerRegionHighlight() {
    // Select currently displayed table
    const targetTable = document.getElementById("sequence-grid-" + Project.activePlasmidIndex);
    
    // Iterate over all cells in the table and remove element styles
    for (let i = 0; i < targetTable.rows.length; i++) {
        for (let j = 0; j < targetTable.rows[i].cells.length; j++) {
            const cell = targetTable.rows[i].cells[j];
            if (cell.id !== "Annotations") {
                cell.removeAttribute("style");
            };
        };
    };
};


/**
 * Extends the primer from the starting position in the specified direction on the specified strand
 * 
 * Example:
 *                                     startingPos  
 *                                         |
 *                          <--- backward  ▼  forward  --->
 * fwdStrand  -> 5'-GGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATAT-3'
 * compStrand -> 3'-ATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCC-5'
 *                          <--- forward   ▲  backward --->
 * 
 * 
 * Backward extension on fwdStrand, ATG as the initialSequence:
 *                                     startingPos  
 *                                         |
 *                                         ▼  
 * fwdStrand  -> 5'-GGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATAT3'
 *                           <----------
 *                           TTTATATATGGATG
 *                           ▲
 *                           |
 *                           Melting temperature exceeds targetTm here.
 * 
 *
 * @param {string} plasmidSequence - sequence of the plasmid
 * @param {number} startingPos - initial position from where to start extending the sequence
 * @param {number} targetStrand - strand onto which "fwdStrand"/"revStrand"
 * @param {string} direction - extension direction "forward"/"backward"
 * @param {number} targetTm - melting temperature that should be reached
 * @param {string} method - melting temperature algorithm
 * @param {number} minLength - minimum length of the sequence
 * @param {string} initialSequence - starting sequence for the primer
 * @returns {string} - output sequence
 */
function primerExtension(plasmidSequence, startingPos, targetStrand, direction, targetTm, method, minLength, initialSequence="") {
    // Set working strand sequence
    const currStrand = (targetStrand === 'fwdStrand') ? plasmidSequence : getComplementaryStrand(plasmidSequence).split("").reverse().join("");
    // Set working start index
    const startIndex = (targetStrand === 'fwdStrand') ? startingPos - 1: currStrand.length - startingPos + 1; // Convert sequence index to string index
    

    // Initial extension length minus the initial sequence
    let extensionLength = minLength - initialSequence.length;
    // Initial primer sequence, initial sequence + initial extension
    let prevPrimerSequence =  (direction === "forward") ? initialSequence + repeatingSlice(currStrand, startIndex, startIndex + extensionLength - 1): repeatingSlice(currStrand, startIndex - extensionLength + 1, startIndex) + initialSequence;
    // Initial melting temperature
    let prevTM = getMeltingTemperature(prevPrimerSequence, method);
    
    // Extend primer until target melting temperature is reached, or the maximum amount of iterations is reached
    const maxIter = 100;
    let i = 0;
    // Current primer sequence and melting temperature
    let primerSequence = prevPrimerSequence;
    let currTM = prevTM;
    while (i < maxIter) {
        /** If the melting temperature of the current primer exceeds the target temperature, break the loop 
         * and return either the current primer or the previous one, whichever is closest to the target temperature*/ 
        if (currTM >= targetTm && primerSequence.length >= minLength) {
            if (Math.abs(currTM - targetTm) <= Math.abs(prevTM - targetTm)) {
                return primerSequence;
            } else {
                return prevPrimerSequence;
            };
        } else {
            // Save current sequence and tm, then recalculate current seq and tm
            prevPrimerSequence = primerSequence;
            prevTM = currTM;
            extensionLength += 1;
            primerSequence = (direction === "forward") ? initialSequence + repeatingSlice(currStrand, startIndex, startIndex + extensionLength - 1): repeatingSlice(currStrand, startIndex - extensionLength + 1, startIndex) + initialSequence;
            currTM = getMeltingTemperature(primerSequence, method);
            i++;
        };
    };
};


/**
 * Select a random codon using the given weights
 * 
 * @param {Object.<number, string>>} frequenciesDict - Frequency data 
 * @returns {string} - Randomly selected codon
 */
function weightedCodonRandomSelect(frequenciesDict) {
    // Convert dict to array
    const possibilityArray = Object.entries(frequenciesDict).map(([value, weight]) => ({ weight: parseFloat(weight), value }));
    // Calculate sum of weights
    const totalWeight = possibilityArray.reduce((acc, possibility) => acc + possibility.weight, 0);
    
    // Generate random number between 0 and total weight
    const randomNumber = Math.random() * totalWeight;
    
    // Return codon
    let cumulativeWeight = 0;
    for (const possibility of possibilityArray) {
        cumulativeWeight += possibility.weight;
        if (randomNumber <= cumulativeWeight) {
            return possibility.value;
        };
    };
};


/**
 * Amino acid to codon map.
 */
const aaToCodon = {
    "A": ['GCT', 'GCC', 'GCA', 'GCG'],
    "R": ['CGT', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'],
    "N": ['AAT', 'AAC'],
    "D": ['GAT', 'GAC'],
    "C": ['TGT', 'TGC'],
    "E": ['GAA', 'GAG'],
    "Q": ['CAA', 'CAG'],
    "G": ['GGT', 'GGC', 'GGA', 'GGG'],
    "H": ['CAT', 'CAC'],
    "I": ['ATT', 'ATC', 'ATA'],
    "L": ['TTA', 'TTG', 'CTT', 'CTC', 'CTA', 'CTG'],
    "K": ['AAA', 'AAG'],
    "M": ['ATG'],
    "F": ['TTT', 'TTC'],
    "P": ['CCT', 'CCC', 'CCA', 'CCG'],
    "S": ['TCT', 'TCC', 'TCA', 'TCG', 'AGT', 'AGC'],
    "T": ['ACT', 'ACC', 'ACA', 'ACG'],
    "W": ['TGG'],
    "Y": ['TAT', 'TAC'],
    "V": ['GTT', 'GTC', 'GTA', 'GTG'],
    "*": ['TAA', 'TAG', 'TGA']
};


/**
 * Load codon weight tables.
 * Codon frequency tables from CoCoPUTs (Alexaki et al. 2019, https://doi.org/10.1016/j.jmb.2019.04.021).
 */
let codonWeights;
/**
 * Populate aa optimisation dropdown menu with all organism choices
 */
function populateOrganismDropdown() {
    const organismsList = Object.keys(codonWeights);
    const select = document.getElementById('targetOrganismSelector'); 
    for (let i = 0; i < organismsList.length; i++) {
      let newOption = new Option(organismsList[i],organismsList[i]);
      if (organismsList[i] === preferredOrganism) {
        newOption.setAttribute('selected','selected');
      };
      select.add(newOption,undefined);
    };
  };
function loadCodonWeights() {
    fetch('static/codonWeights.json')
    .then(response => response.json())
    .then(json => {
        codonWeights = json;
        populateOrganismDropdown();
    });
};
document.addEventListener('DOMContentLoaded', loadCodonWeights);


/**
 * Optimise amino acid sequence using codon frequency tables for the specified organism
 * 
 * @param {string} inputAA - Amino acid sequence to optimise
 * @param {string} targetOrganism - Organism for which the codons should be optimised
 * @returns {string} - Optimised DNA sequence
 */
function optimizeAA(inputAA, targetOrganism) {
    // Update last selected organism
    preferredOrganism = targetOrganism;
    saveUserPreference("preferredOrganism", targetOrganism);
    updateOrganismSelectorDefault();

    // Get codon frequency table for specified organism
    let organismCodonTable = codonWeights[targetOrganism];
    
    // Iterate over the amino acid sequence and append the randomly selected
    let outputSequence = "";
    for (let i = 0; i < inputAA.length; i++) {
        outputSequence += weightedCodonRandomSelect(organismCodonTable[inputAA[i]])
    };

    return outputSequence;
};


/**
 * Creates primer sequences in the given plasmid sequence.
 * 
 * DNA or AA sequences can be specified. AA sequence will be optimised to specified target organism.
 * If no AA sequence is provided, the DNA sequence will be used.
 * 
 * The resulting DNA sequence will be inserted between pos1 and pos2. If no DNA sequence is
 * provided, the resulting primers will delete whatever is between pos1 and pos2.
 * 
 * @param {string} plasmidSequence - Sequence of the plasmid
 * @param {string} dnaToInsert - User specified DNA sequence, used if no AA sequence specified
 * @param {string} aaToInsert - User specified AA sequence
 * @param {string} targetOrganism - Organism for AA sequence optimisation
 * @param {number} pos1 - Operation index 1
 * @param {number} pos2 - Operation index 2
 * @param {string} operationType - IVA operation type ("Insetion", "Deletion", etc)
 * @returns {[string, Object, string, number, number]}
 */
function generatePrimerSequences(plasmidSequence, dnaToInsert, aaToInsert, targetOrganism, pos1, pos2, operationType) {
    console.log("generatePrimerSequences", operationType, pos1, pos2, dnaToInsert, aaToInsert, targetOrganism,)
    /**
     * Set primer colors
     */
    let bgClassIns = "primer-span-red";
    let bgClassHomo = "primer-span-orange";
    let bgClassTBR = "primer-span-green";
    if (operationType === "Subcloning") {
        bgClassHomo = "primer-span-cyan";
        bgClassTBR = "primer-span-purple";
    };
    
    // Get start and end indices
    const operationStartPos = Math.min(pos1, pos2)
    const operationEndPos = Math.max(pos1, pos2)

    // Optimise AA sequence if one is given, else use DNA sequence
    let seqToInsert = "";
    if (aaToInsert && aaToInsert !== "" && targetOrganism !== null) {
        seqToInsert = optimizeAA(aaToInsert, targetOrganism);
    } else {
        seqToInsert = dnaToInsert;
    };

    
    /**
     * Template binding regions
     */
    // Forward template binding region, extend forward on the forward strand from the end position
    const tempFwd = primerExtension(
        plasmidSequence,
        operationEndPos,
        "fwdStrand",
        "forward",
        tempRegionTm,
        meltingTempAlgorithmChoice,
        7
    );
    // Reverse template binding region, extend forward on the complementary strand from the start position
    const tempRev = primerExtension(
        plasmidSequence,
        operationStartPos,
        "compStrand",
        "forward",
        tempRegionTm,
        meltingTempAlgorithmChoice,
        7
    );
    
    /**
     * Homologous regions
     */
    let operationTypeTagline;
    let primersList = [];
    let homoFwd = "";
    let homoRev = "";

    // If the sequence to be inserted has a melting temperature lower than 49 C, extende the primer backwards
    if (getMeltingTemperature(seqToInsert, "oligoCalc") < upperBoundShortInsertions) {
        /**
         * Short insertions and deletions
        */
        operationTypeTagline = (operationType !== "Deletion") ? "Short " + operationType: operationType;

        if (primerDistribution === false) {
            /**
             * Assymmetric primers, add bases to 5' end of sequence to add, or to nothing in case of deletions
             */
            homoFwd = primerExtension(
                plasmidSequence,
                operationStartPos,
                "fwdStrand",
                "backward",
                homoRegionTm,
                "oligoCalc",
                homoRegionMinLength
            );
            homoRev = "";

            primersList.push(
                {
                    "primerName": "Forward Primer",
                    "homologousRegionLengths": homoFwd.length,
                    "primerRegions": [
                        [homoFwd, bgClassHomo],
                        [seqToInsert, bgClassIns],
                        [tempFwd, bgClassTBR]
                    ]
                }
            );

            primersList.push(
                {
                    "primerName": "Reverse Primer",
                    "homologousRegionLengths": homoFwd.length,
                    "primerRegions": [
                        null,
                        null,
                        [tempRev, bgClassTBR]
                    ]
                }
            );

        } else if (primerDistribution === true) {
            /**
             * Symmetric primers, add bases to 5' and 3' end of sequence to add, or to nothing in case of deletions
             */
            // Added fragment length trackers
            let homoFragmentLength1 = 0;
            let homoFragmentLength2 = 0;
            // Extend more than we need
            let homoFwd1 = primerExtension(
                plasmidSequence,
                operationStartPos,
                "fwdStrand",
                "backward",
                homoRegionTm,
                "oligoCalc",
                homoRegionMinLength,
            );
            let homoFwd2 = primerExtension(
                plasmidSequence,
                operationEndPos,
                "fwdStrand",
                "forward",
                homoRegionTm,
                "oligoCalc",
                homoRegionMinLength,
            );
            let overlappingSeq = homoFwd1 + seqToInsert + homoFwd2;

            // Take turns deleting bases from each end until the target melting temperature is reached
            let turnHomoFwd1 = true;
            while (true) {
                // Get slice indices for the current iteration
                const sliceIndices = (turnHomoFwd1 === true) ?  [1, overlappingSeq.length]: [0, -1]
                // Check conditions
                const stillAboveTargetTM = getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc") > homoRegionTm;
                const slicingGetsUsCloser = Math.abs(homoRegionTm - getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc")) <= Math.abs(homoRegionTm - getMeltingTemperature(overlappingSeq, "oligoCalc"));
                const minimumLengthNotReached = overlappingSeq.length > homoRegionMinLength;
                
                if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                    // If the minimum length has not been reached, and if we are still above the target tm or 
                    // slicing would get us closer, slice the string
                    overlappingSeq = overlappingSeq.slice(...sliceIndices);
                    // Increment fragment length tracker
                    if (turnHomoFwd1 === true) {homoFragmentLength1++} else {homoFragmentLength2++};
                    // Switch turn
                    turnHomoFwd1 = !turnHomoFwd1;
                } else {
                    // Otherwise, end the loop
                    break;
                };
            };

            // Save the fragments that were added on each side
            homoFwd1 = homoFwd1.slice(homoFragmentLength1, homoFwd1.length);
            homoFwd2 = homoFwd2.slice(0, homoFwd2.length - homoFragmentLength2 + 1);
            // Get reverse complementary sequences of the added fragments
            let homoRev1 = getComplementaryStrand(homoFwd2).split('').reverse().join('');
            let homoRev2 = getComplementaryStrand(homoFwd1).split('').reverse().join('');
 
            const homologousRegionLength = homoFwd1.length + seqToInsert.length + homoRev1.length
            primersList.push(
                {
                    "primerName": "Forward Primer",
                    "homologousRegionLengths": homologousRegionLength,
                    "primerRegions": [
                        [homoFwd1, bgClassHomo],
                        [seqToInsert, bgClassIns],
                        [tempFwd, bgClassTBR]
                    ]
                }
            );
            primersList.push(
                {
                    "primerName": "Reverse Primer",
                    "homologousRegionLengths": homologousRegionLength,
                    "primerRegions": [
                        [homoRev1, bgClassHomo],
                        [getComplementaryStrand(seqToInsert).split("").reverse().join(""), bgClassIns],
                        [tempRev, bgClassTBR]
                    ]
                }
            );
        };
    } else {
        /**
         * Long insertions
         */
        operationTypeTagline = "Long Insertion";

        let overlappingSeq = "";
        if (primerDistribution === false) {
            /**
             * Asymmetric primers, remove bases from the complementary strand until target tm is reached
             */
            // Initial overlapping sequence is the entire insertion
            overlappingSeq = getComplementaryStrand(seqToInsert).split('').reverse().join('');
            
            // Delete bases until target tm is reached
            while (true) {
                const stillAboveTargetTM = getMeltingTemperature(overlappingSeq.slice(1), "oligoCalc") > homoRegionTm;
                const slicingGetsUsCloser = Math.abs(homoRegionTm - getMeltingTemperature(overlappingSeq.slice(1), "oligoCalc")) <= Math.abs(homoRegionTm - getMeltingTemperature(overlappingSeq, "oligoCalc"));
                const minimumLengthNotReached = overlappingSeq.length > homoRegionMinLength;
                if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                    overlappingSeq = overlappingSeq.slice(1);
                } else {
                    break;
                };
            };
            
            // Set homologous sequences
            homoFwd = seqToInsert;
            homoRev = overlappingSeq;

        } else if (primerDistribution === true) {
            /**
             * Symmetric primers, take turns deleting bases from each end until the target melting temperature is reached
             */
            // Deleted bases trackers for the fragments
            let homoFragmentLength1 = 0;
            let homoFragmentLength2 = 0;

            // Initial overlapping sequence is the entire insertion
            overlappingSeq = seqToInsert;

            // Take turns deleting bases from each end until the target melting temperature is reached
            let turnHomoFwd1 = true;
            while (true) {
                const sliceIndices = (turnHomoFwd1 === true) ? [1, overlappingSeq.length]: [0, -1]
                const stillAboveTargetTM = getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc") > homoRegionTm;
                const slicingGetsUsCloser = Math.abs(homoRegionTm - getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc")) <= Math.abs(homoRegionTm - getMeltingTemperature(overlappingSeq, "oligoCalc"));
                const minimumLengthNotReached = overlappingSeq.length > homoRegionMinLength;
                if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                    overlappingSeq = overlappingSeq.slice(...sliceIndices);
                    if (turnHomoFwd1 === true) {homoFragmentLength1++} else {homoFragmentLength2++};
                    turnHomoFwd1 = !turnHomoFwd1;
                } else {
                    break;
                };
            };

            // Set homologous sequences
            homoFwd = seqToInsert.slice(homoFragmentLength1, seqToInsert.length);
            const seqToInsertRevComp = getComplementaryStrand(seqToInsert).split('').reverse().join('');
            homoRev = seqToInsertRevComp.slice(homoFragmentLength2, seqToInsertRevComp.length);
        };

        // Generate primer dict
        primersList.push(
            {
                "primerName": "Forward Primer",
                "homologousRegionLengths": overlappingSeq.length,
                "primerRegions": [
                    null,
                    [homoFwd, bgClassIns],
                    [tempFwd, bgClassTBR]
                ]
            }
        );
        primersList.push(
            {
                "primerName": "Reverse Primer",
                "homologousRegionLengths": overlappingSeq.length,
                "primerRegions": [
                    null,
                    [homoRev, bgClassIns],
                    [tempRev, bgClassTBR]
                ]
            }
        );
    };

    return [
        operationTypeTagline,
        primersList,
        seqToInsert,
        operationStartPos,
        operationEndPos
    ];
};


/**
 * Generate primers and display them in the sidebar, then update features dict to account for
 * deletion/insertion of base pairs.
 * 
 * @param {string} plasmidSequence - Sequence of the plasmid
 * @param {string} dnaToInsert - User specified DNA sequence, used if no AA sequence specified
 * @param {string} aaToInsert - User specified AA sequence
 * @param {string} targetOrganism - Organism for AA sequence optimisation
 * @param {number} pos1 - Operation index 1
 * @param {number} pos2 - Operation index 2
 * @param {string} operationType - IVA operation type ("Insetion", "Deletion", etc)
 * @param {boolean} translateFeature - Flag to either translate the newly generated feature
 * @returns {void}
 */
function makePrimers(plasmidSequence, dnaToInsert, aaToInsert, targetOrganism, pos1, pos2, operationType, translateFeature) {
    // Generate primers
    const [
        operationTypeTagline,
        primersList,
        seqToInsert,
        operationStartPos,
        operationEndPos
    ] = generatePrimerSequences(
        plasmidSequence,
        dnaToInsert,
        aaToInsert,
        targetOrganism,
        pos1,
        pos2,
        operationType
    );
    
    // Display primers in the sidebar
    displayPrimers(
        operationTypeTagline,
        primersList
    );
    
    // Update the sequence and features
    updateFeatures(
        operationType,
        translateFeature,
        seqToInsert,
        operationStartPos,
        operationEndPos,
        seqToInsert.length - (operationEndPos - operationStartPos)
    );
};


/**
 * Mark selection as subcloning target and highlight bases
 * 
 * @param {number} plasmidIndex - Target plasmid index
 * @param {number} inputStartPos - Start index
 * @param {number} inputEndPos - End index
 * @returns {void}
 */
function markSelectionForSubcloning(plasmidIndex, inputStartPos, inputEndPos) {
    // Clear previous subcloning selections
    clearAllSubcloningSelections();

    // Update global trackers of the subcloning target
    Project.subcloningOriginIndex = plasmidIndex;
    Project.subcloningOriginSpan = [Math.min(inputStartPos, inputEndPos), Math.max(inputStartPos, inputEndPos)];

    // If the plasmid with the subcloning target is open, highlight it
    if (Project.activePlasmidIndex === Project.subcloningOriginIndex) {
        // First cell
        highlightSpan(
            0,
            Project.subcloningOriginSpan[0],
            Project.subcloningOriginSpan[0] + 1,
            "subcloning-target-cell-first"
        );

        // Middle cells
        highlightSpan(
            0,
            Project.subcloningOriginSpan[0] + 1,
            Project.subcloningOriginSpan[1] - 1,
            "subcloning-target-cell"
        );

        // Last cell
        highlightSpan(
            0,
            Project.subcloningOriginSpan[1] - 1,
            Project.subcloningOriginSpan[1],
            "subcloning-target-cell-last"
        );
    };
};


/**
 * Remove highlight classes for subcloning target
 * 
 * @param {boolean} clearVariables - Flag for wether or not to reset global subcloning target trackers
 * @returns {void}
 */
function clearAllSubcloningSelections(clearVariables=true) {
    // If specified, reset global variables
    if (clearVariables === true) {
        Project.subcloningOriginIndex = null;
        Project.subcloningOriginSpan = null;
    };

    // Select all table cells that have the subcloning highlight classes
    const selectedCellsFirst = document.querySelectorAll('.subcloning-target-cell-first');
    const selectedCells = document.querySelectorAll('.subcloning-target-cell');
    const selectedCellsLast = document.querySelectorAll('.subcloning-target-cell-last');

    // Iterate through all cells and remove the class
    selectedCellsFirst.forEach((cell) => {
        cell.classList.remove('subcloning-target-cell-first');
    });
    selectedCells.forEach((cell) => {
        cell.classList.remove('subcloning-target-cell');
    });
    selectedCellsLast.forEach((cell) => {
        cell.classList.remove('subcloning-target-cell-last');
    });
};


/**
 * Creates the subcloning primers.
 * 
 * Example:
 * 
 *  Insert:
 *                                                                      subcloning target
 *                                        ┏-----------------------------------------------------------------------------┓
 *                                        |                                                                             |
 *forward insert homologous region        |  forward template binding region                                            |
 *                            |           |         |                                                                   |
 *               ┏-----------------------┓┏------------------------┓                                                     |
 *               ATATAAATTTTTTTTCCCCATATATTTTATATATGGGGAAAAAAAATTTA                                                     |
 * fwdStrand  ->         TATATGGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATATGGGATATGGGAT
 * compStrand ->         TCCCCATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCCATATTCCCCATA
 *                                                                                              TATAAATTTTTTTTCCCCATATTCCAAAAAAATTTATATATGGGGAAAAAAAA
 *                                                                                              ┗-----------------------┛┗---------------------------┛   
 *                                                                                                          |                          |
 *                                                                                        reverse template binding region         reverse insert homologous region
 * 
 *  Vector:
 *                                         forward vector template binding region
 *                                                        |
 *                                          ┏-------------------------┓
 *                                          AAAAAATTTATATATGGGGAAAAAAAA  
 * fwdStrand  -> GGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATAT
 * compStrand -> ATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCC
 *                 ATATAAATTTTTTTTCCCCATATAT
 *                 ┗-----------------------┛   
 *                             |          
 *             reverse vector template binding region
 * 
 * 
 * @param {number} subcloningStartPos - Operation index 1
 * @param {number} subcloningEndPos - Operation index 2
 * @param {string} aaSequence5Prime - User specified AA 5' sequence
 * @param {string} dnaSequence5Prime - User specified DNA  5' sequence, used if no AA sequence specified
 * @param {string} aaSequence3Prime - User specified AA 3' sequence
 * @param {string} dnaSequence3Prime - User specified DNA  3' sequence, used if no AA sequence specified
 * @param {string} targetOrganism - Organism for AA sequence optimisation
 * @param {boolean} translateFeature -  Flag to either translate the newly generated feature
 * @returns {void}
 */
function makeSubcloningPrimers(subcloningStartPos, subcloningEndPos, aaSequence5Prime, dnaSequence5Prime, aaSequence3Prime, dnaSequence3Prime, targetOrganism, translateFeature=false) {
    /**
     * Optimise 5' and 3' insertions, otherwise use given DNA sequence
     */
    let seqToInsert5 = "";
    if (aaSequence5Prime !== null && aaSequence5Prime !== "") {
        seqToInsert5 = optimizeAA(aaSequence5Prime, targetOrganism);
    } else if (dnaSequence5Prime !== null && dnaSequence5Prime !== "") {
        seqToInsert5 = dnaSequence5Prime;
    };
    let seqToInsert3 = "";
    if (aaSequence3Prime !== null && aaSequence3Prime !== "") {
        seqToInsert3 = optimizeAA(aaSequence3Prime, targetOrganism);
    } else if (dnaSequence3Prime !== null && dnaSequence3Prime !== "") {
        seqToInsert3 = dnaSequence3Prime;
    };

    // Check indices and reorder if necessary
    if (!subcloningStartPos) {subcloningStartPos = subcloningEndPos};
    if (!subcloningEndPos) {subcloningEndPos = subcloningStartPos};
    const startPos = Math.min(subcloningStartPos, subcloningEndPos);
    const endPos = Math.max(subcloningStartPos, subcloningEndPos);

    // Subcloning target sequence
    const subcloningOriginSpan = Project.subcloningOriginSpan
    const subcloningTargetSequence = repeatingSlice(
        Project.getPlasmid(Project.subcloningOriginIndex).sequence,
        subcloningOriginSpan[0] - 1,
        subcloningOriginSpan[1]-1
    )
    // Subcloning target sequence with insertion sequences
    const subcloningSequenceFull = seqToInsert5 + subcloningTargetSequence + seqToInsert3;

    // Plasmid sequence of target vector
    const targetVectorSequence = Project.activePlasmid().sequence;
    // Create a simulated plasmid sequence where the subcloning target is already inserted
    const simulatedPlasmidSequence = targetVectorSequence.slice(0, startPos-1) + subcloningTargetSequence + targetVectorSequence.slice(endPos-1);
    // Create insertion primers to insert the 5' insertion on the simulated plasmid sequence
    const [, primersList5, , , ] = generatePrimerSequences(
        simulatedPlasmidSequence,
        seqToInsert5,
        "",
        targetOrganism,
        startPos,
        startPos,
        "Subcloning"
    );
    console.log("makeSubcloningPrimers", primersList5);

    // Create a simulated plasmid reverse complement sequence where the subcloning target is already inserted
    const simulatedPlasmidSequenceRevComp = getComplementaryStrand(simulatedPlasmidSequence).split("").reverse().join("");
    // Get new insertion position in the new, simulated sequence
    const endPosRevComp = simulatedPlasmidSequenceRevComp.length - startPos - subcloningTargetSequence.length + 2;
    // Get the reverse complement sequence of the 3' insertion
    const seqToInsert3RevComp = getComplementaryStrand(seqToInsert3).split("").reverse().join("");
    // Create insertion primers to insert the 3' insertion on the simulated plasmid sequence
    const [, primersList3, , , ] = generatePrimerSequences(
        simulatedPlasmidSequenceRevComp,
        seqToInsert3RevComp,
        "",
        targetOrganism,
        endPosRevComp,
        endPosRevComp,
        "Subcloning"
    );
    console.log("makeSubcloningPrimers", primersList3);


    // Generate primer dict
    let primersList = [
        primersList5[0],
        primersList3[0],
        primersList3[1],
        primersList5[1],
    ];
    console.log("makeSubcloningPrimers", primersList);

    primersList[0]["primerName"] = "Forward Primer";
    primersList[1]["primerName"] = "Reverse Primer";
    primersList[2]["primerName"] = "Vector Forward Primer";
    primersList[3]["primerName"] = "Vector Reverse Primer";

    // Display primers in the sidebar
    displayPrimers(
        "Subcloning",
        primersList
    );

    // Update the sequence and features
    const plasmidLengthDiff = subcloningSequenceFull.length - (endPos - startPos);
    updateFeatures(
        "Subcloning",
        translateFeature,
        subcloningSequenceFull,
        startPos,
        endPos,
        plasmidLengthDiff
    );
};


/**
 * Decides if the old feature should be left alone, shifted, or deleted based on the span of the new feature.
 * 
 * @param {Array<number>} featureSpan - Span of feature to compare to
 * @param {Array<number>} newFeatureSpan - Span of new feature
 * @returns {string} - Decision: delete, shift, inside, null
 */
function checkNewFeatureOverlap(featureSpan, newFeatureSpan) {
    // Separate start and end
    const spanStart = featureSpan[0];
    const spanEnd = featureSpan[1];
    
    // Separate start and end
    let newSpanStart = newFeatureSpan[0];
    let newSpanEnd = newFeatureSpan[1];
    // Adjust indices if we're dealing with a pure insertion and the start and end indices are identical
    if (newSpanStart === newSpanEnd) {
        newSpanStart++;
        newSpanEnd++;
    } else { // Adjust indices from sequence indices to feature indices
        newSpanStart++;
    };

    /**
     * Pure insertions - new feature start and end positions are identical
     */
    if (newSpanStart === newSpanEnd) {
        if (newSpanStart <= spanStart) {
            /**
             * Insertion is before old feature
             * old     [         ]
             * new  |
             */
            return "shift";
        } else if (newSpanStart < spanEnd) {
            /**
             * Insertion is inside old feature
             * old    [         ]
             * new         |
             */
            return "inside";
        } else if (newSpanStart > spanEnd) {
            /**
             * Insertion is after old feature
             * old    [         ]
             * new                   |
             */
            return null;
        };
    } else {
        if (newSpanStart === spanStart && newSpanEnd === spanEnd) {
            /**
             * Special case: exact deletion/replacement
             * old    [         ]
             * new    [         ]
             */
            return "delete";
        } else if (newSpanStart >= spanStart && newSpanEnd >= spanStart && newSpanStart <= spanEnd && newSpanEnd <= spanEnd && newSpanStart !== newSpanEnd) {
            /**
             * 0.
             * old                [         ]
             * new                 [      ]
             */
            return "inside";
        } else if (newSpanStart < spanStart && newSpanEnd < spanStart && newSpanStart < spanEnd && newSpanEnd < spanEnd) {
            /**
             * 1. New feature is before old feature
             * old                [         ]
             * new    [        ]
             */
            return "shift";
        } else if (newSpanStart < spanStart && newSpanEnd >= spanStart && newSpanStart < spanEnd && newSpanEnd <= spanEnd) {
            /**
             * 2. New feature overlaps old feature
             * old         [         ]
             * new    [        ]
             */
            return "delete";
        } else if (newSpanStart < spanStart && newSpanEnd > spanStart && newSpanStart < spanEnd && newSpanEnd > spanEnd) {
            /**
             * 3. New feature encompasses old feature
             * old          [         ]
             * new    [                 ] 
             */
            return "delete";
        } else if (newSpanStart >= spanStart && newSpanEnd > spanStart && newSpanStart <= spanEnd && newSpanEnd > spanEnd) {
            /**
             * 4. New feature overlaps old feature
             * old          [         ]
             * new               [                 ] 
             */
            return "delete";
        } else {
            /**
             * 5. New feature is after old feature
             * old          [         ]
             * new                        [                 ] 
             */
            return null;
        };
    };
    return null;
};


/**
 * Updates the target plasmid sequence, checks if the insertion/deletion crashes with exsiting features and adjusts accordingly (shift or deletion).
 * Lastly, adds the new feature to the feature dict and rebuilds the plasmid as well as refresh it in the viewer.
 * 
 * @param {string} operationType - Type of IVA operation (insertion, deletion, etc)
 * @param {boolean} translateFeature - Flag to translate new feature or not
 * @param {string} newFeatureSequence - DNA sequence of the new feature
 * @param {number} segmentStartPos - Start index of new feature
 * @param {number} segmentEndPos - End index of new feature
 * @param {number} featureShift - Amount of bases to shift old features
 * @returns {void}
 */
function updateFeatures(operationType, translateFeature, newFeatureSequence, segmentStartPos, segmentEndPos, featureShift) {
    // Convert back from sequence indices to string indices
    segmentStartPos--;
    segmentEndPos--;

    // Insertion is added into the main sequence and complementary strand is remade
    const currPlasmid = Project.activePlasmid();
    Project.activePlasmid().sequence = currPlasmid.sequence.substring(0, segmentStartPos) + newFeatureSequence + currPlasmid.sequence.substring(segmentEndPos);
    Project.activePlasmid().complementarySequence  = getComplementaryStrand(currPlasmid.sequence);

    // Loop over all features and decided wether to shift, modify, delete or do nothing
    Object.entries(currPlasmid.features).forEach(([key, value]) => {
        // Pass old feature span and new feature span and decide what to do
        const currSpanString = value.span;
        const currSpan = removeNonNumeric(currSpanString).split("..").map(Number);
        const decision = checkNewFeatureOverlap(
            currSpan,
            [segmentStartPos, segmentEndPos],
        );
        if (decision === "shift") {
            // Shift feature
            const adjustedSpan = [currSpan[0] + featureShift, currSpan[1] + featureShift];
            const spanStringMatches = currSpanString.match(/\d+/g);
            Project.activePlasmid().features[key].span = currSpanString.replace(spanStringMatches[0], adjustedSpan[0]).replace(spanStringMatches[1], adjustedSpan[1]);
        } else if (decision === "inside") {
            // Inside, only shift span end
            const adjustedSpan = [currSpan[0], currSpan[1] + featureShift];
            const spanStringMatches = currSpanString.match(/\d+/g);
            Project.activePlasmid().features[key].span = currSpanString.replace(spanStringMatches[0], adjustedSpan[0]).replace(spanStringMatches[1], adjustedSpan[1]);
        } else if (decision === "delete") {
            // Delete old feature
            delete Project.activePlasmid().features[key];
        };
    });

    // Creat the new feature entry in feature dict
    if (operationType !== "Deletion") {
        const tempDict = {};
        tempDict.label = operationType;
        tempDict.type = (translateFeature === true) ? "CDS": "misc_feature";
        if (translateFeature === true) {
            tempDict.translation = translateSequence(newFeatureSequence);
        };
        const insertStringPositionStart = segmentStartPos + 1;
        const insertStringPositionEnd = segmentStartPos + newFeatureSequence.length;
        tempDict.span = insertStringPositionStart + ".." + insertStringPositionEnd;
        tempDict.note = "";
        Project.activePlasmid().features[crypto.randomUUID()] = tempDict;

        // Sort feature dict by span
        Project.activePlasmid().features = sortBySpan(Project.activePlasmid().features);
    };

    // Remake the sidebar and content grid 
    Project.activePlasmid().createSidebarTable();
    Project.activePlasmid().makeContentGrid();
    updateSidebarAndGrid();

    // At the very end, save the progress to file history
    Project.activePlasmid().saveProgress();
};


/**
 * Sort the features dict by span so that the features appear in order in the sidebar.
 * 
 * @param {Object} dict - Dictionary to be sorted
 * @returns {Object}
 */
function sortBySpan(dict) {
    // Convert the dictionary to an array of key-value pairs
    const valueKey = "span";
    const entries = Object.entries(dict);

    // Sort the array based on the first number in the value key
    entries.sort((a, b) => {
        const spanListA = removeNonNumeric(a[1][valueKey]);
        const rangeA = spanListA.split("..").map(Number);
        const rangeStartA = rangeA[0];

        const spanListB = removeNonNumeric(b[1][valueKey]);
        const rangeB = spanListB.split("..").map(Number);
        const rangeStartB = rangeB[0];

        return rangeStartA - rangeStartB;
    });

    // Convert the sorted array back to a dictionary and return
    return Object.fromEntries(entries);
};


/**
 * MAP of complementary single letter codes.
 */
const nucleotideComplements = {
    'A': 'T',
    'C': 'G',
    'G': 'C',
    'T': 'A',
    'R': 'Y', // A or G -> T or C
    'Y': 'R', // T or C -> A or G
    'S': 'S', // G or C -> G or C
    'W': 'W', // A or T -> A or T
    'K': 'M', // G or T -> A or C
    'M': 'K', // A or C -> G or T
    'B': 'V', // C or G or T -> G or C or A
    'D': 'H', // A or G or T -> T or C or A
    'H': 'D', // A or C or T -> T or G or A
    'V': 'B', // A or C or G -> T or G or C
    'N': 'N', // any
    '.': '-', // gap
    '-': '-'  // gap
};


/**
 * Create the complementary strand to a given DNA sequence.
 * 
 * @param {string} inputSequence - Template sequence for the complementary strand
 * @returns 
 */
function getComplementaryStrand(inputSequence) {
    // Convert to uppercase, make into list, map to complementary base, then turn back into string
    const complementaryStrand = inputSequence.toUpperCase()
        .replace(/[^ACGTRYSWKMBDHVN.-]+/g, '')
        .split('')
        .map(nucleotide => nucleotideComplements[nucleotide])
        .join('');

    return complementaryStrand;
};


/**
 * Modified slice() function that allows for negative indices or indices longer than the string length by assuming
 * the string loops.
 * 
 * Example:
 *         startIndex            endIndex
 *             ▼                    ▼
 *         -3 -2 -1 0 1 2 3 4 5 6 7 8 9
 * str ->    _  _  _ A B C D E F G _ _ _
 * 
 * Result -> FGABCDEFGA
 * 
 * @param {string} str - String to be sliced
 * @param {number} startIndex - Start index
 * @param {number} endIndex - End index
 * @returns {string}
 */
function repeatingSlice(str, startIndex, endIndex) {
    const repeatedStr = str.repeat(3); // Copy the string 3 times: ABC_ABC_ABC
    // Remap indices to new string then return
    return repeatedStr.slice(startIndex + str.length, endIndex + str.length);
};


/**
 * Copy primer sequence to clipboard
 * 
 * @param {Object} sourceBtn - Button element
 * @returns {void}
 */
function copyPrimerSequenceToClipboard(sourceBtn) {
    // Copy source button html to clipboard
    const dummyElement = document.createElement("div");
    dummyElement.innerHTML = sourceBtn.parentElement.innerHTML;
    dummyElement.removeChild(dummyElement.lastChild);

    for (let i = 0; i < dummyElement.children.length; i++) {
        const child = dummyElement.children[i];
        const styles = window.getComputedStyle(sourceBtn.parentElement.children[i])
        for (let key in styles) {
            if (["color", "background-color", "font-weight", "font-family"].includes(key)){
                let prop = key.replace(/\-([a-z])/g, v => v[1].toUpperCase());
                child.style[prop] = styles[key];
            };
        };
    };

    copyStringToClipboard(sourceBtn.parentElement.innerText, dummyElement.innerHTML)
};


/**
 * 
 * @param {*} eventSource 
 * @param {*} adjustmentDirection 
 * @param {*} targetStrand 
 * @param {*} startPos 
 * @param {*} endPos 
 */
function adjustPrimerLength(instigator, adjustmentDirection, targetStrand, startPos, endPos) {
    /**
     * Get new primer sequence
     */
    const currPlasmid = Project.activePlasmid();
    const currSequence = (targetStrand === "fwd") ? currPlasmid.sequence: currPlasmid.complementarySequence;

    const newSequence = "";

    /**
     * Update stuff
     */
    // Update span
    // button -> buttons container -> primer-sequence p -> primer-div div -> mod-div div
    const modDiv = instigator.parentElement.parentElement.parentElement.parentElement;
    refreshPrimerDiv(modDiv);
};


/**
 * 
 * @param {Element} modDiv 
 */
function refreshPrimerDiv(modDiv) {
    /**
     * Homologous region info
     */
    // Get new homologous region sequence -> length, tm
    const homologousRegionInfoDiv = modDiv.querySelectorAll("#homologous-region-info")[0];
    if (homologousRegionInfoDiv.childNodes.length === 1) {
        /**
         * Standard operation -> 1 homologous region
         */
        const homologousSequence = modDiv.querySelectorAll("#homologous-region")[0].innerText;
        const homologousSequenceTm = getMeltingTemperature(homologousSequence, "oligoCalc").toFixed(2);

        const lengthSpan = homologousRegionInfoDiv.querySelectorAll("#operation-info-homo-length")[0];
        lengthSpan.innerText = homologousSequence.length;
        const tmSpan = homologousRegionInfoDiv.querySelectorAll("#operation-info-homo-tm")[0];
        tmSpan.innerText = homologousSequenceTm;
        console.log(lengthSpan, tmSpan);
    } else {
        /**
         * Subcloning -> 2 homologous regions
         */
        let homologousSequences = [];
        modDiv.querySelectorAll("#homologous-region").forEach(span => {
            homologousSequences.push(span.innerText)
        });

        const [lengthSpan5, lengthSpan3] = homologousRegionInfoDiv.querySelectorAll("#operation-info-homo-length");
        const [tmSpan5, tmSpan3] = homologousRegionInfoDiv.querySelectorAll("#operation-info-homo-tm");
        
        lengthSpan5.innerText = homologousSequences[0];
        tmSpan5.innerText = getMeltingTemperature(lengthSpan5.innerText, "oligoCalc").toFixed(2);
        lengthSpan3.innerText = homologousSequences[2];
        tmSpan3.innerText = getMeltingTemperature(lengthSpan3.innerText, "oligoCalc").toFixed(2);
        
        console.log(lengthSpan5, lengthSpan3);
        console.log(tmSpan5, tmSpan3);
    };

    /**
     * Individual primers
     */
    // Iterate over primer-divs
    const primerDivs = modDiv.querySelectorAll("#primer-div");
    primerDivs.forEach((primerDiv) => {
        console.log(primerDiv);
        /**
         * Adjust onmouseover events
         */
        // Homo -> same sequence
        // Ins -> span sequence
        primerDiv.querySelectorAll('[primer-span-type="homo"], [primer-span-type="ins"]').forEach(span => {
            const currentEvent = span.getAttribute("onmouseover");
            const regex = /primerRegionHover\("([^"]+)", "([^"]+)", "([^"]+)"\)/;
            const newEvent = currentEvent.replace(regex, `primerRegionHover("${span.innerText}", "$2", "$3")`);
            span.setAttribute("onmouseover", newEvent);
        });

        // TBR -> combined span sequence
        let tbrSequence = "";
        primerDiv.querySelectorAll('[primer-span-type="tbr"]').forEach(tbrSpan => {
            tbrSequence += tbrSpan.innerText;
        });

        primerDiv.querySelectorAll('[primer-span-type="tbr"]').forEach(tbrSpan => {
            const currentEvent = tbrSpan.getAttribute("onmouseover");
            const regex = /primerRegionHover\("([^"]+)", "([^"]+)", "([^"]+)"\)/;
            const newEvent = currentEvent.replace(regex, `primerRegionHover("${tbrSequence}", "$2", "$3")`);
            tbrSpan.setAttribute("onmouseover", newEvent);
        });

        // Recalculate TBR length and tm
        const tbrLengthSpan = primerDiv.querySelectorAll("#primer-info-tbr-length")[0];
        tbrLengthSpan.innerText = tbrSequence.length;
        const tbrTmSpan = primerDiv.querySelectorAll("#primer-info-tbr-tm")[0];
        tbrTmSpan.innerText = getMeltingTemperature(tbrSequence, meltingTempAlgorithmChoice).toFixed(2);


        // Recalculate Total length
        const fullSequenceLength = primerDiv.querySelectorAll("#primer-sequence")[0].innerText.length;
        const totalLengthSpan = primerDiv.querySelectorAll("#primer-info-total-length")[0];
        totalLengthSpan.innerText = fullSequenceLength;
    })
};