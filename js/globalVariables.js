/**
 * createPrimers
 */
let primerConc = 100E-9; // M, primer concentration for melting temperatures
let saltConc = 0.5; // M, primer concentration for melting temperatures

let homoRegionTm = 49.5; // C, target temperature for the homologous region
let tempRegionTm = 60; // C, target temperature for the template region

let operationNr = 1; // modification counter


/**
 * importPlasmid
 */
// Grid structure, each entry is a row in the table
let gridStructure, gridStructure2;
gridStructure= gridStructure2 = ["Forward Strand",
                                "Complementary Strand",
                                "Amino Acids",
                                "Annotations",
                                "Spacer"];
const gridWidth = 60; // Amount of cells per row
// Initialise empty sequence and features variables
let sequence = "";
let complementaryStrand = "";
let features = null;
let sequence2 = "";
let complementaryStrand2 = "";
let features2 = null;
// Global variable that stores the most recent color used
let recentColor = '';


/**
 * importSubcloningPlasmid 
 */
// Keep track if the second plasmid has been imported (to disable the button etc)
let secondPlasmidIported = false;


/**
 * insertionPopUpWindow 
 */
// User inputs int he insertion pop up window
let dnaSequenceInput = '';
let aminoAcidSequenceInput = '';


/**
 * tableHover 
 */
// 
let basePosition = -1; // Cursor position in the first grid (sequence coords)
let basePosition2 = -1; // Cursor position in the sublocning plasmid grid (sequence coords)


/**
 * tableSelection 
 */
let selectedText = ''; // Currently selected sequence in the first grid
let selectedText2 = ''; // Currently selected sequence in the second grid
let selectionStartPos = null;
let selectionEndPos = null;


/**
 * Biology stuff.
 */

// Possible codons resulting in each amino acid
const aaToCodon = {
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
    X: ['TAA', 'TAG', 'TGA']};

/**
 * Codon frequency tables
 */

const codonTablesDict = {
    "Escherichia coli": {
        X: {0.61: "TAA", 0.3: "TGA", 0.09: "TAG", },
        A: {0.33: "GCG", 0.26: "GCC", 0.23: "GCA", 0.18: "GCT", },
        C: {0.54: "TGC", 0.46: "TGT", },
        D: {0.63: "GAT", 0.37: "GAC", },
        E: {0.68: "GAA", 0.32: "GAG", },
        F: {0.58: "TTT", 0.42: "TTC", },
        G: {0.37: "GGC", 0.35: "GGT", 0.15: "GGG", 0.13: "GGA", },
        H: {0.57: "CAT", 0.43: "CAC", },
        I: {0.49: "ATT", 0.39: "ATC", 0.11: "ATA", },
        K: {0.74: "AAA", 0.26: "AAG", },
        L: {0.47: "CTG", 0.14: "TTA", 0.13: "TTG", 0.12: "CTT", 0.1: "CTC", 0.04: "CTA", },
        M: {1.0: "ATG", },
        N: {0.51: "AAC", 0.49: "AAT", },
        P: {0.49: "CCG", 0.2: "CCA", 0.18: "CCT", 0.13: "CCC", },
        Q: {0.66: "CAG", 0.34: "CAA", },
        R: {0.36: "CGT", 0.36: "CGC", 0.11: "CGG", 0.07: "CGA", 0.07: "AGA", 0.04: "AGG", },
        S: {0.25: "AGC", 0.17: "TCT", 0.16: "AGT", 0.15: "TCC", 0.14: "TCA", 0.14: "TCG", },
        T: {0.4: "ACC", 0.25: "ACG", 0.19: "ACT", 0.17: "ACA", },
        V: {0.35: "GTG", 0.28: "GTT", 0.2: "GTC", 0.17: "GTA", },
        W: {1.0: "TGG", },
        Y: {0.59: "TAT", 0.41: "TAC", },
    },
    "Human": {
        A: {0.4: "GCC", 0.26: "GCT", 0.23: "GCA", 0.11: "GCG", },
        C: {0.55: "TGC", 0.45: "TGT", },
        D: {0.54: "GAC", 0.46: "GAT", },
        E: {0.58: "GAG", 0.42: "GAA", },
        F: {0.55: "TTC", 0.45: "TTT", },
        G: {0.34: "GGC", 0.25: "GGA", 0.25: "GGG", 0.16: "GGT", },
        H: {0.59: "CAC", 0.41: "CAT", },
        I: {0.48: "ATC", 0.36: "ATT", 0.16: "ATA", },
        K: {0.58: "AAG", 0.42: "AAA", },
        L: {0.41: "CTG", 0.2: "CTC", 0.13: "TTG", 0.13: "CTT", 0.07: "TTA", 0.07: "CTA", },
        M: {1.0: "ATG", 1.0: "ATG", },
        N: {0.54: "AAC", 0.51: "AAC", 0.49: "AAT", 0.46: "AAT", },
        P: {0.49: "CCG", 0.33: "CCC", 0.28: "CCT", 0.27: "CCA", 0.2: "CCA", 0.18: "CCT", 0.13: "CCC", 0.11: "CCG", },
        Q: {0.75: "CAG", 0.66: "CAG", 0.34: "CAA", 0.25: "CAA", },
        R: {0.36: "CGT", 0.36: "CGC", 0.21: "CGG", 0.2: "AGA", 0.2: "AGG", 0.19: "CGC", 0.11: "CGG", 0.11: "CGA", 0.08: "CGT", 0.07: "CGA", 0.07: "AGA", 0.04: "AGG", },
        S: {0.25: "AGC", 0.24: "AGC", 0.22: "TCC", 0.18: "TCT", 0.17: "TCT", 0.16: "AGT", 0.15: "TCC", 0.15: "TCA", 0.15: "AGT", 0.14: "TCA", 0.14: "TCG", 0.06: "TCG", },
        T: {0.4: "ACC", 0.36: "ACC", 0.28: "ACA", 0.25: "ACG", 0.24: "ACT", 0.19: "ACT", 0.17: "ACA", 0.12: "ACG", },
        V: {0.47: "GTG", 0.35: "GTG", 0.28: "GTT", 0.24: "GTC", 0.2: "GTC", 0.18: "GTT", 0.17: "GTA", 0.11: "GTA", },
        W: {1.0: "TGG", 1.0: "TGG", },
        X: {0.52: "TGA", 0.28: "TAA", 0.2: "TAG", },
        Y: {0.59: "TAT", 0.57: "TAC", 0.43: "TAT", 0.41: "TAC", },
    }
}