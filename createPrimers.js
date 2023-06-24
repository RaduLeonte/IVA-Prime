primerConc = 100E-9; // M
saltConc = 0.5; // M

function displayPrimers(primersType, primersList) {

    var element = document.getElementById("primers-type");
    element.textContent = primersType + " Primers:";

    // Create the first paragraph
    const paragraph1 = document.createElement('p');
    paragraph1.style.wordWrap = 'break-word'; // Add CSS style for word wrapping
    // Create the first span with red text and bold
    const span1a = document.createElement('span');
    span1a.style.color = 'red';
    span1a.style.fontWeight = 'bold';
    span1a.textContent = primersList[2];
    // Create the second span with green text and bold
    const span1b = document.createElement('span');
    span1b.style.color = 'green';
    span1b.style.fontWeight = 'bold';
    span1b.textContent = primersList[3];
    // Append the spans to the paragraph
    paragraph1.appendChild(span1a);
    paragraph1.appendChild(span1b);

    const spanTm1 = document.createElement('span');
    spanTm1.textContent = "(" + get_tm(primersList[2], primerConc, saltConc).toFixed(1) + ", " + get_tm(primersList[3], primerConc, saltConc).toFixed(1) + ")";
    paragraph1.appendChild(spanTm1);

    // Create the second paragraph
    const paragraph2 = document.createElement('p');
    paragraph2.style.wordWrap = 'break-word'; // Add CSS style for word wrapping
    // Create the first span with red text and bold
    const span2a = document.createElement('span');
    span2a.style.color = 'red';
    span2a.style.fontWeight = 'bold';
    span2a.textContent = primersList[0];
    // Create the second span with green text and bold
    const span2b = document.createElement('span');
    span2b.style.color = 'green';
    span2b.style.fontWeight = 'bold';
    span2b.textContent = primersList[1];
    // Append the spans to the paragraph
    paragraph2.appendChild(span2a);
    paragraph2.appendChild(span2b);

    const spanTm2 = document.createElement('span');
    spanTm2.textContent = "(" + get_tm(primersList[0], primerConc, saltConc).toFixed(1) + ", " + get_tm(primersList[1], primerConc, saltConc).toFixed(1) + ")";
    paragraph2.appendChild(spanTm2);

    // Find the <p> with the id "primers-type"

    // Insert the new paragraphs after the <p> with id "primers-type"
    element.insertAdjacentElement('afterend', paragraph1);
    element.insertAdjacentElement('afterend', paragraph2);
}

function primerExtension(startingPos, direction, targetTm, minLength) {
    let p_start_index = startingPos - 1;
    let length = minLength;

    const backbone = direction === 'forward' ? sequence : complementaryStrand;
    console.log(backbone)
    //let prev_p = direction === 'forward' ? backbone.slice(p_start_index, p_start_index + length - 1): backbone.slice(p_start_index - length, p_start_index);
    let prev_p = direction === 'forward' ? repeatingSlice(backbone, p_start_index, p_start_index + length - 1): repeatingSlice(backbone, p_start_index - length, p_start_index);
    let prev_tm = get_tm(prev_p, primerConc, saltConc);
    const maxIter = 50;
    let i = 0;
    while (i < maxIter) {
        //let curr_p = direction === 'forward' ? backbone.slice(p_start_index, p_start_index + length): backbone.slice(p_start_index - length - 1, p_start_index);
        let curr_p = direction === 'forward' ? repeatingSlice(backbone, p_start_index, p_start_index + length): repeatingSlice(backbone, p_start_index - length - 1, p_start_index);
        console.log("Curr_p: " + curr_p)
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
    const targetTM = 49.5;

    for (let key in dnaTMDictionary) {
        const tm = dnaTMDictionary[key];
        const diff = Math.abs(tm - targetTM);

        if (diff < closestDiff) {
            closestDiff = diff;
            closestKey = key;
        }
    }

    console.log("Closes value: " + closestKey + "(" + dnaTMDictionary[closestKey] + ")")
    let optimizedAA = closestKey;

    return optimizedAA;
}

function createInsertionPrimers(dnaSequence, aaSequence, insertionPos) {
    // Insertion logic using dnaSequenceInput and aminoAcidSequenceInput
    console.log('Creating insertion primers...');
    let homologousSequence = "";

    // for testing
    if (!aaSequence && !dnaSequence) {
        aaSequence = "GGGGS";
    }

    if (aaSequence) {
        console.log("Optimizing aa sequence to 49.5 C.");
        homologousSequence = optimizeAA(aaSequence);
    } else {
        homologousSequence = dnaSequence;
    }

    let homologousSequenceRev = getComplementaryStrand(homologousSequence).split('').reverse().join('');
    console.log("Before overhang: " + homologousSequenceRev)
    while (get_tm(homologousSequenceRev, primerConc, saltConc) > 52) {
        homologousSequenceRev = homologousSequenceRev.slice(0, -1);
    }
    console.log("After overhang: " + homologousSequenceRev)

    let homoFwd = homologousSequence;
    let tempFwd = primerExtension(insertionPos, "forward", 60, 7)
    let homoRev = homologousSequenceRev;
    let tempRev = primerExtension(insertionPos, "backward", 60, 7)

    displayPrimers("Insertion", [homoFwd, tempFwd, homoRev, tempRev]);
}

function repeatingSlice(str, startIndex, endIndex) {
    const repeatedStr = str.repeat(3); // ABC_ABC_ABC
    return repeatedStr.slice(startIndex + str.length, endIndex + str.length);
}
