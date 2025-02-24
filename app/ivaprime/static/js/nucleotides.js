const Nucleotides = new class {
    /**
     * MAP of complementary single letter codes.
     */
    complements = {
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
    codonTable = {
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
     * @param {string} inputSequence - Template sequence.
     * @returns - Complementary sequence.
     */
    complementary(inputSequence) {
        // Convert to uppercase, make into list, map to complementary base,
        // then turn back into string
        return Nucleotides.sanitizeSequence(inputSequence)
            .split('')
            .map(nucleotide => Nucleotides.complements[nucleotide])
            .join('');
    };


    /**
     * Translates a DNA/RNA sequence. Extra nucleotides are ignored.
     * 
     * @param {string} inputSequence - Sequence to be translated.
     * @returns {string} - Translated sequence.
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
};