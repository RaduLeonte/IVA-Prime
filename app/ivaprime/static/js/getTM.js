/**
 * Calculate melting temperature of a DNA duplex with specified sequence.
 * 
 * @param {string} primerSequence - Sequence of interest
 * @param {string} method - Melting temperature algorithm (oligoCalc, nnSantaLucia)
 * @returns {number} - Melting temperature
 */
function getMeltingTemperature(primerSequence, method="nnSantaLucia") {
    // Convert primer concentration from nM to M
    const primerConcM = primerConc / 1E9

    // Calculate the melting temperature
    const tm = meltingTemperatureAlgorithmDict[method](primerSequence, primerConcM); 
    
    // Add a salt correction
    let tm_corr = (method !== "oligoCalc" && saltConc &&  saltConc !== NaN && saltConc !== 0) ? saltCorrectionEquationDict[saltCorrectionEquation](tm, primerSequence, saltConc): tm;

    // Add DMSO correction
    if (method !== "oligoCalc") {
      tm_corr = (dmsoConc && dmsoConc !== NaN && dmsoConc !== 0) ? tm_corr - 0.6*dmsoConc: tm_corr;
    };

    // Clamp output to absolute zero
    return Math.max(tm_corr, -273.15); 
};


/**
 * Map of melting Temperature algorithms
 */
const meltingTemperatureAlgorithmDict = {
  /**
   * Nearest-neighbour algorithm as described by SantaLucia (1998)
   * 
   * @param {string} inputSequence - Primer sequence 
   * @param {number} primerC - Primer concentration
   * @returns {number} - Melting temperature
   */
  nnSantaLucia : (inputSequence, primerC) => {
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
    let symmFraction = 4;
    if (inputSequence === getComplementaryStrand(inputSequence)) {
        deltaS0 += -1.4;
        symmFraction = 1;
    };

    // Nucleation term
    // The first pair to anneal is the nucleation point, but since G-C bonds are so strong it basically
    // always starts annealing there. If there is a G or C anywhere in the sequence add GC contributions
    // otherwise, the AT contributions.
    if (inputSequence.includes("G") || inputSequence.includes("C")) {
        deltaH0 += 0.1E3;
        deltaS0 += -2.8;
    } else {
        deltaH0 += 2.3E3;
        deltaS0 += 4.1;
    };

    // Loop over the possible pairs and add the contributions
    for (let pair in deltaH_dict) {
        const pairCount = countSubstringOccurrences(inputSequence, pair);
        deltaH0 += pairCount * deltaH_dict[pair];
        deltaS0 += pairCount * deltaS_dict[pair];
    };

    // Ideal gas constant
    const R = 1.987; // cal mol-1 K-1

    return (deltaH0 / (deltaS0 + R * Math.log(primerC / symmFraction))) - 273.15;
  },
  
  /**
   * Algorithm from the Oligo Calc online calculator (http://biotools.nubic.northwestern.edu/oligocalc.html)
   * 
   * @param {string} inputSequence - Primer sequence
   * @param {number} primerC - not used
   * @returns {number} - Melting temperature
   */
  oligoCalc : (inputSequence, primerC) => {
    if (inputSequence.length > 0 ) {
      // Count occurences of each base
      let nr = {};
      for (let char of ["A", "T", "G", "C"]) {
        nr[char] = countSubstringOccurrences(inputSequence, char);
      };
  
      return 64.9 + 41 * (((nr["G"] + nr["C"]) - 16.4) / inputSequence.length);
    } else {
      // Clamp value to absolute 0.
      return -273.15;
    };
  }
};


/**
 * Count occurrences of a substring of characters in an input string
 * 
 * @param {string} inputString
 * @param {string} substring 
 * @returns {number} Number of occurences
 */
function countSubstringOccurrences(inputString, substring) {
  let count = 0;
  let currentIndex = inputString.indexOf(substring);
  while (currentIndex !== -1) {
    count++;
    currentIndex = inputString.indexOf(substring, currentIndex + 1);
  };
  return count;
};


/**
 * Calculate fraction of GC content of a given sequence.
 * 
 * @param {string} input_sequence 
 * @returns {number} GC fraction
 */
function fractionGC(input_sequence) {
  const gc_count = (input_sequence.match(/[GC]/g) || []).length;
  return gc_count / input_sequence.length;
};


/**
 * Map of salt correcitons
 */
const saltCorrectionEquationDict = {
  /**
   * Schildkraut and Lifosn salt correction
   * 
   * @param {number} T1 - Initial melting temperature
   * @param {number} inputSequence - Primer sequence
   * @param {number} saltC - Salt concenration
   * @returns {number} Corrected melting tempeature
   */
  SchildkrautLifson : (T1, inputSequence, saltC) => {
    return T1 + 16.6 * Math.log(saltC);
  },

  /**
   * Owczarzy salt correction
   * 
   * @param {number} T1 - Initial melting temperature
   * @param {number} inputSequence - Primer sequence
   * @param {number} saltC - Salt concenration
   * @returns {number} Corrected melting tempeature
   */
  Owczarzy : (T1, inputSequence, saltC) => {
    const fGC = fractionGC(inputSequence);
    const reciprocT2 = (1/T1) + ((4.29*fGC - 3.95)*1E-5*Math.log(saltC)) + 9.4*1E-6*(Math.log(saltC)**2);
    return 1/reciprocT2;
  }
};