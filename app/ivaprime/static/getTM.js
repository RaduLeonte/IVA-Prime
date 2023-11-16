/**
 * Melting temperature calculator for DNA duplexes.
 * 
 * sequence - primer of interest
 * c - primer concentration in M
 * m - salt concentration in M
 */
function get_tm(sequence, c, m) {

    /**
     * Find nucleotide pair in the enthalpy or entropy dictionaries. Function searches for the presence of the 
     * nucleotide pair or its reverse in the dictionary keys.
     */
    function find_in_dict(dictionary, pair) {
      let key = null;

      // Check for pair in the first 2 characters of dict keys
      for (const dictKey of Object.keys(dictionary)) {
        if (dictKey.slice(0, 2) === pair) {
          key = dictKey;
          return dictionary[key];
        };
      };
    
      // Check for reverse of pair in the first 2 characters of dict keys
      for (const dictKey of Object.keys(dictionary)) {
        if (dictKey.slice(0, 2) === pair.split('').reverse().join('')) {
          key = dictKey;
          return dictionary[key];
        };
      };
    
      // Check for pair in the last 2 characters of dict keys
      for (const dictKey of Object.keys(dictionary)) {
        if (dictKey.slice(-2) === pair) {
          key = dictKey;
          return dictionary[key];
        };
      };
    
      // Check for reverse of pair in the last 2 characters of dict keys
      for (const dictKey of Object.keys(dictionary)) {
        if (dictKey.slice(-2) === pair.split('').reverse().join('')) {
          key = dictKey;
          return dictionary[key];
        };
      };
    
      return null;
    };

    // Constants or params
    const R = 1.987; // cal mol-1 K-1 universal gas constant

    // Enthalpy data (cal mol-1)
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

    // Entropy data (cal k-1 mol-1)
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

    /**
     * Initialize enthalpy and entropy
     */
    let deltaH0 = 0; // cal * mol-1 enthalpy
    let deltaS0 = 0; // cal K-1 mol-1 entropy

    // Symmetry correction
    // If the primer is completely symmetric, there is an entropy gain and the symmetry fraction
    // is different
    let symm_fraction = 4;
    const complementary = getComplementaryStrand(sequence);
    if (sequence === complementary) {
        console.log("Symmetric")
        deltaS0 += -1.4;
        symm_fraction = 1;
    };

    // Nucleation term
    // The first pair to anneal is the nucleation point, but since G-C bonds are so strong it basically
    // always starts annealing there. If there is a G or C anywhere in the sequence add GC contributions
    // otherwise, the AT contributions.
    if (sequence.includes("G") || sequence.includes("C")) {
        deltaH0 += 0.1E3;
        deltaS0 += -2.8;
    } else {
        deltaH0 += 2.3E3;
        deltaS0 += 4.1;
    };

    // Loop over the sequence and add the contributions of each pair of nucleotides.
    for (let i = 0; i < sequence.length - 1; i++) {
        const pair = sequence[i] + sequence[i + 1];

        const to_addH = find_in_dict(deltaH_dict, pair);
        deltaH0 += to_addH;

        const to_addS = find_in_dict(deltaS_dict, pair);
        deltaS0 += to_addS
    };
    
    // Calculate the melting temperature and convert from K to C
    const tm = (deltaH0 / (deltaS0 + R * Math.log(c / symm_fraction))) - 273.15; 
    // Add a salt correction
    console.log("getTM", saltCorrectionEquation, applyingSaltCorrection, saltConc)
    let tm_corr = (applyingSaltCorrection && saltConc &&  saltConc !== NaN && saltConc !== 0) ? saltCorrection(tm, sequence, m, saltCorrectionEquation): tm;

    // Add DMSO correction
    tm_corr = (applyingDMSOCorrection && dmsoConc && dmsoConc !== NaN) ? tm_corr - 0.6*dmsoConc: tm_corr;

    return tm_corr;
};


/**
 * Calculate fraction of GC content of sequence
 */
function fractionGC(sequence) {
  let gc_count = (sequence.match(/[GC]/g) || []).length;
  return gc_count / sequence.length;
};


/**
 * Different salt correciton equations
 */
const saltCorrectionEquationDict = {
  SchildkrautLifson : (T1, s, m) => {
    return T1 + 16.6 * Math.log(m);
  },
  Owczarzy : (T1, s, m) => {
    const fGC = fractionGC(s);
    let reciprocT2 = (1/T1) + ((4.29*fGC - 3.95)*1E-5*Math.log(m)) + 9.4*1E-6*(Math.log(m)**2);
    return 1/reciprocT2;
  }
};


/**
 * Salt correction
 * 
 * sequence - primer of interest
 * c - primer concentration in M
 * m - salt concentration in M
 */
function saltCorrection(T1, sequence, m, equation) {
  console.log("Salt corr", equation)
  return saltCorrectionEquationDict[equation](T1, sequence, m);
};