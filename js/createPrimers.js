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
 * TO DO:
 * - group <p>s into div
 * - save to dict so they can be used later to generate a protocol?
 * - use a loop to create the two primers and change structure of primersList to nested list and maybe
 * make a dict to combine with colors
 */
function displayPrimers(primersType, primersList, textColor, templateColor, homoColor, mutSeq) {
    const sidebarContentDiv = document.querySelector('.sidebar-content'); // Select sidebar

    // Change sidebar headline
    var element = document.getElementById("primers-type");
    element.textContent = "Primers:";


    // Display primer pair nr and type of mod
    const p = document.createElement('p');
    p.id = 'primers-type';
    p.textContent = operationNr + '. ' + primersType;
    operationNr++;
    sidebarContentDiv.appendChild(p);



    // First Pair of primers
    const paragraph1 = document.createElement('p');
    paragraph1.style.wordWrap = 'break-word'; // Add CSS style for word wrapping

    // Create individual spans for the homologous and template regions of the primers  with different colors
    const span1a = document.createElement('span'); 
    span1a.style.color = textColor;
    span1a.style.backgroundColor = homoColor;
    span1a.style.fontWeight = 'bold';
    span1a.textContent = primersList[2];

    const span1b = document.createElement('span');
    span1b.style.color = textColor;
    span1b.style.backgroundColor = templateColor;
    span1b.style.fontWeight = 'bold';
    span1b.textContent = primersList[3];
    // Append the spans to the paragraph
    paragraph1.appendChild(span1a);
    paragraph1.appendChild(span1b);

    // Calculate melting temperatures and add to the paragraph
    const spanTm1 = document.createElement('span');
    let tmTuple = [];
    if (primersList[2] !== "") {
        tmTuple.push(get_tm(primersList[2], primerConc, saltConc).toFixed(2))
    }
    if (primersList[3] !== "") {
        tmTuple.push(get_tm(primersList[3], primerConc, saltConc).toFixed(2))
    }
    spanTm1.textContent = ` (${tmTuple.join(',')})`
    paragraph1.appendChild(spanTm1);

    // Second Pair of primers
    const paragraph2 = document.createElement('p');
    paragraph2.style.wordWrap = 'break-word'; // Add CSS style for word wrapping
    // Create the first span with red text and bold
    const span2a = document.createElement('span');
    span2a.style.color = textColor;
    span2a.style.backgroundColor = homoColor;
    span2a.style.fontWeight = 'bold';
    span2a.textContent = primersList[0];

    // Create the second span with green text and bold
    const span2b = document.createElement('span');
    span2b.style.color = textColor;
    span2b.style.backgroundColor = templateColor;
    span2b.style.fontWeight = 'bold';
    span2b.textContent = primersList[1];
    // Append the spans to the paragraph
    paragraph2.appendChild(span2a);
    if (mutSeq) {
        const spanMut = document.createElement('span');
        spanMut.style.color = textColor;
        spanMut.style.backgroundColor = 'rgb(199,51,116)';
        spanMut.style.fontWeight = 'bold';
        spanMut.textContent = mutSeq;
        paragraph2.appendChild(spanMut);
    }
    paragraph2.appendChild(span2b);

    const spanTm2 = document.createElement('span');
    tmTuple = [];
    if (primersList[0] !== "") {
        tmTuple.push(get_tm(primersList[0], primerConc, saltConc).toFixed(2))
    }
    if (primersList[1] !== "") {
        tmTuple.push(get_tm(primersList[1], primerConc, saltConc).toFixed(2))
    }
    spanTm2.textContent = `(${tmTuple.join(',')})`
    //spanTm2.textContent = " (" + get_tm(primersList[0], primerConc, saltConc).toFixed(1) + ", " + get_tm(primersList[1], primerConc, saltConc).toFixed(1) + ")";
    paragraph2.appendChild(spanTm2);


    // Insert the new paragraphs after the <p> with id "primers-type"
    sidebarContentDiv.appendChild(paragraph2);
    sidebarContentDiv.appendChild(paragraph1);
    
    // Special case for subcloning which requires 4 primers
    if (primersType === "Subcloning") {
        const paragraph3 = document.createElement('p');
        const paragraph4 = document.createElement('p');
        paragraph3.style.wordWrap = 'break-word';
        paragraph4.style.wordWrap = 'break-word'; // Add CSS style for word wrapping
        
        // Create the first span with red text and bold
        const span3 = document.createElement('span');
        span3.style.color = textColor;
        span3.style.backgroundColor = homoColor;
        span3.style.fontWeight = 'bold';
        span3.textContent = primersList[4];
        paragraph3.appendChild(span3);

        const span4 = document.createElement('span');
        span4.style.color = textColor;
        span4.style.backgroundColor = homoColor;
        span4.style.fontWeight = 'bold';
        span4.textContent = primersList[5];
        paragraph4.appendChild(span4);

        sidebarContentDiv.appendChild(paragraph3);
        sidebarContentDiv.appendChild(paragraph4);
    }

    // Reset selection
    selectedText = "";
    selectedText2 = "";
}


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
 * TO DO:
 * - Clean up, some lines are way too long
 * - Maybe change to always favour the primer with the higher temperature?
 */
function primerExtension(startingPos, targetStrand, direction, targetTm, minLength, pNr, mutSeq) {
    console.log("PE", startingPos, targetStrand, direction, targetTm, minLength, pNr, mutSeq)
    
    let p_start_index = startingPos - 1; // Convert sequence index to string index
    let length = minLength; // initial value for length

    // Set working strand
    let currStrand = targetStrand === 'fwdStrand' ? sequence : complementaryStrand;
    // If we're working on the second plasmid, change working strand to that
    if (pNr === 2) {
        currStrand = targetStrand === 'fwdStrand' ? sequence2 : complementaryStrand2;
    }

    // Check if we have a sequence to start with
    let accessory = ""
    if (mutSeq) {
        accessory = mutSeq;
    }


    // Initialise previous primer based on target strand and direction and using the min length
    let prev_p = "";
    if (direction === "forward") {
        prev_p = targetStrand === 'fwdStrand' ? repeatingSlice(currStrand, p_start_index, p_start_index + length - 1) + accessory: repeatingSlice(currStrand, p_start_index - length, p_start_index);
    } else {
        prev_p = targetStrand === 'fwdStrand' ? repeatingSlice(currStrand, p_start_index - length + 1, p_start_index) + accessory: repeatingSlice(currStrand, p_start_index, p_start_index - length);
    }
    console.log("prev_p", targetStrand, direction, p_start_index, prev_p)
    let prev_tm = get_tm(prev_p, primerConc, saltConc); // Get melting temperature of initial primer
    
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
        }
        let curr_tm = get_tm(curr_p, primerConc, saltConc);

        /** If the melting temperature of the current primer exceeds the target temperature, break the loop 
         * and return either the current primer or the previous one, whichever is closest to the target temperature*/ 
        if (curr_tm >= targetTm) {
            if (Math.abs(curr_tm - targetTm) <= Math.abs(prev_tm - targetTm)) {
                primer_fwd_tm = curr_tm;
                primer_fwd = curr_p;
            } else {
                primer_fwd_tm = prev_tm;
                primer_fwd = prev_p;
            }
            break;
        }

        // Adjusting loop variables
        prev_tm = curr_tm;
        prev_p = curr_p;
        length += 1;
        i++;
    }

    // Primer needs to be flipped if it was not fromt he fwdStrand
    if (targetStrand !== "fwdStrand") {
        primer_fwd = primer_fwd.split('').reverse().join('');
    }

    // Move the accessory (mutSeq) from the front to the back for compStrand
    if (direction !== "forward") {
        primer_fwd = primer_fwd.replace(accessory, "") + accessory;
    }

    return primer_fwd;
}


/**
 * Takes in a sequence of amino acids (inputAA) as input and returns the DNA sequence with
 * the lowest melting temperature. This function calls generateDNASequences to create all
 * possible DNA sequences for the specified amino acid sequence.
 * 
 * inputAA - amino acid sequence to optimize
 * 
 * TO DO:
 * - add options to optimize the AA sequence for a specific organism
 */
function optimizeAA(inputAA) {
    /**
     * Function that recursively creates every possible DNA sequence for the specificied amino acid sequence if
     * the length is under 10 amino acids, in which case it only returns the first DNA sequence generated.
     *  
     * TO DO:
     * - Make the algorithm not have an O(n!), maybe cache the melting temperatures of the codons
     * - Add an option to optimize for a specific organism
     * - Maybe optimize GC content?
     */
    function generateDNASequences(aminoAcidSequence) {
    
        const results = []; // Initialize empty list for generated sequences
    
        /**
         * The function looks at the amino acid in the amino acid sequence specified by the index and calls itself for each possible codon
         * that corresponds to the current amino acid.
         * 
         * aminoAcidSeq - full amino acid sequence
         * index - current tree depth and sequence index
         * currentSeq - the current sequence with all codons appended so far
         */
        function generateSequences(aminoAcidSeq, index, currentSeq) {
            // Check if we've reached the end of the recursive tree
            if (index === aminoAcidSeq.length) {
                results.push(currentSeq); // Save progress by pushing to results
                return;
            }

            const aminoAcid = aminoAcidSeq[index]; // Current amino acid
            const possibleCodons = aaToCodon[aminoAcid]; // Return list of possible codonds for current amino acid

            // For each possible codon, append the codon to the current sequence then branch the tree with an incremented index
            for (let codon of possibleCodons) {
                generateSequences(aminoAcidSeq, index + 1, currentSeq + codon);
            }
        }
    
        // If the sequence is less than 10 acids, generate all possible DNA sequences
        if (aminoAcidSequence.length < 10) {
            generateSequences(aminoAcidSequence, 0, '');
        } else { // Else only choose the first codon for each acid
            let basicSeq = "";
            for (let aminoAcid of aminoAcidSequence) {
                const possibleCodons = aaToCodon[aminoAcid];
                const selectedCodon = possibleCodons[0];
                basicSeq += selectedCodon;
            }
            results.push(basicSeq);
        }
    
        return results;
    }
    // Call function to generate all possible DNA sequence that result in the input amino acid sequence
    let dnaSequences = generateDNASequences(inputAA);

    // creates a dictionary with each DNA sequence as the key and its corresponding melting temperature as the entry.
    const dnaTMDictionary = {};
    for (let sequence of dnaSequences) {
        const tm = get_tm(sequence, primerConc, saltConc);
        dnaTMDictionary[sequence] = tm;
    }

    // Iterate over the dict and find the DNA sequence with the lowest melting temperature
    let closestKey = null;
    let closestDiff = Infinity;
    for (let key in dnaTMDictionary) {
        const tm = dnaTMDictionary[key];
        const diff = Math.abs(tm - homoRegionTm);

        if (diff < closestDiff) {
            closestDiff = diff;
            closestKey = key;
        }
    }

    console.log("Closest value: " + closestKey + "(" + dnaTMDictionary[closestKey] + ")")
    return closestKey;
}


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
 * TO DO:
 * - check at which point the tool should just recommend a long piece of dsDNA to order and use as a subcloning target
 * - fix the feature updater and maybe make a function of it
 */
function createReplacementPrimers(dnaToInsert, aaToInsert, replaceStartPos, replaceEndPos) {
    // Define operation type
    let operationType = "Mutation/Replacement";
    if (!replaceEndPos) { // if startPos equals endPos then its just an insertion
        replaceEndPos = replaceStartPos;
        operationType = "Insertion"
    }
    console.log("HERE1", operationType, dnaToInsert, aaToInsert, replaceStartPos, replaceEndPos)
    // Make sure that startPos is the smaller number
    if (replaceStartPos > replaceEndPos) {
        let temp = replaceStartPos;
        replaceStartPos = replaceEndPos;
        replaceEndPos = temp;
    }

    // If theres no input, use the default sequence for testing
    if (!aaToInsert && !dnaToInsert) {
        aaToInsert = "GGGGS";
    }

    // If an animo acid sequence is given, send it for optimization (lowest melting temperature)
    // otherwise use the DNA sequence given.
    let seqToInsert = "";
    if (aaToInsert) {
        console.log("Optimizing aa sequence to 49.5 C.");
        seqToInsert = optimizeAA(aaToInsert);
    } else {
        seqToInsert = dnaToInsert;
    }
    


    // Make the primers
    let homoFwd = "";
    let tempFwd = "";
    let homoRev = "";
    let tempRev = "";
    // If the sequence to be inserted has a melting temperature lower than 49 C, extende the primer backward
    if (get_tm(seqToInsert, primerConc, saltConc) < homoRegionTm) { // Mutation < 49 C, need homolog region

        // Forward template binding region, extend forward on the forward strand from the end position
        tempFwd = primerExtension(replaceEndPos, "fwdStrand", "forward", tempRegionTm, 7, 1);
        // Forward homologous region, extend backwards on the forward strand from the start position
        homoFwd = primerExtension(replaceStartPos, "fwdStrand", "backward", homoRegionTm, 7, 1);
        
        // There is no need for a homologous region in the reverse primer, the homologous region of the forward primer
        // will bind to the template binding region of the reverse primer instead.
        homoRev = "";
        // Reverse template binding region, extend forward on the complementary strand from the start position
        tempRev = primerExtension(replaceStartPos, "compStrand", "forward", tempRegionTm, 7, 1);

        // Display primers in the sidebar
        displayPrimers(operationType, [homoFwd, tempFwd, homoRev, tempRev], "white", "rgb(68, 143, 71)", "rgb(200, 52, 120)", seqToInsert);
    } else { //  // Mutation > 49 C

        // Forward template bindin region
        tempFwd = primerExtension(replaceEndPos, "fwdStrand", "forward", tempRegionTm, 7, 1);
        // Forward homologous region is just the sequence to be inserted
        homoFwd = seqToInsert;
        
        // The reverse starts of as the complementary sequence to the sequence to be inserted
        // but wil be shortened until the optimal target melting temperature is reached
        homoRev = getComplementaryStrand(homoFwd).split('').reverse().join('');;
        while (get_tm(homoRev, primerConc, saltConc) > homoRegionTm) {
            homoRev = homoRev.slice(1);
        }

        // Reverse template binding region
        tempRev = primerExtension(replaceStartPos, "compStrand", "forward", tempRegionTm, 7, 1);

        // Display primers in the sidebar
        displayPrimers(operationType, [homoFwd, tempFwd, homoRev, tempRev], "white", "rgb(68, 143, 71)", "rgb(200, 52, 120)");
    }

    // Update the sequence and features
    const plasmidLengthDiff = seqToInsert.length - (replaceEndPos - replaceStartPos)
    updateFeatures(operationType, seqToInsert, replaceStartPos, replaceEndPos, plasmidLengthDiff, 1);
}


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
 * 
 * TO DO:
 * - 
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
    let tempFwd = primerExtension(deletionEndPos, "fwdStrand", "forward", tempRegionTm, 7, 1);

    // Reverse homologous region, but extend it up to the melting temperature of the template region
    let tempRev = primerExtension(deletionStartPos, "compStrand", "forward", tempRegionTm, 7, 1);

    // The forward homologous region is the reverse complement of the reverse homologous region
    let homoFwd = getComplementaryStrand(tempRev);

    // Slice the forward homologous region until target temperature is reached
    while (get_tm(homoFwd.slice(0, -1), primerConc, saltConc) > homoRegionTm) {
        homoFwd = homoFwd.slice(0, -1);
    }
    // Check if slicing one more base would get us closer to the target temp
    const oldTm = get_tm(homoFwd, primerConc, saltConc);
    const newTm = get_tm(homoFwd.slice(0, -1), primerConc, saltConc);
    if (Math.abs(oldTm - homoRegionTm) >= Math.abs(newTm - homoRegionTm)) {
        homoFwd = homoFwd.slice(0, -1);
    }
    // Flip primer for display
    homoFwd = homoFwd.split("").reverse().join("");

    displayPrimers("Deletion", [homoFwd, tempFwd, tempRev, ""], "white", "rgb(68, 143, 71)", "rgb(217, 130, 58)");

    // Update the sequence and features
    const plasmidLengthDiff = 0 - (deletionEndPos - deletionStartPos);
    updateFeatures("Deletion", "", deletionStartPos, deletionEndPos, plasmidLengthDiff, 1);
}


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
 * 
 * TO DO:
 * - 
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
    }

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
            }

            // Clears the previous selection in the second sequence grid
            function clearSelection() {
                const selectedCells = element.querySelectorAll('.selected-cell-subcloning-target');
                selectedCells.forEach((cell) => {
                cell.classList.remove('selected-cell-subcloning-target');
                });
                selectedText2 = "";
            }
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
                    }
                }
            }
        }
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
        }
        
        /**
         * Make the primers
         */
        // Extend the insert template binding regions
        let insertTempFwd = primerExtension(subcloningStartPos, "fwdStrand", "forward", tempRegionTm, 7, 1); // 60
        let insertTempRev = primerExtension(subcloningEndPos, "compStrand", "forward", tempRegionTm, 7, 1); // 60

        // Extend the vector template binding regions
        let vecFwd = primerExtension(subcloningInsertPositionEnd, "fwdStrand", "forward", tempRegionTm, 7, 2); // 60
        let vecRev = primerExtension(subcloningInsertPositionStart, "compStrand", "forward", tempRegionTm, 7, 2); // 60

        // Creat the insert homologous regions by getting the complementary sequence of the vecor template binding regions
        // and slicing them until they are the target temperatures for homologous regions
        let insertHomoFwd = getComplementaryStrand(vecRev);
        while (get_tm(insertHomoFwd.slice(0, -1), primerConc, saltConc) > homoRegionTm) {
            insertHomoFwd = insertHomoFwd.slice(0, -1);
        };
        let oldTm = get_tm(insertHomoFwd, primerConc, saltConc);
        let newTm = get_tm(insertHomoFwd.slice(0, -1), primerConc, saltConc);
        if (Math.abs(oldTm - homoRegionTm) >= Math.abs(newTm - homoRegionTm)) { // Check which is closer to target tm
            insertHomoFwd = insertHomoFwd.slice(0, -1);
        }
        insertHomoFwd = insertHomoFwd.split("").reverse().join("");

        let insertHomoRev = getComplementaryStrand(vecFwd);
        while (get_tm(insertHomoRev.slice(0, -1), primerConc, saltConc) > homoRegionTm) { // Check which is closer to target tm
            insertHomoRev = insertHomoRev.slice(0, -1);
        };
        oldTm = get_tm(insertHomoRev, primerConc, saltConc);
        newTm = get_tm(insertHomoRev.slice(0, -1), primerConc, saltConc);
        if (Math.abs(oldTm - homoRegionTm) >= Math.abs(newTm - homoRegionTm)) {
            insertHomoRev = insertHomoRev.slice(0, -1);
        }
        insertHomoRev = insertHomoRev.split("").reverse().join("");


        displayPrimers("Subcloning", [insertHomoFwd, insertTempFwd, insertHomoRev, insertTempRev, vecFwd, vecRev], "white", "rgb(107, 96, 157)", "rgb(140, 202, 242)");

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
}


/**
 * Updates the target plasmid sequence, checks if the insertion/deletion crashes with exsiting features and adjusts accordingly (shift or deletion).
 * Lastly, adds the new feature to the feature dict and rebuilds the plasmid as well as refresh it in the viewer.
 * 
 * newFeatureTyp - name of operation type (insertion, deletion, subcloning)
 * newFeatureSequence - sequence of the new feature to be inserted (or "" in the case of deletions)
 * segmentStartPos, segmentEndPos - indices deliminating the span of the new feature (equal in the case of pure insertions)
 * pNr - number of the target plasmid to be updated
 * 
 * TO DO:
 * - 
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
    }

    /**
     * Decides if the old feature should be left alone, shifted, or deleted based on the span of the new feature.
     * 
     * elementKey - working key
     * elementvalue - working value
     * featureStart, featureEnd - indices of new feature that need to be checked against the span of the key
     * 
     * TO DO:
     * - Right now a hacky way of checking overlap, cant be sure it covers all cases but passed basic testing
    */

    function checkNewFeatureOverlap(elementKey, elementValue, featureStart, featureEnd) {
        // Adjust indices if we're dealing with a pure insertion and the start and end indices are identical
        if (featureStart === featureEnd) {
            featureStart++;
            featureEnd++;
        } else { // Adjust indices from sequence indices to feature indices
            featureStart++;
        }
        if (elementValue.span && !elementKey.includes("source")) { // exclude "source" feature as it spans the entire plasmid
            // Get span of current feature
            const currSpan = elementValue.span.split("..").map(Number);
            const spanStart = currSpan[0];
            const spanEnd = currSpan[1];

            // Special cases for pure insertions
            if (featureStart === featureEnd) {
                if (featureStart < spanStart) {
                    //way before, just shift
                    console.log("Case Insertion shift")
                    return "shift";
                } else if (spanStart === featureStart) {
                    //Insert right before
                    console.log("Case Insertion right before")
                    return "shift";
                } else if (featureStart < spanEnd) {
                    //Inside, delete
                    console.log("Case Insertion inside")
                    return "delete";
                } else if (featureStart > spanEnd) {
                    //way after, do noghing
                    console.log("Case Insertion right before")
                    return null;
                }
            }
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
                console.log("Feature Overlap Case 0", featureStart, featureEnd, spanStart, spanEnd)
                return "delete";
            } else if (featureStart < spanStart && featureEnd < spanStart && featureStart < spanEnd && featureEnd < spanEnd) {
                // 1. Find how much t"o shift features after the insertion
                console.log("Feature Overlap Case 1", featureStart, featureEnd, spanStart, spanEnd)
                return "shift";
            } else if (featureStart < spanStart && featureEnd >= spanStart && featureStart < spanEnd && featureEnd <= spanEnd) {
                // 2.
                console.log("Feature Overlap Case 2", featureStart, featureEnd, spanStart, spanEnd)
                return "delete";
            } else if (featureStart < spanStart && featureEnd > spanStart && featureStart < spanEnd && featureEnd > spanEnd) {
                // 3.
                console.log("Feature Overlap Case 3", featureStart, featureEnd, spanStart, spanEnd)
                return "delete";
            } else if (featureStart >= spanStart && featureEnd > spanStart && featureStart <= spanEnd && featureEnd > spanEnd) {
                // 4.
                console.log("Feature Overlap Case 4", featureStart, featureEnd, spanStart, spanEnd)
                return "delete";
            } else if (featureStart === featureEnd && featureStart <= spanEnd) {
                return "shift";
            } else {
                console.log("Feature Overlap Case 5", featureStart, featureEnd, spanStart, spanEnd)
                return null;
            }
        }
    };

    // Loop over every feature and either shift it if it occurs after the replacement or delete it if it
    // overlapped with the replacemen
    if (pNr === 1) {
        Object.entries(features).forEach(([key, value]) => {
            const decision = checkNewFeatureOverlap(key, value, segmentStartPos, segmentEndPos, featureShift);
            if (decision === "shift") {
                const currSpan = value.span.split("..").map(Number);
                const newSpanStart = currSpan[0] + featureShift;
                const newSpanEnd = currSpan[1] + featureShift;
                features[key].span = newSpanStart + ".." + newSpanEnd; // Update span of the feature
            } else if (decision === "delete") {
                delete features[key];
            }
        });
    } else {
        Object.entries(features2).forEach(([key, value]) => {
            const decision = checkNewFeatureOverlap(key, value, segmentStartPos, segmentEndPos,);
            if (decision === "shift") {
                const currSpan = value.span.split("..").map(Number);
                const newSpanStart = currSpan[0] + featureShift;
                const newSpanEnd = currSpan[1] + featureShift;
                features2[key].span = newSpanStart + ".." + newSpanEnd; // Update span of the feature
            } else if (decision === "delete") {
                delete features2[key];
            }
        });
    }

    // Name of the new feature
    let newFeatureName = newFeatureType; // Long name
    if (newFeatureSequence.length < 7) { // If theres no space, abbreviate to first 3 letters
        newFeatureName = newFeatureName.slice(0, 3)
    }

    // Check if there is a previous insertion and if there is, increment the nr at the end
    let i = 2;
    let targetFeaturesDict = features;
    if (pNr === 2) {
        targetFeaturesDict = features2;
    }
    while (newFeatureName in targetFeaturesDict) {
        newFeatureName =  newFeatureName.replace("" + i-1, "")
        newFeatureName += i;
        i++;
    }


    /**
     * Sort the features dict by span so that the features appear in order in the sidebar.
     */
    function sortBySpan(dict) {
        // Convert the dictionary to an array of key-value pairs
        const valueKey = "span";
        const entries = Object.entries(dict);
    
        // Sort the array based on the first number in the value key
        entries.sort((a, b) => {
        const aValue = Number(a[1][valueKey].split('..')[0]);
        const bValue = Number(b[1][valueKey].split('..')[0]);
        return aValue - bValue;
        });
    
        // Convert the sorted array back to a dictionary
        const sortedDict = Object.fromEntries(entries);
    
        return sortedDict;
    }

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
        }
    }
    // Remake the sidebar and content grid 
    createSideBar(pNr);
    makeContentGrid(pNr);
}


/**
 * Create the complementary strand to a given DNA sequence.
 * 
 * TO DO:
 * - sanitize input?
 */
function getComplementaryStrand(sequence) {
    // Map
    const nucleotideComplements = {
        'A': 'T',
        'T': 'A',
        'G': 'C',
        'C': 'G'
    };

    // Convert to uppercase, make into list, map to complementary base, then turn back into string
    const complementaryStrand = sequence
        .toUpperCase()
        .split('')
        .map(nucleotide => nucleotideComplements[nucleotide])
        .join('');

    return complementaryStrand;
}

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
}