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
const gridStructure = ["Forward Strand",
                        "Complementary Strand",
                        "Indices",
                        "Amino Acids",
                        "Annotations"];
const gridStructure2 = ["Forward Strand",
                        "Complementary Strand",
                        "Indices",
                        "Amino Acids",
                        "Annotations"];
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