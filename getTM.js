function find_in_dict(dictionary, pair) {
  let key = null;

  // Check for pair in the first 2 characters of dict keys
  for (const dictKey of Object.keys(dictionary)) {
    if (dictKey.slice(0, 2) === pair) {
      key = dictKey;
      return dictionary[key];
    }
  }

  // Check for reverse of pair in the first 2 characters of dict keys
  for (const dictKey of Object.keys(dictionary)) {
    if (dictKey.slice(0, 2) === pair.split('').reverse().join('')) {
      key = dictKey;
      return dictionary[key];
    }
  }

  // Check for pair in the last 2 characters of dict keys
  for (const dictKey of Object.keys(dictionary)) {
    if (dictKey.slice(-2) === pair) {
      key = dictKey;
      return dictionary[key];
    }
  }

  // Check for reverse of pair in the last 2 characters of dict keys
  for (const dictKey of Object.keys(dictionary)) {
    if (dictKey.slice(-2) === pair.split('').reverse().join('')) {
      key = dictKey;
      return dictionary[key];
    }
  }

  return null;
}

function get_tm(sequence, c, m) {
    //console.log("Input sequence: " + sequence)

    // Constants or params
    const R = 1.987; // cal mol-1 K-1 universal gas constant

    // cal mol-1
    const deltaH_dict = {
        "AA/TT": -7.9E3,
        "AT/TA": -7.2E3,
        "TA/AT": -7.2E3,
        "CA/GT": -8.5E3,
        "GT/CA": -8.4E3,
        "CT/GA": -7.8E3,
        "GA/CT": -8.2E3,
        "CG/GC": -10.6E3,
        "GC/CG": -9.8E3,
        "GG/CC": -8.0E3
    }; 

    // cal k-1 mol-1
    const deltaS_dict = {
        "AA/TT": -22.2,
        "AT/TA": -20.4,
        "TA/AT": -21.3,
        "CA/GT": -22.7,
        "GT/CA": -22.4,
        "CT/GA": -21.0,
        "GA/CT": -22.2,
        "CG/GC": -27.2,
        "GC/CG": -24.4,
        "GG/CC": -19.9
    };

    /*
    H0 and S0
    */
    let deltaH0 = 0; // cal * mol-1 enthalpy
    let deltaS0 = 0; // cal K-1 mol-1 entropy

    // Symmetry correction
    let symm_fraction = 4;
    const complementary = getComplementaryStrand(sequence);
    if (sequence === complementary) {
        deltaS0 += -1.4;
        symm_fraction = 1;
    }

    // Nucleation term
    if (sequence.includes("G") || sequence.includes("C")) {
        deltaH0 += 0.1E3;
        deltaS0 += -2.8;
    } else {
        deltaH0 += 2.3E3;
        deltaS0 += 4.1;
    }

    for (let i = 0; i < sequence.length - 1; i++) {
        const pair = sequence[i] + sequence[i + 1];

        const to_addH = find_in_dict(deltaH_dict, pair);
        deltaH0 += to_addH;
        //console.log(pair, to_addH)

        const to_addS = find_in_dict(deltaS_dict, pair);
        deltaS0 += to_addS
        //console.log(to_addS)
    }

    //console.log("DeltaH0: " + deltaH0)
    //console.log("DeltaS0: " + deltaS0)
    

    const tm = (deltaH0 / (deltaS0 + R * Math.log(c / symm_fraction))) - 273.15;
    //console.log(tm)   
    const tm_corr = tm + 16.6 * Math.log(m);

    return tm_corr;
}