function getComplementaryStrand(sequence) {
    const nucleotideComplements = {
        'A': 'T',
        'T': 'A',
        'G': 'C',
        'C': 'G'
    };

    const complementaryStrand = sequence
        .toUpperCase()
        .split('')
        .map(nucleotide => nucleotideComplements[nucleotide])
        .join('');

    return complementaryStrand;
}