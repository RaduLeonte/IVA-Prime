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

const eColiCodonTable = {
    A: ['GCG'],
    R: ['CGT'],
    N: ['AAT'],
    D: ['GAT'],
    C: ['TGC'],
    E: ['GAA'],
    Q: ['CAG'],
    G: ['GGC'],
    H: ['CAT'],
    I: ['ATT'],
    L: ['CTG'],
    K: ['AAA'],
    M: ['ATG'],
    F: ['TTT'],
    P: ['CCG'],
    S: ['TCT'],
    T: ['ACC'],
    W: ['TGG'],
    Y: ['TAT'],
    V: ['GTG'],
    X: ['TAA'],
}