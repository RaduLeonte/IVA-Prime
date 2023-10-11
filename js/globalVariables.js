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
let recentColor = ''; // Global variable that stores the most recent color used


// importSubcloningPlasmid
let secondPlasmidIported = false;


// insertionPopUpWindow
let dnaSequenceInput = '';
let aminoAcidSequenceInput = '';

// mutationPopUpWindow
let mutateToSequence = '';

// sequenceContextMenu
let clickedOffset = 0;
let targetCell = null;
let target = null;
insertionPosition = null;

// tableHover
let basePosition = -1;
let basePosition2 = -1;

// tableSelection
let selectedText = '';
let selectedText2 = '';
let selectionStartPos = null;
let selectionEndPos = null;

