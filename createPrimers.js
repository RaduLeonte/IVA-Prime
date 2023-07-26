
let primerConc = 100E-9; // M
let saltConc = 0.5; // M
let homoRegionTm = 49.5;
let tempRegionTm = 60;
let operationNr = 1;

function displayPrimers(primersType, primersList, textColor, templateColor, homoColor, mutSeq) {
    const sidebarContentDiv = document.querySelector('.sidebar-content');

    var element = document.getElementById("primers-type");
    element.textContent = "Primers:";


    const p = document.createElement('p');
    p.id = 'primers-type';
    p.textContent = operationNr + '. ' + primersType;
    operationNr++;
    sidebarContentDiv.appendChild(p);

    // Create the first paragraph
    const paragraph1 = document.createElement('p');
    paragraph1.style.wordWrap = 'break-word'; // Add CSS style for word wrapping
    // Create the first span with red text and bold
    const span1a = document.createElement('span');
    span1a.style.color = textColor;
    span1a.style.backgroundColor = homoColor;
    span1a.style.fontWeight = 'bold';
    span1a.textContent = primersList[2];
    // Create the second span with green text and bold
    const span1b = document.createElement('span');
    span1b.style.color = textColor;
    span1b.style.backgroundColor = templateColor;
    span1b.style.fontWeight = 'bold';
    span1b.textContent = primersList[3];
    // Append the spans to the paragraph
    paragraph1.appendChild(span1a);
    paragraph1.appendChild(span1b);

    const spanTm1 = document.createElement('span');
    let tmTuple = [];
    if (primersList[2] !== "") {
        tmTuple.push(get_tm(primersList[2], primerConc, saltConc).toFixed(2))
    }
    if (primersList[3] !== "") {
        tmTuple.push(get_tm(primersList[3], primerConc, saltConc).toFixed(2))
    }
    spanTm1.textContent = `(${tmTuple.join(',')})`
    paragraph1.appendChild(spanTm1);

    // Create the second paragraph
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

    // Find the <p> with the id "primers-type"

    // Insert the new paragraphs after the <p> with id "primers-type"
    sidebarContentDiv.appendChild(paragraph2);
    sidebarContentDiv.appendChild(paragraph1);
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
}

function primerExtension(startingPos, targetStrand, direction, targetTm, minLength, pNr, mutSeq) {
    console.log("PE", startingPos, targetStrand, direction, targetTm, minLength, pNr, mutSeq)
    let p_start_index = startingPos - 1;
    let length = minLength;

    let currStrand = targetStrand === 'fwdStrand' ? sequence : complementaryStrand;
    if (pNr === 2) {
        currStrand = targetStrand === 'fwdStrand' ? sequence2 : complementaryStrand2;
    }

    let accessory = ""
    if (mutSeq) {
        accessory = mutSeq;
    }

    
    //let prev_p = direction === 'forward' ? backbone.slice(p_start_index, p_start_index + length - 1): backbone.slice(p_start_index - length, p_start_index);
    let prev_p = "";
    if (direction === "forward") {
        prev_p = targetStrand === 'fwdStrand' ? repeatingSlice(currStrand, p_start_index, p_start_index + length - 1) + accessory: repeatingSlice(currStrand, p_start_index - length, p_start_index);
    } else {
        prev_p = targetStrand === 'fwdStrand' ? repeatingSlice(currStrand, p_start_index - length + 1, p_start_index) + accessory: repeatingSlice(currStrand, p_start_index, p_start_index - length);
    }
    console.log("prev_p", targetStrand, direction, p_start_index, prev_p)
    let prev_tm = get_tm(prev_p, primerConc, saltConc);
    const maxIter = 50;
    let i = 0;
    while (i < maxIter) {
        //let curr_p = direction === 'forward' ? backbone.slice(p_start_index, p_start_index + length): backbone.slice(p_start_index - length - 1, p_start_index);
        let curr_p = "";
        if (direction === "forward") {
            curr_p = targetStrand === 'fwdStrand' ? repeatingSlice(currStrand, p_start_index, p_start_index + length) + accessory: repeatingSlice(currStrand, p_start_index - length - 1, p_start_index);
        } else {
            curr_p = targetStrand === 'fwdStrand' ? repeatingSlice(currStrand, p_start_index - length, p_start_index) + accessory: repeatingSlice(currStrand, p_start_index, p_start_index - length - 1);
        }
        let curr_tm = get_tm(curr_p, primerConc, saltConc);

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

        prev_tm = curr_tm;
        prev_p = curr_p;
        length += 1;
        i++;
    }
    if (targetStrand !== "fwdStrand") {
        primer_fwd = primer_fwd.split('').reverse().join('');
    }

    if (direction !== "forward") {
        //primer_fwd = primer_fwd.split('').reverse().join('');
        primer_fwd = primer_fwd.replace(accessory, "") + accessory;
    }

    // console.log(primer_fwd, primer_fwd_tm)
    return primer_fwd;
}

function generateDNASequences(aminoAcidSequence) {
    const codons = {
      A: ['GCT', 'GCC', 'GCA', 'GCG'],
      R: ['CGT', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'],
      N: ['AAT', 'AAC'],
      D: ['GAT', 'GAC'],
      C: ['TGT', 'TGC'],
      E: ['GAA', 'GAG'],
      Q: ['CAA', 'CAG'],
      G: ['GGT', 'GGC', 'GGA', 'GGG'],
      H: ['CAT', 'CAC'],
      I: ['ATT', 'ATC', 'ATA'],
      L: ['TTA', 'TTG', 'CTT', 'CTC', 'CTA', 'CTG'],
      K: ['AAA', 'AAG'],
      M: ['ATG'],
      F: ['TTT', 'TTC'],
      P: ['CCT', 'CCC', 'CCA', 'CCG'],
      S: ['TCT', 'TCC', 'TCA', 'TCG', 'AGT', 'AGC'],
      T: ['ACT', 'ACC', 'ACA', 'ACG'],
      W: ['TGG'],
      Y: ['TAT', 'TAC'],
      V: ['GTT', 'GTC', 'GTA', 'GTG'],
      X: ['TAA', 'TAG', 'TGA']
    };
  
    const results = [];
  
    function generateSequences(aminoAcidSeq, index, currentSeq) {
      if (index === aminoAcidSeq.length) {
        results.push(currentSeq);
        return;
      }
  
      const aminoAcid = aminoAcidSeq[index];
      const possibleCodons = codons[aminoAcid];
  
      for (let codon of possibleCodons) {
        generateSequences(aminoAcidSeq, index + 1, currentSeq + codon);
      }
    }
  
    if (aminoAcidSequence.length < 10) {
        generateSequences(aminoAcidSequence, 0, '');
    } else {
        let basicSeq = "";
        for (let aminoAcid of aminoAcidSequence) {
            const possibleCodons = codons[aminoAcid];
            const selectedCodon = possibleCodons[0];
            basicSeq += selectedCodon;
          }
        results.push(basicSeq);
    }

  
    return results;
  }

function createDNATMMapping(dnaSequences, primerConc, saltConc) {
    const dnaTMDictionary = {};

    for (let sequence of dnaSequences) {
        const tm = get_tm(sequence, primerConc, saltConc);
        dnaTMDictionary[sequence] = tm;
    }

    return dnaTMDictionary;
}

function optimizeAA(inputAA) {
    let dnaSequences = generateDNASequences(inputAA);

    const dnaTMDictionary = {};
    for (let sequence of dnaSequences) {
        const tm = get_tm(sequence, primerConc, saltConc);
        dnaTMDictionary[sequence] = tm;
    }

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
    let optimizedAA = closestKey;

    return optimizedAA;
}

function repeatingSlice(str, startIndex, endIndex) {
    const repeatedStr = str.repeat(3); // ABC_ABC_ABC
    return repeatedStr.slice(startIndex + str.length, endIndex + str.length);
}

function createReplacementPrimers(dnaToInsert, aaToInsert, replaceStartPos, replaceEndPos) {
    let operationType = "Mutation/Replacement";
    if (!replaceEndPos) {
        replaceEndPos = replaceStartPos;
        operationType = "Insertion"
    }
    if (replaceStartPos > replaceEndPos) {
        let temp = replaceStartPos;
        replaceStartPos = replaceEndPos;
        replaceEndPos = temp;
    }

    // Sequence for testing
    if (!aaToInsert && !dnaToInsert) {
        aaToInsert = "GGGGS";
    }

    // Optimize aa sequence
    let seqToInsert = "";
    if (aaToInsert) {
        console.log("Optimizing aa sequence to 49.5 C.");
        seqToInsert = optimizeAA(aaToInsert);
    } else {
        seqToInsert = dnaToInsert;
    }
    
    let homoFwd = "";
    let tempFwd = "";
    let homoRev = "";
    let tempRev = "";

    if (get_tm(seqToInsert, primerConc, saltConc) < homoRegionTm) { // Mutation < 49 C, need homolog region
        console.log("TestMut1")
        tempFwd = primerExtension(replaceEndPos, "fwdStrand", "forward", tempRegionTm, 7, 1);
        homoFwd = primerExtension(replaceStartPos, "fwdStrand", "backward", homoRegionTm, 7, 1);

        homoRev = "";
        tempRev = primerExtension(replaceStartPos, "compStrand", "forward", tempRegionTm, 7, 1);

        displayPrimers(operationType, [homoFwd, tempFwd, homoRev, tempRev], "white", "rgb(68, 143, 71)", "rgb(200, 52, 120)", seqToInsert);
    } else { //  // Mutation > 49 C
        console.log("TestMut2")
        tempFwd = primerExtension(replaceEndPos, "fwdStrand", "forward", tempRegionTm, 7, 1);
        homoFwd = seqToInsert;

        homoRev = getComplementaryStrand(homoFwd).split('').reverse().join('');;
        while (get_tm(homoRev, primerConc, saltConc) > homoRegionTm) {
            homoRev = homoRev.slice(1);
        }
        tempRev = primerExtension(replaceStartPos, "compStrand", "forward", tempRegionTm, 7, 1);

        displayPrimers(operationType, [homoFwd, tempFwd, homoRev, tempRev], "white", "rgb(68, 143, 71)", "rgb(200, 52, 120)");
    }

    // Update stuff
    replaceStartPos--;
    replaceEndPos--;
    sequence = sequence.substring(0, replaceStartPos) + seqToInsert + sequence.substring(replaceEndPos);
    complementaryStrand = getComplementaryStrand(sequence);
    Object.entries(features).forEach(([key, value]) => {
        if (value.span && !key.includes("source")) {
            const currSpan = value.span.split("..").map(Number);
            const spanStart = currSpan[0];
            const spanEnd = currSpan[1];
            if (spanStart < replaceEndPos && spanStart > replaceStartPos) {
                delete features[key];
            } else if (spanEnd < replaceEndPos && spanEnd > replaceStartPos) {
                delete features[key];
            } else if (spanEnd > replaceStartPos && spanEnd > replaceEndPos) {
                if (seqToInsert.length < replaceEndPos - replaceStartPos) {
                    const spanAdjustment = (replaceEndPos - replaceStartPos) - seqToInsert.length;
                    const newSpanStart = spanStart - spanAdjustment;
                    const newSpanEnd = spanEnd - spanAdjustment;
                    value.span = newSpanStart + ".." + newSpanEnd;
                } else {
                    const spanAdjustment = seqToInsert.length - (replaceEndPos - replaceStartPos);
                    const newSpanStart = spanStart + spanAdjustment;
                    const newSpanEnd = spanEnd + spanAdjustment;
                    value.span = newSpanStart + ".." + newSpanEnd;
                }
                
            }
        }
    });

    let newFeatureName = "Ins"
    if (seqToInsert.length > 7) {
        newFeatureName = "Insertion"
    }
    let i = 2;
    while (newFeatureName in features) {
        newFeatureName =  newFeatureName.replace("" + i-1, "")
        newFeatureName += i;
        i++;
    }
    const tempDict = {}
    tempDict.label = newFeatureName;
    const insertStringPositionStart = replaceStartPos + 1;
    const insertStringPositionEnd = replaceStartPos + seqToInsert.length;
    tempDict.span = insertStringPositionStart + ".." + insertStringPositionEnd;
    tempDict.note = "";
    features[newFeatureName] = tempDict
    features = sortBySpan(features)

    createSideBar(1);
    makeContentGrid(1);

}


function createInsertionPrimers(dnaSequence, aaSequence, insertionPos) {
    // Insertion logic using dnaSequenceInput and aminoAcidSequenceInput
    console.log('Creating insertion primers...');
    let homologousSequenceFwd = "";

    // for testing
    if (!aaSequence && !dnaSequence) {
        aaSequence = "GGGGS";
    }

    if (aaSequence) {
        console.log("Optimizing aa sequence to 49.5 C.");
        homologousSequenceFwd = optimizeAA(aaSequence);
    } else {
        homologousSequenceFwd = dnaSequence;
    }

    let homologousSequenceRev = getComplementaryStrand(homologousSequenceFwd).split('').reverse().join('');
    while (get_tm(homologousSequenceRev, primerConc, saltConc) > homoRegionTm) {
        homologousSequenceRev = homologousSequenceRev.slice(0, -1);
    }

    if (get_tm(mutationSeq, primerConc, saltConc) < homoRegionTm) { // Need additional region
    }
    else { // No need

    }
    let homoFwd = homologousSequenceFwd;
    let tempFwd = primerExtension(insertionPos, "fwdStrand", "forward", tempRegionTm, 7, 1)
    let homoRev = homologousSequenceRev;
    let tempRev = primerExtension(insertionPos, "compStrand", "forward", tempRegionTm, 7, 1)
    displayPrimers("Insertion", [homoFwd, tempFwd, homoRev, tempRev], "white", "rgb(68, 143, 71)", "rgb(200, 52, 120)");

    // Update stuff
    const insertStringPosition = insertionPos - 1;
    sequence = sequence.slice(0, insertStringPosition) + homologousSequenceFwd + sequence.slice(insertStringPosition);
    complementaryStrand = getComplementaryStrand(sequence);
    Object.entries(features).forEach(([key, value]) => {
        if (value.span && !key.includes("source")) {
            const currSpan = value.span.split("..").map(Number);
            const spanStart = currSpan[0];
            const spanEnd = currSpan[1];
            if (insertStringPosition < spanStart) {
                const newSpanStart = spanStart + homologousSequenceFwd.length;
                const newSpanEnd = spanEnd + homologousSequenceFwd.length;
                value.span = newSpanStart + ".." + newSpanEnd;
            } else if (spanStart < insertStringPosition && insertStringPosition < spanEnd) {
                delete features[key];
            }
        }
    });
    let newFeatureName = "Insertion"
    let i = 2;
    while (newFeatureName in features) {
        newFeatureName =  newFeatureName.replace("" + i-1, "")
        newFeatureName += i;
        i++;
    }
    const tempDict = {}
    tempDict.label = newFeatureName;
    const insertStringPositionStart = insertStringPosition + 1;
    const insertStringPositionEnd = insertStringPositionStart + homologousSequenceFwd.length - 1;
    tempDict.span = insertStringPositionStart + ".." + insertStringPositionEnd;
    tempDict.note = "";
    features[newFeatureName] = tempDict;
    features = sortBySpan(features);

    createSideBar(1);
    makeContentGrid(1);
}

function createDeletionPrimers(deletionStartPos, deletionEndPos) {
    if (deletionStartPos > deletionEndPos) {
        let temp = deletionStartPos;
        deletionStartPos = deletionEndPos;
        deletionEndPos = temp;
    }
    console.log('Creating deletion primers...', selectedText, deletionStartPos, deletionEndPos);

    let homoRev = primerExtension(deletionStartPos, "compStrand", "forward", homoRegionTm, 7, 1);
    let homoFwd = getComplementaryStrand(homoRev).split("").reverse().join("");
    
    let tempFwd = primerExtension(deletionEndPos, "fwdStrand", "forward", tempRegionTm, 7, 1);
    let tempRev = primerExtension(deletionStartPos - homoRev.length, "compStrand", "forward", tempRegionTm, 7, 1);

    let revPrimer = homoRev + tempRev;
    while (get_tm(revPrimer, primerConc, saltConc) > homoRegionTm) {
        revPrimer = revPrimer.slice(0, -1)
    }

    displayPrimers("Deletion", [homoFwd, tempFwd, revPrimer, ""], "white", "rgb(68, 143, 71)", "rgb(217, 130, 58)");

    // Update stuff
    deletionStartPos--;
    deletionEndPos--;
    const deletionSpan = deletionEndPos - deletionStartPos;
    sequence = sequence.slice(0, deletionStartPos) + sequence.slice(deletionEndPos);
    complementaryStrand = getComplementaryStrand(sequence);
    Object.entries(features).forEach(([key, value]) => {
        if (value.span && !key.includes("source")) {
            const currSpan = value.span.split("..").map(Number);
            const spanStart = currSpan[0];
            const spanEnd = currSpan[1];
            if (deletionEndPos < spanStart) {
                const newSpanStart = spanStart - deletionSpan;
                const newSpanEnd = spanEnd - deletionSpan;
                value.span = newSpanStart + ".." + newSpanEnd;
            } else if (spanStart < deletionEndPos && spanStart > deletionStartPos) {
                delete features[key];
            } else if (spanEnd < deletionEndPos && spanEnd > deletionStartPos) {
                delete features[key];
            }
        }
    });
    createSideBar(1);
    makeContentGrid(1);
}

function createMutagenesisPrimers(mutationSeq, mutaStartPos, mutaEndPos) {
    if (mutaStartPos > mutaEndPos) {
        let temp = mutaStartPos;
        mutaStartPos = mutaEndPos;
        mutaEndPos = temp;
    }
    console.log('Creating Mutagenesis primers...', mutationSeq, mutaStartPos, mutaEndPos);

    let homoRev = "";
    let tempRev = "";
    let tempFwd = "";
    let homoFwd = "";

    if (get_tm(mutationSeq, primerConc, saltConc) < homoRegionTm) { // Mutation < 49 C, need homolog region
        console.log("TestMut1")
        tempFwd = primerExtension(mutaEndPos, "fwdStrand", "forward", tempRegionTm, 7, 1);
        homoFwd = primerExtension(mutaStartPos, "fwdStrand", "backward", homoRegionTm, 7, 1) + mutationSeq;

        homoRev = "";
        tempRev = primerExtension(mutaStartPos, "compStrand", "forward", tempRegionTm, 7, 1);

        displayPrimers("Mutagenesis", [homoFwd, tempFwd, homoRev, tempRev], "white", "rgb(68, 143, 71)", "rgb(200, 52, 120)");
    } else { //  // Mutation > 49 C
        console.log("TestMut2")
        tempFwd = primerExtension(mutaEndPos, "fwdStrand", "forward", tempRegionTm, 7, 1);
        homoFwd = mutationSeq;

        homoRev = getComplementaryStrand(homoFwd).split('').reverse().join('');;
        while (get_tm(homoRev, primerConc, saltConc) > homoRegionTm) {
            homoRev = homoRev.slice(1);
        }
        tempRev = primerExtension(mutaStartPos, "compStrand", "forward", tempRegionTm, 7, 1);

        displayPrimers("Mutagenesis", [homoFwd, tempFwd, homoRev, tempRev], "white", "rgb(68, 143, 71)", "rgb(200, 52, 120)");
    }

    // Update stuff
    mutaStartPos--;
    mutaEndPos--;
    sequence = sequence.substring(0, mutaStartPos) + mutationSeq + sequence.substring(mutaEndPos);
    complementaryStrand = getComplementaryStrand(sequence);
    Object.entries(features).forEach(([key, value]) => {
        if (value.span && !key.includes("source")) {
            const currSpan = value.span.split("..").map(Number);
            const spanStart = currSpan[0];
            const spanEnd = currSpan[1];
            if (spanStart < mutaEndPos && spanStart > mutaStartPos) {
                delete features[key];
            } else if (spanEnd < mutaEndPos && spanEnd > mutaStartPos) {
                delete features[key];
            } else if (spanEnd > mutaStartPos && spanEnd > mutaEndPos) {
                if (mutationSeq.length < mutaEndPos - mutaStartPos) {
                    const spanAdjustment = (mutaEndPos - mutaStartPos) - mutationSeq.length;
                    const newSpanStart = spanStart - spanAdjustment;
                    const newSpanEnd = spanEnd - spanAdjustment;
                    value.span = newSpanStart + ".." + newSpanEnd;
                } else {
                    const spanAdjustment = mutationSeq.length - (mutaEndPos - mutaStartPos);
                    const newSpanStart = spanStart + spanAdjustment;
                    const newSpanEnd = spanEnd + spanAdjustment;
                    value.span = newSpanStart + ".." + newSpanEnd;
                }
                
            }
        }
    });


    let newFeatureName = "Mut"
    if (mutationSeq.length > 7) {
        newFeatureName = "Mutation"
    }
    let i = 2;
    while (newFeatureName in features) {
        newFeatureName =  newFeatureName.replace("" + i-1, "")
        newFeatureName += i;
        i++;
    }
    const tempDict = {}
    tempDict.label = newFeatureName;
    const insertStringPositionStart = mutaStartPos + 1;
    const insertStringPositionEnd = mutaStartPos + mutationSeq.length;
    tempDict.span = insertStringPositionStart + ".." + insertStringPositionEnd;
    tempDict.note = "";
    features[newFeatureName] = tempDict
    features = sortBySpan(features)

    createSideBar(1);
    makeContentGrid(1);
}

function createSubcloningPrimers(subcloningStartPos, subcloningEndPos) {
    let subcloningInsertPositionStart = null;
    let subcloningInsertPositionEnd = null;
    let selectingSubcloningTarget = false;
    let subcloningInsertionSequence = selectedText;
    if (subcloningStartPos > subcloningEndPos) {
        let temp = subcloningStartPos;
        subcloningStartPos = subcloningEndPos;
        subcloningEndPos = temp;
    }
    console.log('Creating subcloning primers...', subcloningInsertionSequence, subcloningStartPos, subcloningEndPos);

    const element = document.getElementById('sequence-grid2');
    // Change the cursor to a pointer when it's over the element
    element.style.cursor = 'pointer';
    // Listen for click events on the element
    let startCell = null;
    let endCell = null;
    element.addEventListener('mousedown', function(event) {
        event.stopPropagation(); // Prevent the event from bubbling up to the document
        // Your code here for what should happen when the element is clicked
        subcloningInsertPositionStart = basePosition2;
        startCell = null;
        endCell = null;
        console.log('start: ', subcloningInsertPositionStart);
        selectingSubcloningTarget = true;
    }, { once: true });

    element.addEventListener('mousemove', function(event) {
        if (selectingSubcloningTarget && subcloningInsertPositionStart && subcloningInsertPositionStart !== basePosition2) {
        subcloningInsertPositionEnd = basePosition2;
            // Get the indices of the start and end cells
          let startCoords = null;
          let startRowIndex = null;
          let startCellIndex = null;
          let endCoords = null;
          let endRowIndex = null;
          let endCellIndex = null;

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

          // Clear the previous selection
          function clearSelection() {
            const selectedCells = element.querySelectorAll('.selected-cell-subcloning-target');
            selectedCells.forEach((cell) => {
              cell.classList.remove('selected-cell-subcloning-target');
            });
            selectedText2 = "";
          }
          clearSelection();

          // Iterate over cells between start and end cells
          for (let i = startRowIndex; i <= endRowIndex; i++) {
            const row = element.rows[i];
            const start = (i === startRowIndex) ? startCellIndex : 0;
            const end = (i === endRowIndex) ? endCellIndex : row.cells.length - 1;

            for (let j = start; j <= end; j++) {
              const selectedCell = row.cells[j];
              if (selectedCell.id === "Forward Strand" && selectedCell.innerText.trim() !== "") {
                selectedCell.classList.add('selected-cell-subcloning-target');
              }
            }
          }

          // Update the end cell
          //endCell = cell;
        }
    });

    element.addEventListener('mouseup', function(event) {
        event.stopPropagation(); // Prevent the event from bubbling up to the document
        // Your code here for what should happen when the element is clicked
        subcloningInsertPositionEnd = basePosition2;
        console.log('end: ', subcloningInsertPositionEnd);
        element.style.cursor = 'default';
        selectingSubcloningTarget = false;

        if (subcloningInsertPositionStart > subcloningInsertPositionEnd) {
            let temp = subcloningInsertPositionStart;
            subcloningInsertPositionStart = subcloningInsertPositionEnd;
            subcloningInsertPositionEnd = temp;
        }
        

        let insertTempFwd = primerExtension(subcloningStartPos, "fwdStrand", "forward", tempRegionTm, 7, 1); // 60
        let insertTempRev = primerExtension(subcloningEndPos, "compStrand", "forward", tempRegionTm, 7, 1); // 60

        let vecFwd = primerExtension(subcloningInsertPositionEnd, "fwdStrand", "forward", tempRegionTm, 7, 2); // 60
        let vecRev = primerExtension(subcloningInsertPositionStart, "compStrand", "forward", tempRegionTm, 7, 2); // 60

        let insertHomoFwd = getComplementaryStrand(vecRev);
        while (get_tm(insertHomoFwd, primerConc, saltConc) > homoRegionTm) {
            insertHomoFwd = insertHomoFwd.slice(0, -1);
        };
        insertHomoFwd = insertHomoFwd.split("").reverse().join("");

        let insertHomoRev = getComplementaryStrand(vecFwd);
        while (get_tm(insertHomoRev, primerConc, saltConc) > homoRegionTm) {
            insertHomoRev = insertHomoRev.slice(0, -1);
        };
        insertHomoRev = insertHomoRev.split("").reverse().join("");


        displayPrimers("Subcloning", [insertHomoFwd, insertTempFwd, insertHomoRev, insertTempRev, vecFwd, vecRev], "white", "rgb(107, 96, 157)", "rgb(140, 202, 242)");

        // Update stuff
        subcloningInsertPositionStart--;
        subcloningInsertPositionEnd--;
        sequence2 = sequence2.slice(0, subcloningInsertPositionStart) + subcloningInsertionSequence + sequence2.slice(subcloningInsertPositionEnd);
        complementaryStrand2 = getComplementaryStrand(sequence2);
        Object.entries(features2).forEach(([key, value]) => {
            if (value.span && !key.includes("source")) {
                const currSpan = value.span.split("..").map(Number);
                const spanStart = currSpan[0];
                const spanEnd = currSpan[1];
                if (subcloningInsertPositionStart < spanStart && subcloningInsertPositionEnd < spanStart) {
                    const newSpanStart = spanStart + subcloningInsertionSequence.length - (subcloningInsertPositionEnd - subcloningInsertPositionStart);
                    const newSpanEnd = spanEnd + subcloningInsertionSequence.length - (subcloningInsertPositionEnd - subcloningInsertPositionStart);
                    value.span = newSpanStart + ".." + newSpanEnd;
                } else if (subcloningInsertPositionStart < spanStart && subcloningInsertPositionEnd > spanStart) {
                    delete features2[key];
                } else if(subcloningInsertPositionStart < spanEnd && subcloningInsertPositionEnd > spanEnd) {
                    delete features2[key];
                } else if (spanStart < subcloningInsertPositionStart && subcloningInsertPositionEnd < spanEnd) {
                    delete features2[key];
                }
            }
        });
        let newFeatureName = "Subcloning"
        let i = 2;
        while (newFeatureName in features2) {
            newFeatureName =  newFeatureName.replace("" + i-1, "")
            newFeatureName += i;
            i++;
        }
        const tempDict = {}
        tempDict.label = newFeatureName;
        const insertStringPositionStart = subcloningInsertPositionStart + 1;
        const insertStringPositionEnd = insertStringPositionStart + subcloningInsertionSequence.length - 1;
        tempDict.span = insertStringPositionStart + ".." + insertStringPositionEnd;
        tempDict.note = "";
        features2[newFeatureName] = tempDict
        features2 = sortBySpan(features2)

        createSideBar(2);
        makeContentGrid(2);
    }, { once: true });

    // Listen for click events on the document
    document.addEventListener('click', function() {
        // Your code here for what should happen when something outside the element is clicked
        // Reset the cursor
        element.style.cursor = 'default';
        return;
    }, { once: true });
}


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