/**
 * Display the primer pair in the sidebar by appending <p>s
 * 
 * primersType - time of modification (e.g. insertion, deletion etc)
 * primersList - list of primers [homoFwd, tempFwd, homoRev, tempRev]
 * textColor - color of text, usually white
 * templateColor - background color of template part
 * homoColor - background color of homologous part
 * mutSeq - additional sequence for mutations
 * 
 */
function displayPrimers(primersType, primersDict) {
    const sidebarContentDiv = document.querySelector('.sidebar-content'); // Select sidebar

    // Change sidebar headline
    var element = document.getElementById("primers-type");
    if (element.textContent !== "Primers:") {addExportPrimersButtonListener()};
    element.textContent = "Primers:";


    // Display primer pair nr and type of mod
    const modDiv = document.createElement("div");
    modDiv.id = "mod-div"
    const h3 = document.createElement('h3');
    h3.id = 'primers-type';
    h3.setAttribute("primers-type", primersType.toLowerCase());
    h3.classList.add("editable");
    enableElementEditing(h3, 1)
    h3.setAttribute("edited", false);
    h3.textContent = operationNr + '. ' + primersType;
    operationNr++;
    modDiv.appendChild(h3);

    for (const [primer, subprimersDict] of Object.entries(primersDict)) {
        console.log("Display primers:", primer, subprimersDict);
        const primerDiv = document.createElement("div");
        primerDiv.id = "primer-div";
        primerDiv.setAttribute("direction", primer.toLowerCase().includes("forward") ? "fwd": "rev");

        const primerName = document.createElement('p'); // Add CSS style for word wrapping
        primerName.textContent = primer + ":";
        primerName.classList.add("editable")
        primerName.setAttribute("edited", false);
        primerName.id = "primer-id";
        enableElementEditing(primerName, 1)
        primerDiv.appendChild(primerName);

        const primerSequence = document.createElement('p');
        primerSequence.id = 'primer-sequence';
        for (const [subprimer, subprimerProperties] of Object.entries(subprimersDict)) {
            if (subprimer !== "info") {
                const span = document.createElement('span');
                span.style.color = "white";
                span.style.backgroundColor = subprimerProperties["color"];
                span.style.fontWeight = 'bold';
                span.textContent = subprimerProperties["seq"];
                primerSequence.appendChild(span)
                primerSequence.appendChild(span)
                span.addEventListener('mouseover', primerRegionHover);
                span.addEventListener('mouseout', removePrimerRegionHighlight);
            };
        };

        const pPrimerInfo = document.createElement('p')
        const spanPrimerInfo = document.createElement('span');
        spanPrimerInfo.textContent = subprimersDict["info"];
        pPrimerInfo.appendChild(spanPrimerInfo);

        primerSequence.style.wordBreak = 'break-all';
        primerDiv.appendChild(primerSequence);
        primerDiv.appendChild(pPrimerInfo);
        modDiv.append(primerDiv);
    };

    
    sidebarContentDiv.appendChild(modDiv);
    // Reset selection
    selectedText = "";
    selectedText2 = "";
};


/**
 * Add event listener to the export primers button
 */
function addExportPrimersButtonListener() {
    console.log("Enabling Primer Export Buttons")
    const targetDropdown = document.querySelector('#export-primers-dropdown');
    targetDropdown.style.display = "block";
  
    let dropdownOptions = document.querySelectorAll('#export-primers-dropdown .dropdown-content a');
    dropdownOptions.forEach(function (option) {
        let id = option.id;
        option.addEventListener('click', function () {
          exportPrimersDict[id.split('-')[2]](); // Extract the export type from the option id
        });
    });
};


/**
 *  Converts the primers from the sidebar html element into a 2d array.
 */
function getPrimersAsTable(includeColumnNames = false) {
    const sidebarDiv = document.getElementsByClassName('sidebar-content')[0];
    const modDivs = sidebarDiv.querySelectorAll('#mod-div');
    const fileName = document.getElementById("plasmid-file-name1").innerText.replace(/\.[^/.]+$/, "") + " primers";
    console.log("modDivs", modDivs)

    let tableData = [];
    if (includeColumnNames === true) {tableData.push(["Primer Name", "Primer Sequence"])}
    for (var i = 0; i < modDivs.length; i++) {
        const currentDiv = modDivs[i];
        const h3Div = currentDiv.querySelector("#primers-type");
        const modType = h3Div.getAttribute("primers-type");
        console.log("Mod Type", modType);
        console.log(currentDiv)
        const primerDivs = currentDiv.querySelectorAll("#primer-div");
        console.log(primerDivs)
        for (var j = 0; j < primerDivs.length; j++) {
            const currPrimerDiv = primerDivs[j]

            const primerIdDiv = currPrimerDiv.querySelector("#primer-id");
            let primerId = ""
            const primerDirection = currPrimerDiv.getAttribute("direction");

            const h3Edited = currentDiv.querySelector("#primers-type").getAttribute("edited");
            const modIndex = (h3Edited === true) ? "": currentDiv.innerText.split(" ")[0].replace(".", "");
            const idEdited = primerIdDiv.getAttribute("edited");
            const subcloningVectorSuffix = (primerIdDiv.innerText.toLowerCase().includes("vector")) ? "_vec": "";
            // id and h3 edited -> id
            // id edited -> id
            // h3 edited -> id from h3
            // none edited -> default
            console.log("Edited", idEdited, idEdited === "true", h3Edited, h3Edited === "true")
            if (idEdited === "true") {
                primerId = primerIdDiv.innerText;
            } else if (h3Edited === "true") {
                primerId = h3Div.innerText + subcloningVectorSuffix + "_" + primerDirection;
            } else {
                primerId = modType + modIndex + subcloningVectorSuffix + "_" + primerDirection;
            };

            const primerSeq = currPrimerDiv.querySelector("#primer-sequence").innerText;

            console.log("Primer", primerId, primerSeq, primerIdDiv.getAttribute("edited"));

            tableData.push([primerId, primerSeq])
        };
    };
    return tableData
};


/**
 * Export primers to different files
 */
const exportPrimersDict = {
    // Plain text
    txt : () => {
        const fileName = document.getElementById("plasmid-file-name1").innerText.replace(/\.[^/.]+$/, "") + " primers";
        const htmlTextContent = document.getElementsByClassName('sidebar-content')[0].innerText;
        let lines = htmlTextContent.split("\n");
        lines = lines.filter(function(item) {
            return item.trim() !== '';
        });

        let textContent = "";
        for (i = 1; i < lines.length; i += 7) {
            textContent += i !== 1 ? "\n": "";
            textContent += lines[i] + "\n";
            textContent += lines[i + 1] + " " + lines[i + 2] + " " + lines[i + 3] + "\n";
            textContent += lines[i + 4] + " " + lines[i + 5] + " " + lines[i + 6] + "\n";
        };

        const blob = new Blob([textContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName + '.txt';
        link.click();
    },
    // Microsoft Word
    doc : () => {
        const fileName = document.getElementById("plasmid-file-name1").innerText.replace(/\.[^/.]+$/, "") + " primers";
        const htmlContent = document.getElementsByClassName('sidebar-content')[0].innerHTML;
        
        const docx = window.htmlDocx.asBlob(htmlContent);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(docx);
        link.download = fileName + '.docx';
        link.click();
    },
    // CSV
    csv : () => {
        const fileName = document.getElementById("plasmid-file-name1").innerText.replace(/\.[^/.]+$/, "") + " primers";
        const tableData = getPrimersAsTable(includeColumnNames = true);

        let csvLines = tableData.map(function(row) {
            return row.map(function(cell) {
                return '"' + String(cell).replace(/"/g, '""') + '"';
            }).join(',');
        });
    
        const textContent = csvLines.join('\n');
        const blob = new Blob([textContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName + '.csv';
        link.click();
    },
    // Excel file
    xlsx: () => {
        const fileName = document.getElementById("plasmid-file-name1").innerText.replace(/\.[^/.]+$/, "") + " primers";
        const tableData = getPrimersAsTable(includeColumnNames = true);

        let wb = XLSX.utils.book_new();
        wb.SheetNames.push("Sheet 1");
        wb.Sheets["Sheet 1"] = XLSX.utils.aoa_to_sheet(tableData);
        XLSX.writeFile(wb, fileName + '.xlsx');
    },
    // Microsynth Excel Template
    microsynth: () => {
        const tableData = getPrimersAsTable(includeColumnNames = false);
        let primerList = [];
        for (i = 0; i < tableData.length; i++) {
            const primerId = tableData[i][0];
            const primerSeq = tableData[i][1]
            primerList.push([primerId, primerSeq, null, "DES", (primerSeq.length <= 60) ? "GEN": 0.04]);
        };

        const formName = "MicrosynthUploadFormDNA.xlsx";
        const templatePath = "/static/" + formName;
        fetch(templatePath)
            .then((res) => res.arrayBuffer())
            .then((ab) => {
                const workbook = new ExcelJS.Workbook();
                return workbook.xlsx.load(ab);
            })
            .then((workbook) => {
                const worksheet = workbook.getWorksheet("DNA Order"); // Assuming the second sheet needs to be modified
                console.log("Microsynth", worksheet.name, primerList);

                for (let i = 0; i < primerList.length; i++) {
                    const row = primerList[i];
                    const rowIndex = i + 4;
                    const cellId = "A" + rowIndex;
                    console.log("Microsynth", "Adding row at", cellId, "with data", row);
              
                    // Create an array representing the entire row with only the specified columns modified
                    const modifiedRow = Array.from({ length: worksheet.columnCount }, (_, colIndex) => {
                      if (colIndex !== 2 ) {
                        return row[colIndex];
                      } else {
                        return worksheet.getCell(rowIndex, colIndex + 1).value;
                      }
                    });
              
                    // Insert the modified row into the worksheet
                    worksheet.spliceRows(rowIndex, 1, modifiedRow);
                };

                // Save the modified workbook
                return workbook.xlsx.writeBuffer();
            })
            .then((buffer) => {
                // Create a Blob from the buffer and trigger the download
                const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = formName;
                link.click();
            })
            .catch((error) => {
                console.error("Error fetching or reading the file:", error);
            });
        }
};


/**
 * Highlights where the primer sequence is in the plasmid sequence.
 */
function primerRegionHover(event) {
    // Get the inner text of the span
    const targetSpan = event.target
    console.log(targetSpan.parentElement.parentElement)
    const spanSequence = targetSpan.innerText;
    const spanDirection = (targetSpan.parentElement.parentElement.getAttribute("direction") === "fwd") ? "fwd": "rev";
    console.log(spanDirection)
    const spanColor = window.getComputedStyle(targetSpan).backgroundColor;
    console.log('Looking for:', spanSequence, spanColor);
    
    // Highlight hovered sequence in plasmid files
    for (targetPlasmid = 1; targetPlasmid < 3; targetPlasmid++) {
        const currGridstructure = (targetPlasmid === 1) ? gridStructure: gridStructure2;
        let currSequence = null;
        if (targetPlasmid === 1) { 
            currSequence = (spanDirection === "fwd") ? sequence: complementaryStrand;
        } else {
            currSequence = (spanDirection === "fwd") ? sequence2: complementaryStrand2;
        };
        const searchQuery = (spanDirection === "fwd") ? spanSequence: spanSequence.split('').reverse().join('');
        const targetStrand = (spanDirection === "fwd") ? 0: 1;
        console.log("Search query:",  targetPlasmid, targetStrand, searchQuery, null, spanColor);
        highlightOccurences(targetPlasmid, targetStrand, currSequence, searchQuery, currGridstructure, null, spanColor);
    };
};


/**
 * Function to remove highlighting
 */
function removePrimerRegionHighlight() {
    for (pNr = 1; pNr < 3; pNr++) {
        const targetTable = (pNr === 1) ? document.getElementById("sequence-grid"): document.getElementById("sequence-grid2");
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
};


/**
 * Extends the primer from the starting position in the specified direction on the specified strand
 * 
 * Example:
 *                                     startingPos  
 *                                         |
 *                          <--- backward  ▼  forward  --->
 * fwdStrand  -> GGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATAT
 * compStrand -> ATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCC
 *                          <--- forward   ▲  backward --->
 * 
 * 
 * Backward extension on fwdStrand, ATG as the mutseq:
 *                                     startingPos  
 *                                         |
 *                                         ▼  
 * fwdStrand  -> GGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATAT
 *                           <-------------
 *                           TTTATATATGGATG
 *                           ▲
 *                           |
 *                           Melting temperature exceeds targetTm here.
 * 
 * 
 * startingPos - initial position
 * targetStrand - strand where the extension takes place, "fwdStrand" or "compStrand"
 * direction - either "forward" or "backward" (see above, directionality is flipped on the complementary strand)
 * targetTm - the function extends the primer until the primer has a melting temperature above targetTm
 * minLength - a minimum length to make sure the melting temperature calculator does not give NaN
 * pNr - plasmid number, important when the second plasmid is imported for subcloning, 1 or 2
 * mutSeq - sequence that will be inserted and will be the starting sequence for the homologous region of the forward primer
 *  
 */
function primerExtension(startingPos, targetStrand, direction, targetTm, method, minLength, pNr, mutSeq) {
    console.log("PE", startingPos, targetStrand, direction, targetTm, minLength, pNr, mutSeq)
    
    let p_start_index = startingPos - 1; // Convert sequence index to string index
    let length = minLength; // initial value for length

    // Set working strand
    let currStrand = targetStrand === 'fwdStrand' ? sequence : complementaryStrand;
    // If we're working on the second plasmid, change working strand to that
    if (pNr === 2) {
        currStrand = targetStrand === 'fwdStrand' ? sequence2 : complementaryStrand2;
    };

    // Check if we have a sequence to start with
    let accessory = ""
    if (mutSeq) {
        accessory = mutSeq;
    };


    // Initialise previous primer based on target strand and direction and using the min length
    let prev_p = "";
    if (direction === "forward") {
        prev_p = targetStrand === 'fwdStrand' ? repeatingSlice(currStrand, p_start_index, p_start_index + length - 1) + accessory: repeatingSlice(currStrand, p_start_index - length, p_start_index);
    } else {
        prev_p = targetStrand === 'fwdStrand' ? repeatingSlice(currStrand, p_start_index - length + 1, p_start_index) + accessory: repeatingSlice(currStrand, p_start_index, p_start_index - length);
    };
    console.log("prev_p", targetStrand, direction, p_start_index, prev_p)
    let prev_tm = get_tm(prev_p, primerConc, saltConc, method); // Get melting temperature of initial primer
    
    // Main loop for the extension of the primer
    const maxIter = 50; // Maximum amount of iterations in case of errors
    let i = 0;
    while (i < maxIter) {
        let curr_p = ""; // Reset current primer
        // Set current primer using the current length then get its temperature
        if (direction === "forward") {
            curr_p = targetStrand === 'fwdStrand' ? repeatingSlice(currStrand, p_start_index, p_start_index + length) + accessory: repeatingSlice(currStrand, p_start_index - length - 1, p_start_index);
        } else {
            curr_p = targetStrand === 'fwdStrand' ? repeatingSlice(currStrand, p_start_index - length, p_start_index) + accessory: repeatingSlice(currStrand, p_start_index, p_start_index - length - 1);
        };
        let curr_tm = get_tm(curr_p, primerConc, saltConc, method);

        /** If the melting temperature of the current primer exceeds the target temperature, break the loop 
         * and return either the current primer or the previous one, whichever is closest to the target temperature*/ 
        if (curr_tm >= targetTm && curr_p.length >= minLength) {
            if (Math.abs(curr_tm - targetTm) <= Math.abs(prev_tm - targetTm)) {
                primer_fwd_tm = curr_tm;
                primer_fwd = curr_p;
            } else {
                primer_fwd_tm = prev_tm;
                primer_fwd = prev_p;
            };
            break;
        };

        // Adjusting loop variables
        prev_tm = curr_tm;
        prev_p = curr_p;
        length += 1;
        i++;
    };

    // Primer needs to be flipped if it was not fromt he fwdStrand
    if (targetStrand !== "fwdStrand") {
        primer_fwd = primer_fwd.split('').reverse().join('');
    };

    // Move the accessory (mutSeq) from the front to the back for compStrand
    if (direction !== "forward") {
        primer_fwd = primer_fwd.replace(accessory, "") + accessory;
    };

    return primer_fwd;
};


/**
 * Takes in a sequence of amino acids (inputAA) as input and returns the DNA sequence with
 * the lowest melting temperature. This function calls generateDNASequences to create all
 * possible DNA sequences for the specified amino acid sequence.
 * 
 * inputAA - amino acid sequence to optimize
 * 
 */
function optimizeAA(inputAA, targetOrganism) {
    // Update last selected organism
    preferredOrganism = targetOrganism;
    saveUserPreference("preferredOrganism", targetOrganism);
    updateOrganismSelectorDefault();

    if (targetOrganism === "prioLowTM") {
        let outputSequence = "";
        let organismCodonTable = lowTMTable;

        let tripletToAdd = "";
        for (let i = 0; i < inputAA.length; i++) {
            frequenciesList = Object.keys(organismCodonTable[inputAA[i]])
            console.log("Optimizer:", frequenciesList)
            tripletToAdd = organismCodonTable[inputAA[i]][frequenciesList[0]]
            
            outputSequence += tripletToAdd
            console.log("Optimizer:", tripletToAdd)
        };
        console.log("Optimizer:", targetOrganism, inputAA, outputSequence)
        return outputSequence;
    };

    /**
     * Using codon frequency tables
     */
    let outputSequence = "";
    let organismCodonTable = codonTablesDict[targetOrganism];

    let tripletToAdd = "";
    for (let i = 0; i < inputAA.length; i++) {
        frequenciesList = Object.keys(organismCodonTable[inputAA[i]])
        console.log("Optimizer:", frequenciesList)
        tripletToAdd = organismCodonTable[inputAA[i]][frequenciesList[0]]
        
        outputSequence += tripletToAdd
        console.log("Optimizer:", tripletToAdd)
    };
    console.log("Optimizer:", targetOrganism, inputAA, outputSequence)
    return outputSequence;
};


/**
 * Creates the replacement primers. Takes in either a DNA sequence or an amino acid sequence and creates primers
 * that will delete the section between the start and end positions specified and then insert the DNA sequence.
 * The melting temperature of the DNA sequence to be inserted determines the amount of overhang in the primers.
 * 
 * Examples:
 * 
 * 1. Same start and end position, inserting ATG:
 * (homologous and template binding regions are extended until they reach their specified melting temperatures)
 * 
 *                       homologous region  insertion      template binding region
 *                                    |         |            |
 *                            ┏---------------┓┏-┓┏------------------------┓
 *                            TTATATATGGGGAAAAAATGTTTATATATGGGGAAAAAAAATTTA  
 * fwdStrand  -> GGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATAT
 * compStrand -> ATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCC
 *                       ATTTTTTTTCCCCATATATAAATTT
 *                       ┗-----------------------┛   
 *                                   |
 *                      homologous region
 * 
 * 2. Different start and end positions (3 bp difference), inserting a long sequence (CATCATCATCATCATCATCAT):
 * (template binding regions are extended until their target temperature,
 * the insertion can be as long as it needs to be
 * BUT the reverse complement of the insertion needs to be truncated to only reach the target temperature
 * of the homologous region)
 * 
 *                             insertion in full    template binding region
 *                                      |                     |
 *                           ┏-------------------┓┏------------------------┓
 *                           CATCATCATCATCATCATCATTTTATATATGGGGAAAAAAAATTTA  
 * fwdStrand  -> GGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATAT
 * compStrand -> ATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCC
 *                    ATTTTTTTTCCCCATATATAAATTTGTAGTAGTAGTAGTAGTAG
 *                    ┗-----------------------┛┗-----------------┛   
 *                                |                      |
 *                   homologous region     reverse complement of insertion

 * 
 * dnaToInsert - DNA sequence to be inserted between the specified indices
 * aaToInsert - amino acid sequence to be inserted, it will be converted to the DNA sequence with the lowest possible melting temperature
 * replaceStartPos, replaceEndPos - indices of the segment to be deleted, then filled with the new DNA sequence
 * 
 */
function createReplacementPrimers(dnaToInsert, aaToInsert, targetOrganism,  replaceStartPos, replaceEndPos) {
    // Define operation type
    let operationType = "Mutation";
    if (!replaceEndPos) { // if startPos equals endPos then its just an insertion
        replaceEndPos = replaceStartPos;
        operationType = "Insertion"
    };
    console.log("HERE1", operationType, dnaToInsert, aaToInsert, targetOrganism, replaceStartPos, replaceEndPos)
    // Make sure that startPos is the smaller number
    if (replaceStartPos > replaceEndPos) {
        let temp = replaceStartPos;
        replaceStartPos = replaceEndPos;
        replaceEndPos = temp;
    };

    // If theres no input, use the default sequence for testing
    if (!aaToInsert && !dnaToInsert) {
        aaToInsert = "GGGGS";
    };

    // If an animo acid sequence is given, send it for optimization (lowest melting temperature)
    // otherwise use the DNA sequence given.
    let seqToInsert = "";
    if (aaToInsert) {
        console.log("Optimizing aa sequence to 49.5 C.");
        seqToInsert = optimizeAA(aaToInsert, targetOrganism);
    } else {
        seqToInsert = dnaToInsert;
    };
    

    // Make the primers
    let homoFwd = "";
    let tempFwd = "";
    let homoRev = "";
    let tempRev = "";
    // If the sequence to be inserted has a melting temperature lower than 49 C, extende the primer backward
    if (get_tm(seqToInsert, primerConc, saltConc, "oligoCalc") < upperBoundShortInsertions) { // Mutation < 49 C, need homolog region

        if (primerDistribution === false) {
            console.log("Short insertion: DONT DISTRIBUTE")
            // Forward template binding region, extend forward on the forward strand from the end position
            tempFwd = primerExtension(replaceEndPos, "fwdStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, 1);
            // Reverse template binding region, extend forward on the complementary strand from the start position
            tempRev = primerExtension(replaceStartPos, "compStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, 1);

            // Forward homologous region, extend backwards on the forward strand from the start position
            homoFwd = primerExtension(replaceStartPos, "fwdStrand", "backward", homoRegionTm, "oligoCalc", homoRegionMinLength, 1);
            // There is no need for a homologous region in the reverse primer, the homologous region of the forward primer
            // will bind to the template binding region of the reverse primer instead.
            homoRev = "";
            
            // Display primers in the sidebar
            let primersDict = {}
            const primerInfoFwd = `(Homologous region: ${homoFwd.length} bp, ${Math.round(get_tm(homoFwd, primerConc, saltConc, "oligoCalc"))} ℃;
                                    Template binding region: ${tempFwd.length} bp, ${Math.round(get_tm(tempFwd, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃; 
                                    Total: ${(tempFwd.length + seqToInsert.length + tempFwd.length)} bp)`;
            const primerInfoRev = `(Template binding region: ${tempRev.length} bp, ${Math.round(get_tm(tempRev, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃; 
                                    Total: ${(tempRev.length)} bp)`;
            primersDict["Forward Primer"] = {1: {"seq": homoFwd, "color": primerColorOrange},
                                            2: {"seq": seqToInsert, "color": primerColorRed},
                                            3: {"seq": tempFwd, "color": primerColorGreen},
                                            info: primerInfoFwd};
            primersDict["Reverse Primer"] = {1: {"seq": tempRev, "color": primerColorGreen},
                                            info: primerInfoRev};
            
            console.log("Primers Dict:", primersDict)
            displayPrimers("Short " + operationType, primersDict);
        } else if (primerDistribution === true) {
            console.log("Short insertion: DISTRIBUTE")

            let homoFragmentLength1 = 0;
            let homoFragmentLength2 = 0;
            let homoFwd1 = primerExtension(replaceStartPos, "fwdStrand", "backward", homoRegionTm, "oligoCalc", homoRegionMinLength, 1);
            let homoFwd2 = primerExtension(replaceEndPos, "fwdStrand", "forward", homoRegionTm, "oligoCalc", homoRegionMinLength, 1);
            let overlappingSeq = homoFwd1 + seqToInsert + homoFwd2;

            let turn = "homoFwd1";
            while (true) {
                if (turn === "homoFwd1") {
                    const stillAboveTargetTM = get_tm(overlappingSeq.slice(1), primerConc, saltConc, "oligoCalc") > homoRegionTm;
                    const slicingGetsUsCloser = Math.abs(homoRegionTm - get_tm(overlappingSeq.slice(1), primerConc, saltConc, "oligoCalc")) <= Math.abs(homoRegionTm - get_tm(overlappingSeq, primerConc, saltConc, "oligoCalc"));
                    const minimumLengthNotReached = overlappingSeq.length > homoRegionMinLength;
                    if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                        overlappingSeq = overlappingSeq.slice(1);
                        homoFragmentLength1++;
                        turn = "homoFwd2";
                    } else{break};
                } else if (turn === "homoFwd2") {
                    const stillAboveTargetTM = get_tm(overlappingSeq.slice(0, -1), primerConc, saltConc, "oligoCalc") > homoRegionTm;
                    const slicingGetsUsCloser = Math.abs(homoRegionTm - get_tm(overlappingSeq.slice(0, -1), primerConc, saltConc, "oligoCalc")) <= Math.abs(homoRegionTm - get_tm(overlappingSeq, primerConc, saltConc, "oligoCalc"));
                    const minimumLengthNotReached = overlappingSeq.length > homoRegionMinLength;
                    if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                        overlappingSeq = overlappingSeq.slice(0, -1);
                        homoFragmentLength2++;
                        turn = "homoFwd1";
                    } else{break};
                };
            };

            homoFwd1 = homoFwd1.slice(homoFragmentLength1, homoFwd1.length);
            homoFwd2 = homoFwd2.slice(0, overlappingSeq.length - homoFragmentLength2 + 1);
            tempFwd = primerExtension(replaceEndPos, "fwdStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice,  7, 1)

            let homoRev1 = getComplementaryStrand(homoFwd2).split('').reverse().join('');
            let homoRev2 = getComplementaryStrand(homoFwd1).split('').reverse().join('');
            console.log("Short insertion", replaceStartPos, replaceStartPos + homoRev2.length)
            tempRev = primerExtension(replaceStartPos, "compStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, 1)
 
            // Display primers in the sidebar
            let primersDict = {}
            const primerInfoFwd = `(Overlap: ${overlappingSeq.length} bp, ${Math.round(get_tm(overlappingSeq, primerConc, saltConc, "oligoCalc"))} ℃;
                                    Template binding region: ${tempFwd.length} bp, ${Math.round(get_tm(tempFwd, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃; 
                                    Total: ${(homoFwd1.length + seqToInsert.length + tempFwd.length)} bp)`;
            const primerInfoRev = `(Template binding region: ${tempRev.length} bp, ${Math.round(get_tm(tempRev, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃; 
                                    Total: ${(homoRev1.length + seqToInsert.length + tempRev.length)} bp)`;
            primersDict["Forward Primer"] = {1: {"seq": homoFwd1, "color": primerColorOrange},
                                            2: {"seq": seqToInsert, "color": primerColorRed},
                                            3: {"seq": tempFwd, "color": primerColorGreen},
                                            info: primerInfoFwd};
            primersDict["Reverse Primer"] = {1: {"seq": homoRev1, "color": primerColorOrange},
                                             2: {"seq": getComplementaryStrand(seqToInsert).split("").reverse().join(""), "color": primerColorRed},
                                             3: {"seq": tempRev, "color": primerColorGreen},
                                             info: primerInfoRev};
            
            console.log("Primers Dict:", primersDict)
            displayPrimers("Short " + operationType, primersDict);
        };
    } else { //  // Mutation > 49 C
        // Forward template bindin region
        tempFwd = primerExtension(replaceEndPos, "fwdStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, 1);
        // Reverse template binding region
        tempRev = primerExtension(replaceStartPos, "compStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, 1);
        
        // Forward homologous region is just the sequence to be inserted
        homoFwd = seqToInsert;
        // The reverse starts of as the complementary sequence to the sequence to be inserted
        // but wil be shortened until the optimal target melting temperature is reached
        homoRev = getComplementaryStrand(homoFwd).split('').reverse().join('');

        let overlappingSeq = "";
        if (primerDistribution === false) {
            while (true) {
                const stillAboveTargetTM = get_tm(homoRev.slice(1), primerConc, saltConc, "oligoCalc") > homoRegionTm;
                const slicingGetsUsCloser = Math.abs(homoRegionTm - get_tm(homoRev.slice(1), primerConc, saltConc, "oligoCalc")) <= Math.abs(homoRegionTm - get_tm(homoRev, primerConc, saltConc, "oligoCalc"));
                const minimumLengthNotReached = homoRev.length > homoRegionMinLength;
                if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                    homoRev = homoRev.slice(1);
                } else {break};
            };
            overlappingSeq = homoRev;
        } else if (primerDistribution === true) {
            let homoFwdFragmentLength = 0;
            let homoRevFragmentLength = 0;
            overlappingSeq = seqToInsert;
            let turn = "fwd";
            console.log("Long insertion", homoRegionTm)
            while (true) {
                if (turn === "fwd") {
                    const stillAboveTargetTM = get_tm(overlappingSeq.slice(1), primerConc, saltConc, "oligoCalc") > homoRegionTm;
                    const slicingGetsUsCloser = Math.abs(homoRegionTm - get_tm(overlappingSeq.slice(1), primerConc, saltConc, "oligoCalc")) <= Math.abs(homoRegionTm - get_tm(overlappingSeq, primerConc, saltConc, "oligoCalc"));
                    const minimumLengthNotReached = overlappingSeq.length > homoRegionMinLength;
                    if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                        overlappingSeq = overlappingSeq.slice(1);
                        homoFwdFragmentLength++;
                        turn = "rev";
                    } else{break};
                } else if (turn === "rev") {
                    const stillAboveTargetTM = get_tm(overlappingSeq.slice(0, -1), primerConc, saltConc, "oligoCalc") > homoRegionTm;
                    const slicingGetsUsCloser = Math.abs(homoRegionTm - get_tm(overlappingSeq.slice(0, -1), primerConc, saltConc, "oligoCalc")) <= Math.abs(homoRegionTm - get_tm(overlappingSeq, primerConc, saltConc, "oligoCalc"));
                    const minimumLengthNotReached = overlappingSeq.length > homoRegionMinLength;
                    if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                        overlappingSeq = overlappingSeq.slice(0, -1);
                        homoRevFragmentLength++;
                        turn = "fwd";
                    } else{break};
                };
            };

            console.log("Long insertion", homoFwdFragmentLength, homoRevFragmentLength)
            console.log("Long insertion", homoFwd, homoFwd.length, homoRev, homoRev.length)
            homoFwd = homoFwd.slice(homoFwdFragmentLength, homoFwd.length);
            homoRev = homoRev.slice(homoRevFragmentLength, homoRev.length);
            console.log("Long insertion", homoFwd, homoFwd.length, homoRev, homoRev.length)
        };

        // Display primers in the sidebar
        let primersDict = {}
        const primerInfoFwd = `(Overlap: ${overlappingSeq.length} bp, ${Math.round(get_tm(overlappingSeq, primerConc, saltConc, "oligoCalc"))} ℃;
                                Template binding region: ${tempFwd.length} bp, ${Math.round(get_tm(tempFwd, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃; 
                                Total: ${(homoFwd.length + tempFwd.length)} bp)`;
        const primerInfoRev = `(Template binding region: ${tempRev.length} bp, ${Math.round(get_tm(tempRev, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃; 
                                Total: ${(homoRev.length + tempRev.length)} bp)`;
        primersDict["Forward Primer"] = {1: {"seq": homoFwd, "color": primerColorRed},
                                         2: {"seq": tempFwd, "color": primerColorGreen},
                                        info: primerInfoFwd};
        primersDict["Reverse Primer"] = {1: {"seq": homoRev, "color": primerColorRed},
                                         2: {"seq": tempRev, "color": primerColorGreen},
                                         info: primerInfoRev};
        
        console.log("Primers Dict:", primersDict)
        displayPrimers("Medium " + operationType, primersDict);
    }

    // Update the sequence and features
    const plasmidLengthDiff = seqToInsert.length - (replaceEndPos - replaceStartPos)
    updateFeatures(operationType, seqToInsert, replaceStartPos, replaceEndPos, plasmidLengthDiff, 1);
};


/**
 * Creates the deletion primers that will delete the segment between the two specified indices.
 * 
 * Examples:
 * Everything between deletion start and deletion end will not be present after recombination.
 * (homologous and template binding regions are extended until they reach their specified melting temperatures)
 * 
 *                      homologous region   deletion end  template binding region
 *                                    |           |          |
 *                       ┏-----------------------┓┏------------------------┓
 *                       TATATGGGGAAAAAAAATTTATATATTTATATATGGGGAAAAAAAATTTA  
 * fwdStrand  -> GGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATATGGGGAAAAAAAATTTATATAT
 * compStrand -> ATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCCATATATAAATTTTTTTTCCCC
 *                TATATAAATTTTTTTTCCCCATATA
 *                ┗-----------------------┛   
 *                            |           |
 *         template binding region     deletion start

 * 
 * deletionStartPos, deletionEndPos - indices of the segment to be deleted
 */
function createDeletionPrimers(deletionStartPos, deletionEndPos) {
    // Swap indices so start is always the smaller index
    if (deletionStartPos > deletionEndPos) {
        let temp = deletionStartPos;
        deletionStartPos = deletionEndPos;
        deletionEndPos = temp;
    }
    console.log('Creating deletion primers...', selectedText, deletionStartPos, deletionEndPos);

    // Forward template binding region, extend forward on the forward strand from the end position
    let tempFwd = primerExtension(deletionEndPos, "fwdStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, 1);

    // Reverse homologous region, but extend it up to the melting temperature of the template region
    let tempRev = primerExtension(deletionStartPos, "compStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, 1);

    // The forward homologous region is the reverse complement of the reverse homologous region
    let homoFwd = getComplementaryStrand(tempRev);

    // Slice the forward homologous region until target temperature is reached
    while (get_tm(homoFwd.slice(0, -1), primerConc, saltConc, "oligoCalc") > homoRegionTm && homoFwd.length > homoRegionMinLength) {
        homoFwd = homoFwd.slice(0, -1);
    }
    // Check if slicing one more base would get us closer to the target temp
    const oldTm = get_tm(homoFwd, primerConc, saltConc, "oligoCalc");
    const newTm = get_tm(homoFwd.slice(0, -1), primerConc, saltConc, "oligoCalc");
    if (Math.abs(oldTm - homoRegionTm) >= Math.abs(newTm - homoRegionTm) && homoFwd.slice(0, -1).length >= homoRegionMinLength) {
        homoFwd = homoFwd.slice(0, -1);
    };
    // Flip primer for display
    homoFwd = homoFwd.split("").reverse().join("");

    /**
     * const primerColorRed = "rgb(200, 52, 120)"
     * const primerColorGreen = "rgb(68, 143, 71)"
     * const primerColorOrange = "rgb(217, 130, 58)"
     * const primerColorPurple = "rgb(107, 96, 157)"
     * const primerColorCyan = "rgb(140, 202, 242)"
     */
    let primersDict = {};
    const primerInfoFwd = `(Homologous region: ${homoFwd.length} bp, ${Math.round(get_tm(homoFwd, primerConc, saltConc, "oligoCalc"))} ℃;
                            Template binding region: ${tempFwd.length} bp, ${Math.round(get_tm(tempFwd, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃; 
                            Total: ${(homoFwd.length + tempFwd.length)} bp)`;
    const primerInfoRev = `(Template binding region: ${tempRev.length} bp, ${Math.round(get_tm(tempRev, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃)`;
    primersDict["Forward Primer"] = {1: {"seq": homoFwd, "color": primerColorOrange},
                                     2: {"seq": tempFwd, "color": primerColorGreen},
                                    info: primerInfoFwd};
    primersDict["Reverse Primer"] = {1: {"seq": tempRev, "color": primerColorGreen},
                                    info: primerInfoRev};
    
    console.log("Primers Dict:", primersDict)

    displayPrimers("Deletion", primersDict);

    // Update the sequence and features
    const plasmidLengthDiff = 0 - (deletionEndPos - deletionStartPos);
    updateFeatures("Deletion", "", deletionStartPos, deletionEndPos, plasmidLengthDiff, 1);
};


/**
 * Creates the subcloning primers. Explanation here.
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
 * subcloningStartPos, subcloningEndPos - indices of the segment to be subcloned into the second plasmid
 */
function createSubcloningPrimers(subcloningStartPos, subcloningEndPos) {
    // Initialise variables
    let subcloningInsertPositionStart = null;
    let subcloningInsertPositionEnd = null;
    let selectingSubcloningTarget = false; // Set the state to not currently seleting on the subcloning vector
    let subcloningInsertionSequence = selectedText; // Capture currently selected text
    
    // Switch indices so that the start position is always smaller
    if (subcloningStartPos > subcloningEndPos) {
        let temp = subcloningStartPos;
        subcloningStartPos = subcloningEndPos;
        subcloningEndPos = temp;
    };

    console.log('Creating subcloning primers...', subcloningInsertionSequence, subcloningStartPos, subcloningEndPos);

    // Select the second plasmid's sequence grid
    const element = document.getElementById('sequence-grid2');
    // Change the cursor to a pointer when it's over the element
    element.style.cursor = 'pointer';

    // Listen for click events on the element
    let startCell = null;
    let endCell = null;
    element.addEventListener('mousedown', function(event) {
        event.stopPropagation(); // Prevent the event from bubbling up to the document
        // Once the mouse is clicked inside the second sequence grid
        subcloningInsertPositionStart = basePosition2; // Capture mouse position
        // Reset selection variables
        startCell = null;
        endCell = null;
        console.log('start: ', subcloningInsertPositionStart);
        selectingSubcloningTarget = true; // Signal that the selection has started
    }, { once: true });

    // Listen for mouse movement
    element.addEventListener('mousemove', function(event) {
        // Check if we have started a selection, we have a start position for the selection, and the mouse has since moved from the initial position
        if (selectingSubcloningTarget && subcloningInsertPositionStart && subcloningInsertPositionStart !== basePosition2) {
            subcloningInsertPositionEnd = basePosition2; // Update the end of the selection to the current mouse position
            // Initialise variables for table coordinates
            let startCoords = null;
            let startRowIndex = null;
            let startCellIndex = null;
            let endCoords = null;
            let endRowIndex = null;
            let endCellIndex = null;

            // Convert sequence index to table coordinates
            if (subcloningInsertPositionStart < subcloningInsertPositionEnd) {
                startCoords = seqIndexToCoords(subcloningInsertPositionStart, 0, gridStructure2);
                startRowIndex = startCoords[0];
                startCellIndex = startCoords[1];
                endCoords = seqIndexToCoords(subcloningInsertPositionEnd, 0, gridStructure2);
                endRowIndex = endCoords[0];
                endCellIndex = endCoords[1] - 1;
            } else {
                startCoords = seqIndexToCoords(subcloningInsertPositionEnd, 0, gridStructure2);
                startRowIndex = startCoords[0];
                startCellIndex = startCoords[1];
                endCoords = seqIndexToCoords(subcloningInsertPositionStart, 0, gridStructure2);
                endRowIndex = endCoords[0];
                endCellIndex = endCoords[1] - 1;
            };

            // Clears the previous selection in the second sequence grid
            function clearSelection() {
                const selectedCells = element.querySelectorAll('.selected-cell-subcloning-target');
                selectedCells.forEach((cell) => {
                cell.classList.remove('selected-cell-subcloning-target');
                });
                selectedText2 = "";
            };
            clearSelection();

            // Iterate over cells between start and end cells and mark them as selected by adding a css class
            // Iterate over all rows
            for (let i = startRowIndex; i <= endRowIndex; i++) {
                const row = element.rows[i]; // Get current row
                const start = (i === startRowIndex) ? startCellIndex : 0; // If first row, start is the cell's index, otherwise start at the beginnig of the row
                const end = (i === endRowIndex) ? endCellIndex : row.cells.length - 1; // If in the last row, stop at the selection end, otherwise cover the row

                for (let j = start; j <= end; j++) { // Itterate over cells in row
                    const selectedCell = row.cells[j]; // Fetch current cell
                    // Check if the selected cell is in the forward strand row and selected cell is not empty
                    if (selectedCell.id === "Forward Strand" && selectedCell.innerText.trim() !== "") {
                        selectedCell.classList.add('selected-cell-subcloning-target');
                    };
                };
            };
        };
    });

    // Look for mouse up to end the selection
    element.addEventListener('mouseup', function(event) {
        event.stopPropagation(); // Prevent the event from bubbling up to the document

        subcloningInsertPositionEnd = basePosition2; // Fetch the mouse's final position
        console.log('end: ', subcloningInsertPositionEnd);
        element.style.cursor = 'default'; // Reset mouse icon
        selectingSubcloningTarget = false; // Signal that the selection has ended

        // Swap indices if they are ordered wrong
        if (subcloningInsertPositionStart > subcloningInsertPositionEnd) {
            let temp = subcloningInsertPositionStart;
            subcloningInsertPositionStart = subcloningInsertPositionEnd;
            subcloningInsertPositionEnd = temp;
        };
        
        /**
         * Make the primers
         */
        // Extend the insert template binding regions
        let insertTempFwd = primerExtension(subcloningStartPos, "fwdStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, 1); // 60
        let insertTempRev = primerExtension(subcloningEndPos, "compStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, 1); // 60

        // Extend the vector template binding regions
        let vecFwd = primerExtension(subcloningInsertPositionEnd, "fwdStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, 2); // 60
        let vecRev = primerExtension(subcloningInsertPositionStart, "compStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, 2); // 60

        // Creat the insert homologous regions by getting the complementary sequence of the vecor template binding regions
        // and slicing them until they are the target temperatures for homologous regions
        let insertHomoFwd = getComplementaryStrand(vecRev);
        while (get_tm(insertHomoFwd.slice(0, -1), primerConc, saltConc, "oligoCalc") > homoRegionTm && insertHomoFwd.length > homoRegionMinLength) {
            insertHomoFwd = insertHomoFwd.slice(0, -1);
        };
        let oldTm = get_tm(insertHomoFwd, primerConc, saltConc, "oligoCalc");
        let newTm = get_tm(insertHomoFwd.slice(0, -1), primerConc, saltConc, "oligoCalc");
        if (Math.abs(oldTm - homoRegionTm) >= Math.abs(newTm - homoRegionTm) && insertHomoFwd.slice(0, -1).length >= homoRegionMinLength) { // Check which is closer to target tm
            insertHomoFwd = insertHomoFwd.slice(0, -1);
        };
        insertHomoFwd = insertHomoFwd.split("").reverse().join("");

        let insertHomoRev = getComplementaryStrand(vecFwd);
        while (get_tm(insertHomoRev.slice(0, -1), primerConc, saltConc,"oligoCalc") > homoRegionTm && insertHomoRev.length > homoRegionMinLength) { // Check which is closer to target tm
            insertHomoRev = insertHomoRev.slice(0, -1);
        };
        oldTm = get_tm(insertHomoRev, primerConc, saltConc, "oligoCalc");
        newTm = get_tm(insertHomoRev.slice(0, -1), primerConc, saltConc, "oligoCalc");
        if (Math.abs(oldTm - homoRegionTm) >= Math.abs(newTm - homoRegionTm)  && insertHomoRev.slice(0, -1).length >= homoRegionMinLength) {
            insertHomoRev = insertHomoRev.slice(0, -1);
        };
        insertHomoRev = insertHomoRev.split("").reverse().join("");


        // Display primers in the sidebar
        let primersDict = {}
        const primerInfoFwd = `(Homologous region: ${insertHomoFwd.length} bp, ${Math.round(get_tm(insertHomoFwd, primerConc, saltConc, "oligoCalc"))} ℃;
                                Template binding region: ${insertTempFwd.length} bp, ${Math.round(get_tm(insertTempFwd, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃; 
                                Total: ${(insertHomoFwd.length + insertTempFwd.length)} bp)`;
        const primerInfoRev = `(Homologous region: ${insertHomoRev.length} bp, ${Math.round(get_tm(insertHomoRev, primerConc, saltConc, "oligoCalc"))} ℃;
                                Template binding region: ${insertTempRev.length} bp, ${Math.round(get_tm(insertTempRev, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃; 
                                Total: ${(insertHomoRev.length + insertTempRev.length)} bp)`;
        const primerInfoVecFwd = `(Template binding region: ${vecFwd.length} bp, ${Math.round(get_tm(vecFwd, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃)`;
        const primerInfoVecRev = `(Template binding region: ${vecRev.length} bp, ${Math.round(get_tm(vecRev, primerConc, saltConc, meltingTempAlgorithmChoice))} ℃)`;
        primersDict["Forward Primer"] = {1: {"seq": insertHomoFwd, "color": primerColorCyan},
                                         2: {"seq": insertTempFwd, "color": primerColorPurple},
                                        info: primerInfoFwd};
        primersDict["Reverse Primer"] = {1: {"seq": insertHomoRev, "color": primerColorCyan},
                                         2: {"seq": insertTempRev, "color": primerColorPurple},
                                         info: primerInfoRev};
        primersDict["Vector Forward Primer"] = {1: {"seq": vecFwd, "color": primerColorCyan},
                                        info: primerInfoVecFwd};
        primersDict["Vector Reverse Primer"] = {1: {"seq": vecRev, "color": primerColorCyan},
                                                info: primerInfoVecRev};
        
        console.log("Primers Dict:", primersDict)
        displayPrimers("Subcloning", primersDict);

        // Update stuff
        const plasmidLengthDiff = (subcloningEndPos - subcloningStartPos) - (subcloningInsertPositionEnd - subcloningInsertPositionStart);
        updateFeatures("Subcloning", subcloningInsertionSequence, subcloningInsertPositionStart, subcloningInsertPositionEnd, plasmidLengthDiff, 2);
    }, { once: true });

    // Listen for click events on the document
    document.addEventListener('click', function() {
        // Your code here for what should happen when something outside the element is clicked
        // Reset the cursor
        element.style.cursor = 'default';
        return;
    }, { once: true });
};


/**
 * Updates the target plasmid sequence, checks if the insertion/deletion crashes with exsiting features and adjusts accordingly (shift or deletion).
 * Lastly, adds the new feature to the feature dict and rebuilds the plasmid as well as refresh it in the viewer.
 * 
 * newFeatureTyp - name of operation type (insertion, deletion, subcloning)
 * newFeatureSequence - sequence of the new feature to be inserted (or "" in the case of deletions)
 * segmentStartPos, segmentEndPos - indices deliminating the span of the new feature (equal in the case of pure insertions)
 * pNr - number of the target plasmid to be updated
 */
function updateFeatures(newFeatureType, newFeatureSequence, segmentStartPos, segmentEndPos, featureShift, pNr) {
    // Update the sequence and features
    // Convert back from sequence indices to string indices
    segmentStartPos--;
    segmentEndPos--;


    // Insertion is added into the main sequence and complementary strand is remade
    if (pNr === 1) {
        sequence = sequence.substring(0, segmentStartPos) + newFeatureSequence + sequence.substring(segmentEndPos);
        complementaryStrand = getComplementaryStrand(sequence);
    } else {
        sequence2 = sequence2.substring(0, segmentStartPos) + newFeatureSequence + sequence2.substring(segmentEndPos);
        complementaryStrand2= getComplementaryStrand(sequence2);
    };

    /**
     * Decides if the old feature should be left alone, shifted, or deleted based on the span of the new feature.
     * 
     * elementKey - working key
     * elementvalue - working value
     * featureStart, featureEnd - indices of new feature that need to be checked against the span of the key
     * 
    */

    function checkNewFeatureOverlap(elementKey, elementValue, featureStart, featureEnd) {
        // Adjust indices if we're dealing with a pure insertion and the start and end indices are identical
        if (featureStart === featureEnd) {
            featureStart++;
            featureEnd++;
        } else { // Adjust indices from sequence indices to feature indices
            featureStart++;
        };
        if (elementValue.span && !elementKey.includes("source")) { // exclude "source" feature as it spans the entire plasmid
            // Get span of current feature
            const currSpan = removeNonNumeric(elementValue.span).split("..").map(Number);
            const spanStart = currSpan[0];
            const spanEnd = currSpan[1];

            // Special cases for pure insertions
            if (featureStart === featureEnd) {
                if (featureStart < spanStart) {
                    //way before, just shift
                    console.log("Case Insertion shift", featureStart, featureEnd, spanStart, spanEnd)
                    return "shift";
                } else if (spanStart === featureStart) {
                    //Insert right before
                    console.log("Case Insertion right before", featureStart, featureEnd, spanStart, spanEnd)
                    return "shift";
                } else if (featureStart < spanEnd) {
                    //Inside, delete
                    console.log("Case Insertion inside", featureStart, featureEnd, spanStart, spanEnd)
                    return "inside";
                } else if (featureStart > spanEnd) {
                    //way after, do noghing
                    console.log("Case Insertion way after", featureStart, featureEnd, spanStart, spanEnd)
                    return null;
                };
            } else {
                /**
                 * Scenarios for replacement features:
                 * 
                 * 0.
                 * old                [         ]
                 * new                 [      ]
                 * -> shift
                 * 
                 * 1.
                 * old                [         ]
                 * new    [        ]
                 * -> shift
                 * 
                 * 2.
                 * old         [         ]
                 * new    [        ]
                 * -> deletion
                 * 
                 * 3.
                 * old          [         ]
                 * new    [                 ] 
                 * -> deletion
                 * 
                 * 4.
                 * old          [         ]
                 * new               [                 ] 
                 * -> deletion

                * 5.
                * old          [         ]
                * new                        [                 ] 
                * -> do nothing
                */

                if (featureStart >= spanStart && featureEnd >= spanStart && featureStart <= spanEnd && featureEnd <= spanEnd && featureStart !== featureEnd) {
                    // 0. new feature is inside the old feature, delete
                    console.log("Case Replacement Case 0", featureStart, featureEnd, spanStart, spanEnd)
                    return "inside";
                } else if (featureStart < spanStart && featureEnd < spanStart && featureStart < spanEnd && featureEnd < spanEnd) {
                    // 1. Find how much t"o shift features after the insertion
                    console.log("Case Replacement Case 1", featureStart, featureEnd, spanStart, spanEnd)
                    return "shift";
                } else if (featureStart < spanStart && featureEnd >= spanStart && featureStart < spanEnd && featureEnd <= spanEnd) {
                    // 2.
                    console.log("Case Replacement Case 2", featureStart, featureEnd, spanStart, spanEnd)
                    return "delete";
                } else if (featureStart < spanStart && featureEnd > spanStart && featureStart < spanEnd && featureEnd > spanEnd) {
                    // 3.
                    console.log("Case Replacement Case 3", featureStart, featureEnd, spanStart, spanEnd)
                    return "delete";
                } else if (featureStart >= spanStart && featureEnd > spanStart && featureStart <= spanEnd && featureEnd > spanEnd) {
                    // 4.
                    console.log("Case Replacement Case 4", featureStart, featureEnd, spanStart, spanEnd)
                    return "delete";
                } else if (featureStart === featureEnd && featureStart <= spanEnd) {
                    return "shift";
                } else {
                    console.log("Case Replacement Case 5", featureStart, featureEnd, spanStart, spanEnd)
                    return null;
                };
            };
            return null;
        };
    };

    // Loop over every feature and either shift it if it occurs after the replacement or delete it if it
    // overlapped with the replacemen
    if (pNr === 1) {
        Object.entries(features).forEach(([key, value]) => {
            const decision = checkNewFeatureOverlap(key, value, segmentStartPos, segmentEndPos, featureShift);
            if (decision === "shift" || decision === "inside") {
                const spanDirection = (!value.span.includes("complement")) ? "fwd": "rev";
                const currSpan = removeNonNumeric(value.span).split("..").map(Number);
                let newSpanStart = null;
                let newSpanEnd = null;
                if (decision === "inside") {
                    newSpanStart = currSpan[0];
                    newSpanEnd = currSpan[1] + featureShift;
                } else {
                    newSpanStart = currSpan[0] + featureShift;
                    newSpanEnd = currSpan[1] + featureShift;
                };
                
                if (spanDirection === "fwd") {
                    features[key].span = newSpanStart + ".." + newSpanEnd; // Update span of the feature
                } else {
                    features[key].span = "complement(" + newSpanStart + ".." + newSpanEnd + ")";
                }
            } else if (decision === "delete") {
                delete features[key];
            };
        });
    } else {
        Object.entries(features2).forEach(([key, value]) => {
            const decision = checkNewFeatureOverlap(key, value, segmentStartPos, segmentEndPos,);
            if (decision === "shift"  || decision === "inside") {
                const spanDirection = (!value.span.includes("complement")) ? "fwd": "rev";
                const currSpan = removeNonNumeric(value.span).split("..").map(Number);
                let newSpanStart = null;
                let newSpanEnd = null;
                if (decision === "inside") {
                    newSpanStart = currSpan[0];
                    newSpanEnd = currSpan[1] + featureShift;
                } else {
                    newSpanStart = currSpan[0] + featureShift;
                    newSpanEnd = currSpan[1] + featureShift;
                };

                if (spanDirection === "fwd") {
                    features2[key].span = newSpanStart + ".." + newSpanEnd; // Update span of the feature
                } else {
                    features2[key].span = "complement(" + newSpanStart + ".." + newSpanEnd + ")";
                }
            } else if (decision === "delete") {
                delete features2[key];
            };
        });
    };

    // Name of the new feature
    let newFeatureName = newFeatureType; // Long name
    if (newFeatureSequence.length < 7) { // If theres no space, abbreviate to first 3 letters
        newFeatureName = newFeatureName.slice(0, 3)
    };

    // Check if there is a previous insertion and if there is, increment the nr at the end
    let i = 2;
    let targetFeaturesDict = features;
    if (pNr === 2) {
        targetFeaturesDict = features2;
    };
    while (newFeatureName in targetFeaturesDict) {
        newFeatureName =  newFeatureName.replace("" + i-1, "")
        newFeatureName += i;
        i++;
    };


    // Creat the new feature
    if (newFeatureType !== "Deletion") {
        const tempDict = {} // init feature dict
        tempDict.label = newFeatureName;
        const insertStringPositionStart = segmentStartPos + 1;
        const insertStringPositionEnd = segmentStartPos + newFeatureSequence.length;
        tempDict.span = insertStringPositionStart + ".." + insertStringPositionEnd;
        tempDict.note = "";
        if (pNr === 1) {
            features[newFeatureName] = tempDict // add feature to features dict
            features = sortBySpan(features) // resort feature dict by their order of appearance in the sequence
        } else {
            features2[newFeatureName] = tempDict // add feature to features dict
            features2 = sortBySpan(features2) // resort feature dict by their order of appearance in the sequence
        };
    };
    // Remake the sidebar and content grid 
    createSideBar(pNr);
    makeContentGrid(pNr);
};


/**
* Sort the features dict by span so that the features appear in order in the sidebar.
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

        //const aValue = Number(a[1][valueKey].split('..')[0]);
        //const bValue = Number(b[1][valueKey].split('..')[0]);
        return rangeStartA - rangeStartB;
    });

    // Convert the sorted array back to a dictionary
    const sortedDict = Object.fromEntries(entries);

    return sortedDict;
};


/**
 * Create the complementary strand to a given DNA sequence.
 */
function getComplementaryStrand(inputSequence) {
    // Map
    const nucleotideComplements = {
        'A': 'T',
        'T': 'A',
        'G': 'C',
        'C': 'G',
        'N': 'N'
    };

    // Convert to uppercase, make into list, map to complementary base, then turn back into string
    const complementaryStrand = inputSequence.toUpperCase()
        .replace(/[^ACTNG]+/g, '')
        .split('')
        .map(nucleotide => nucleotideComplements[nucleotide])
        .join('');

    return complementaryStrand;
};


/**
 * Improved slice() function that allows for negative indices or indices longer than the string length by assuming
 * the string loops.
 * 
 * Example:
 *         startIndex            endIndex
 *             ▼                    ▼
 *         -3 -2 -1 0 1 2 3 4 5 6 7 8 9
 * str ->   _  _  _ A B C D E F G _ _ _
 * 
 * Result -> FGABCDEFGAB
 * 
 * str - string to be sliced
 * startIndex, endIndex - slice indices
 */
function repeatingSlice(str, startIndex, endIndex) {
    const repeatedStr = str.repeat(3); // Copy the string 3 times: ABC_ABC_ABC
    return repeatedStr.slice(startIndex + str.length, endIndex + str.length); // Remap indices to new string then return
};