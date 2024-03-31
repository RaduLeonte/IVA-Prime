/**
 * Melting temperature calculator for DNA duplexes.
 * 
 * sequence - primer of interest
 * c - primer concentration in M
 * m - salt concentration in M
 */
function get_tm(primer_sequence, c, m, method="nnSantaLucia") {
    // Convert from nM to M
    c = c / 1E9
    // Calculate the melting temperature
    const tm = meltingTemperatureAlgorithmDict[method](primer_sequence, c); 
    
    // Add a salt correction
    let tm_corr = (saltConc &&  saltConc !== NaN && saltConc !== 0) ? saltCorrectionEquationDict[saltCorrectionEquation](tm, primer_sequence, m): tm;

    // Add DMSO correction
    if (method !== "oligoCalc") {
      tm_corr = (dmsoConc && dmsoConc !== NaN && dmsoConc !== 0) ? tm_corr - 0.6*dmsoConc: tm_corr;
    };

    // Minimum value of absolute zero
    return Math.max(tm_corr, -273.15); 
};


/**
 * Melting Temperature algorithms
 */
const meltingTemperatureAlgorithmDict = {
  /**
   * Nearest-neighbour algorithm as described by SantaLucia (1998)
   */
  nnSantaLucia : (input_sequence, primerC) => {
      // Enthalpy data (cal mol-1)
      const deltaH_dict = {
        "AA": -7.9E3,
        "TT": -7.9E3,
        "AT": -7.2E3,
        "TA": -7.2E3,
        "CA": -8.5E3,
        "TG": -8.5E3,
        "GT": -8.4E3,
        "AC": -8.4E3,
        "CT": -7.8E3,
        "AG": -7.8E3,
        "GA": -8.2E3,
        "TC": -8.2E3,
        "CG": -10.6E3,
        "GC": -9.8E3,
        "GG": -8.0E3,
        "CC": -8.0E3,
    }; 

    // Entropy data (cal k-1 mol-1)
    const deltaS_dict = {
        "AA": -22.2,
        "TT": -22.2,
        "AT": -20.4,
        "TA": -21.3,
        "CA": -22.7,
        "TG": -22.7,
        "GT": -22.4,
        "AC": -22.4,
        "CT": -21.0,
        "AG": -21.0,
        "GA": -22.2,
        "TC": -22.2,
        "CG": -27.2,
        "GC": -24.4,
        "GG": -19.9,
        "CC": -19.9
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
    const complementary = getComplementaryStrand(input_sequence);
    if (input_sequence === complementary) {
        console.log("Symmetric")
        deltaS0 += -1.4;
        symm_fraction = 1;
    };

    // Nucleation term
    // The first pair to anneal is the nucleation point, but since G-C bonds are so strong it basically
    // always starts annealing there. If there is a G or C anywhere in the sequence add GC contributions
    // otherwise, the AT contributions.
    if (input_sequence.includes("G") || input_sequence.includes("C")) {
        deltaH0 += 0.1E3;
        deltaS0 += -2.8;
    } else {
        deltaH0 += 2.3E3;
        deltaS0 += 4.1;
    };

    // Loop over the sequence and add the contributions of each pair of nucleotides.
    for (let pair in deltaH_dict) {
        const pairCount = countSubstringOccurrences(input_sequence, pair);
        deltaH0 += pairCount * deltaH_dict[pair];
        deltaS0 += pairCount * deltaS_dict[pair];
    };
    const R = 1.987; // cal mol-1 K-1 universal gas constant
    return (deltaH0 / (deltaS0 + R * Math.log(primerC / symm_fraction))) - 273.15;
  },
  /**
   * Algorithm from the Oligo Calc online calculator (http://biotools.nubic.northwestern.edu/oligocalc.html)
   */
  oligoCalc : (input_sequence, primerC) => {
    if (input_sequence.length > 0 ) {
      let nr = {};
      for (let char of ["A", "T", "G", "C"]) {nr[char] = countSubstringOccurrences(input_sequence, char);};
  
      let tm = 64.9 + 41 * (((nr["G"] + nr["C"]) - 16.4) / input_sequence.length);
      return tm;
    } else {
      return -273.15;
    }
  }
};


/**
 * Count occurrences of a substring of characters in an input string
 */
function countSubstringOccurrences(inputSequence, substring) {
  let count = 0;
  let currentIndex = inputSequence.indexOf(substring);

  while (currentIndex !== -1) {
    count++;
    currentIndex = inputSequence.indexOf(substring, currentIndex + 1);
  };
  return count;
};


/**
 * Calculate fraction of GC content of sequence
 */
function fractionGC(input_sequence) {
  let gc_count = (input_sequence.match(/[GC]/g) || []).length;
  return gc_count / input_sequence.length;
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