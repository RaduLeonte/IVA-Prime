const Nucleotides = new class {
    constructor() {
        this.commonFeatures = null;
        fetch('static/data/commonFeatures.json')
            .then(response => response.json())
            .then(json => {
                this.commonFeatures = json;
            });
        

        /**
         * MAP of complementary single letter codes.
         */
        this.complements = {
            'A': 'T',
            'C': 'G',
            'G': 'C',
            'T': 'A',
            'R': 'Y', // A or G -> T or C
            'Y': 'R', // T or C -> A or G
            'S': 'S', // G or C -> G or C
            'W': 'W', // A or T -> A or T
            'K': 'M', // G or T -> A or C
            'M': 'K', // A or C -> G or T
            'B': 'V', // C or G or T -> G or C or A
            'D': 'H', // A or G or T -> T or C or A
            'H': 'D', // A or C or T -> T or G or A
            'V': 'B', // A or C or G -> T or G or C
            'N': 'N', // any
            '.': '-', // gap
            '-': '-'  // gap
        };
    

        /**
         * Codon table. DNA -> AA
         */
        this.codonTable = {
            'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
            'TGT': 'C', 'TGC': 'C',
            'GAT': 'D', 'GAC': 'D',
            'GAA': 'E', 'GAG': 'E',
            'TTT': 'F', 'TTC': 'F',
            'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
            'CAT': 'H', 'CAC': 'H',
            'ATT': 'I', 'ATC': 'I', 'ATA': 'I',
            'AAA': 'K', 'AAG': 'K',
            'TTA': 'L', 'TTG': 'L', 'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
            'ATG': 'M',
            'AAT': 'N', 'AAC': 'N',
            'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
            'CAA': 'Q', 'CAG': 'Q',
            'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R', 'AGA': 'R', 'AGG': 'R',
            'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S', 'AGT': 'S', 'AGC': 'S',
            'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
            'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
            'TGG': 'W',
            'TAT': 'Y', 'TAC': 'Y',
            'TAA': '*', 'TAG': '*', 'TGA': '*'
        };
    
        
        this.codonWeights = null;
        // Load codon weights once document is loaded
        document.addEventListener('DOMContentLoaded', function () {
            Nucleotides.loadCodonWeights();
        });
    };


    loadCodonWeights() {
        fetch('static/data/codonWeights.json')
        .then(response => response.json())
        .then(json => {
            Nucleotides.codonWeights = json;
        });
    };


    /**
     * Check if a given sequence is a purely nucleotide sequence
     * 
     * @param {string} inputSequence - Input sequence to be checked
     * @returns {bool} - True for nucleotide sequences, false for anything else
     */
    isNucleotideSequence(inputSequence) {
        return [...inputSequence].every(char => char in this.complements);
    };


    /**
     * Sanitize DNA/RNA sequence leaving only allowed IUPAC nucleotide
     * one letter codes.
     * 
     * @param {string} inputSequence - String to be sanitized 
     * @returns - Sanitized string
     */
    sanitizeSequence(inputSequence) {
        return inputSequence.toUpperCase()
        .trim()
        .replace(/[\r\n\t\s]+/g, "")
        .replace(/[^ACGTURYSWKMBDHVN\.\-]/g, "");
    };


    /**
     * Create the complementary sequence to a given DNA/RNA sequence.
     * 
     * @param {String} inputSequence - Template sequence.
     * @returns - Complementary sequence.
     */
    complementary(inputSequence) {
        const seq = Nucleotides.sanitizeSequence(inputSequence);
        let result = new Array(seq.length);

        for (let i = 0; i < seq.length; i++) {
            result[i] = Nucleotides.complements[seq[i]];
        };
    
        return result.join('');
    };


    /**
     * Create the reverse complementary sequence to a given DNA/RNA sequence.
     * 
     * @param {String} inputSequence - Template sequence
     * @returns - Reverse complementary sequence
     */
    reverseComplementary(inputSequence) {
        return this.complementary(inputSequence).split("").reverse().join("")
    };


    /**
     * Translates a DNA/RNA sequence. Extra nucleotides are ignored.
     * 
     * @param {String} inputSequence - DNA/RNA Sequence to be translated.
     * @returns {String} - Translated sequence.
     */
    translate(inputSequence) {
        // Sanitize then convert RNA to DNA
        inputSequence = Nucleotides.sanitizeSequence(inputSequence).replace("U", "T")
        // Iterate over the string and add translated amino acid
        // 1 letter codes to a string.
        let outputSequence = "";
        for (let i = 0; i < inputSequence.length - (inputSequence.length % 3); i += 3) {
            outputSequence += Nucleotides.codonTable[inputSequence.slice(i, i+3)]
        };
        return outputSequence;
    };


    /**
     * Optimise amino acid sequence using codon frequency tables
     * for the specified organism
     * 
     * @param {string} inputAA - Amino acid sequence to optimise
     * @param {string} targetOrganism - Organism for which the codons should be optimised
     * @returns {string} - Optimised DNA sequence
     */
    optimizeAA(inputAA, targetOrganism) {
        return inputAA
        .split("")
        .map(aa => {
            const possibilities = Object.entries(this.codonWeights[targetOrganism][aa]).map(([value, weight]) => ({
                weight: parseFloat(weight),
                value
            }));

            const totalWeight = possibilities.reduce((sum, p) => sum + p.weight, 0);

            let rand = Math.random() * totalWeight;
            for (const p of possibilities) {
                rand -= p.weight;
                if (rand <= 0) return p.value;
            };
        })
        .join("");
    };


    /**
     * Calculate fraction of GC content of a given sequence.
     * 
     * @param {String} inputSequence 
     * @returns {Number} GC fraction
     */
    fractionGC(inputSequence) {
        const gcCount = (inputSequence.match(/[GC]/g) || []).length;
        return gcCount / inputSequence.length;
    };


    /**
     * Calculate melting temperature of a DNA duplex with specified sequence.
     * 
     * @param {String} seq - Sequence
     * @param {String} method - Melting temperature algorithm (oligoCalc, nnSantaLucia)
     * @returns {number} - Melting temperature
     */
    getMeltingTemperature(seq, method=null) {
        method = (method) ? method: UserPreferences.get("TmAlgorithm");

        // Convert global primer concentration from nM to M
        const primerConcentrationM = UserPreferences.get("primerConc") * 1E-9;

        const tm = this.meltingTemperatureAlgorithms[method](seq, primerConcentrationM);

        const saltConc = UserPreferences.get("saltConc");
        const tmCorrectedSalt = (method !== "oligoCalc" && saltConc &&  saltConc !== NaN && saltConc !== 0)
        ? saltCorrections[UserPreferences.get("saltCorr")](tm, seq, saltConc)
        : tm;

        const dmsoConc = UserPreferences.get("dmsoConc");
        const tmCorrectedSaltDMSO = (method !== "oligoCalc" && dmsoConc && dmsoConc !== NaN && dmsoConc !== 0)
        ? tmCorrectedSalt - 0.6*dmsoConc
        : tmCorrectedSalt;

        // Clamp output to absolute zero
        return Math.max(tmCorrectedSaltDMSO, -273.15); 
    };


    meltingTemperatureAlgorithms = {
        /**
         * Nearest-neighbour algorithm as described by SantaLucia (1998).
         * 
         * @param {String} seq - Primer sequence 
         * @param {Number} C - Primer concentration
         * @returns {Number} - Melting temperature
         */
        nnSantaLucia: (seq, C) => {
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

            // Entropy data (cal K-1 mol-1)
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

            let deltaH0 = 0; // cal mol-1 enthalpy
            let deltaS0 = 0; // cal K-1 mol-1 entropy

            /**
             * Symmetry correction
             * If the primer is completely symmetric, there is an
             * entropy gain and the symmetry fraction is different.
             */
            let symmFraction = 4;
            if (seq === Utilities.complementary(seq)) {
                deltaS0 += -1.4;
                symmFraction = 1;
            };

            /**
             * Nucleation term
             * The first pair to anneal is the nucleation point, but
             * since G-C bonds are so strong it basically always starts
             * annealing there. If there is a G or C anywhere in the sequence
             * add GC contributions otherwise, the AT contributions.
             */
            if (seq.includes("G") || seq.includes("C")) {
                deltaH0 += 0.1E3;
                deltaS0 += -2.8;
            } else {
                deltaH0 += 2.3E3;
                deltaS0 += 4.1;
            };

            // Loop over the possible pairs and add the contributions
            for (let pair in deltaH_dict) {
                const pairCount = Utilities.countSubstringOccurences(pair, seq);
                deltaH0 += pairCount * deltaH_dict[pair];
                deltaS0 += pairCount * deltaS_dict[pair];
            };

            // Ideal gas constant
            const R = 1.987; // cal mol-1 K-1

            return (deltaH0 / (deltaS0 + R * Math.log(C / symmFraction))) - 273.15;
        },

        /**
         * Algorithm from the Oligo Calc online calculator (http://biotools.nubic.northwestern.edu/oligocalc.html)
         * 
         * @param {String} seq - Primer sequence
         * @param {Number} C - Not used
         * @returns {Number} - Melting temperature
         */
        oligoCalc: (seq, C) => {
            if (seq.length == 0) {
                return -273.15;
            };

            const nrBases = {};
            ["G", "C"].forEach(base => {
                nrBases[base] = Utilities.countSubstringOccurences(base, seq);
            });
            return 64.9 + 41 * (((nrBases["G"] + nrBases["C"]) - 16.4) / seq.length);
        }
    };


    saltCorrections = {
        /**
         * Schildkraut and Lifosn salt correction
         * 
         * @param {Number} T1 - Initial melting temperature
         * @param {Number} seq - Primer sequence
         * @param {Number} C - Salt concentration
         * @returns {Number} Corrected melting tempeature
         */
        SchildkrautLifson : (T1, seq, C) => {
            return T1 + 16.6 * Math.log(C);
        },

        /**
         * Owczarzy salt correction
         * 
         * @param {Number} T1 - Initial melting temperature
         * @param {Number} seq - Primer sequence
         * @param {Number} C - Salt concentration
         * @returns {Number} Corrected melting tempeature
         */
        Owczarzy : (T1, seq, C) => {
            const fGC = fractionGC(seq);
            const reciprocT2 = (1/T1) + ((4.29*fGC - 3.95)*1E-5*Math.log(C)) + 9.4*1E-6*(Math.log(C)**2);
            return 1/reciprocT2;
        }
    };


    validatePrimerSequence(seq) {
        const validBases = new Set(["A", "C", "T", "G"]);

        for (let i = 0, len = seq.length; i < len; i++) {
            const base = seq[i];
            if (!validBases.has(base)) {
                throw new AmbiguousBaseError(seq)
            };
        };
    };


    detectCommonFeatures(plasmidSequence) {
        const plasmidSequenceComp = this.complementary(plasmidSequence);
        let detectedFeatures = {}
        // Check for common features first in the forward strand then
        // then once more for the complementary strand
        for (let i = 0; i < 2; i++) {
            // Select current sequence in 5'->3'
            const currentSequence = (i === 0) ? plasmidSequence: plasmidSequenceComp.split("").reverse().join("");
            
            // Iterate over all features in the database and check if
            // they are present
            for (const commonFeatureIndex in Nucleotides.commonFeatures) {
                // Get current feature info
                const commonFeatureDict = Nucleotides.commonFeatures[commonFeatureIndex];
                const featureLabel = commonFeatureDict["label"];
                const featureSequenceType = commonFeatureDict["sequence type"];
                const featureSequence = commonFeatureDict["sequence"];
                
                // Initialize regex
                const regex = new RegExp(featureSequence, 'g');
                let match;
    
                // Check if a feature with the same name is already present and
                // save its span
                const similarFeatures = [];
                // Iterate over the values in the dictionary
                Object.values(detectedFeatures).forEach((feature) => {
                    if (feature.label == featureLabel) {
                        similarFeatures.push(feature.span);
                    };
                });
    
                /**
                 * If checking for amino acid sequence
                 */
                if (featureSequenceType === "AA") {
                    // Generate reading frames offset by 1 nucleotide
                    const readingFrames = [
                        Nucleotides.translate(currentSequence),
                        Nucleotides.translate(currentSequence.slice(1) + currentSequence.slice(0, 1)),
                        Nucleotides.translate(currentSequence.slice(2) + currentSequence.slice(0, 2))
                    ];
                    // Iterate over reading frames and check for features
                    for (let j = 0; j < 3; j++) {
                        // While there are matches
                        while ((match = regex.exec(readingFrames[j])) !== null) {
                            // Generate new feature info
                            const newFeatureId = Utilities.newUUID();
                            const newFeatureDirectionality = (i === 0) ? "fwd": "rev";
                            const newFeatureSpanStart = (i === 0) ? match.index*3 + j + 1: currentSequence.length - j - match.index*3 - featureSequence.length*3 + 1;
                            const newFeaturSpanEnd = newFeatureSpanStart + featureSequence.length*3 - 1;
                            const newFeatureSpan = [newFeatureSpanStart, newFeaturSpanEnd];
                            
                            // Check if any feature in similarFeatures has an
                            // overlapping span with the new feature. If there's
                            // at least one hit, do not add the new feature.
                            let canAdd = true;
                            Object.values(similarFeatures).forEach((similarFeatureSpan) => {
                                if (similarFeatureSpan[0] <= newFeatureSpanStart && newFeaturSpanEnd <= similarFeatureSpan[1]) {
                                    canAdd = false;
                                };
                            });
            
                            // Add new feature.
                            if (canAdd) {
                                detectedFeatures[newFeatureId] = {
                                    label: featureLabel,
                                    type: commonFeatureDict["type"],
                                    directionality: newFeatureDirectionality,
                                    span: newFeatureSpan,
                                    translation: featureSequence,
                                    note: (commonFeatureDict["note"] !== null) ? commonFeatureDict["note"]: "",
                                    color: Utilities.getRandomDefaultColor()
                                };
                            };
                        };
                    };

                /**
                 * If checking for DNA sequence
                 */
                } else if (featureSequenceType === "DNA") {
                    // While there are matches
                    while ((match = regex.exec(currentSequence)) !== null) {
                        // Generate new feature info
                        const newFeatureId = Utilities.newUUID();
                        const newFeatureDirectionality = (i === 0) ? "fwd": "rev";
                        const newFeatureSpanStart = (i === 0) ? match.index + 1: currentSequence.length - match.index - featureSequence.length + 1;
                        const newFeaturSpanEnd = newFeatureSpanStart + featureSequence.length - 1;
                        const newFeatureSpan = [newFeatureSpanStart, newFeaturSpanEnd];
                        
                        
                        // Check if any feature in similarFeatures has an
                        // overlapping span with the new feature. If there's
                        // at least one hit, do not add the new feature.
                        let canAdd = true;
                        Object.values(similarFeatures).forEach((similarFeatureSpan) => {
                            if (similarFeatureSpan[0] <= newFeatureSpanStart && newFeaturSpanEnd <= similarFeatureSpan[1]) {
                                canAdd = false;
                            };
                        });
        
                        // Add new feature.
                        if (canAdd) {
                            detectedFeatures[newFeatureId] = {
                                label: featureLabel,
                                type: commonFeatureDict["type"],
                                directionality: newFeatureDirectionality,
                                span: newFeatureSpan,
                                note: (commonFeatureDict["note"] !== null) ? commonFeatureDict["note"]: "",
                                color: Utilities.getRandomDefaultColor()
                            };
                        };
                    };
                };
            };
        };


        return detectedFeatures;
    };
};