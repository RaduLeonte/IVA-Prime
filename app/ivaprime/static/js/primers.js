const Primers = new class {
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
     * @param {String} plasmidSequence - Sequence of the plasmid
     * @param {Number} startingIndex - Initial position from where to start extending the sequence
     * @param {Number} targetStrand - Strand onto which to work on ("top", "bottom")
     * @param {String} direction - Extension direction ("fwd"=5'->3', "rev"=5'->3')
     * @param {Number} targetTm - Melting temperature that should be reached
     * @param {String} method - Melting temperature algorithm
     * @param {Number} minimumLength - Minimum length of the sequence
     * @param {String} initialSequence - Starting sequence for the primer
     * @returns {String} - Output sequence
     */
    extendSequence(
        plasmidSequence,
        startingIndex,
        targetStrand,
        direction,
        targetTM,
        tmMethod,
        minimumLength,
        initialSequence=""
    ) {
        // Select correct strand
        plasmidSequence = (targetStrand === "top") ? plasmidSequence : Nucleotides.reverseComplementary(plasmidSequence);
        
        // Adjust starting index
        startingIndex = (targetStrand === 'top') ? startingIndex: plasmidSequence.length - startingIndex + 1;

        console.log("here1", targetStrand, startingIndex)

        // Initial extension length minus the initial sequence
        let extensionLength = minimumLength - initialSequence.length;
        
        // Initial primer sequence, initial sequence + initial extension
        let prevPrimerSequence =  (direction === "fwd")
        ? initialSequence + Utilities.repeatingSlice(plasmidSequence, startingIndex, startingIndex + extensionLength - 1)
        : Utilities.repeatingSlice(plasmidSequence, startingIndex - extensionLength + 1, startingIndex) + initialSequence;
        
        // Initial melting temperature
        let prevTM = Nucleotides.getMeltingTemperature(prevPrimerSequence, tmMethod);
        
        // Extend primer until target melting temperature is reached, or the maximum amount of iterations is reached
        let primerSequence = prevPrimerSequence;
        let currTM = prevTM;
        const maxIter = 100;
        for (let i = 0; i < maxIter; i++) {
            /** If the melting temperature of the current primer exceeds
              * the target temperature and the minimum length, break the loop
              * and return either the current primer or the previous one, whichever
              * is closest to the target temperature
             */ 
            if (
                currTM >= targetTM &&
                primerSequence.length >= minimumLength
            ) {
                if (
                    Math.abs(currTM - targetTM) <= Math.abs(prevTM - targetTM) &&
                    prevPrimerSequence.length < minimumLength
                ) {
                    return primerSequence;
                } else {
                    return prevPrimerSequence;
                };
            } else {
                // Save current sequence and tm, then recalculate current seq and tm
                prevPrimerSequence = primerSequence;
                prevTM = currTM;
                
                extensionLength += 1;
                
                primerSequence = (direction === "fwd")
                ? initialSequence + Utilities.repeatingSlice(plasmidSequence, startingIndex, startingIndex + extensionLength - 1)
                : Utilities.repeatingSlice(plasmidSequence, startingIndex - extensionLength + 1, startingIndex) + initialSequence;
                
                currTM = Nucleotides.getMeltingTemperature(primerSequence, tmMethod);
            };
        };
    };

    generateSet(
        plasmidSequence,
        dnaToInsert,
        aaToInsert,
        targetOrganism,
        operationRange,
        operationType
    ) {
        // Colors
        const primerColors = {
            "insertion": "primer-span-red",
            "HR": (operationType !== "Subcloning") ? "primer-span-orange": "primer-span-cyan",
            "TBR": (operationType !== "Subcloning") ? "primer-span-green": "primer-span-purple"
        }

        // Target Tm for homologous region
        const targetTMHR = (operationType !== "Subcloning") ? homoRegionTm: homoRegionSubcloningTm;

        // Make sure indices are sorted
        if (operationRange[1] === null) {
            operationRange = [
                operationRange[0] - 1,
                operationRange[0] - 1
            ];
        } else {
            operationRange = [
                Math.min(...operationRange),
                Math.max(...operationRange)
            ];
        };

        // Optimise AA sequence if one is given, else use DNA sequence
        const seqToInsert = (aaToInsert && aaToInsert !== "" && targetOrganism !== null)
        ? Nucleotides.optimizeAA(aaToInsert, targetOrganism)
        : dnaToInsert;

        // #region TBR Template binding region
        // Forward template binding region, extend forward on the forward strand from the end position
        const tempFwd = this.extendSequence(
            plasmidSequence,
            operationRange[1],
            "top",
            "fwd",
            tempRegionTm,
            meltingTempAlgorithmChoice,
            7
        );
        // Reverse template binding region, extend forward on the complementary strand from the start position
        const tempRev = this.extendSequence(
            plasmidSequence,
            operationRange[0],
            "bottom",
            "fwd",
            tempRegionTm,
            meltingTempAlgorithmChoice,
            7
        );
        // #endregion TBR


        // #region HR Homologous region
        const isShortInsertion = Nucleotides.getMeltingTemperature(seqToInsert, "oligoCalc") < upperBoundShortInsertions;

        let primersSet;
        if (isShortInsertion) {
            primersSet = (symmetricPrimers)
            ? this.generateSymShortSet(plasmidSequence, tempFwd, tempRev, seqToInsert, operationRange, targetTMHR, operationType, primerColors)
            : this.generateAsymShortSet(plasmidSequence, tempFwd, tempRev, seqToInsert, operationRange, targetTMHR, operationType, primerColors);
        } else {
            primersSet = (symmetricPrimers)
            ? this.generateSymLongSet(plasmidSequence, tempFwd, tempRev, seqToInsert, operationRange, targetTMHR, operationType, primerColors)
            : this.generateAsymLongSet(plasmidSequence, tempFwd, tempRev, seqToInsert, operationRange, targetTMHR, operationType, primerColors);
        }
        // #endregion HR

        return primersSet;
    };


    generateSymShortSet(
        plasmidSequence,
        tempFwd,
        tempRev,
        seqToInsert,
        operationRange,
        targetTMHR,
        operationType,
        primerColors
    ) {
        /**
         * Symmetric primers, add bases to 5' and 3' end of sequence to add, or to nothing in case of deletions
         */
        // Added fragment length trackers
        let homoFragmentLength1 = 0;
        let homoFragmentLength2 = 0;
        // Extend more than we need
        let homoFwd1 = this.extendSequence(
            plasmidSequence,
            operationRange[0],
            "fwdStrand",
            "backward",
            targetTMHR,
            "oligoCalc",
            homoRegionMinLength,
        );
        let homoFwd2 = this.extendSequence(
            plasmidSequence,
            operationRange[1],
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
            const stillAboveTargetTM = Nucleotides.getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc") > targetTMHR;
            const slicingGetsUsCloser = Math.abs(targetTMHR - Nucleotides.getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc")) <= Math.abs(targetTMHR - Nucleotides.getMeltingTemperature(overlappingSeq, "oligoCalc"));
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
        const homoRev1 = Nucleotides.reverseComplementary(homoFwd2);
        //const homoRev2 = Nucleotides.reverseComplementary(homoFwd1);

        const hrLength = homoFwd1.length + seqToInsert.length + homoRev1.length;

        return {
            "title": (operationType !== "Deletion") ? `Short ${operationType}` : operationType,
            "operationType": operationType,
            "hrLength": hrLength,
            "primersPositions": [operationRange[0], operationRange[0] + seqToInsert.length],
            "type": "symmetric",
            "primers": [
                {
                    "name": "Forward Primer",
                    "regions": [
                        {"sequence": homoFwd1, "color": primerColors["HR"]},
                        {"sequence": seqToInsert, "color": primerColors["insertion"]},
                        {"sequence": tempFwd, "color": primerColors["TBR"]}
                    ],
                },
                {
                    "name": "Reverse Primer",
                    "regions": [
                        {"sequence": homoRev1, "color": primerColors["HR"]},
                        {"sequence": Nucleotides.reverseComplementary(seqToInsert), "color": primerColors["insertion"]},
                        {"sequence": tempRev, "color": primerColors["TBR"]}
                    ],
                },
            ],
        };
    };


    generateAsymShortSet(
        plasmidSequence,
        tempFwd,
        tempRev,
        seqToInsert,
        operationRange,
        targetTMHR,
        operationType,
        primerColors
    ) {
        const homoFwd = this.extendSequence(
            plasmidSequence,
            operationRange[0],
            "top",
            "rev",
            targetTMHR,
            "oligoCalc",
            homoRegionMinLength
        );

        return {
            "title": (operationType !== "Deletion") ? `Short ${operationType}` : operationType,
            "operationType": operationType,
            "hrLength": homoFwd.length,
            "primersPositions": [operationRange[0], operationRange[0] + seqToInsert.length],
            "type": "asymmetric",
            "primers": [
                {
                    "name": "Forward Primer",
                    "regions": [
                        {"sequence": homoFwd, "color": primerColors["HR"]},
                        {"sequence": seqToInsert, "color": primerColors["insertion"]},
                        {"sequence": tempFwd, "color": primerColors["TBR"]}
                    ],
                },
                {
                    "name": "Reverse Primer",
                    "regions": [
                        {"sequence": tempRev, "color": primerColors["TBR"]}
                    ],
                },
            ],
        };
    };


    generateSymLongSet(
        plasmidSequence,
        tempFwd,
        tempRev,
        seqToInsert,
        operationRange,
        targetTMHR,
        operationType,
        primerColors
    ) {
        const operationTypeTagline = "Long Insertion";

        let overlappingSeq = "";

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
            const stillAboveTargetTM = Nucleotides.getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc") > targetTMHR;
            const slicingGetsUsCloser = Math.abs(targetTMHR - Nucleotides.getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc")) <= Math.abs(targetTMHR - Nucleotides.getMeltingTemperature(overlappingSeq, "oligoCalc"));
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
        const homoFwd = seqToInsert.slice(homoFragmentLength1, seqToInsert.length);
        const seqToInsertRevComp = Nucleotides.reverseComplementary(seqToInsert);
        const homoRev = seqToInsertRevComp.slice(homoFragmentLength2, seqToInsertRevComp.length);

        return [
            {
                "primerName": "Forward Primer",
                "homologousRegionLengths": overlappingSeq.length,
                "nextBases": [
                    operationRange[0] + seqToInsert.length - homoFwd.length - 1,
                    operationRange[0] + seqToInsert.length + tempFwd.length 
                ],
                "maxLengths": [
                    Infinity,
                    seqToInsert.length,
                    Infinity
                ],
                "primerRegions": [
                    null,
                    [homoFwd, primerColors["insertion"]],
                    [tempFwd, primerColors["TBR"]]
                ]
            },
            {
                "primerName": "Reverse Primer",
                "homologousRegionLengths": overlappingSeq.length,
                "nextBases": [
                    operationRange[0] + homoRev.length,
                    operationRange[0] - tempRev.length - 1 
                ],
                "maxLengths": [
                    Infinity,
                    seqToInsert.length,
                    Infinity
                ],
                "primerRegions": [
                    null,
                    [homoRev, primerColors["insertion"]],
                    [tempRev, primerColors["TBR"]]
                ]
            }
        ];
    };


    generateAsymLongSet(
        plasmidSequence,
        tempFwd,
        tempRev,
        seqToInsert,
        operationRange,
        targetTMHR,
        operationType,
        primerColors
    ) {
        const operationTypeTagline = "Long Insertion";

        let overlappingSeq = "";

        /**
         * Asymmetric primers, remove bases from the complementary strand until target tm is reached
         */
        // Initial overlapping sequence is the entire insertion
        overlappingSeq = Nucleotides.reverseComplementary(seqToInsert);
        
        // Delete bases until target tm is reached
        while (true) {
            const stillAboveTargetTM = Nucleotides.getMeltingTemperature(overlappingSeq.slice(1), "oligoCalc") > targetTMHR;
            const slicingGetsUsCloser = Math.abs(targetTMHR - Nucleotides.getMeltingTemperature(overlappingSeq.slice(1), "oligoCalc")) <= Math.abs(targetTMHR - Nucleotides.getMeltingTemperature(overlappingSeq, "oligoCalc"));
            const minimumLengthNotReached = overlappingSeq.length > homoRegionMinLength;
            if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                overlappingSeq = overlappingSeq.slice(1);
            } else {
                break;
            };
        };
        
        // Set homologous sequences
        const homoFwd = seqToInsert;
        const homoRev = overlappingSeq;

        return [
            {
                "primerName": "Forward Primer",
                "homologousRegionLengths": overlappingSeq.length,
                "nextBases": [
                    null,
                    operationRange[0] + seqToInsert.length + tempFwd.length 
                ],
                "maxLengths": [
                    Infinity,
                    seqToInsert.length,
                    Infinity
                ],
                "primerRegions": [
                    null,
                    [homoFwd, primerColors["insertion"]],
                    [tempFwd, primerColors["TBR"]]
                ]
            },
            {
                "primerName": "Reverse Primer",
                "homologousRegionLengths": overlappingSeq.length,
                "nextBases": [
                    operationRange[0] + homoRev.length,
                    operationRange[0] - tempRev.length - 1 
                ],
                "maxLengths": [
                    Infinity,
                    seqToInsert.length,
                    Infinity
                ],
                "primerRegions": [
                    null,
                    [homoRev, primerColors["insertion"]],
                    [tempRev, primerColors["TBR"]]
                ]
            }
        ];
    };
};