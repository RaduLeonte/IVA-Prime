/**
 * Display the primers for the operation in the sidebar
 * 
 * @param {string} primersType - "Insertion", "Deletion", "Subcloning with Insertion" etc
 * @param {Object.<string, Object>} primersDict - Dictionary containing all primer info
 * 
 * @returns {void} 
 */
// TO DO: Make and assign classes to the divs instead of setting the styles manually
function displayPrimers(primersType, primersDict) {
    // Select sidebar element
    const sidebarContentDiv = document.querySelector('.sidebar-content');

    // Change sidebar headline if it still has the default text
    let element = document.getElementById("primers-div-headline");
    if (element.textContent === "Primers will appear here.") {
        element.textContent = "Primers:";
    };

    // Main div
    const modDiv = document.createElement("div");
    modDiv.id = "mod-div"

    // Headline: operation nr + operation type
    const h3 = document.createElement('h3');
    h3.id = 'primers-type';
    h3.setAttribute("primers-type", primersType.toLowerCase());
    h3.classList.add("editable");
    enableElementEditing(h3, 1);
    h3.setAttribute("edited", false);
    h3.textContent = Project.activePlasmid().operationNr + '. ' + primersType;
    Project.activePlasmid().operationNr = parseInt(Project.activePlasmid().operationNr) + 1;
    modDiv.appendChild(h3);


    // Iterate over each primer in the primerDict
    for (const [primer, subprimersDict] of Object.entries(primersDict)) {
        // Main div
        const primerDiv = document.createElement("div");
        primerDiv.id = "primer-div";
        primerDiv.setAttribute("direction", primer.toLowerCase().includes("forward") ? "fwd": "rev");

        // Primer name (forward primer, reverse primer, vector forward etc)
        const primerName = document.createElement('p');
        primerName.textContent = primer + ":";
        primerName.classList.add("editable")
        primerName.setAttribute("edited", false);
        primerName.id = "primer-id";
        enableElementEditing(primerName, 1)
        primerDiv.appendChild(primerName);

        // Primer sequence
        const primerSequence = document.createElement('p');
        primerSequence.id = 'primer-sequence';
        // Add spans for each region in the primer sequence
        // TO DO: Create classes for primer regions instead of adding styles to the element
        for (const [subprimer, subprimerProperties] of Object.entries(subprimersDict)) {
            if (subprimer !== "info") {
                const span = document.createElement('span');
                span.classList.add("primer-span")
                span.classList.add(subprimerProperties["bg-class"]);
                span.textContent = subprimerProperties["seq"];
                primerSequence.appendChild(span)
            };
        };

        // Add button that copies the primer sequence to clipboard
        // TO DO: Copy formatting of the sequence as well (rich text)
        const copyPrimerSequenceButton = document.createElement("a");
        copyPrimerSequenceButton.href = "#";
        copyPrimerSequenceButton.setAttribute("onClick", "copyPrimerSequenceToClipboard(this)");
        copyPrimerSequenceButton.classList.add("copy-primer-btn");
        copyPrimerSequenceButton.style.backgroundImage = "url('/static/assets/icons/copy_icon.svg')";
        primerSequence.appendChild(copyPrimerSequenceButton);

        // Primer info div
        const pPrimerInfo = document.createElement('p')
        const spanPrimerInfo = document.createElement('span');
        spanPrimerInfo.textContent = subprimersDict["info"];
        pPrimerInfo.appendChild(spanPrimerInfo);

        // Append divs
        primerSequence.style.wordBreak = 'break-all';
        primerDiv.appendChild(primerSequence);
        primerDiv.appendChild(pPrimerInfo);
        modDiv.append(primerDiv);
    };

    // Append new div to sidebar
    sidebarContentDiv.appendChild(modDiv);
    // Update the primers
    Project.activePlasmid().savePrimers();
    // Add hover effects to the different regions in the primer sequences
    // TO DO: Maybe add a click effect that takes you to that position
    // TO DO: Make sure this doesn't stack event listeners
    addPrimerRegionHoverEvents();
    
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
     * @param {number} plasmidIndex 
     * @returns {void}
     */
    txt : (plasmidIndex) => {
        // Get file name and primers from the html element
        const currPlasmid = Project.getPlasmid(plasmidIndex);
        const fileName = currPlasmid.name.replace(currPlasmid.extension, "") + " primers";
        const containerDiv = document.createElement("div");
        containerDiv.innerHTML = currPlasmid.primers;

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
        const blob = new Blob([textContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName + '.txt';
        link.click();
    },
    /**
     * Export to Microsoft Word file
     * 
     * @param {number} plasmidIndex 
     * @returns {void}
     */
    doc : (plasmidIndex) => {
        // Get file name and primers from the html element
        const currPlasmid = Project.getPlasmid(plasmidIndex);
        const fileName = currPlasmid.name.replace(currPlasmid.extension, "") + " primers";
        const htmlContent = currPlasmid.primers;
        
        // Create blob using html-docx.js and download it
        const docx = window.htmlDocx.asBlob(htmlContent);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(docx);
        link.download = fileName + '.docx';
        link.click();
    },
    /**
     * Export to csv file
     * 
     * @param {number} plasmidIndex 
     * @returns {void}
     */
    csv : (plasmidIndex) => {
        // Get file name and primers from the html element as 2d array
        const currPlasmid = Project.getPlasmid(plasmidIndex);
        const fileName = currPlasmid.name.replace(currPlasmid.extension, "") + " primers";
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
        const blob = new Blob([textContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName + '.csv';
        link.click();
    },
    /**
     * Export to Excel file
     * 
     * @param {number} plasmidIndex 
     * @returns {void}
     */
    xlsx: (plasmidIndex) => {
        addLoadingCursor();
        // Get file name and primers from the html element as 2d array
        const currPlasmid = Project.getPlasmid(plasmidIndex);
        const fileName = currPlasmid.name.replace(currPlasmid.extension, "") + " primers";
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
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
            removeLoadingCursor();
        })
    },
    /**
     * Export to Microsynth order form
     * 
     * @param {number} plasmidIndex 
     * @returns {void}
     */
    microsynth: (plasmidIndex) => {
        addLoadingCursor();
        // Get file name and primers from the html element as 2d array
        const currPlasmid = Project.getPlasmid(plasmidIndex);
        const fileName = currPlasmid.name.replace(currPlasmid.extension, "") + " primers";
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
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName + " microsynth order form";
            link.click();
            removeLoadingCursor();
        })
    } 
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
 * Add hover events for primer regions
 */
// TO DO: Add click events that take you to the region
function addPrimerRegionHoverEvents(){
    const spansList = document.querySelector(".sidebar-content").getElementsByTagName("SPAN");

    Array.from(spansList).forEach((span) => {
        span.addEventListener('mouseover', primerRegionHover);
        span.addEventListener('mouseout', removePrimerRegionHighlight);
    });
};


/**
 * Highlights where the primer sequence is in the plasmid sequence.
 * 
 * @param {Event} event 
 */
function primerRegionHover(event) {
    // Get primer span info
    // Span element
    const targetSpan = event.target;
    // Sequence
    const spanSequence = targetSpan.innerText;
    // Sequence direction
    const spanDirection = (targetSpan.parentElement.parentElement.getAttribute("direction") === "fwd") ? "fwd": "rev";
    // Color
    const spanColor = window.getComputedStyle(targetSpan).backgroundColor;
    
    // Grid structure and sequence of currently opened plasmid
    const currPlasmid = Project.activePlasmid();
    const currSequence = (spanDirection === "fwd") ? currPlasmid.sequence: currPlasmid.complementarySequence;

    // Reverse sequence if direction is reverse
    const searchQuery = (spanDirection === "fwd") ? spanSequence: spanSequence.split('').reverse().join('');
    // Strand 0 for forward, 1 for reverse
    const targetStrand = (spanDirection === "fwd") ? 0: 1;
    highlightOccurences(
        targetStrand,
        currSequence,
        searchQuery,
        null,
        spanColor
    );
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
    let primersDict = {};
    let operationTypeTagline = "";
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
            
            // Generate primer dict
            const primerInfoFwd = `(Homologous region: ${homoFwd.length} bp, ${Math.round(getMeltingTemperature(homoFwd, "oligoCalc"))} °C;
                                    Template binding region: ${tempFwd.length} bp, ${Math.round(getMeltingTemperature(tempFwd, meltingTempAlgorithmChoice))} °C; 
                                    Total: ${(homoFwd.length + seqToInsert.length + tempFwd.length)} bp)`;
            const primerInfoRev = `(Template binding region: ${tempRev.length} bp, ${Math.round(getMeltingTemperature(tempRev, meltingTempAlgorithmChoice))} °C; 
                                    Total: ${(tempRev.length)} bp)`;
            primersDict["Forward Primer"] = {1: {"seq": homoFwd, "bg-class": bgClassHomo},
                                            2: {"seq": seqToInsert, "bg-class": bgClassIns},
                                            3: {"seq": tempFwd, "bg-class": bgClassTBR},
                                            info: primerInfoFwd};
            primersDict["Reverse Primer"] = {1: {"seq": tempRev, "bg-class": bgClassTBR},
                                            info: primerInfoRev};

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
 
            // Generate primer dict
            const primerInfoFwd = `(Overlap: ${overlappingSeq.length} bp, ${Math.round(getMeltingTemperature(overlappingSeq, "oligoCalc"))} °C;
                                    Template binding region: ${tempFwd.length} bp, ${Math.round(getMeltingTemperature(tempFwd, meltingTempAlgorithmChoice))} °C; 
                                    Total: ${(homoFwd1.length + seqToInsert.length + tempFwd.length)} bp)`;
            const primerInfoRev = `(Template binding region: ${tempRev.length} bp, ${Math.round(getMeltingTemperature(tempRev, meltingTempAlgorithmChoice))} °C; 
                                    Total: ${(homoRev1.length + seqToInsert.length + tempRev.length)} bp)`;
            primersDict["Forward Primer"] = {1: {"seq": homoFwd1, "bg-class": bgClassHomo},
                                            2: {"seq": seqToInsert, "bg-class": bgClassIns},
                                            3: {"seq": tempFwd, "bg-class": bgClassTBR},
                                            info: primerInfoFwd};
            primersDict["Reverse Primer"] = {1: {"seq": homoRev1, "bg-class": bgClassHomo},
                                             2: {"seq": getComplementaryStrand(seqToInsert).split("").reverse().join(""), "bg-class": bgClassIns},
                                             3: {"seq": tempRev, "bg-class": bgClassTBR},
                                             info: primerInfoRev};
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
        const primerInfoFwd = `(Overlap: ${overlappingSeq.length} bp, ${Math.round(getMeltingTemperature(overlappingSeq, "oligoCalc"))} °C;
                                Template binding region: ${tempFwd.length} bp, ${Math.round(getMeltingTemperature(tempFwd, meltingTempAlgorithmChoice))} °C; 
                                Total: ${(homoFwd.length + tempFwd.length)} bp)`;
        const primerInfoRev = `(Template binding region: ${tempRev.length} bp, ${Math.round(getMeltingTemperature(tempRev, meltingTempAlgorithmChoice))} °C; 
                                Total: ${(homoRev.length + tempRev.length)} bp)`;
        primersDict["Forward Primer"] = {1: {"seq": homoFwd, "bg-class": bgClassIns},
                                         2: {"seq": tempFwd, "bg-class": bgClassTBR},
                                        info: primerInfoFwd};
        primersDict["Reverse Primer"] = {1: {"seq": homoRev, "bg-class": bgClassIns},
                                         2: {"seq": tempRev, "bg-class": bgClassTBR},
                                         info: primerInfoRev};
    };

    return [operationTypeTagline, primersDict, seqToInsert, operationStartPos, operationEndPos];
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
        primersDict,
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
        primersDict
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
    const [, primersDict5, , , ] = generatePrimerSequences(
        simulatedPlasmidSequence,
        seqToInsert5,
        "",
        targetOrganism,
        startPos,
        startPos,
        "Subcloning"
    );

    // Create a simulated plasmid reverse complement sequence where the subcloning target is already inserted
    const simulatedPlasmidSequenceRevComp = getComplementaryStrand(simulatedPlasmidSequence).split("").reverse().join("");
    // Get new insertion position in the new, simulated sequence
    const endPosRevComp = simulatedPlasmidSequenceRevComp.length - startPos - subcloningTargetSequence.length + 2;
    // Get the reverse complement sequence of the 3' insertion
    const seqToInsert3RevComp = getComplementaryStrand(seqToInsert3).split("").reverse().join("");
    // Create insertion primers to insert the 3' insertion on the simulated plasmid sequence
    const [, primersDict3, , , ] = generatePrimerSequences(
        simulatedPlasmidSequenceRevComp,
        seqToInsert3RevComp,
        "",
        targetOrganism,
        endPosRevComp,
        endPosRevComp,
        "Subcloning"
    );


    // Generate primer dict
    let primersDict = {};
    primersDict["Forward Primer"] = primersDict5["Forward Primer"];
    primersDict["Reverse Primer"] = primersDict3["Forward Primer"];
    primersDict["Vector Forward Primer"] = primersDict3["Reverse Primer"];
    primersDict["Vector Reverse Primer"] = primersDict5["Reverse Primer"];

    // Display primers in the sidebar
    displayPrimers("Subcloning", primersDict);

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

    copyStringToClipboard(dummyElement.innerHTML)
};