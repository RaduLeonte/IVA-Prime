/**
 * Cookie handlers
 */
function setCookie(name, value, daysToExpire, isSecure, isCrossSite) {
    let cookieValue = `${name}=${value}; path=/`;

    if (daysToExpire) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + daysToExpire);
        cookieValue += `; expires=${expirationDate.toUTCString()}`;
    };

    if (isSecure) {
        cookieValue += '; Secure';
    };

    if (isCrossSite) {
        cookieValue += '; SameSite=None';
    };

    document.cookie = cookieValue;
};


function getCookieValue(name) {
    const cookieName = `${name}=`;
    const cookies = document.cookie.split(';');

    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(cookieName) === 0) {
            return cookie.substring(cookieName.length, cookie.length);
        };
    };
    return null;
};


function saveUserPreference(preferenceName, preferenceValue, daysToExpire, isSecure, isCrossSite) {
    // Retrieve the current user preferences from the cookie
    const userPreferences = JSON.parse(getCookieValue('userPreferences') || '{}');
    
    // Update or set the preference
    userPreferences[preferenceName] = preferenceValue;

    // Save the updated user preferences to the cookie
    setCookie('userPreferences', JSON.stringify(userPreferences), daysToExpire, isSecure, isCrossSite);
};


function getUserPreference(preferenceName) {
    // Retrieve the current user preferences from the cookie
    const userPreferences = JSON.parse(getCookieValue('userPreferences') || '{}');

    // Check if the preference exists, and return its value; otherwise, return a default value or null
    if (userPreferences.hasOwnProperty(preferenceName)) {
        return userPreferences[preferenceName];
    } else {
        return null; // or return a default value
    };
};
console.log("Settings:", JSON.stringify(JSON.parse(getCookieValue('userPreferences') || '{}'), null, 2));


/**
 * Default settings
 */
const defaultSetingsDict = {
    "primerConc": 100,
    "meltingTempAlgorithmChoice": "oligoCalc",
    "saltConc": 0,
    "saltCorrectionEquation": "SchildkrautLifson",
    "dmsoConc": 0,
    "homoRegionMinLength": 15,
    "homoRegionTm": 49.5,
    "primerDistribution": false,
    "tempRegionTm": 60,
    "upperBoundShortInsertions": 49.5,
    "colorTheme": "lightTheme",
    "gridWidth": 60,
};
let colorTheme = (getUserPreference("colorTheme")  !== null) ? getUserPreference("colorTheme") : defaultSetingsDict["colorTheme"];


/**
 * createPrimers
 */
// Setting deciding wether to distribute insertion across both forward and reverse primers or whether to keep it on one.
let primerDistribution = (getUserPreference("primerDistribution")  !== null) ? getUserPreference("primerDistribution") : defaultSetingsDict["primerDistribution"];
// Minimum length for homologous region
let homoRegionMinLength = (getUserPreference("homoRegionMinLength")  !== null) ? getUserPreference("homoRegionMinLength") : defaultSetingsDict["homoRegionMinLength"];
// C, target temperature for the homologous region
let homoRegionTm = (getUserPreference("homoRegionTm")  !== null) ? getUserPreference("homoRegionTm") : defaultSetingsDict["homoRegionTm"];
// C, target temperature for the template region
let tempRegionTm = (getUserPreference("tempRegionTm")  !== null) ? getUserPreference("tempRegionTm") : defaultSetingsDict["tempRegionTm"];
// Insertions with a TM lower than this will be turned into short insertions
let upperBoundShortInsertions = (getUserPreference("upperBoundShortInsertions")  !== null) ? getUserPreference("upperBoundShortInsertions") : defaultSetingsDict["upperBoundShortInsertions"];

let operationNr = 1; // modification counter

const primerColorRed = "rgb(200, 52, 120)"
const primerColorGreen = "rgb(68, 143, 71)"
const primerColorOrange = "rgb(217, 130, 58)"
const primerColorPurple = "rgb(107, 96, 157)"
const primerColorCyan = "rgb(140, 202, 242)"


/**
 * customSearch
 */
let customSearchEnabledFirstPlasmid = false;
let customSearchEnabledSecondPlasmid = false;


/**
 * getTm
 */
// M, primer concentration for melting temperatures
let primerConc = (getUserPreference("primerConc") !== null) ? getUserPreference("primerConc") : defaultSetingsDict["primerConc"];
// Melting temperature calculator algorithm
let meltingTempAlgorithmChoice = (getUserPreference("meltingTempAlgorithmChoice") !== null) ? getUserPreference("meltingTempAlgorithmChoice") : defaultSetingsDict["meltingTempAlgorithmChoice"];

// M, salt concentration for melting temperatures
let saltConc = (getUserPreference("saltConc") !== null) ? getUserPreference("saltConc") : 0.5;
// Salt correction equation choice
let saltCorrectionEquation = (getUserPreference("saltCorrectionEquation") !== null) ? getUserPreference("saltCorrectionEquation") : defaultSetingsDict["saltCorrectionEquation"];

// M, DMSO concentration for melting temperatures
let dmsoConc = (getUserPreference("dmsoConc") !== null) ? getUserPreference("dmsoConc") : defaultSetingsDict["dmsoConc"];


let isTmCalcWindowVisible = false;


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
let gridWidth = (getUserPreference("gridWidth") !== null) ? getUserPreference("gridWidth") : defaultSetingsDict["gridWidth"]; // Amount of cells per row
// Store content of imported file
let originalFileExtension1 = null;
let originalFileExtension2 = null;
let importedFileHeader1 = null;
let importedFileHeader2 = null;
let importedFileContent1 = null;
let importedFileContent2 = null;
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
let secondPlasmidImported = false;


/**
 * insertionPopUpWindow 
 */
// User inputs int he insertion pop up window
let preferredOrganism = (getUserPreference("preferredOrganism")  !== null) ? getUserPreference("preferredOrganism") : "Escherichia coli";
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
let selectionCursorPosition = null;
let hoveringOverSelectionCursor = null;


/**
 * insertionPopUpWindow 
 */
const sidebarHitbox = 5;
const containerHitbox = 5; // px
let hoveringOverSidebarEdge = false;
let hoveringOverContainerEdge = false;

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
    X: ['TAA', 'TAG', 'TGA']
};

// Codons ordered by their contributio to the meltin temperature, with 1 being the lowest contribution and 0 the highest
const lowTMTable = {
    A: {0.2768181568837317: 'GCT', 0.18955310307461037: 'GCC', 0.21011512717469671: 'GCA', 0.0: 'GCG'},
    R: {0.17924766735539022: 'CGT', 0.0: 'CGC', 0.20903582673201693: 'CGA', 0.15151548259786807: 'CGG', 0.47638600432001343: 'AGA', 0.4229733241454229: 'AGG'},
    N: {0.8759568811412506: 'AAT', 0.49632250689234125: 'AAC'},
    D: {0.6088505792486156: 'GAT', 0.4361598493841824: 'GAC'},
    C: {0.4120403171723359: 'TGT', 0.21707856015907723: 'TGC'},
    E: {0.5369155913233679: 'GAA', 0.47638600432001343: 'GAG'},
    Q: {0.49632250689234125: 'CAA', 0.4361598493841824: 'CAG'},
    G: {0.38992731450926876: 'GGT', 0.18955310307461037: 'GGC', 0.4229733241454229: 'GGA', 0.36638547667024357: 'GGG'},
    H: {0.5669060645597621: 'CAT', 0.39641845658493935: 'CAC'},
    I: {0.8759568811412506: 'ATT', 0.6446668707848606: 'ATC', 1.0: 'ATA'},
    L: {0.9110099971695126: 'TTA', 0.5045171428552604: 'TTG', 0.5708652199797833: 'CTT', 0.5434836667632903: 'CTC', 0.6798246202632705: 'CTA', 0.47662579839901587: 'CTG'},
    K: {0.7910074174037259: 'AAA', 0.5369155913233679: 'AAG'},
    M: {0.5755476383859438: 'ATG'},
    F: {0.7910074174037259: 'TTT', 0.5708652199797833: 'TTC'},
    P: {0.45617568393297536: 'CCT', 0.36638547667024357: 'CCC', 0.3819263558839726: 'CCA', 0.15151548259786807: 'CCG'},
    S: {0.5434836667632903: 'TCT', 0.45617568393297536: 'TCC', 0.46841312432390625: 'TCA', 0.23641987097033945: 'TCG', 0.44413486343587083: 'AGT', 0.2479474002578762: 'AGC'},
    T: {0.46841312432390625: 'ACT', 0.3819263558839726: 'ACC', 0.39641845658493935: 'ACA', 0.17263684581327954: 'ACG'},
    W: {0.38992731450926876: 'TGG'},
    Y: {1.0: 'TAT', 0.6021890456922131: 'TAC'},
    V: {0.5045171428552604: 'GTT', 0.47662579839901587: 'GTC', 0.6108651598192687: 'GTA', 0.4120403171723359: 'GTG'},
    X: {0.9110099971695126: 'TAA', 0.6438855550856217: 'TAG', 0.44413486343587083: 'TGA'}
};


/**
 * Codon frequency tables
 * from: https://www.genscript.com/tools/codon-frequency-table
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
    },
    "Arabidopsis thaliana": {
        A: {0.44: "GCT", 0.27: "GCA", 0.16: "GCC", 0.14: "GCG", },
        C: {0.59: "TGT", 0.41: "TGC", },
        D: {0.68: "GAT", 0.32: "GAC", },
        E: {0.52: "GAA", 0.49: "GAG", },
        F: {0.51: "TTT", 0.49: "TTC", },
        G: {0.37: "GGA", 0.34: "GGT", 0.15: "GGG", 0.14: "GGC", },
        H: {0.61: "CAT", 0.39: "CAC", },
        I: {0.41: "ATT", 0.35: "ATC", 0.24: "ATA", },
        K: {0.52: "AAG", 0.48: "AAA", },
        L: {0.26: "CTT", 0.22: "TTG", 0.17: "CTC", 0.13: "TTA", 0.11: "CTA", 0.11: "CTG", },
        M: {1.00: "ATG", },
        N: {0.52: "AAT", 0.48: "AAC", },
        P: {0.38: "CCT", 0.33: "CCA", 0.17: "CCG", 0.11: "CCC", },
        Q: {0.56: "CAA", 0.44: "CAG", },
        R: {0.35: "AGA", 0.20: "AGG", 0.17: "CGT", 0.12: "CGA", 0.09: "CGG", 0.07: "CGC", },
        S: {0.28: "TCT", 0.20: "TCA", 0.16: "AGT", 0.13: "TCC", 0.13: "AGC", 0.10: "TCG", },
        T: {0.34: "ACT", 0.30: "ACA", 0.20: "ACC", 0.15: "ACG", },
        V: {0.41: "GTT", 0.26: "GTG", 0.19: "GTC", 0.15: "GTA", },
        W: {1.00: "TGG", },
        X: {0.44: "TGA", 0.36: "TAA", 0.20: "TAG", },
        Y: {0.52: "TAT", 0.48: "TAC", },
    },
    "C. elegans": {
        A: {0.36: "GCT", 0.31: "GCA", 0.20: "GCC", 0.13: "GCG", },
        C: {0.55: "TGT", 0.45: "TGC", },
        D: {0.68: "GAT", 0.33: "GAC", },
        E: {0.62: "GAA", 0.38: "GAG", },
        F: {0.50: "TTT", 0.50: "TTC", },
        G: {0.59: "GGA", 0.20: "GGT", 0.12: "GGC", 0.08: "GGG", },
        H: {0.61: "CAT", 0.39: "CAC", },
        I: {0.53: "ATT", 0.31: "ATC", 0.16: "ATA", },
        K: {0.59: "AAA", 0.41: "AAG", },
        L: {0.24: "CTT", 0.23: "TTG", 0.17: "CTC", 0.14: "CTG", 0.12: "TTA", 0.09: "CTA", },
        M: {1.00: "ATG", },
        N: {0.62: "AAT", 0.38: "AAC", },
        P: {0.53: "CCA", 0.20: "CCG", 0.18: "CCT", 0.09: "CCC", },
        Q: {0.66: "CAA", 0.34: "CAG", },
        R: {0.29: "AGA", 0.23: "CGA", 0.21: "CGT", 0.10: "CGC", 0.09: "CGG", 0.08: "AGG", },
        S: {0.25: "TCA", 0.21: "TCT", 0.15: "TCG", 0.15: "AGT", 0.13: "TCC", 0.10: "AGC", },
        T: {0.34: "ACA", 0.33: "ACT", 0.18: "ACC", 0.15: "ACG", },
        V: {0.39: "GTT", 0.23: "GTG", 0.22: "GTC", 0.16: "GTA", },
        W: {1.00: "TGG", },
        X: {0.44: "TAA", 0.39: "TGA", 0.17: "TAG", },
        Y: {0.56: "TAT", 0.44: "TAC", },
    },
    "Cricetulus griseus (CHO)": {
        A: {0.37: "GCC", 0.32: "GCT", 0.23: "GCA", 0.07: "GCG", },
        C: {0.53: "TGC", 0.47: "TGT", },
        D: {0.53: "GAC", 0.47: "GAT", },
        E: {0.59: "GAG", 0.41: "GAA", },
        F: {0.53: "TTC", 0.47: "TTT", },
        G: {0.34: "GGC", 0.25: "GGA", 0.21: "GGG", 0.20: "GGT", },
        H: {0.56: "CAC", 0.44: "CAT", },
        I: {0.51: "ATC", 0.35: "ATT", 0.14: "ATA", },
        K: {0.61: "AAG", 0.39: "AAA", },
        L: {0.39: "CTG", 0.19: "CTC", 0.14: "TTG", 0.13: "CTT", 0.08: "CTA", 0.07: "TTA", },
        M: {1.00: "ATG", },
        N: {0.55: "AAC", 0.45: "AAT", },
        P: {0.32: "CCC", 0.31: "CCT", 0.29: "CCA", 0.08: "CCG", },
        Q: {0.76: "CAG", 0.24: "CAA", },
        R: {0.19: "CGG", 0.19: "AGA", 0.19: "AGG", 0.18: "CGC", 0.14: "CGA", 0.11: "CGT", },
        S: {0.22: "TCT", 0.22: "TCC", 0.22: "AGC", 0.15: "AGT", 0.14: "TCA", 0.05: "TCG", },
        T: {0.37: "ACC", 0.29: "ACA", 0.26: "ACT", 0.08: "ACG", },
        V: {0.46: "GTG", 0.24: "GTC", 0.18: "GTT", 0.12: "GTA", },
        W: {1.00: "TGG", },
        X: {0.53: "TGA", 0.26: "TAA", 0.22: "TAG", },
        Y: {0.56: "TAC", 0.44: "TAT", },
    },
    "Drosophila melanogaster": {
        A: {0.45: "GCC", 0.19: "GCT", 0.19: "GCG", 0.17: "GCA", },
        C: {0.71: "TGC", 0.29: "TGT", },
        D: {0.53: "GAT", 0.47: "GAC", },
        E: {0.67: "GAG", 0.33: "GAA", },
        F: {0.63: "TTC", 0.37: "TTT", },
        G: {0.43: "GGC", 0.29: "GGA", 0.21: "GGT", 0.07: "GGG", },
        H: {0.60: "CAC", 0.40: "CAT", },
        I: {0.47: "ATC", 0.34: "ATT", 0.19: "ATA", },
        K: {0.71: "AAG", 0.29: "AAA", },
        L: {0.43: "CTG", 0.18: "TTG", 0.15: "CTC", 0.10: "CTT", 0.09: "CTA", 0.05: "TTA", },
        M: {1.00: "ATG", },
        N: {0.56: "AAC", 0.44: "AAT", },
        P: {0.33: "CCC", 0.29: "CCG", 0.25: "CCA", 0.13: "CCT", },
        Q: {0.70: "CAG", 0.30: "CAA", },
        R: {0.33: "CGC", 0.16: "CGT", 0.15: "CGA", 0.15: "CGG", 0.11: "AGG", 0.09: "AGA", },
        S: {0.25: "AGC", 0.24: "TCC", 0.20: "TCG", 0.14: "AGT", 0.09: "TCA", 0.08: "TCT", },
        T: {0.38: "ACC", 0.26: "ACG", 0.19: "ACA", 0.17: "ACT", },
        V: {0.47: "GTG", 0.24: "GTC", 0.18: "GTT", 0.11: "GTA", },
        W: {1.00: "TGG", },
        X: {0.42: "TAA", 0.32: "TAG", 0.26: "TGA", },
        Y: {0.63: "TAC", 0.37: "TAT", },
    },
    "Insect": {
        A: {0.36: "GCT", 0.30: "GCC", 0.18: "GCG", 0.16: "GCA", },
        C: {0.65: "TGC", 0.35: "TGT", },
        D: {0.63: "GAC", 0.37: "GAT", },
        E: {0.59: "GAG", 0.41: "GAA", },
        F: {0.75: "TTC", 0.25: "TTT", },
        G: {0.36: "GGT", 0.32: "GGC", 0.27: "GGA", 0.05: "GGG", },
        H: {0.68: "CAC", 0.32: "CAT", },
        I: {0.59: "ATC", 0.29: "ATT", 0.12: "ATA", },
        K: {0.69: "AAG", 0.31: "AAA", },
        L: {0.31: "CTG", 0.22: "CTC", 0.20: "TTG", 0.13: "CTT", 0.08: "CTA", 0.07: "TTA", },
        M: {1.00: "ATG", },
        N: {0.71: "AAC", 0.29: "AAT", },
        P: {0.31: "CCC", 0.29: "CCT", 0.24: "CCA", 0.16: "CCG", },
        Q: {0.61: "CAG", 0.39: "CAA", },
        R: {0.25: "CGT", 0.24: "CGC", 0.21: "AGG", 0.16: "AGA", 0.08: "CGA", 0.05: "CGG", },
        S: {0.24: "TCC", 0.19: "TCT", 0.17: "AGC", 0.16: "TCA", 0.12: "TCG", 0.12: "AGT", },
        T: {0.36: "ACC", 0.27: "ACT", 0.21: "ACA", 0.16: "ACG", },
        V: {0.35: "GTG", 0.30: "GTC", 0.20: "GTT", 0.15: "GTA", },
        W: {1.00: "TGG", },
        X: {0.68: "TAA", 0.17: "TGA", 0.15: "TAG", },
        Y: {0.75: "TAC", 0.25: "TAT", },
    },
    "Mouse": {
        A: {0.38: "GCC", 0.29: "GCT", 0.23: "GCA", 0.10: "GCG", },
        C: {0.52: "TGC", 0.48: "TGT", },
        D: {0.56: "GAC", 0.44: "GAT", },
        E: {0.60: "GAG", 0.40: "GAA", },
        F: {0.57: "TTC", 0.43: "TTT", },
        G: {0.33: "GGC", 0.26: "GGA", 0.23: "GGG", 0.18: "GGT", },
        H: {0.60: "CAC", 0.40: "CAT", },
        I: {0.50: "ATC", 0.34: "ATT", 0.16: "ATA", },
        K: {0.61: "AAG", 0.39: "AAA", },
        L: {0.39: "CTG", 0.20: "CTC", 0.13: "TTG", 0.13: "CTT", 0.08: "CTA", 0.06: "TTA", },
        M: {1.00: "ATG", },
        N: {0.57: "AAC", 0.43: "AAT", },
        P: {0.31: "CCC", 0.30: "CCT", 0.28: "CCA", 0.10: "CCG", },
        Q: {0.75: "CAG", 0.25: "CAA", },
        R: {0.22: "AGG", 0.21: "AGA", 0.19: "CGG", 0.18: "CGC", 0.12: "CGA", 0.09: "CGT", },
        S: {0.24: "AGC", 0.22: "TCC", 0.19: "TCT", 0.15: "AGT", 0.14: "TCA", 0.05: "TCG", },
        T: {0.35: "ACC", 0.29: "ACA", 0.25: "ACT", 0.11: "ACG", },
        V: {0.46: "GTG", 0.25: "GTC", 0.17: "GTT", 0.12: "GTA", },
        W: {1.00: "TGG", },
        X: {0.52: "TGA", 0.26: "TAA", 0.22: "TAG", },
        Y: {0.58: "TAC", 0.43: "TAT", },
    },
    "Nicotiana tabacum (Tabacco)": {
        A: {0.44: "GCT", 0.31: "GCA", 0.17: "GCC", 0.08: "GCG", },
        C: {0.57: "TGT", 0.43: "TGC", },
        D: {0.68: "GAT", 0.32: "GAC", },
        E: {0.55: "GAA", 0.45: "GAG", },
        F: {0.58: "TTT", 0.42: "TTC", },
        G: {0.34: "GGT", 0.34: "GGA", 0.17: "GGC", 0.15: "GGG", },
        H: {0.61: "CAT", 0.39: "CAC", },
        I: {0.50: "ATT", 0.25: "ATC", 0.25: "ATA", },
        K: {0.51: "AAG", 0.49: "AAA", },
        L: {0.26: "CTT", 0.24: "TTG", 0.14: "TTA", 0.14: "CTC", 0.12: "CTG", 0.10: "CTA", },
        M: {1.00: "ATG", },
        N: {0.60: "AAT", 0.40: "AAC", },
        P: {0.40: "CCA", 0.37: "CCT", 0.13: "CCC", 0.10: "CCG", },
        Q: {0.58: "CAA", 0.42: "CAG", },
        R: {0.32: "AGA", 0.26: "AGG", 0.15: "CGT", 0.11: "CGA", 0.08: "CGC", 0.08: "CGG", },
        S: {0.26: "TCT", 0.23: "TCA", 0.17: "AGT", 0.14: "TCC", 0.13: "AGC", 0.07: "TCG", },
        T: {0.39: "ACT", 0.33: "ACA", 0.19: "ACC", 0.09: "ACG", },
        V: {0.41: "GTT", 0.25: "GTG", 0.17: "GTC", 0.17: "GTA", },
        W: {1.00: "TGG", },
        X: {0.41: "TAA", 0.41: "TGA", 0.19: "TAG", },
        Y: {0.57: "TAT", 0.43: "TAC", },
    },
    "Pichia pastoris": {
        A: {0.45: "GCT", 0.25: "GCC", 0.24: "GCA", 0.06: "GCG", },
        C: {0.65: "TGT", 0.35: "TGC", },
        D: {0.59: "GAT", 0.41: "GAC", },
        E: {0.58: "GAA", 0.42: "GAG", },
        F: {0.56: "TTT", 0.44: "TTC", },
        G: {0.43: "GGT", 0.32: "GGA", 0.14: "GGC", 0.10: "GGG", },
        H: {0.54: "CAT", 0.46: "CAC", },
        I: {0.51: "ATT", 0.31: "ATC", 0.18: "ATA", },
        K: {0.53: "AAG", 0.47: "AAA", },
        L: {0.33: "TTG", 0.17: "CTT", 0.16: "CTG", 0.15: "TTA", 0.12: "CTA", 0.08: "CTC", },
        M: {1.00: "ATG", },
        N: {0.52: "AAC", 0.48: "AAT", },
        P: {0.40: "CCA", 0.35: "CCT", 0.16: "CCC", 0.10: "CCG", },
        Q: {0.62: "CAA", 0.38: "CAG", },
        R: {0.47: "AGA", 0.16: "CGT", 0.16: "AGG", 0.11: "CGA", 0.05: "CGC", 0.05: "CGG", },
        S: {0.29: "TCT", 0.20: "TCC", 0.19: "TCA", 0.15: "AGT", 0.09: "TCG", 0.09: "AGC", },
        T: {0.40: "ACT", 0.25: "ACA", 0.24: "ACC", 0.11: "ACG", },
        V: {0.42: "GTT", 0.23: "GTC", 0.20: "GTG", 0.16: "GTA", },
        W: {1.00: "TGG", },
        X: {0.53: "TAA", 0.29: "TAG", 0.18: "TGA", },
        Y: {0.55: "TAC", 0.45: "TAT", },
    },
    "Pig": {
        A: {0.45: "GCC", 0.24: "GCT", 0.20: "GCA", 0.11: "GCG", },
        C: {0.61: "TGC", 0.39: "TGT", },
        D: {0.62: "GAC", 0.38: "GAT", },
        E: {0.62: "GAG", 0.38: "GAA", },
        F: {0.62: "TTC", 0.38: "TTT", },
        G: {0.36: "GGC", 0.26: "GGA", 0.24: "GGG", 0.14: "GGT", },
        H: {0.66: "CAC", 0.34: "CAT", },
        I: {0.53: "ATC", 0.30: "ATT", 0.18: "ATA", },
        K: {0.60: "AAG", 0.40: "AAA", },
        L: {0.40: "CTG", 0.21: "CTC", 0.13: "CTA", 0.10: "TTG", 0.10: "CTT", 0.06: "TTA", },
        M: {1.00: "ATG", },
        N: {0.63: "AAC", 0.37: "AAT", },
        P: {0.35: "CCC", 0.27: "CCA", 0.24: "CCT", 0.13: "CCG", },
        Q: {0.75: "CAG", 0.25: "CAA", },
        R: {0.22: "CGC", 0.20: "CGG", 0.20: "AGG", 0.19: "AGA", 0.12: "CGA", 0.07: "CGT", },
        S: {0.26: "TCC", 0.26: "AGC", 0.15: "TCT", 0.15: "TCA", 0.12: "AGT", 0.06: "TCG", },
        T: {0.41: "ACC", 0.26: "ACA", 0.19: "ACT", 0.13: "ACG", },
        V: {0.48: "GTG", 0.27: "GTC", 0.14: "GTT", 0.12: "GTA", },
        W: {1.00: "TGG", },
        X: {0.79: "TGA", 0.13: "TAA", 0.08: "TAG", },
        Y: {0.65: "TAC", 0.35: "TAT", },
    },
    "Rat": {
        A: {0.40: "GCC", 0.28: "GCT", 0.22: "GCA", 0.10: "GCG", },
        C: {0.56: "TGC", 0.45: "TGT", },
        D: {0.58: "GAC", 0.42: "GAT", },
        E: {0.61: "GAG", 0.39: "GAA", },
        F: {0.59: "TTC", 0.41: "TTT", },
        G: {0.34: "GGC", 0.25: "GGA", 0.24: "GGG", 0.17: "GGT", },
        H: {0.62: "CAC", 0.38: "CAT", },
        I: {0.54: "ATC", 0.32: "ATT", 0.14: "ATA", },
        K: {0.63: "AAG", 0.37: "AAA", },
        L: {0.42: "CTG", 0.21: "CTC", 0.12: "TTG", 0.12: "CTT", 0.07: "CTA", 0.06: "TTA", },
        M: {1.00: "ATG", },
        N: {0.60: "AAC", 0.40: "AAT", },
        P: {0.32: "CCC", 0.30: "CCT", 0.27: "CCA", 0.11: "CCG", },
        Q: {0.75: "CAG", 0.25: "CAA", },
        R: {0.21: "AGG", 0.20: "CGG", 0.20: "AGA", 0.18: "CGC", 0.12: "CGA", 0.09: "CGT", },
        S: {0.25: "AGC", 0.23: "TCC", 0.18: "TCT", 0.15: "AGT", 0.14: "TCA", 0.06: "TCG", },
        T: {0.37: "ACC", 0.28: "ACA", 0.23: "ACT", 0.12: "ACG", },
        V: {0.47: "GTG", 0.26: "GTC", 0.16: "GTT", 0.11: "GTA", },
        W: {1.00: "TGG", },
        X: {0.50: "TGA", 0.27: "TAA", 0.23: "TAG", },
        Y: {0.60: "TAC", 0.40: "TAT", },
    },
    "Saccharomyces cerevisiae (gbpln)": {
        A: {0.38: "GCT", 0.29: "GCA", 0.22: "GCC", 0.11: "GCG", },
        C: {0.63: "TGT", 0.37: "TGC", },
        D: {0.65: "GAT", 0.35: "GAC", },
        E: {0.70: "GAA", 0.30: "GAG", },
        F: {0.59: "TTT", 0.41: "TTC", },
        G: {0.47: "GGT", 0.22: "GGA", 0.19: "GGC", 0.12: "GGG", },
        H: {0.64: "CAT", 0.36: "CAC", },
        I: {0.46: "ATT", 0.27: "ATA", 0.26: "ATC", },
        K: {0.58: "AAA", 0.42: "AAG", },
        L: {0.29: "TTG", 0.28: "TTA", 0.14: "CTA", 0.13: "CTT", 0.11: "CTG", 0.06: "CTC", },
        M: {1.00: "ATG", },
        N: {0.59: "AAT", 0.41: "AAC", },
        P: {0.42: "CCA", 0.31: "CCT", 0.15: "CCC", 0.12: "CCG", },
        Q: {0.69: "CAA", 0.31: "CAG", },
        R: {0.48: "AGA", 0.21: "AGG", 0.14: "CGT", 0.07: "CGA", 0.06: "CGC", 0.04: "CGG", },
        S: {0.26: "TCT", 0.21: "TCA", 0.16: "TCC", 0.16: "AGT", 0.11: "AGC", 0.10: "TCG", },
        T: {0.35: "ACT", 0.30: "ACA", 0.22: "ACC", 0.14: "ACG", },
        V: {0.39: "GTT", 0.21: "GTC", 0.21: "GTA", 0.19: "GTG", },
        W: {1.00: "TGG", },
        X: {0.48: "TAA", 0.30: "TGA", 0.22: "TAG", },
        Y: {0.56: "TAT", 0.44: "TAC", },
    },
    "Streptomyces": {
        A: {0.57: "GCC", 0.36: "GCG", 0.04: "GCA", 0.02: "GCT", },
        C: {0.91: "TGC", 0.09: "TGT", },
        D: {0.95: "GAC", 0.05: "GAT", },
        E: {0.85: "GAG", 0.15: "GAA", },
        F: {0.98: "TTC", 0.02: "TTT", },
        G: {0.64: "GGC", 0.19: "GGG", 0.10: "GGT", 0.08: "GGA", },
        H: {0.93: "CAC", 0.07: "CAT", },
        I: {0.96: "ATC", 0.02: "ATT", 0.02: "ATA", },
        K: {0.95: "AAG", 0.05: "AAA", },
        L: {0.60: "CTG", 0.36: "CTC", 0.02: "TTG", 0.02: "CTT", 0.00: "TTA", 0.00: "CTA", },
        M: {1.00: "ATG", },
        N: {0.96: "AAC", 0.04: "AAT", },
        P: {0.54: "CCG", 0.41: "CCC", 0.02: "CCT", 0.02: "CCA", },
        Q: {0.95: "CAG", 0.05: "CAA", },
        R: {0.47: "CGC", 0.38: "CGG", 0.07: "CGT", 0.04: "AGG", 0.03: "CGA", 0.01: "AGA", },
        S: {0.41: "TCC", 0.28: "TCG", 0.25: "AGC", 0.03: "AGT", 0.02: "TCA", 0.01: "TCT", },
        T: {0.65: "ACC", 0.31: "ACG", 0.03: "ACA", 0.02: "ACT", },
        V: {0.55: "GTC", 0.41: "GTG", 0.03: "GTA", 0.02: "GTT", },
        W: {1.00: "TGG", },
        X: {0.80: "TGA", 0.17: "TAG", 0.03: "TAA", },
        Y: {0.95: "TAC", 0.05: "TAT", },
    },
    "Yeast": {
        A: {0.38: "GCT", 0.29: "GCA", 0.22: "GCC", 0.11: "GCG", },
        C: {0.63: "TGT", 0.37: "TGC", },
        D: {0.65: "GAT", 0.35: "GAC", },
        E: {0.71: "GAA", 0.29: "GAG", },
        F: {0.59: "TTT", 0.41: "TTC", },
        G: {0.47: "GGT", 0.22: "GGA", 0.19: "GGC", 0.12: "GGG", },
        H: {0.64: "CAT", 0.36: "CAC", },
        I: {0.46: "ATT", 0.27: "ATA", 0.26: "ATC", },
        K: {0.58: "AAA", 0.42: "AAG", },
        L: {0.29: "TTG", 0.28: "TTA", 0.14: "CTA", 0.13: "CTT", 0.11: "CTG", 0.06: "CTC", },
        M: {1.00: "ATG", },
        N: {0.59: "AAT", 0.41: "AAC", },
        P: {0.41: "CCA", 0.31: "CCT", 0.15: "CCC", 0.12: "CCG", },
        Q: {0.69: "CAA", 0.31: "CAG", },
        R: {0.48: "AGA", 0.21: "AGG", 0.15: "CGT", 0.07: "CGA", 0.06: "CGC", 0.04: "CGG", },
        S: {0.26: "TCT", 0.21: "TCA", 0.16: "TCC", 0.16: "AGT", 0.11: "AGC", 0.10: "TCG", },
        T: {0.35: "ACT", 0.30: "ACA", 0.22: "ACC", 0.13: "ACG", },
        V: {0.39: "GTT", 0.21: "GTC", 0.21: "GTA", 0.19: "GTG", },
        W: {1.00: "TGG", },
        X: {0.48: "TAA", 0.29: "TGA", 0.24: "TAG", },
        Y: {0.56: "TAT", 0.44: "TAC", },
    },
    "Zea mays (Maize)": {
        A: {0.33: "GCC", 0.25: "GCT", 0.23: "GCG", 0.19: "GCA", },
        C: {0.66: "TGC", 0.34: "TGT", },
        D: {0.56: "GAC", 0.44: "GAT", },
        E: {0.64: "GAG", 0.36: "GAA", },
        F: {0.63: "TTC", 0.37: "TTT", },
        G: {0.39: "GGC", 0.21: "GGT", 0.21: "GGG", 0.20: "GGA", },
        H: {0.57: "CAC", 0.43: "CAT", },
        I: {0.47: "ATC", 0.33: "ATT", 0.20: "ATA", },
        K: {0.70: "AAG", 0.30: "AAA", },
        L: {0.25: "CTC", 0.25: "CTG", 0.18: "CTT", 0.15: "TTG", 0.08: "TTA", 0.08: "CTA", },
        M: {1.00: "ATG", },
        N: {0.60: "AAC", 0.40: "AAT", },
        P: {0.26: "CCA", 0.26: "CCG", 0.24: "CCT", 0.24: "CCC", },
        Q: {0.61: "CAG", 0.39: "CAA", },
        R: {0.25: "AGG", 0.23: "CGC", 0.16: "AGA", 0.15: "CGG", 0.12: "CGT", 0.09: "CGA", },
        S: {0.22: "TCC", 0.21: "AGC", 0.17: "TCT", 0.15: "TCA", 0.14: "TCG", 0.11: "AGT", },
        T: {0.33: "ACC", 0.24: "ACT", 0.22: "ACA", 0.21: "ACG", },
        V: {0.36: "GTG", 0.29: "GTC", 0.24: "GTT", 0.11: "GTA", },
        W: {1.00: "TGG", },
        X: {0.44: "TGA", 0.32: "TAG", 0.24: "TAA", },
        Y: {0.63: "TAC", 0.37: "TAT", },
    }
};