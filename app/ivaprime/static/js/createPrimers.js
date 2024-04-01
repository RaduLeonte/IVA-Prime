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
    console.log("displayPrimers", primersType, primersDict)
    const sidebarContentDiv = document.querySelector('.sidebar-content'); // Select sidebar
    console.log(sidebarContentDiv)

    // Change sidebar headline
    let element = document.getElementById("primers-div-headline");
    if (element.textContent === "Primers will appear here.") {element.textContent = "Primers:";}


    // Display primer pair nr and type of mod
    const modDiv = document.createElement("div");
    modDiv.id = "mod-div"
    const h3 = document.createElement('h3');
    h3.id = 'primers-type';
    h3.setAttribute("primers-type", primersType.toLowerCase());
    h3.classList.add("editable");
    enableElementEditing(h3, 1)
    h3.setAttribute("edited", false);
    h3.textContent = plasmidDict[currentlyOpenedPlasmid]["operationNr"] + '. ' + primersType;
    plasmidDict[currentlyOpenedPlasmid]["operationNr"] = parseInt(plasmidDict[currentlyOpenedPlasmid]["operationNr"]) + 1;
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
                //primerSequence.appendChild(span)
            };
        };

        const copyPrimerSequenceButton = document.createElement("a");
        copyPrimerSequenceButton.href = "#";
        copyPrimerSequenceButton.setAttribute("onClick", "copyPrimerSequenceToClipboard(this)");
        copyPrimerSequenceButton.classList.add("copy-primer-btn");
        copyPrimerSequenceButton.style.backgroundImage = "url('/static/copy_icon.svg')";
        primerSequence.appendChild(copyPrimerSequenceButton);

        const pPrimerInfo = document.createElement('p')
        const spanPrimerInfo = document.createElement('span');
        spanPrimerInfo.textContent = subprimersDict["info"];
        pPrimerInfo.appendChild(spanPrimerInfo);

        primerSequence.style.wordBreak = 'break-all';
        primerDiv.appendChild(primerSequence);
        primerDiv.appendChild(pPrimerInfo);
        modDiv.append(primerDiv);
    };

    console.log("To add", modDiv)
    sidebarContentDiv.appendChild(modDiv);
    savePrimers();
    addPrimerRegionHoverEvents();
    console.log("After", plasmidDict[currentlyOpenedPlasmid]["sidebarPrimers"])
    // Reset selection
    plasmidDict[currentlyOpenedPlasmid]["selectedText"] = "";
    clearSelection(currentlyOpenedPlasmid, true)
};


/**
 *  Converts the primers from the sidebar html element into a 2d array.
 */
function getPrimersAsTable(plasmidIndex, includeColumnNames = false) {
    const sidebarDiv = document.createElement("div");
    sidebarDiv.innerHTML = plasmidDict[plasmidIndex]["sidebarPrimers"];
    const modDivs = sidebarDiv.querySelectorAll('#mod-div');

    let tableData = [];
    if (includeColumnNames === true) {tableData.push(["Primer Name", "Primer Sequence"])}
    for (var i = 0; i < modDivs.length; i++) {
        const currentDiv = modDivs[i];
        const h3Div = currentDiv.querySelector("#primers-type");
        const modType = h3Div.getAttribute("primers-type").replace(" ", "_");
        console.log("Mod Type2", modType);
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
            console.log("Edited2", primerIdDiv, idEdited, idEdited === "true", h3Edited, h3Edited === "true")
            if (idEdited === "true") {
                primerId = primerIdDiv.innerText;
            } else if (h3Edited === "true") {
                primerId = h3Div.innerText + subcloningVectorSuffix + "_" + primerDirection;
            } else {
                primerId = modType + modIndex + subcloningVectorSuffix + "_" + primerDirection;
            };

            const primerSeq = currPrimerDiv.querySelector("#primer-sequence").innerText;
            tableData.push([primerId, primerSeq])
        };
    };
    return tableData;
};


/**
 * Export primers to different files
 */
const exportPrimersDict = {
    // Plain text
    txt : (plasmidIndex) => {
        const fileName = plasmidDict[plasmidIndex]["fileName"].replace(plasmidDict[plasmidIndex]["fileExtension"], "") + " primers";
        const containerDiv = document.createElement("div");
        containerDiv.innerHTML = plasmidDict[plasmidIndex]["sidebarPrimers"];
        console.log("txt", containerDiv)


        let textContent = "";
        let counter = 1;
        for (const childDiv of containerDiv.children) {
            if (counter !== 1) {textContent += "\n"}
            counter++;
            if (childDiv.id === "mod-div") {
                for (const subDiv of childDiv.children) {
                    if (subDiv.id === "primers-type") {
                        textContent += subDiv.innerText + "\n";
                    } else if (subDiv.id === "primer-div") {
                        const tempDiv = document.createElement("div");
                        tempDiv.innerHTML = subDiv.innerHTML;
                        let tempList = []
                        for (const subsubDiv of tempDiv.children) {
                            tempList.push(subsubDiv.innerText);
                        };
                        textContent += `${tempList[0]} ${tempList[1]}\n`;
                        textContent += `${tempList.slice(2, tempList.length).join("").split(";").map((item) => item.trim()).join("; ")}\n\n`;
                    };
                };
            };
        };

        const blob = new Blob([textContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName + '.txt';
        link.click();
    },
    // Microsoft Word
    doc : (plasmidIndex) => {
        const fileName = plasmidDict[plasmidIndex]["fileName"].replace(plasmidDict[plasmidIndex]["fileExtension"], "") + " primers";
        const htmlContent = plasmidDict[plasmidIndex]["sidebarPrimers"];
        
        const docx = window.htmlDocx.asBlob(htmlContent);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(docx);
        link.download = fileName + '.docx';
        link.click();
    },
    // CSV
    csv : (plasmidIndex) => {
        const fileName = plasmidDict[plasmidIndex]["fileName"].replace(plasmidDict[plasmidIndex]["fileExtension"], "") + " primers";
        const tableData = getPrimersAsTable(plasmidIndex, includeColumnNames = true);

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
    xlsx: (plasmidIndex) => {
        const fileName = plasmidDict[plasmidIndex]["fileName"].replace(plasmidDict[plasmidIndex]["fileExtension"], "") + " primers";
        const tableData = getPrimersAsTable(plasmidIndex, includeColumnNames = true);

        let wb = XLSX.utils.book_new();
        wb.SheetNames.push("Sheet 1");
        wb.Sheets["Sheet 1"] = XLSX.utils.aoa_to_sheet(tableData);
        XLSX.writeFile(wb, fileName + '.xlsx');
    },
    // Microsynth Excel Template
    microsynth: (plasmidIndex) => {
        const fileName = plasmidDict[plasmidIndex]["fileName"].replace(plasmidDict[plasmidIndex]["fileExtension"], "") + " primers";
        const tableData = getPrimersAsTable(plasmidIndex, includeColumnNames = false);
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
                worksheet.unprotect();
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
                link.download = fileName + " microsynth order form";
                link.click();
            })
            .catch((error) => {
                console.error("Error fetching or reading the file:", error);
            });
    } 
};


/**
 * 
 */
function addPrimerRegionHoverEvents(){
    const spansList = document.querySelector(".sidebar-content").getElementsByTagName("SPAN");

    Array.from(spansList).forEach((span) => {
        span.addEventListener('mouseover', primerRegionHover);
        span.addEventListener('mouseout', removePrimerRegionHighlight);
    });
};

/**
 * Highlights where the primer sequence is in the plasmid sequence.
 */
function primerRegionHover(event) {
    // Get the inner text of the span
    const targetSpan = event.target
    const spanSequence = targetSpan.innerText;
    const spanDirection = (targetSpan.parentElement.parentElement.getAttribute("direction") === "fwd") ? "fwd": "rev";
    const spanColor = window.getComputedStyle(targetSpan).backgroundColor;
    console.log('Looking for:', spanSequence, spanColor);
    
    // Highlight hovered sequence in plasmid files
    const currGridstructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"];
    let currSequence = (spanDirection === "fwd") ? plasmidDict[currentlyOpenedPlasmid]["fileSequence"]: plasmidDict[currentlyOpenedPlasmid]["fileComplementarySequence"];

    const searchQuery = (spanDirection === "fwd") ? spanSequence: spanSequence.split('').reverse().join('');
    const targetStrand = (spanDirection === "fwd") ? 0: 1;
    highlightOccurences(targetStrand, currSequence, searchQuery, currGridstructure, null, spanColor);
};


/**
 * Function to remove highlighting
 */
function removePrimerRegionHighlight() {
    const targetTable = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid);
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
function primerExtension(plasmidSequence, startingPos, targetStrand, direction, targetTm, method, minLength, plasmidIndex, initialSequence="") {
    console.log("primerExtension", startingPos, targetStrand, direction, targetTm, minLength, plasmidIndex, initialSequence)
    const currStrand = (targetStrand === 'fwdStrand') ? plasmidSequence : getComplementaryStrand(plasmidSequence).split("").reverse().join("");
    const startIndex = (targetStrand === 'fwdStrand') ? startingPos - 1: currStrand.length - startingPos + 1; // Convert sequence index to string index
    

    let extensionLength = minLength - initialSequence.length;
    let prevPrimerSequence =  (direction === "forward") ? initialSequence + repeatingSlice(currStrand, startIndex, startIndex + extensionLength - 1): repeatingSlice(currStrand, startIndex - extensionLength + 1, startIndex) + initialSequence;
    let prevTM = get_tm(prevPrimerSequence, primerConc, saltConc, method); // Get melting temperature of initial primer
    console.log("primerExtension", targetStrand, direction, startIndex, prevPrimerSequence)
    
    // Main loop for the extension of the primer
    const maxIter = 100; // Maximum amount of iterations in case of errors
    let i = 0;
    let outputPrimerSequence = "";
    let primerSequence = prevPrimerSequence; // Reset current primer
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
            prevTM = currTM;
            prevPrimerSequence = primerSequence;
            extensionLength += 1;
            i++;
    
            // Set current primer using the current length then get its temperature
            primerSequence = (direction === "forward") ? initialSequence + repeatingSlice(currStrand, startIndex, startIndex + extensionLength - 1): repeatingSlice(currStrand, startIndex - extensionLength + 1, startIndex) + initialSequence;
            currTM = get_tm(primerSequence, primerConc, saltConc, method);
        };
    };
};


/**
 *  Calculates the standard deviation from a list of numbers
 */
function standardDeviation(numbers) {
    const mean = numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
    const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
    const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / numbers.length;
    const stdDev = Math.sqrt(variance);
    return stdDev;
};


/**
 * Scales the codon frequencies in the input table to give more weight to more common codons and less to rare codons
 * Works by exponentiating each frequency by a factor determiend using the standard deviation of the distribution.
 */
function scaleCodonFrequencies(inputTable) {
    //console.log("scaleCodonFrequencies b4", inputTable);

    for (let aa in inputTable) {
        const aaDict = inputTable[aa];
        //console.log("scaleCodonFrequencies", aa, aaDict);

        let frequencyData = [];
        let codons = [];
        for (let codonFreq in aaDict) {
            frequencyData.push(parseFloat(codonFreq));
            codons.push(aaDict[codonFreq]);
        };
        //console.log("scaleCodonFrequencies", aa, codons, frequencyData);

        // Don't scale if there is only 1 possible codon
        if (frequencyData.length > 1) {
            // Powerfactor is square root of the inverse of the standard deviation
            // the more extreme the differences, the less the scaling should be
            // square root also reduced the size of the factor nicely, but was chosen arbitrarily
            const powerFactor = Math.sqrt(1/standardDeviation(frequencyData));
            frequencyData = frequencyData.map(freq => Math.pow(freq, powerFactor));

            // Normalise
            let dataSum = 0;
            for (let i = 0; i < frequencyData.length; i++) {dataSum += frequencyData[i]}
            frequencyData = frequencyData.map(freq => freq / dataSum);
        };

        let newAADict = {};
        for (let i = 0; i < frequencyData.length; i++) {
            newAADict[frequencyData[i]] = codons[i]
        }
        inputTable[aa] = newAADict;
    };

    //console.log("scaleCodonFrequencies after", inputTable);
    return inputTable
};


/**
 * Weighted random codon selection
 */
function weightedCodonRandomSelect(frequenciesDict) {
    const possibilityArray = Object.entries(frequenciesDict).map(([weight, value]) => ({ weight: parseFloat(weight), value }));
    const totalWeight = possibilityArray.reduce((acc, possibility) => acc + possibility.weight, 0);
    
    const randomNumber = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    for (const possibility of possibilityArray) {
        cumulativeWeight += possibility.weight;
        if (randomNumber <= cumulativeWeight) {
            return possibility.value;
        };
    };
};


/**
 * Calculate GC content of a string
 */

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

    /**
     * Using codon frequency tables
     */
    let outputSequence = "";
    let organismCodonTable = codonTablesDict[targetOrganism];

    // Scale frequency distribution to give more weight to frequent codons and less to rare ones
    organismCodonTable = scaleCodonFrequencies(organismCodonTable);

    let tripletToAdd = "";
    for (let i = 0; i < inputAA.length; i++) {
        frequenciesList = Object.keys(organismCodonTable[inputAA[i]])
        //console.log("optimizeAA", frequenciesList)
        //tripletToAdd = organismCodonTable[inputAA[i]][frequenciesList[0]]
        tripletToAdd = weightedCodonRandomSelect(organismCodonTable[inputAA[i]])
        //console.log("optimizeAA", inputAA[i], tripletToAdd, organismCodonTable[inputAA[i]])
        
        outputSequence += tripletToAdd
        //console.log("optimizeAA", tripletToAdd)
    };

    console.log("optimizeAA", targetOrganism, inputAA, outputSequence, fractionGC(outputSequence) )
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
function generatePrimerSequences(plasmidSequence, dnaToInsert, aaToInsert, targetOrganism, pos1, pos2, operationType) {
    console.log("generatePrimerSequences", operationType, dnaToInsert, aaToInsert, targetOrganism, pos1, pos2)
    /**
     * Set colors
     */
    let colorHomo = primerColorOrange;
    let colorIns = primerColorRed;
    let colorTBR = primerColorGreen;
    if (operationType === "Subcloning") {
        colorHomo = primerColorCyan;
        colorIns = primerColorRed;
        colorTBR = primerColorPurple;
    };
    
    
    // Operation positions
    const operationStartPos = Math.min(pos1, pos2)
    const operationEndPos = Math.max(pos1, pos2)

    /**
     * Amino acid sequence optimisation
     */
    let seqToInsert = "";
    // If AA sequence given, optimise it, else use the DNA sequence
    if (aaToInsert && aaToInsert !== "" && targetOrganism !== null) {
        seqToInsert = optimizeAA(aaToInsert, targetOrganism);
    } else {
        seqToInsert = dnaToInsert;
    };

    
    let primersDict = {};
    let operationTypeTagline = "";
    /**
     * Template binding regions
     */
    // Forward template binding region, extend forward on the forward strand from the end position
    const tempFwd = primerExtension(plasmidSequence, operationEndPos, "fwdStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, currentlyOpenedPlasmid);
    // Reverse template binding region, extend forward on the complementary strand from the start position
    const tempRev = primerExtension(plasmidSequence, operationStartPos, "compStrand", "forward", tempRegionTm, meltingTempAlgorithmChoice, 7, currentlyOpenedPlasmid);

    /**
     * Homologous regions
     */
    let homoFwd = "";
    let homoRev = "";

    console.log("generatePrimerSequences", operationType, dnaToInsert, aaToInsert, targetOrganism, operationStartPos, operationEndPos)
    // If the sequence to be inserted has a melting temperature lower than 49 C, extende the primer backwards
    if (get_tm(seqToInsert, primerConc, saltConc, "oligoCalc") < upperBoundShortInsertions) { // Mutation < 49 C (or user defined minimum TM), need homolog region
        /**
         * Short insertions + deletions
         */
        if (primerDistribution === false) {
            /**
             * Assymmetric primers, add bases to 5' end of sequence to add, or to nothing in case of deletions
             */
            // Forward homologous region, extend backwards on the forward strand from the start position
            homoFwd = primerExtension(plasmidSequence, operationStartPos, "fwdStrand", "backward", homoRegionTm, "oligoCalc", homoRegionMinLength, currentlyOpenedPlasmid);
            homoRev = "";
            
            // Display primers in the sidebar
            const primerInfoFwd = `(Homologous region: ${homoFwd.length} bp, ${Math.round(get_tm(homoFwd, primerConc, saltConc, "oligoCalc"))} °C;
                                    Template binding region: ${tempFwd.length} bp, ${Math.round(get_tm(tempFwd, primerConc, saltConc, meltingTempAlgorithmChoice))} °C; 
                                    Total: ${(homoFwd.length + seqToInsert.length + tempFwd.length)} bp)`;
            const primerInfoRev = `(Template binding region: ${tempRev.length} bp, ${Math.round(get_tm(tempRev, primerConc, saltConc, meltingTempAlgorithmChoice))} °C; 
                                    Total: ${(tempRev.length)} bp)`;
            primersDict["Forward Primer"] = {1: {"seq": homoFwd, "color": colorHomo},
                                            2: {"seq": seqToInsert, "color": colorIns},
                                            3: {"seq": tempFwd, "color": colorTBR},
                                            info: primerInfoFwd};
            primersDict["Reverse Primer"] = {1: {"seq": tempRev, "color": colorTBR},
                                            info: primerInfoRev};

        } else if (primerDistribution === true) {
            /**
             * Symmetric primers, add bases to 5' and 3' end of sequence to add, or to nothing in case of deletions
             */
            let homoFragmentLength1 = 0;
            let homoFragmentLength2 = 0;
            let homoFwd1 = primerExtension(plasmidSequence, operationStartPos, "fwdStrand", "backward", homoRegionTm, "oligoCalc", homoRegionMinLength, currentlyOpenedPlasmid);
            let homoFwd2 = primerExtension(plasmidSequence, operationEndPos, "fwdStrand", "forward", homoRegionTm, "oligoCalc", homoRegionMinLength, currentlyOpenedPlasmid);
            let overlappingSeq = homoFwd1 + seqToInsert + homoFwd2;

            let turnHomoFwd1 = true;
            while (true) {
                const sliceIndices = (turnHomoFwd1 === true) ?  [1, overlappingSeq.length]: [0, -1]
                const stillAboveTargetTM = get_tm(overlappingSeq.slice(...sliceIndices), primerConc, saltConc, "oligoCalc") > homoRegionTm;
                const slicingGetsUsCloser = Math.abs(homoRegionTm - get_tm(overlappingSeq.slice(...sliceIndices), primerConc, saltConc, "oligoCalc")) <= Math.abs(homoRegionTm - get_tm(overlappingSeq, primerConc, saltConc, "oligoCalc"));
                const minimumLengthNotReached = overlappingSeq.length > homoRegionMinLength;
                if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                    overlappingSeq = overlappingSeq.slice(...sliceIndices);
                    if (turnHomoFwd1 === true) {homoFragmentLength1++} else {homoFragmentLength2++};
                    turnHomoFwd1 = !turnHomoFwd1;
                } else{
                    break;
                };
            };

            homoFwd1 = homoFwd1.slice(homoFragmentLength1, homoFwd1.length);
            homoFwd2 = homoFwd2.slice(0, homoFwd2.length - homoFragmentLength2 + 1);

            let homoRev1 = getComplementaryStrand(homoFwd2).split('').reverse().join('');
            let homoRev2 = getComplementaryStrand(homoFwd1).split('').reverse().join('');
            console.log("Short insertion", operationStartPos, operationStartPos + homoRev2.length)
 
            // Display primers in the sidebar
            const primerInfoFwd = `(Overlap: ${overlappingSeq.length} bp, ${Math.round(get_tm(overlappingSeq, primerConc, saltConc, "oligoCalc"))} °C;
                                    Template binding region: ${tempFwd.length} bp, ${Math.round(get_tm(tempFwd, primerConc, saltConc, meltingTempAlgorithmChoice))} °C; 
                                    Total: ${(homoFwd1.length + seqToInsert.length + tempFwd.length)} bp)`;
            const primerInfoRev = `(Template binding region: ${tempRev.length} bp, ${Math.round(get_tm(tempRev, primerConc, saltConc, meltingTempAlgorithmChoice))} °C; 
                                    Total: ${(homoRev1.length + seqToInsert.length + tempRev.length)} bp)`;
            primersDict["Forward Primer"] = {1: {"seq": homoFwd1, "color": colorHomo},
                                            2: {"seq": seqToInsert, "color": colorIns},
                                            3: {"seq": tempFwd, "color": colorTBR},
                                            info: primerInfoFwd};
            primersDict["Reverse Primer"] = {1: {"seq": homoRev1, "color": colorHomo},
                                             2: {"seq": getComplementaryStrand(seqToInsert).split("").reverse().join(""), "color": colorIns},
                                             3: {"seq": tempRev, "color": colorTBR},
                                             info: primerInfoRev};
        };

        operationTypeTagline = (operationType !== "Deletion") ? "Short " + operationType: operationType;

    } else {
        /**
         * Long insertions
         */
        let overlappingSeq = "";
        if (primerDistribution === false) {
            /**
             * Asymmetric primers
             */
            overlappingSeq = getComplementaryStrand(seqToInsert).split('').reverse().join('');
            while (true) {
                const stillAboveTargetTM = get_tm(overlappingSeq.slice(1), primerConc, saltConc, "oligoCalc") > homoRegionTm;
                const slicingGetsUsCloser = Math.abs(homoRegionTm - get_tm(overlappingSeq.slice(1), primerConc, saltConc, "oligoCalc")) <= Math.abs(homoRegionTm - get_tm(overlappingSeq, primerConc, saltConc, "oligoCalc"));
                const minimumLengthNotReached = overlappingSeq.length > homoRegionMinLength;
                if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                    overlappingSeq = overlappingSeq.slice(1);
                } else {
                    break;
                };
            };
            homoFwd = seqToInsert;
            homoRev = overlappingSeq;

        } else if (primerDistribution === true) {
            /**
             * Symmetric primers
             */
            let homoFragmentLength1 = 0;
            let homoFragmentLength2 = 0;
            overlappingSeq = seqToInsert;

            let turnHomoFwd1 = true;
            while (true) {
                const sliceIndices = (turnHomoFwd1 === true) ? [1, overlappingSeq.length]: [0, -1]
                const stillAboveTargetTM = get_tm(overlappingSeq.slice(...sliceIndices), primerConc, saltConc, "oligoCalc") > homoRegionTm;
                const slicingGetsUsCloser = Math.abs(homoRegionTm - get_tm(overlappingSeq.slice(...sliceIndices), primerConc, saltConc, "oligoCalc")) <= Math.abs(homoRegionTm - get_tm(overlappingSeq, primerConc, saltConc, "oligoCalc"));
                const minimumLengthNotReached = overlappingSeq.length > homoRegionMinLength;
                if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                    overlappingSeq = overlappingSeq.slice(...sliceIndices);
                    if (turnHomoFwd1 === true) {homoFragmentLength1++} else {homoFragmentLength2++};
                    turnHomoFwd1 = !turnHomoFwd1;
                } else {
                    break;
                };
            };
            console.log("generatePrimerSequences long symm", homoFragmentLength1, homoFragmentLength2, overlappingSeq)
            homoFwd = seqToInsert.slice(homoFragmentLength1, seqToInsert.length);
            const seqToInsertRevComp = getComplementaryStrand(seqToInsert).split('').reverse().join('');
            homoRev = seqToInsertRevComp.slice(homoFragmentLength2, seqToInsertRevComp.length);
            console.log("generatePrimerSequences long symm", homoFwd, homoRev)
        };

        // Display primers in the sidebar
        const primerInfoFwd = `(Overlap: ${overlappingSeq.length} bp, ${Math.round(get_tm(overlappingSeq, primerConc, saltConc, "oligoCalc"))} °C;
                                Template binding region: ${tempFwd.length} bp, ${Math.round(get_tm(tempFwd, primerConc, saltConc, meltingTempAlgorithmChoice))} °C; 
                                Total: ${(homoFwd.length + tempFwd.length)} bp)`;
        const primerInfoRev = `(Template binding region: ${tempRev.length} bp, ${Math.round(get_tm(tempRev, primerConc, saltConc, meltingTempAlgorithmChoice))} °C; 
                                Total: ${(homoRev.length + tempRev.length)} bp)`;
        primersDict["Forward Primer"] = {1: {"seq": homoFwd, "color": colorIns},
                                         2: {"seq": tempFwd, "color": colorTBR},
                                        info: primerInfoFwd};
        primersDict["Reverse Primer"] = {1: {"seq": homoRev, "color": colorIns},
                                         2: {"seq": tempRev, "color": colorTBR},
                                         info: primerInfoRev};
        operationTypeTagline = (operationType !== "Deletion") ? "Long " + operationType: operationType;
    };

    return [operationTypeTagline, primersDict, seqToInsert, operationStartPos, operationEndPos];
};

function makePrimers(plasmidSequence, dnaToInsert, aaToInsert, targetOrganism, pos1, pos2, operationType) {
    const [operationTypeTagline, primersDict, seqToInsert, operationStartPos, operationEndPos] = generatePrimerSequences(plasmidSequence, dnaToInsert, aaToInsert, targetOrganism, pos1, pos2, operationType);

    // Display primers in the sidebar
    displayPrimers(operationTypeTagline, primersDict);
    // Update the sequence and features
    updateFeatures(operationType, seqToInsert, operationStartPos, operationEndPos, seqToInsert.length - (operationEndPos - operationStartPos));
};


/**
 * Mark selection as subcloning target
 */
function markSelectionForSubcloning(plasmidIndex, inputStartPos, inputEndPos) {
    console.log("markSelectionForSubcloning", inputStartPos, inputEndPos);
    clearAllSubcloningSelections();
    subcloningOriginPlasmidIndex = plasmidIndex;
    subcloningOriginSpan = [Math.min(inputStartPos, inputEndPos), Math.max(inputStartPos, inputEndPos)];
    if (currentlyOpenedPlasmid === subcloningOriginPlasmidIndex) {
        highlightSpan(plasmidIndex, 0, subcloningOriginSpan[0], subcloningOriginSpan[0] + 1, "subcloning-target-cell-first", null, null);
        highlightSpan(plasmidIndex, 0, subcloningOriginSpan[0] + 1, subcloningOriginSpan[1] - 1, "subcloning-target-cell", null, null);
        highlightSpan(plasmidIndex, 0, subcloningOriginSpan[1] - 1, subcloningOriginSpan[1], "subcloning-target-cell-last", null, null);
    };
};


/**
 * 
 */
function clearAllSubcloningSelections(clearVariables = true) {
    if (clearVariables === true) {
        subcloningOriginPlasmidIndex = null;
        subcloningOriginSpan = null;
    };
    const selectedCellsFirst = document.querySelectorAll('.subcloning-target-cell-first');
    const selectedCells = document.querySelectorAll('.subcloning-target-cell');
    const selectedCellsLast = document.querySelectorAll('.subcloning-target-cell-last');
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
function makeSubcloningPrimers(subcloningStartPos, subcloningEndPos, aaSequence5Prime, dnaSequence5Prime, aaSequence3Prime, dnaSequence3Prime, targetOrganism) {
    console.log("makeSubcloningPrimers", subcloningStartPos, subcloningEndPos, aaSequence5Prime, dnaSequence5Prime, aaSequence3Prime, dnaSequence3Prime, targetOrganism)
    
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

    // Insertion sequence with insertions added
    const subcloningTargetSequence = repeatingSlice(plasmidDict[subcloningOriginPlasmidIndex]["fileSequence"], subcloningOriginSpan[0] - 1, subcloningOriginSpan[1]-1)
    const subcloningSequenceFull = seqToInsert5 + subcloningTargetSequence + seqToInsert3;

    const targetVectorSequence = plasmidDict[currentlyOpenedPlasmid]["fileSequence"];
    const simulatedPlasmidSequence = targetVectorSequence.slice(0, startPos-1) + subcloningTargetSequence + targetVectorSequence.slice(endPos-1);
    console.log("simulatedPlasmidSequence", simulatedPlasmidSequence, startPos)
    const [, primersDict5, , , ] = generatePrimerSequences(simulatedPlasmidSequence, seqToInsert5, "", targetOrganism, startPos, startPos, "Subcloning");

    const simulatedPlasmidSequenceRevComp = getComplementaryStrand(simulatedPlasmidSequence).split("").reverse().join("");
    const endPosRevComp = simulatedPlasmidSequenceRevComp.length - startPos - subcloningTargetSequence.length + 2;
    console.log("simulatedPlasmidSequence", simulatedPlasmidSequenceRevComp, endPosRevComp)
    const seqToInsert3RevComp = getComplementaryStrand(seqToInsert3).split("").reverse().join("");;
    const [, primersDict3, , , ] = generatePrimerSequences(simulatedPlasmidSequenceRevComp, seqToInsert3RevComp, "", targetOrganism, endPosRevComp, endPosRevComp, "Subcloning");

    console.log("makeSubcloningPrimers", primersDict5)
    console.log("makeSubcloningPrimers", primersDict3)

    /**
     * Primers dict
     */
    let primersDict = {};
    primersDict["Forward Primer"] = primersDict5["Forward Primer"];
    primersDict["Reverse Primer"] = primersDict3["Forward Primer"];
    primersDict["Vector Forward Primer"] = primersDict3["Reverse Primer"];
    primersDict["Vector Reverse Primer"] = primersDict5["Reverse Primer"];
    console.log("Primers Dict:", primersDict)
    displayPrimers("Subcloning", primersDict);

    // Update stuff
    const plasmidLengthDiff = subcloningSequenceFull.length - (endPos - startPos);
    updateFeatures("Subcloning", subcloningSequenceFull, startPos, endPos, plasmidLengthDiff);
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
function updateFeatures(newFeatureType, newFeatureSequence, segmentStartPos, segmentEndPos, featureShift) {
    // Update the sequence and features
    // Convert back from sequence indices to string indices
    segmentStartPos--;
    segmentEndPos--;


    // Insertion is added into the main sequence and complementary strand is remade
    console.log("updateFeatures before", plasmidDict[currentlyOpenedPlasmid]["fileSequence"].length, plasmidDict[currentlyOpenedPlasmid]["fileComplementarySequence"].length)
    plasmidDict[currentlyOpenedPlasmid]["fileSequence"] = plasmidDict[currentlyOpenedPlasmid]["fileSequence"].substring(0, segmentStartPos) + newFeatureSequence + plasmidDict[currentlyOpenedPlasmid]["fileSequence"].substring(segmentEndPos);
    plasmidDict[currentlyOpenedPlasmid]["fileComplementarySequence"]  = getComplementaryStrand(plasmidDict[currentlyOpenedPlasmid]["fileSequence"]);
    console.log("updateFeatures after", plasmidDict[currentlyOpenedPlasmid]["fileSequence"].length, plasmidDict[currentlyOpenedPlasmid]["fileComplementarySequence"].length)

    /**
     * Decides if the old feature should be left alone, shifted, or deleted based on the span of the new feature.
     * 
     * elementKey - working key
     * elementvalue - working value
     * featureStart, featureEnd - indices of new feature that need to be checked against the span of the key
     * 
    */

    function checkNewFeatureOverlap(elementKey, elementValue, featureStart, featureEnd, operationType) {
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

                /** Special case: exact deletion */
                console.log("operationType", operationType)
                if (operationType === "Deletion" && featureStart === spanStart && featureEnd === spanEnd) {
                    return "delete";
                };

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
    Object.entries(plasmidDict[currentlyOpenedPlasmid]["fileFeatures"]).forEach(([key, value]) => {
        const decision = checkNewFeatureOverlap(key, value, segmentStartPos, segmentEndPos, newFeatureType);
        console.log("checkNewFeatureOverlap", key, segmentStartPos, segmentEndPos, decision)
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
                plasmidDict[currentlyOpenedPlasmid]["fileFeatures"][key].span = newSpanStart + ".." + newSpanEnd; // Update span of the feature
            } else {
                plasmidDict[currentlyOpenedPlasmid]["fileFeatures"][key].span = "complement(" + newSpanStart + ".." + newSpanEnd + ")";
            }
        } else if (decision === "delete") {
            console.log("updateFeatures delete", key)
            delete plasmidDict[currentlyOpenedPlasmid]["fileFeatures"][key];
        };
    });

    // Check if there is a previous insertion and if there is, increment the nr at the end
    let i = 2;
    let targetFeaturesDict = plasmidDict[currentlyOpenedPlasmid]["fileFeatures"];
    let newFeatureId = "misc_feature"
    while (newFeatureId in targetFeaturesDict) {
        newFeatureId =  newFeatureId.replace("" + i-1, "")
        newFeatureId += i;
        i++;
    };
    console.log("newFeatureName", newFeatureId, newFeatureType)

    // Creat the new feature
    if (newFeatureType !== "Deletion") {
        const tempDict = {} // init feature dict
        tempDict.label = newFeatureType;
        const insertStringPositionStart = segmentStartPos + 1;
        const insertStringPositionEnd = segmentStartPos + newFeatureSequence.length;
        tempDict.span = insertStringPositionStart + ".." + insertStringPositionEnd;
        tempDict.note = "";
        plasmidDict[currentlyOpenedPlasmid]["fileFeatures"][newFeatureId] = tempDict // add feature to features dict
        plasmidDict[currentlyOpenedPlasmid]["fileFeatures"] = sortBySpan(plasmidDict[currentlyOpenedPlasmid]["fileFeatures"]) // resort feature dict by their order of appearance in the sequence

    };
    // Remake the sidebar and content grid 
    plasmidDict[currentlyOpenedPlasmid]["sidebarTable"] = createSidebarTable(currentlyOpenedPlasmid);
    plasmidDict[currentlyOpenedPlasmid]["contentGrid"] = makeContentGrid(currentlyOpenedPlasmid);
    updateSidebarAndGrid();

    // At the very end, save the progress to file history
    saveProgress(currentlyOpenedPlasmid);
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


/**
 * Copy primer sequence to clipboard
 */
function copyPrimerSequenceToClipboard(sourceBtn) {
    const buttonParent = sourceBtn.parentElement;
    copyStringToClipboard(buttonParent.innerText)
};