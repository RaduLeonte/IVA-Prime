const Primers = new class {
    // #region extendSequence
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
        
        //console.log(`Primers.extendSequence -> startingIndex=${startingIndex} [${plasmidSequence.slice(startingIndex, startingIndex+3)}...]`);

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
            Nucleotides.validatePrimerSequence(primerSequence);

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

                const nextBaseIndices = (direction === "fwd")
                    ? [startingIndex, startingIndex + extensionLength - 1]
                    : [startingIndex - extensionLength + 1, startingIndex];
                const [nextStartIndex, nextEndIndex] = nextBaseIndices;
                
                const primerOutOfBounds =  plasmidSequence.length - nextEndIndex < 0;


                if (Session.activePlasmid().topology === "linear" && primerOutOfBounds) {
                    throw new OutOfBasesError()
                };
                
                primerSequence = (direction === "fwd")
                ? initialSequence + Utilities.repeatingSlice(plasmidSequence, nextStartIndex, nextEndIndex)
                : Utilities.repeatingSlice(plasmidSequence, nextStartIndex, nextEndIndex) + initialSequence;
                

                currTM = Nucleotides.getMeltingTemperature(primerSequence, tmMethod);
            };
        };
    };


    // #region generateSet
    /**
     * Generate the set of primers for a given IVA Operation.
     * 
     * @param {String} operationType - Type of IVA Operation
     * @param {Array<Number>} operationRange - Operation range/span
     * @param {String} plasmidSequence - DNA sequence of the plasmid
     * @param {String} seqToInsert - DNA sequence to be inserted
     * @returns 
     */
    // TO DO: warn user if TBRs bind somewhere else and give the option to extend them unti they dont
    generateSet(
        operationType,
        operationRange,
        plasmidSequence,
        seqToInsert,
    ) {
        // Target Tm for homologous region
        const targetTMHR = (operationType !== "Subcloning")
            ? UserPreferences.get("HRTm")
            : UserPreferences.get("HRSubcloningTm");

        // Make sure indices are sorted
        if (operationRange[1] === null) {
            operationRange = [
                operationRange[0],
                operationRange[0] - 1
            ];
        } else {
            operationRange = [
                Math.min(...operationRange),
                Math.max(...operationRange)
            ];
        };


        // #region TBR Template binding region
        // Forward template binding region, extend forward on the forward strand from the end position
        const tempFwd = this.extendSequence(
            plasmidSequence,
            operationRange[1],
            "top",
            "fwd",
            UserPreferences.get("TBRTm"),
            UserPreferences.get("TmAlgorithm"),
            7
        );
        // Reverse template binding region, extend forward on the complementary strand from the start position
        const tempRev = this.extendSequence(
            plasmidSequence,
            operationRange[0],
            "bottom",
            "fwd",
            UserPreferences.get("TBRTm"),
            UserPreferences.get("TmAlgorithm"),
            7
        );
        // #endregion TBR


        // #region HR Homologous region
        const isShortInsertion = Nucleotides.getMeltingTemperature(seqToInsert, "oligoCalc") < UserPreferences.get("maxTmSi");
        const symmetricPrimers = UserPreferences.get("symmetricPrimers");

        // Find appropriate generator for the primers
        const generator = (isShortInsertion)
        ? (symmetricPrimers)
            ? this.generateSymShortSet.bind(this)
            : this.generateAsymShortSet.bind(this)
        : (symmetricPrimers)
            ? this.generateSymLongSet.bind(this)
            : this.generateAsymLongSet.bind(this)

        // Generate the primers
        const primersSet = generator(
            plasmidSequence,
            operationRange,
            tempFwd,
            tempRev,
            seqToInsert,
            targetTMHR,
            operationType,
        );
        // #endregion HR

        return primersSet;
    };


    // #region Symmetric Short
    /**
     * Generate a set of symmetric primers for short insertions/mutations
     * 
     * @param {String} plasmidSequence - Sequence of the plasmid
     * @param {Array<Number>} operationRange - Operation range/span
     * @param {String} tempFwd - DNA sequence of the template binding region of the forward primer
     * @param {String} tempRev - DNA sequence of the template binding region of the reverse primer
     * @param {String} seqToInsert - DNA sequence to be inserted
     * @param {Number} targetTMHR - Targer melting temperature for the homologous region
     * @param {String} operationType - Type of IVA operation
     * 
     * @returns {Object} - Primers set dictionary
     */
    generateSymShortSet(
        plasmidSequence,
        operationRange,
        tempFwd,
        tempRev,
        seqToInsert,
        targetTMHR,
        operationType,
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
            operationRange[0] - 1,
            "top",
            "rev",
            targetTMHR,
            "oligoCalc",
            UserPreferences.get("HRMinLength"),
        );
        console.log("Primers.generateSymShortSet ->", homoFwd1)
        let homoFwd2 = this.extendSequence(
            plasmidSequence,
            operationRange[1],
            "top",
            "fwd",
            targetTMHR,
            "oligoCalc",
            UserPreferences.get("HRMinLength"),
        );
        console.log("Primers.generateSymShortSet ->", homoFwd2)

        let overlappingSeq = homoFwd1 + seqToInsert + homoFwd2;

        // Take turns deleting bases from each end until the target melting temperature is reached
        let turnHomoFwd1 = true;
        while (true) {
            // Get slice indices for the current iteration
            const sliceIndices = (turnHomoFwd1 === true) ?  [1, overlappingSeq.length]: [0, -1]
            // Check conditions
            const stillAboveTargetTM = Nucleotides.getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc") > targetTMHR;
            const slicingGetsUsCloser = Math.abs(targetTMHR - Nucleotides.getMeltingTemperature(overlappingSeq.slice(...sliceIndices), "oligoCalc")) <= Math.abs(targetTMHR - Nucleotides.getMeltingTemperature(overlappingSeq, "oligoCalc"));
            const minimumLengthNotReached = overlappingSeq.length > UserPreferences.get("HRMinLength");
            
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

        const seqToInsertRevComp = Nucleotides.reverseComplementary(seqToInsert);
        
        const primerSetTitle = (operationType !== "Deletion") ? `Short ${operationType}` : operationType;

        return {
            title: `${Session.activePlasmid().getNextOperationIndex() + 1}. ${primerSetTitle}`,
            type: operationType,
            hrLength: hrLength,
            hrTm: Nucleotides.getMeltingTemperature(homoFwd1 + seqToInsert + homoRev1, "oligoCalc"),
            symmetry: "symmetric",
            currentPlasmidSequence: 
                Session.activePlasmid().sequence.slice(0, operationRange[0] - 1)
                + seqToInsert
                + Session.activePlasmid().sequence.slice(operationRange[1]),
            primers: [
                {
                    name: "Forward primer",
                    label: "Forward primer",
                    regions: [
                        {sequence: homoFwd1, type: "HR", start: operationRange[0] - 1, direction: "fwd"},
                        {sequence: seqToInsert, type: "INS", start: null, direction: "fwd"},
                        {sequence: tempFwd, type: "TBR", start: operationRange[0] + seqToInsert.length, direction: "fwd"}
                    ],
                },
                {
                    name: "Reverse primer",
                    label: "Reverse primer",
                    regions: [
                        {sequence: homoRev1, type:"HR", start: operationRange[0] + seqToInsert.length, direction: "rev"},
                        {sequence: seqToInsertRevComp, type: "INS", start: null, direction: "rev"},
                        {sequence: tempRev, type: "TBR", start: operationRange[0] - 1, direction: "rev"}
                    ],
                },
            ],
        };
    };


    // #region Asymmetric Short
    /**
     * Generate a set of asymmetric primers for short insertions/mutations
     * 
     * @param {String} plasmidSequence - Sequence of the plasmid
     * @param {Array<Number>} operationRange - Operation range/span
     * @param {String} tempFwd - DNA sequence of the template binding region of the forward primer
     * @param {String} tempRev - DNA sequence of the template binding region of the reverse primer
     * @param {String} seqToInsert - DNA sequence to be inserted
     * @param {Number} targetTMHR - Targer melting temperature for the homologous region
     * @param {String} operationType - Type of IVA operation
     * 
     * @returns {Object} - Primers set dictionary
     */
    generateAsymShortSet(
        plasmidSequence,
        operationRange,
        tempFwd,
        tempRev,
        seqToInsert,
        targetTMHR,
        operationType,
    ) {
        const homoFwd = this.extendSequence(
            plasmidSequence,
            operationRange[0] - 1,
            "top",
            "rev",
            targetTMHR,
            "oligoCalc",
            UserPreferences.get("HRMinLength")
        );

        const primerSetTitle = (operationType !== "Deletion") ? `Short ${operationType}` : operationType;

        return {
            title: `${Session.activePlasmid().getNextOperationIndex() + 1}. ${primerSetTitle}`,
            type: operationType,
            hrLength: homoFwd.length,
            hrTm: Nucleotides.getMeltingTemperature(homoFwd, "oligoCalc"),
            symmetry: "asymmetric",
            currentPlasmidSequence: 
                Session.activePlasmid().sequence.slice(0, operationRange[0] - 1)
                + seqToInsert
                + Session.activePlasmid().sequence.slice(operationRange[1]),
            primers: [
                {
                    name: "Forward primer",
                    label: "Forward primer",
                    regions: [
                        {sequence: homoFwd, type: "HR", start: operationRange[0] - 1, direction: "fwd"},
                        {sequence: seqToInsert, type: "INS", start: null, direction: "fwd"},
                        {sequence: tempFwd, type: "TBR", start: operationRange[0] + seqToInsert.length, direction: "fwd"}
                    ],
                },
                {
                    name: "Reverse primer",
                    label: "Reverse primer",
                    regions: [
                        {sequence: "", type: "HR", start: operationRange[0], direction: "rev"},
                        {sequence: "", type: "INS", start: null, direction: "rev"},
                        {sequence: tempRev, type: "TBR", start: operationRange[0] - 1, direction: "rev"},
                    ],
                },
            ],
        };
    };


    // #region Symmetric Long
    /**
     * Generate a set of symmetric primers for long insertions/mutations
     * 
     * @param {String} plasmidSequence - Sequence of the plasmid
     * @param {Array<Number>} operationRange - Operation range/span
     * @param {String} tempFwd - DNA sequence of the template binding region of the forward primer
     * @param {String} tempRev - DNA sequence of the template binding region of the reverse primer
     * @param {String} seqToInsert - DNA sequence to be inserted
     * @param {Number} targetTMHR - Targer melting temperature for the homologous region
     * @param {String} operationType - Type of IVA operation
     * 
     * @returns {Object} - Primers set dictionary
     */
    generateSymLongSet(
        plasmidSequence,
        operationRange,
        tempFwd,
        tempRev,
        seqToInsert,
        targetTMHR,
        operationType,
    ) {
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
            const minimumLengthNotReached = overlappingSeq.length > UserPreferences.get("HRMinLength");
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

        return {
            title: (operationType !== "Deletion") ? `Long ${operationType}` : operationType,
            type: operationType,
            hrLength: overlappingSeq.length,
            hrTm: Nucleotides.getMeltingTemperature(overlappingSeq, "oligoCalc"),
            symmetry: "symmetric",
            currentPlasmidSequence: 
                Session.activePlasmid().sequence.slice(0, operationRange[0] - 1)
                + seqToInsert
                + Session.activePlasmid().sequence.slice(operationRange[1]),
            primers: [
                {
                    name: "Forward primer",
                    label: "Forward primer",
                    regions: [
                        {sequence: "", type: "HR", start: operationRange[0] + seqToInsert.length - 1, direction: "fwd"},
                        {sequence: homoFwd, type: "INS", start: operationRange[0] + seqToInsert.length - 1, direction: "fwd"},
                        {sequence: tempFwd, type: "TBR", start: operationRange[0] + seqToInsert.length, direction: "fwd"},
                    ],
                },
                {
                    name: "Reverse primer",
                    label: "Reverse primer",
                    regions: [
                        {sequence: "", type: "HR", start: operationRange[0], direction: "rev"},
                        {sequence: homoRev, type: "INS", start: operationRange[0], direction: "rev"},
                        {sequence: tempRev, type: "TBR", start: operationRange[0] - 1, direction: "rev"},
                    ],
                },
            ],
        };
    };


    // #region Asymmetric Long
    /**
     * Generate a set of asymmetric primers for long insertions/mutations
     * 
     * @param {String} plasmidSequence - Sequence of the plasmid
     * @param {Array<Number>} operationRange - Operation range/span
     * @param {String} tempFwd - DNA sequence of the template binding region of the forward primer
     * @param {String} tempRev - DNA sequence of the template binding region of the reverse primer
     * @param {String} seqToInsert - DNA sequence to be inserted
     * @param {Number} targetTMHR - Targer melting temperature for the homologous region
     * @param {String} operationType - Type of IVA operation
     * 
     * @returns {Object} - Primers set dictionary
     */
    generateAsymLongSet(
        plasmidSequence,
        operationRange,
        tempFwd,
        tempRev,
        seqToInsert,
        targetTMHR,
        operationType,
    ) {
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
            const minimumLengthNotReached = overlappingSeq.length > UserPreferences.get("HRMinLength");
            if ((stillAboveTargetTM || slicingGetsUsCloser) && minimumLengthNotReached) {
                overlappingSeq = overlappingSeq.slice(1);
            } else {
                break;
            };
        };
        
        // Set homologous sequences
        const homoFwd = seqToInsert;
        const homoRev = overlappingSeq;

        const primerSetTitle = (operationType !== "Deletion") ? `Short ${operationType}` : operationType;

        return {
            title: `${Session.activePlasmid().getNextOperationIndex() + 1}. ${primerSetTitle}`,
            type: operationType,
            hrLength: overlappingSeq.length,
            hrTm: Nucleotides.getMeltingTemperature(overlappingSeq, "oligoCalc"),
            symmetry: "asymmetric",
            currentPlasmidSequence: 
                Session.activePlasmid().sequence.slice(0, operationRange[0] - 1)
                + seqToInsert
                + Session.activePlasmid().sequence.slice(operationRange[1]),
            primers: [
                {
                    name: "Forward primer",
                    label: "Forward primer",
                    regions: [
                        {sequence: "", type: "HR", start: operationRange[0] + seqToInsert.length - 1, direction: "fwd"},
                        {sequence: homoFwd, type: "INS", start: operationRange[0] + seqToInsert.length - 1, direction: "fwd"},
                        {sequence: tempFwd, type: "TBR", start: operationRange[0] + seqToInsert.length, direction: "fwd"},
                    ],
                },
                {
                    name: "Reverse primer",
                    label: "Reverse primer",
                    regions: [
                        {sequence: "", type: "HR", start: operationRange[0], direction: "rev"},
                        {sequence: homoRev, type: "INS", start: operationRange[0], direction: "rev"},
                        {sequence: tempRev, type: "TBR", start: operationRange[0] - 1, direction: "rev"},
                    ],
                },
            ],
        };
    };


    // #region Subcloning
    /**
     * Generate subcloning primers
     * 
     * @param {Array<Number>} operationRange - Operation range/span
     * @param {String} plasmidSequence - Sequence of the plasmid
     * @param {String} seq5Prime - DNA sequence to be inserted at the 5' end
     * @param {String} seq3Prime - DNA sequence to be inserted at the 3' end
     * 
     * @returns {Object} - Primers set dictionary
     */
    generateSubcloningSet(
        operationRange,
        plasmidSequence,
        seq5Prime,
        seq3Prime,
    ) {
        // Adjust range if pure insertion
        if (operationRange[1] === null) {
            operationRange = [
                operationRange[0],
                operationRange[0] - 1
            ];
        } else {
            operationRange = [
                Math.min(...operationRange),
                Math.max(...operationRange)
            ];
        };

        // Get subcloning target sequence
        const subclonignOriginPlasmid = Session.getPlasmid(Session.subcloningOriginPlasmidIndex);
        const subcloningOriginSpan = Session.subcloningOriginSpan;
        const subcloningTarget = subclonignOriginPlasmid.sequence.slice(subcloningOriginSpan[0] - 1, subcloningOriginSpan[1])
    
        // Get current plasmid sequence
        const activePlasmidSequence = plasmidSequence;
        /**
         * Create pseudo plasmid sequence
         * We pretend the subcloning target is already in the target 
         * vector and that we're doing a simple insertion at the 5' end
         */
        const pseudoPlasmidSequence5Prime = activePlasmidSequence.slice(0, operationRange[0]-1) + subcloningTarget + activePlasmidSequence.slice(operationRange[1]);

        // Generate first primer set using pseudo plasmid sequence
        const primerSet5Prime = Primers.generateSet(
            "Insertion",
            [operationRange[0], null],
            pseudoPlasmidSequence5Prime,
            seq5Prime
        );
        
        /**
         * Create pseudo plasmid sequence
         * We pretend the subcloning target is already in the target 
         * vector and that we're doing a simple insertion at the 3' end
         */
        const pseudoPlasmidSequence3Prime = Nucleotides.reverseComplementary(pseudoPlasmidSequence5Prime);
        // Adjust operation position because the 3' pseudo plasmid sequence is flipped
        const operationPos =  pseudoPlasmidSequence3Prime.length - operationRange[0] - subcloningTarget.length + 2

        // Generate second primer set using pseudo plasmid sequence
        const primerSet3Prime = Primers.generateSet(
            "Insertion",
            [operationPos, null],
            pseudoPlasmidSequence3Prime,
            Nucleotides.reverseComplementary(seq3Prime)
        );

        // Shorthand
        const sets = [primerSet5Prime, primerSet3Prime];

        // The full insertion sequence
        const insertionSequenceFull = seq5Prime + subcloningTarget + seq3Prime;

        // Return primer set dict
        return {
            title: `${Session.activePlasmid().getNextOperationIndex() + 1}. Subcloning`,
            type: "Subcloning",
            hrLength: [sets[0].hrLength, sets[1].hrLength],
            hrTm: [sets[0].hrTm, sets[1].hrTm],
            symmetry: sets[0].symmetry,
            currentPlasmidSequence: 
                Session.activePlasmid().sequence.slice(0, operationRange[0] - 1)
                + insertionSequenceFull
                + Session.activePlasmid().sequence.slice(operationRange[1]),
            primers: [
                {
                    name: "Forward primer",
                    label: "Forward primer",
                    regions: [
                        {
                            sequence: sets[0].primers[0].regions[0].sequence,
                            type: "subHR",
                            start: operationRange[0] - 1,
                            direction: "fwd",
                        },
                        {
                            sequence: sets[0].primers[0].regions[1].sequence,
                            type: "INS",
                            start: operationRange[0] - 1 + seq5Prime.length,
                            direction: "fwd",
                        },
                        {
                            sequence: sets[0].primers[0].regions[2].sequence,
                            type: "subTBR",
                            start: operationRange[0] + seq5Prime.length,
                            direction: "fwd",
                        },
                    ],
                },
                {
                    name: "Reverse primer",
                    label: "Reverse primer",
                    regions: [
                        {
                            sequence: sets[1].primers[0].regions[0].sequence,
                            type: "subHR",
                            start: operationRange[0] + insertionSequenceFull.length,
                            direction: "rev",
                        },
                        {
                            sequence: sets[1].primers[0].regions[1].sequence,
                            type: "INS",
                            start: operationRange[0] + insertionSequenceFull.length - seq3Prime.length,
                            direction: "rev",
                        },
                        {
                            sequence: sets[1].primers[0].regions[2].sequence,
                            type: "subTBR",
                            start: operationRange[0] + insertionSequenceFull.length - seq3Prime.length - 1,
                            direction: "rev",
                        },
                    ],
                },
                {
                    name: "Vector forward primer",
                    label: "Vector forward primer",
                    regions: [
                        {
                            sequence: sets[1].primers[1].regions[0].sequence,
                            type: "subHR",
                            start: operationRange[0] + insertionSequenceFull.length - seq3Prime.length - 1,
                            direction: "fwd",
                        },
                        {
                            sequence: sets[1].primers[1].regions[1].sequence,
                            type: "INS",
                            start: operationRange[0] + insertionSequenceFull.length  - 1,
                            direction: "fwd",
                        },
                        {
                            sequence: sets[1].primers[1].regions[2].sequence,
                            type: "subTBR",
                            start: operationRange[0] + insertionSequenceFull.length,
                            direction: "fwd",
                        },
                    ],
                },
                {
                    name: "Vector reverse primer",
                    label: "Vector reverse primer",
                    regions: [
                        {
                            sequence: sets[0].primers[1].regions[0].sequence,
                            type: "subHR",
                            start: operationRange[0] + seq5Prime.length,
                            direction: "rev",
                        },
                        {
                            sequence: sets[0].primers[1].regions[1].sequence,
                            type: "INS",
                            start: operationRange[0],
                            direction: "rev",
                        },
                        {
                            sequence: sets[0].primers[1].regions[2].sequence,
                            type: "subTBR",
                            start: operationRange[0] - 1,
                            direction: "rev",
                        },
                    ],
                },
            ]
        }
    };


    // #region Linear fragment
    insertFromLinearFragment(operationRange, plasmidSequence, seqToInsert, linFragName, translateFeature) {
        // "Subclone" from pseudo linear fragment
        // Adjust range if pure insertion
        if (operationRange[1] === null) {
            operationRange = [
                operationRange[0],
                operationRange[0] - 1
            ];
        } else {
            operationRange = [
                Math.min(...operationRange),
                Math.max(...operationRange)
            ];
        };
    
        // Get current plasmid sequence
        const activePlasmidSequence = plasmidSequence;
        /**
         * Create pseudo plasmid sequence
         * We pretend the ins target is already in the target 
         * vector and that we're doing a simple insertion at the 5' end
         */
        const pseudoPlasmidSequence5Prime = activePlasmidSequence.slice(0, operationRange[0]-1) + seqToInsert + activePlasmidSequence.slice(operationRange[1]);

        // Generate first primer set using pseudo plasmid sequence
        const primerSet5Prime = Primers.generateSet(
            "Insertion",
            [operationRange[0], null],
            pseudoPlasmidSequence5Prime,
            ""
        );
        
        /**
         * Create pseudo plasmid sequence
         * We pretend the subcloning target is already in the target 
         * vector and that we're doing a simple insertion at the 3' end
         */
        const pseudoPlasmidSequence3Prime = Nucleotides.reverseComplementary(pseudoPlasmidSequence5Prime);
        // Adjust operation position because the 3' pseudo plasmid sequence is flipped
        const operationPos =  pseudoPlasmidSequence3Prime.length - operationRange[0] - seqToInsert.length + 2

        // Generate second primer set using pseudo plasmid sequence
        const primerSet3Prime = Primers.generateSet(
            "Insertion",
            [operationPos, null],
            pseudoPlasmidSequence3Prime,
            ""
        );

        // Shorthand
        const sets = [primerSet5Prime, primerSet3Prime];

        // The full insertion sequence
        const insertionSequenceFull = seqToInsert;

        // Return primer set dict
        const primerSet = {
            title: `${Session.activePlasmid().getNextOperationIndex() + 1}. Insertion from linear fragment`,
            type: "Subcloning",
            hrLength: [sets[0].hrLength, sets[1].hrLength],
            hrTm: [sets[0].hrTm, sets[1].hrTm],
            symmetry: sets[0].symmetry,
            currentPlasmidSequence: 
                Session.activePlasmid().sequence.slice(0, operationRange[0] - 1)
                + insertionSequenceFull
                + Session.activePlasmid().sequence.slice(operationRange[1]),
            primers: [
                {
                    name: "Vector forward primer",
                    label: "Vector forward primer",
                    regions: [
                        {
                            sequence: sets[1].primers[1].regions[0].sequence,
                            type: "subHR",
                            start: operationRange[0] + insertionSequenceFull.length - 1,
                            direction: "fwd",
                        },
                        {
                            sequence: sets[1].primers[1].regions[1].sequence,
                            type: "INS",
                            start: operationRange[0] + insertionSequenceFull.length  - 1,
                            direction: "fwd",
                        },
                        {
                            sequence: sets[1].primers[1].regions[2].sequence,
                            type: "subTBR",
                            start: operationRange[0] + insertionSequenceFull.length,
                            direction: "fwd",
                        },
                    ],
                },
                {
                    name: "Vector reverse primer",
                    label: "Vector reverse primer",
                    regions: [
                        {
                            sequence: sets[0].primers[1].regions[0].sequence,
                            type: "subHR",
                            start: operationRange[0],
                            direction: "rev",
                        },
                        {
                            sequence: sets[0].primers[1].regions[1].sequence,
                            type: "INS",
                            start: operationRange[0],
                            direction: "rev",
                        },
                        {
                            sequence: sets[0].primers[1].regions[2].sequence,
                            type: "subTBR",
                            start: operationRange[0],
                            direction: "rev",
                        },
                    ],
                },
            ]
        };


        /**
         * Create new file with overhangs
         */
        const overhang5Prime = sets[0].primers[0].regions[0].sequence;
        const overhang3Prime = Nucleotides.reverseComplementary(sets[1].primers[0].regions[0].sequence);
        const linearFragmentSequence = overhang5Prime + seqToInsert + overhang3Prime;

        // Initialize features dict with default
        let newFileFeatures = {
            "LOCUS": {
            label: "",
            note: "",
            span: ""
            }
        };
    
        // Add plasmid object to project
        const newPlasmid = new Plasmid(
            null, // index
            linFragName,
            ".fasta", // extension
            linearFragmentSequence,
            newFileFeatures,
            "linear",
            null, // additional info
        );
        Session.addPlasmid(newPlasmid);

        // Annotate main sequence of interest
        const sequenceSpan = [overhang5Prime.length + 1, overhang5Prime.length + seqToInsert.length];
        newPlasmid.newFeature(
            sequenceSpan,
            "fwd",
            linFragName,
            null,
            null,
            translateFeature,
            ""
        );

        return primerSet;
    };
};