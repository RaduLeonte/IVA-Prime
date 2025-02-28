

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

    
    /**
     * Set target tm depending on operation type
     */
    const targetTMHR = (operationType !== "Subcloning") ? homoRegionTm: homoRegionSubcloningTm;
    
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
                targetTMHR,
                "oligoCalc",
                homoRegionMinLength
            );
            homoRev = "";

            primersList.push(
                {
                    "primerName": "Forward Primer",
                    "homologousRegionLengths": homoFwd.length,
                    "nextBases": [
                        operationStartPos - homoFwd.length - 1,
                        operationStartPos + seqToInsert.length + tempFwd.length
                    ],
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
                    "nextBases": [
                        null,
                        operationStartPos - tempRev.length - 1 
                    ],
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
                targetTMHR,
                "oligoCalc",
                homoRegionMinLength,
            );
            let homoFwd2 = primerExtension(
                plasmidSequence,
                operationEndPos,
                "fwdStrand",
                "forward",
                targetTMHR,
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
                const stillAboveTargetTM = getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc") > targetTMHR;
                const slicingGetsUsCloser = Math.abs(targetTMHR - getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc")) <= Math.abs(targetTMHR - getMeltingTemperature(overlappingSeq, "oligoCalc"));
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
                    "nextBases": [
                        operationStartPos - homoFwd1.length - 1,
                        operationStartPos + seqToInsert.length + tempFwd.length
                    ],
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
                    "nextBases": [
                        operationStartPos + seqToInsert.length + homoRev1.length,
                        operationStartPos - tempRev.length - 1 
                    ],
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
                const stillAboveTargetTM = getMeltingTemperature(overlappingSeq.slice(1), "oligoCalc") > targetTMHR;
                const slicingGetsUsCloser = Math.abs(targetTMHR - getMeltingTemperature(overlappingSeq.slice(1), "oligoCalc")) <= Math.abs(targetTMHR - getMeltingTemperature(overlappingSeq, "oligoCalc"));
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
                const stillAboveTargetTM = getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc") > targetTMHR;
                const slicingGetsUsCloser = Math.abs(targetTMHR - getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc")) <= Math.abs(targetTMHR - getMeltingTemperature(overlappingSeq, "oligoCalc"));
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
                "nextBases": [
                    (primerDistribution === true) ? operationStartPos + seqToInsert.length - homoFwd.length - 1: null,
                    operationStartPos + seqToInsert.length + tempFwd.length 
                ],
                "maxLengths": [
                    Infinity,
                    seqToInsert.length,
                    Infinity
                ],
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
                "nextBases": [
                    operationStartPos + homoRev.length,
                    operationStartPos - tempRev.length - 1 
                ],
                "maxLengths": [
                    Infinity,
                    seqToInsert.length,
                    Infinity
                ],
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
    console.log("markSelectionForSubcloning", plasmidIndex, inputStartPos, inputEndPos);

    // Warn if the user attempts to subclone a fragment shorter than 400 bp
    if (Math.max(inputStartPos, inputEndPos) - Math.min(inputStartPos, inputEndPos) < 400) {
        alert("Short Subcloning Target",
            "Attempting to subclone fragments shorter than 400 bp may result in lower efficiency or the subcloning may fail all together.",
            "orange",
            10
        );
    };

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
    const [, primersList5, , ,] = generatePrimerSequences(
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
        "Subcloning",
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

    const partInsertionSequence = seqToInsert5 + subcloningTargetSequence;
    const pos3PrimeStartPos = startPos + partInsertionSequence.length;
    console.log("displayPrimers", pos3PrimeStartPos)
    const revHomoLength = (primersList[1]["primerRegions"][0]) ? primersList[1]["primerRegions"][0][0].length : 0;
    const revInsLength = (primersList[1]["primerRegions"][1]) ? primersList[1]["primerRegions"][1][0].length : 0;
    primersList[1]["nextBases"] = [
        pos3PrimeStartPos + revInsLength + revHomoLength,
        pos3PrimeStartPos - primersList[1]["primerRegions"][2][0].length - 1
    ];
    const vecFwdHomoLength = (primersList[2]["primerRegions"][0]) ? primersList[2]["primerRegions"][0][0].length : 0;
    const vecFwdInsLength = (primersList[2]["primerRegions"][1]) ? primersList[2]["primerRegions"][1][0].length : 0;
    primersList[2]["nextBases"] = [
        (primersList[2]["nextBases"][0] !== null) ? pos3PrimeStartPos - vecFwdHomoLength - 1: null,
        (primerDistribution === true) ? pos3PrimeStartPos + vecFwdInsLength + primersList[2]["primerRegions"][2][0].length: pos3PrimeStartPos + seqToInsert3.length + primersList[2]["primerRegions"][2][0].length
    ];

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
function adjustPrimerLength(instigator, adjustmentSign) {
    const buttonContainer = instigator.parentElement;
    const sequenceEnd = buttonContainer.getAttribute("sequence-end");
    const historyIndex = buttonContainer.getAttribute("history-index");
    
    if (buttonContainer.getAttribute("next-base-position") !== "null") {
        let nextBasePosition = parseInt(buttonContainer.getAttribute("next-base-position"));
        // button -> buttons container -> primer-sequence p -> primer-div div -> mod-div div
        const modDiv = instigator.parentElement.parentElement.parentElement.parentElement;
        const primerName = buttonContainer.getAttribute("primer-name");
    
        let homoRegionLengthChange = 0;
        const targetStrand = buttonContainer.getAttribute("direction");
        if (adjustmentSign === 1) {
            /**
             * Lenghtening sequence
             */
    
            /**
             * Find base to be appended
             */
            const currPlasmid = Project.activePlasmid();
            const currSequenceFwd = currPlasmid.history[historyIndex][0];
            const currSequence = (targetStrand === "fwd") ? currSequenceFwd: getComplementaryStrand(currSequenceFwd);
            const nextBase = currSequence.slice(nextBasePosition - 1, nextBasePosition);
    
            /**
             * Append new base to sequence
             */
            if (sequenceEnd === "5'") {
                // Left button pair, find sequence to the right
                // Button container -> homologous region span -> first child
                const targetSpan = buttonContainer.nextElementSibling.firstElementChild;
                if (targetSpan.innerText.length < parseFloat(targetSpan.getAttribute("max-length"))) {
                    targetSpan.innerText = nextBase + targetSpan.innerText;
                    nextBasePosition += (targetStrand === "fwd") ? -1: 1;
                    homoRegionLengthChange = 1;
                } else {
                    return;
                };
    
            } else if (sequenceEnd === "3'") {
                // Right button pair, find sequence to the left
                // Button container -> span -> last child
                const targetSpan = buttonContainer.previousElementSibling.lastElementChild;
                if (targetSpan.innerText.length < parseFloat(targetSpan.getAttribute("max-length"))) {
                    targetSpan.innerText = targetSpan.innerText + nextBase;
                    nextBasePosition += (targetStrand === "fwd") ? 1: -1;
                } else {
                    return;
                };
            };
        } else if (adjustmentSign === -1) {
            /**
             * Deleting bases
             */
            if (sequenceEnd === "5'") {
                // Left button pair, find sequence to the right
                // Button container -> homologous region span -> first child
                const targetSpan = buttonContainer.nextElementSibling.firstElementChild;
                if (targetSpan.innerText.length > 0) {
                    targetSpan.innerText = targetSpan.innerText.slice(1);
                    nextBasePosition += (targetStrand === "fwd") ? 1: -1;
                    homoRegionLengthChange = -1;
                } else {
                    return;
                };
    
            } else if (sequenceEnd === "3'") {
                // Right button pair, find sequence to the left
                // Button container -> span -> last child
                const targetSpan = buttonContainer.previousElementSibling.lastElementChild;
                if (targetSpan.innerText.length > 0) {
                    targetSpan.innerText = targetSpan.innerText.slice(0, -1);
                    nextBasePosition += (targetStrand === "fwd") ? -1: 1;
                } else {
                    return;
                };
            };
        };
    
        let homoRegionLengthSpan;
        if (modDiv.querySelectorAll("#homologous-region-info")[0].children.length === 1) {
            homoRegionLengthSpan = modDiv.querySelectorAll("#operation-info-homo-length")[0];
        } else {
            const targetInfoSpan = (primerName === "Forward Primer" || primerName === "Vector Reverse Primer") ? 0: 1;
            homoRegionLengthSpan = modDiv.querySelectorAll("#operation-info-homo-length")[targetInfoSpan];
        };
        homoRegionLengthSpan.innerText = parseInt(homoRegionLengthSpan.innerText) + homoRegionLengthChange;
        
        /**
         * Update nextBasePosition
         */
        buttonContainer.setAttribute("next-base-position", nextBasePosition);
    
        /**
         * Update stuff
         */
        // Update span
        refreshPrimerDiv(modDiv);
    };
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
    let homoRegionSpanIndices = (homologousRegionInfoDiv.children.length === 1) ? [0, 0] : [0, 1, 1, 0];
    let tempHomoSpan;
    let tempRemainingSpan;
    let i = 0;
    modDiv.querySelectorAll("#primer-sequence").forEach(primerSequenceDiv => {
        const currentIndex = homoRegionSpanIndices[i];
        let currHSeqLength = parseInt(modDiv.querySelectorAll("#operation-info-homo-length")[currentIndex].innerText);
        tempHomoSpan = document.createElement("span");
        tempRemainingSpan = document.createElement("span");
        const regionTags = ["homo", "ins", "tbr"];

        for (tagIndex in regionTags) {
            const tag = regionTags[tagIndex]
            let fullRegionSequence = "";
            primerSequenceDiv.querySelectorAll(`[primer-span-type="${tag}"]`).forEach(span => {
                fullRegionSequence += span.innerText;
            });

            if (primerSequenceDiv.querySelectorAll(`[primer-span-type="${tag}"]`)[0]) {
                const regionSpanElement = primerSequenceDiv.querySelectorAll(`[primer-span-type="${tag}"]`)[0].cloneNode(true);
                regionSpanElement.innerText = fullRegionSequence;

                if (fullRegionSequence.length <= currHSeqLength) {
                    // Fits in h span
                    tempHomoSpan.appendChild(regionSpanElement.cloneNode(true));
                } else if (fullRegionSequence.length > currHSeqLength && currHSeqLength > 0) {
                    // Span needs to be split
                    const tempSpan1 = regionSpanElement.cloneNode(true);
                    tempSpan1.innerText = regionSpanElement.innerText.slice(0, currHSeqLength);
                    const tempSpan2 = regionSpanElement.cloneNode(true);
                    tempSpan2.innerText = regionSpanElement.innerText.slice(currHSeqLength)
                    
                    tempHomoSpan.appendChild(tempSpan1);
                    tempRemainingSpan.appendChild(tempSpan2);
                } else {
                    // h span spent, goes into remaining span
                    tempRemainingSpan.appendChild(regionSpanElement.cloneNode(true));
                };
                currHSeqLength -= fullRegionSequence.length;
            };
        };
        const homoRegionSpan = primerSequenceDiv.querySelectorAll("#homologous-region")[0];
        const remainingRegionSpan = homoRegionSpan.nextElementSibling;
        
        homoRegionSpan.innerHTML = tempHomoSpan.innerHTML;
        remainingRegionSpan.innerHTML = tempRemainingSpan.innerHTML;

        i++;
    });

    homoRegionSpanIndices = (homologousRegionInfoDiv.children.length === 1) ? [0] : [0, 1];
    for (let j = 0; j < homoRegionSpanIndices.length; j++) {
        const currentIndex = homoRegionSpanIndices[j];
        let homologousSequence = modDiv.querySelectorAll("#homologous-region")[currentIndex].innerText;
        const homologousSequenceTm = getMeltingTemperature(homologousSequence, "oligoCalc").toFixed(2);
        const tmSpan = homologousRegionInfoDiv.querySelectorAll("#operation-info-homo-tm")[currentIndex];
        tmSpan.innerText = homologousSequenceTm;
    };

    /**
     * Individual primers
     */
    // Iterate over primer-divs
    const primerDivs = modDiv.querySelectorAll("#primer-div");
    primerDivs.forEach((primerDiv) => {
        /**
         * Adjust onmouseover events
         */
        // Homo -> same sequence
        // Ins -> span sequence
        primerDiv.querySelectorAll('[primer-span-type="homo"], [primer-span-type="ins"]').forEach(span => {
            span.setAttribute("region-full-sequence", span.innerText);
        });

        // TBR -> combined span sequence
        let tbrSequence = "";
        primerDiv.querySelectorAll('[primer-span-type="tbr"]').forEach(tbrSpan => {
            tbrSequence += tbrSpan.innerText;
        });

        primerDiv.querySelectorAll('[primer-span-type="tbr"]').forEach(tbrSpan => {
            tbrSpan.setAttribute("region-full-sequence", tbrSequence);
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
    });

    Project.activePlasmid().savePrimers();
    Project.activePlasmid().saveProgress();
};