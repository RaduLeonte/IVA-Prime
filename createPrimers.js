
let primerConc = 100E-9; // M
let saltConc = 0.5; // M
let homoRegionTm = 49.5;
let tempRegionTm = 60;
let operationNr = 1;

function displayPrimers(primersType, primersList, textColor, templateColor, homoColor, mutSeq) {
    const sidebarContentDiv = document.querySelector('.sidebar-content');
    const p = document.createElement('p');
    p.id = 'primers-type';
    p.textContent = operationNr + '. ' + primersType;
    operationNr++;
    sidebarContentDiv.appendChild(p);

    var element = document.getElementById("primers-type");
    element.textContent = "Primers:";

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
    spanTm1.textContent = " (" + get_tm(primersList[2], primerConc, saltConc).toFixed(1) + ", " + get_tm(primersList[3], primerConc, saltConc).toFixed(1) + ")";
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
    spanTm2.textContent = " (" + get_tm(primersList[0], primerConc, saltConc).toFixed(1) + ", " + get_tm(primersList[1], primerConc, saltConc).toFixed(1) + ")";
    paragraph2.appendChild(spanTm2);

    // Find the <p> with the id "primers-type"

    // Insert the new paragraphs after the <p> with id "primers-type"
    sidebarContentDiv.appendChild(paragraph1);
    sidebarContentDiv.appendChild(paragraph2);
}

function primerExtension(startingPos, direction, targetTm, minLength, pNr) {
    let p_start_index = startingPos - 1;
    let length = minLength;

    let backbone = direction === 'forward' ? sequence : complementaryStrand;
    if (pNr === 2) {
        backbone = direction === 'forward' ? sequence2 : complementaryStrand2;
    }
    //console.log(backbone)
    //let prev_p = direction === 'forward' ? backbone.slice(p_start_index, p_start_index + length - 1): backbone.slice(p_start_index - length, p_start_index);
    let prev_p = direction === 'forward' ? repeatingSlice(backbone, p_start_index, p_start_index + length - 1): repeatingSlice(backbone, p_start_index - length, p_start_index);
    let prev_tm = get_tm(prev_p, primerConc, saltConc);
    const maxIter = 50;
    let i = 0;
    while (i < maxIter) {
        //let curr_p = direction === 'forward' ? backbone.slice(p_start_index, p_start_index + length): backbone.slice(p_start_index - length - 1, p_start_index);
        let curr_p = direction === 'forward' ? repeatingSlice(backbone, p_start_index, p_start_index + length): repeatingSlice(backbone, p_start_index - length - 1, p_start_index);
        //console.log("Curr_p: " + curr_p)
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
    if (direction !== "forward") {
        primer_fwd = primer_fwd.split('').reverse().join('');
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
  
    generateSequences(aminoAcidSequence, 0, '');
  
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
    // console.log(possibleDNA)

    const dnaTMDictionary = {};
    for (let sequence of dnaSequences) {
        const tm = get_tm(sequence, primerConc, saltConc);
        dnaTMDictionary[sequence] = tm;
    }
    // console.log(dnaTMDictionary)

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

    console.log("Closes value: " + closestKey + "(" + dnaTMDictionary[closestKey] + ")")
    let optimizedAA = closestKey;

    return optimizedAA;
}

function repeatingSlice(str, startIndex, endIndex) {
    const repeatedStr = str.repeat(3); // ABC_ABC_ABC
    return repeatedStr.slice(startIndex + str.length, endIndex + str.length);
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
    while (get_tm(homologousSequenceRev, primerConc, saltConc) > 52) {
        homologousSequenceRev = homologousSequenceRev.slice(0, -1);
    }

    let homoFwd = homologousSequenceFwd;
    let tempFwd = primerExtension(insertionPos, "forward", tempRegionTm, 7, 1)
    let homoRev = homologousSequenceRev;
    let tempRev = primerExtension(insertionPos, "backward", tempRegionTm, 7, 1)
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
                console.log("Scooch over nerd.")
            } else if (spanStart < insertStringPosition && insertStringPosition < spanEnd) {
                console.log("Get deleted nerd!")
                delete features[key];
            }
        }
    });
    let newFeatureName = "Insertion"
    let i = 2;
    console.log("Previous insertion present? ", Object.keys(features))
    while (newFeatureName in features) {
        newFeatureName =  newFeatureName.replace("" + i-1, "")
        newFeatureName += i;
        console.log(newFeatureName)
        i++;
    }
    console.log("NEW FEATURES!! ", newFeatureName);
    const tempDict = {}
    tempDict.label = newFeatureName;
    const insertStringPositionStart = insertStringPosition + 1;
    const insertStringPositionEnd = insertStringPositionStart + homologousSequenceFwd.length - 1;
    tempDict.span = insertStringPositionStart + ".." + insertStringPositionEnd;
    console.log("TEMP DICT SPAN " + tempDict.span)
    tempDict.note = "";
    features[newFeatureName] = tempDict

    makeContentGrid(1);
}

function createDeletionPrimers(deletionStartPos, deletionEndPos) {
    if (deletionStartPos > deletionEndPos) {
        let temp = deletionStartPos;
        deletionStartPos = deletionEndPos;
        deletionEndPos = temp;
    }
    console.log('Creating deletion primers...', selectedText, deletionStartPos, deletionEndPos);

    let homoRev = primerExtension(deletionStartPos, "backward", homoRegionTm, 7, 1);
    let homoFwd = getComplementaryStrand(homoRev);
    
    let tempFwd = primerExtension(deletionEndPos, "forward", tempRegionTm, 7, 1);
    let tempRev = primerExtension(deletionStartPos - homoRev.length, "backward", tempRegionTm, 7, 1);

    displayPrimers("Deletion", [homoFwd, tempFwd, homoRev, tempRev], "white", "rgb(68, 143, 71)", "rgb(217, 130, 58)");

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
                console.log("Scooch over nerd.", value.label, value.span)
            } else if (spanStart < deletionEndPos && spanStart > deletionStartPos) {
                console.log("Get deleted nerd!", value.label, spanStart < deletionEndPos, deletionStartPos < spanEnd)
                delete features[key];
            } else if (spanEnd < deletionEndPos && spanEnd > deletionStartPos) {
                console.log("Get deleted nerd!", value.label, spanStart < deletionEndPos, deletionStartPos < spanEnd)
                delete features[key];
            }
        }
    });
    makeContentGrid(1);
}

function createMutagenesisPrimers(mutationSeq, mutaStartPos, mutaEndPos) {
    if (mutaStartPos > mutaEndPos) {
        let temp = mutaStartPos;
        mutaStartPos = mutaEndPos;
        mutaEndPos = temp;
    }
    console.log('Creating Mutagenesis primers...', mutationSeq, mutaStartPos, mutaEndPos);

    
    let homoRev = primerExtension(mutaStartPos, "backward", homoRegionTm, 7, 1);
    let tempRev = primerExtension(mutaStartPos - homoRev.length, "backward", tempRegionTm, 7, 1);
    let tempFwd = primerExtension(mutaEndPos, "forward", tempRegionTm, 7, 1);
    let homoFwd = getComplementaryStrand(homoRev);
    displayPrimers("Mutagenesis", [homoFwd, tempFwd, homoRev, tempRev], "white", "rgb(68, 143, 71)", "rgb(217, 130, 58)", mutationSeq);

    // Update stuff
    mutaStartPos--;
    mutaEndPos--;
    sequence = sequence.slice(0, mutaStartPos) + mutationSeq + sequence.slice(mutaEndPos);
    complementaryStrand = getComplementaryStrand(sequence);
    Object.entries(features).forEach(([key, value]) => {
        if (value.span && !key.includes("source")) {
            const currSpan = value.span.split("..").map(Number);
            const spanStart = currSpan[0];
            const spanEnd = currSpan[1];
            if (spanStart < mutaEndPos && spanStart > mutaStartPos) {
                console.log("Get deleted nerd!", value.label, spanStart < mutaEndPos, mutaStartPos < spanEnd)
                delete features[key];
            } else if (spanEnd < mutaEndPos && spanEnd > mutaStartPos) {
                console.log("Get deleted nerd!", value.label, spanStart < mutaEndPos, mutaStartPos < spanEnd)
                delete features[key];
            }
        }
    });


    let newFeatureName = "Mutagenesis"
    let i = 2;
    console.log("Previous insertion present? ", Object.keys(features))
    while (newFeatureName in features) {
        newFeatureName =  newFeatureName.replace("" + i-1, "")
        newFeatureName += i;
        console.log(newFeatureName)
        i++;
    }
    console.log("NEW FEATURES!! ", newFeatureName);
    const tempDict = {}
    tempDict.label = newFeatureName;
    const insertStringPositionStart = mutaStartPos + 1;
    const insertStringPositionEnd = mutaEndPos;
    tempDict.span = insertStringPositionStart + ".." + insertStringPositionEnd;
    console.log("TEMP DICT SPAN " + tempDict.span)
    tempDict.note = "";
    features[newFeatureName] = tempDict

    makeContentGrid(1);
}

function createSubcloningPrimers(subcloningStartPos, subcloningEndPos) {
    let subcloningInsertPositionStart = null;
    let subcloningInsertPositionEnd = null;
    let selectingSubcloningTarget = false;
    if (subcloningStartPos > subcloningEndPos) {
        let temp = subcloningStartPos;
        subcloningStartPos = subcloningEndPos;
        subcloningEndPos = temp;
    }
    console.log('Creating subcloning primers...', selectedText, subcloningStartPos, subcloningEndPos);

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

          console.log("Iterating from: " + startRowIndex + ", " + startCellIndex);
          console.log("To: " + endRowIndex + ", " + endCellIndex);
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
        

        let tempFwd = primerExtension(subcloningStartPos, "forward", tempRegionTm, 7, 1);
        let homoFwd = primerExtension(subcloningInsertPositionStart, "backward", tempRegionTm, 7, 2);

        let tempRev = primerExtension(subcloningEndPos, "backward", tempRegionTm, 7, 1);
        let homoRev = primerExtension(subcloningInsertPositionEnd, "forward", tempRegionTm, 7, 2);


        displayPrimers("Subcloning", [homoFwd, tempFwd, homoRev, tempRev], "white", "rgb(107, 96, 157)", "rgb(140, 202, 242)");
    }, { once: true });

    // Listen for click events on the document
    document.addEventListener('click', function() {
        // Your code here for what should happen when something outside the element is clicked
        console.log('Clicked outside the element. Aborting...');
        // Reset the cursor
        element.style.cursor = 'default';
        return;
    }, { once: true });
}
