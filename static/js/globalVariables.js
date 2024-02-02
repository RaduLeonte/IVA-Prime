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
    "homoRegionTm": 50,
    "primerDistribution": true,
    "tempRegionTm": 60,
    "upperBoundShortInsertions": 49.5,
    "colorTheme": "lightTheme",
    "gridWidth": 60,
    "preferredOrganism" : "Escherichia coli"
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

let subcloningOriginPlasmidIndex = null;
let subcloningOriginSpan = null;

const primerColorRed = "rgb(200, 52, 120)"
const primerColorGreen = "rgb(68, 143, 71)"
const primerColorOrange = "rgb(217, 130, 58)"
const primerColorPurple = "rgb(107, 96, 157)"
const primerColorCyan = "rgb(140, 202, 242)"


/**
 * customSearch
 */
let searchOn = true;


/**
 * getTm
 */
// M, primer concentration for melting temperatures
let primerConc = (getUserPreference("primerConc") !== null) ? getUserPreference("primerConc") : defaultSetingsDict["primerConc"];
// Melting temperature calculator algorithm
let meltingTempAlgorithmChoice = (getUserPreference("meltingTempAlgorithmChoice") !== null) ? getUserPreference("meltingTempAlgorithmChoice") : defaultSetingsDict["meltingTempAlgorithmChoice"];

// M, salt concentration for melting temperatures
let saltConc = (getUserPreference("saltConc") !== null) ? getUserPreference("saltConc") : defaultSetingsDict["saltConc"];
// Salt correction equation choice
let saltCorrectionEquation = (getUserPreference("saltCorrectionEquation") !== null) ? getUserPreference("saltCorrectionEquation") : defaultSetingsDict["saltCorrectionEquation"];

// M, DMSO concentration for melting temperatures
let dmsoConc = (getUserPreference("dmsoConc") !== null) ? getUserPreference("dmsoConc") : defaultSetingsDict["dmsoConc"];

let isTmCalcWindowVisible = false;


/**
 * importPlasmid
 */
// Grid structure, each entry is a row in the table
let plasmidDict = {};
let currentlyOpenedPlasmid = null;
let defaultGridStructure = ["Forward Strand",
                                "Complementary Strand",
                                "Amino Acids",
                                "Annotations",
                                "Spacer"];
let gridWidth = (getUserPreference("gridWidth") !== null) ? getUserPreference("gridWidth") : defaultSetingsDict["gridWidth"]; // Amount of cells per row
const gridWidthMin = 10;
// Global variable that stores the most recent color used
let recentColor = '';


/**
 * insertionPopUpWindow 
 */
// User inputs int he insertion pop up window
let preferredOrganism = (getUserPreference("preferredOrganism")  !== null) ? getUserPreference("preferredOrganism") : defaultSetingsDict["preferredOrganism"];
let dnaSequenceInput = '';
let aminoAcidSequenceInput = '';


/**
 * tableSelection 
 */
let basePosition = -1;
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
        F: {0.58: 'TTT', 0.42: 'TTC'},
        L: {0.47: 'CTG', 0.14: 'TTA', 0.13: 'TTG', 0.12: 'CTT', 0.1: 'CTC', 0.04: 'CTA'},
        Y: {0.59: 'TAT', 0.41: 'TAC'},
        X: {0.61: 'TAA', 0.3: 'TGA', 0.09: 'TAG'},
        H: {0.57: 'CAT', 0.43: 'CAC'},
        Q: {0.66: 'CAG', 0.34: 'CAA'},
        I: {0.49: 'ATT', 0.39: 'ATC', 0.11: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.51: 'AAC', 0.49: 'AAT'},
        K: {0.74: 'AAA', 0.26: 'AAG'},
        V: {0.35: 'GTG', 0.28: 'GTT', 0.2: 'GTC', 0.17: 'GTA'},
        D: {0.63: 'GAT', 0.37: 'GAC'},
        E: {0.68: 'GAA', 0.32: 'GAG'},
        S: {0.25: 'AGC', 0.17: 'TCT', 0.16: 'AGT', 0.15: 'TCC', 0.14: 'TCG'},
        C: {0.54: 'TGC', 0.46: 'TGT'},
        W: {1.0: 'TGG'},
        P: {0.49: 'CCG', 0.2: 'CCA', 0.18: 'CCT', 0.13: 'CCC'},
        R: {0.36: 'CGC', 0.11: 'CGG', 0.07: 'AGA', 0.04: 'AGG'},
        T: {0.4: 'ACC', 0.25: 'ACG', 0.19: 'ACT', 0.17: 'ACA'},
        A: {0.33: 'GCG', 0.26: 'GCC', 0.23: 'GCA', 0.18: 'GCT'},
        G: {0.37: 'GGC', 0.35: 'GGT', 0.15: 'GGG', 0.13: 'GGA'},
    },
    "Human": {
        F: {0.55: 'TTC', 0.45: 'TTT'},
        L: {0.41: 'CTG', 0.2: 'CTC', 0.13: 'CTT', 0.07: 'CTA'},
        Y: {0.57: 'TAC', 0.43: 'TAT'},
        X: {0.52: 'TGA', 0.28: 'TAA', 0.2: 'TAG'},
        H: {0.59: 'CAC', 0.41: 'CAT'},
        Q: {0.75: 'CAG', 0.25: 'CAA'},
        I: {0.48: 'ATC', 0.36: 'ATT', 0.16: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.54: 'AAC', 0.46: 'AAT'},
        K: {0.58: 'AAG', 0.42: 'AAA'},
        V: {0.47: 'GTG', 0.24: 'GTC', 0.18: 'GTT', 0.11: 'GTA'},
        D: {0.54: 'GAC', 0.46: 'GAT'},
        E: {0.58: 'GAG', 0.42: 'GAA'},
        S: {0.24: 'AGC', 0.22: 'TCC', 0.18: 'TCT', 0.15: 'AGT', 0.06: 'TCG'},
        C: {0.55: 'TGC', 0.45: 'TGT'},
        W: {1.0: 'TGG'},
        P: {0.33: 'CCC', 0.28: 'CCT', 0.27: 'CCA', 0.11: 'CCG'},
        R: {0.21: 'CGG', 0.2: 'AGG', 0.19: 'CGC', 0.11: 'CGA', 0.08: 'CGT'},
        T: {0.36: 'ACC', 0.28: 'ACA', 0.24: 'ACT', 0.12: 'ACG'},
        A: {0.4: 'GCC', 0.26: 'GCT', 0.23: 'GCA', 0.11: 'GCG'},
        G: {0.34: 'GGC', 0.25: 'GGG', 0.16: 'GGT'},
    },
    "Rat": {
        F: {0.59: 'TTC', 0.41: 'TTT'},
        L: {0.42: 'CTG', 0.21: 'CTC', 0.12: 'CTT', 0.07: 'CTA', 0.06: 'TTA'},
        Y: {0.6: 'TAC', 0.4: 'TAT'},
        X: {0.5: 'TGA', 0.27: 'TAA', 0.23: 'TAG'},
        H: {0.62: 'CAC', 0.38: 'CAT'},
        Q: {0.75: 'CAG', 0.25: 'CAA'},
        I: {0.54: 'ATC', 0.32: 'ATT', 0.14: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.6: 'AAC', 0.4: 'AAT'},
        K: {0.63: 'AAG', 0.37: 'AAA'},
        V: {0.47: 'GTG', 0.26: 'GTC', 0.16: 'GTT', 0.11: 'GTA'},
        D: {0.58: 'GAC', 0.42: 'GAT'},
        E: {0.61: 'GAG', 0.39: 'GAA'},
        S: {0.25: 'AGC', 0.23: 'TCC', 0.18: 'TCT', 0.15: 'AGT', 0.14: 'TCA', 0.06: 'TCG'},
        C: {0.56: 'TGC', 0.45: 'TGT'},
        W: {1.0: 'TGG'},
        P: {0.32: 'CCC', 0.3: 'CCT', 0.27: 'CCA', 0.11: 'CCG'},
        R: {0.21: 'AGG', 0.2: 'AGA', 0.18: 'CGC', 0.12: 'CGA', 0.09: 'CGT'},
        T: {0.37: 'ACC', 0.28: 'ACA', 0.23: 'ACT', 0.12: 'ACG'},
        A: {0.4: 'GCC', 0.28: 'GCT', 0.22: 'GCA', 0.1: 'GCG'},
        G: {0.34: 'GGC', 0.25: 'GGA', 0.24: 'GGG', 0.17: 'GGT'},
    },
    "Pig": {
        F: {0.62: 'TTC', 0.38: 'TTT'},
        L: {0.4: 'CTG', 0.21: 'CTC', 0.13: 'CTA', 0.1: 'CTT', 0.06: 'TTA'},
        Y: {0.65: 'TAC', 0.35: 'TAT'},
        X: {0.79: 'TGA', 0.13: 'TAA', 0.08: 'TAG'},
        H: {0.66: 'CAC', 0.34: 'CAT'},
        Q: {0.75: 'CAG', 0.25: 'CAA'},
        I: {0.53: 'ATC', 0.3: 'ATT', 0.18: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.63: 'AAC', 0.37: 'AAT'},
        K: {0.6: 'AAG', 0.4: 'AAA'},
        V: {0.48: 'GTG', 0.27: 'GTC', 0.14: 'GTT', 0.12: 'GTA'},
        D: {0.62: 'GAC', 0.38: 'GAT'},
        E: {0.62: 'GAG', 0.38: 'GAA'},
        S: {0.26: 'AGC', 0.15: 'TCA', 0.12: 'AGT', 0.06: 'TCG'},
        C: {0.61: 'TGC', 0.39: 'TGT'},
        W: {1.0: 'TGG'},
        P: {0.35: 'CCC', 0.27: 'CCA', 0.24: 'CCT', 0.13: 'CCG'},
        R: {0.22: 'CGC', 0.2: 'AGG', 0.19: 'AGA', 0.12: 'CGA', 0.07: 'CGT'},
        T: {0.41: 'ACC', 0.26: 'ACA', 0.19: 'ACT', 0.13: 'ACG'},
        A: {0.45: 'GCC', 0.24: 'GCT', 0.2: 'GCA', 0.11: 'GCG'},
        G: {0.36: 'GGC', 0.26: 'GGA', 0.24: 'GGG', 0.14: 'GGT'},
    },
    "Yeast": {
        F: {0.59: 'TTT', 0.41: 'TTC'},
        L: {0.29: 'TTG', 0.28: 'TTA', 0.14: 'CTA', 0.13: 'CTT', 0.11: 'CTG', 0.06: 'CTC'},
        Y: {0.56: 'TAT', 0.44: 'TAC'},
        X: {0.48: 'TAA', 0.29: 'TGA', 0.24: 'TAG'},
        H: {0.64: 'CAT', 0.36: 'CAC'},
        Q: {0.69: 'CAA', 0.31: 'CAG'},
        I: {0.46: 'ATT', 0.27: 'ATA', 0.26: 'ATC'},
        M: {1.0: 'ATG'},
        N: {0.59: 'AAT', 0.41: 'AAC'},
        K: {0.58: 'AAA', 0.42: 'AAG'},
        V: {0.39: 'GTT', 0.21: 'GTA', 0.19: 'GTG'},
        D: {0.65: 'GAT', 0.35: 'GAC'},
        E: {0.71: 'GAA', 0.29: 'GAG'},
        S: {0.26: 'TCT', 0.21: 'TCA', 0.16: 'AGT', 0.11: 'AGC', 0.1: 'TCG'},
        C: {0.63: 'TGT', 0.37: 'TGC'},
        W: {1.0: 'TGG'},
        P: {0.41: 'CCA', 0.31: 'CCT', 0.15: 'CCC', 0.12: 'CCG'},
        R: {0.48: 'AGA', 0.21: 'AGG', 0.15: 'CGT', 0.07: 'CGA', 0.06: 'CGC', 0.04: 'CGG'},
        T: {0.35: 'ACT', 0.3: 'ACA', 0.22: 'ACC', 0.13: 'ACG'},
        A: {0.38: 'GCT', 0.29: 'GCA', 0.22: 'GCC', 0.11: 'GCG'},
        G: {0.47: 'GGT', 0.22: 'GGA', 0.19: 'GGC', 0.12: 'GGG'},
    },
    "Zea mays (Maize)": {
        F: {0.63: 'TTC', 0.37: 'TTT'},
        L: {0.25: 'CTG', 0.18: 'CTT', 0.15: 'TTG', 0.08: 'CTA'},
        Y: {0.63: 'TAC', 0.37: 'TAT'},
        X: {0.44: 'TGA', 0.32: 'TAG', 0.24: 'TAA'},
        H: {0.57: 'CAC', 0.43: 'CAT'},
        Q: {0.61: 'CAG', 0.39: 'CAA'},
        I: {0.47: 'ATC', 0.33: 'ATT', 0.2: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.6: 'AAC', 0.4: 'AAT'},
        K: {0.7: 'AAG', 0.3: 'AAA'},
        V: {0.36: 'GTG', 0.29: 'GTC', 0.24: 'GTT', 0.11: 'GTA'},
        D: {0.56: 'GAC', 0.44: 'GAT'},
        E: {0.64: 'GAG', 0.36: 'GAA'},
        S: {0.22: 'TCC', 0.21: 'AGC', 0.17: 'TCT', 0.15: 'TCA', 0.14: 'TCG', 0.11: 'AGT'},
        C: {0.66: 'TGC', 0.34: 'TGT'},
        W: {1.0: 'TGG'},
        P: {0.26: 'CCG', 0.24: 'CCC'},
        R: {0.25: 'AGG', 0.23: 'CGC', 0.16: 'AGA', 0.15: 'CGG', 0.12: 'CGT', 0.09: 'CGA'},
        T: {0.33: 'ACC', 0.24: 'ACT', 0.22: 'ACA', 0.21: 'ACG'},
        A: {0.33: 'GCC', 0.25: 'GCT', 0.23: 'GCG', 0.19: 'GCA'},
        G: {0.39: 'GGC', 0.21: 'GGG', 0.2: 'GGA'},
    },
    "Nicotiana tabacum (Tabacco)": {
        F: {0.58: 'TTT', 0.42: 'TTC'},
        L: {0.26: 'CTT', 0.24: 'TTG', 0.14: 'CTC', 0.12: 'CTG', 0.1: 'CTA'},
        Y: {0.57: 'TAT', 0.43: 'TAC'},
        X: {0.41: 'TGA', 0.19: 'TAG'},
        H: {0.61: 'CAT', 0.39: 'CAC'},
        Q: {0.58: 'CAA', 0.42: 'CAG'},
        I: {0.5: 'ATT', 0.25: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.6: 'AAT', 0.4: 'AAC'},
        K: {0.51: 'AAG', 0.49: 'AAA'},
        V: {0.41: 'GTT', 0.25: 'GTG', 0.17: 'GTA'},
        D: {0.68: 'GAT', 0.32: 'GAC'},
        E: {0.55: 'GAA', 0.45: 'GAG'},
        S: {0.26: 'TCT', 0.23: 'TCA', 0.17: 'AGT', 0.14: 'TCC', 0.13: 'AGC', 0.07: 'TCG'},
        C: {0.57: 'TGT', 0.43: 'TGC'},
        W: {1.0: 'TGG'},
        P: {0.4: 'CCA', 0.37: 'CCT', 0.13: 'CCC', 0.1: 'CCG'},
        R: {0.32: 'AGA', 0.26: 'AGG', 0.15: 'CGT', 0.11: 'CGA', 0.08: 'CGG'},
        T: {0.39: 'ACT', 0.33: 'ACA', 0.19: 'ACC', 0.09: 'ACG'},
        A: {0.44: 'GCT', 0.31: 'GCA', 0.17: 'GCC', 0.08: 'GCG'},
        G: {0.34: 'GGA', 0.17: 'GGC', 0.15: 'GGG'},
    },
    "Streptomyces": {
        F: {0.98: 'TTC', 0.02: 'TTT'},
        L: {0.6: 'CTG', 0.36: 'CTC', 0.02: 'CTT', 0.0: 'CTA'},
        Y: {0.95: 'TAC', 0.05: 'TAT'},
        X: {0.8: 'TGA', 0.17: 'TAG', 0.03: 'TAA'},
        H: {0.93: 'CAC', 0.07: 'CAT'},
        Q: {0.95: 'CAG', 0.05: 'CAA'},
        I: {0.96: 'ATC', 0.02: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.96: 'AAC', 0.04: 'AAT'},
        K: {0.95: 'AAG', 0.05: 'AAA'},
        V: {0.55: 'GTC', 0.41: 'GTG', 0.03: 'GTA', 0.02: 'GTT'},
        D: {0.95: 'GAC', 0.05: 'GAT'},
        E: {0.85: 'GAG', 0.15: 'GAA'},
        S: {0.41: 'TCC', 0.28: 'TCG', 0.25: 'AGC', 0.03: 'AGT', 0.02: 'TCA', 0.01: 'TCT'},
        C: {0.91: 'TGC', 0.09: 'TGT'},
        W: {1.0: 'TGG'},
        P: {0.54: 'CCG', 0.41: 'CCC', 0.02: 'CCA'},
        R: {0.47: 'CGC', 0.38: 'CGG', 0.07: 'CGT', 0.04: 'AGG', 0.03: 'CGA', 0.01: 'AGA'},
        T: {0.65: 'ACC', 0.31: 'ACG', 0.03: 'ACA', 0.02: 'ACT'},
        A: {0.57: 'GCC', 0.36: 'GCG', 0.04: 'GCA', 0.02: 'GCT'},
        G: {0.64: 'GGC', 0.19: 'GGG', 0.1: 'GGT', 0.08: 'GGA'},
    },
    "Saccharomyces cerevisiae (gbpln)": {
        F: {0.59: 'TTT', 0.41: 'TTC'},
        L: {0.29: 'TTG', 0.28: 'TTA', 0.14: 'CTA', 0.13: 'CTT', 0.11: 'CTG', 0.06: 'CTC'},
        Y: {0.56: 'TAT', 0.44: 'TAC'},
        X: {0.48: 'TAA', 0.3: 'TGA', 0.22: 'TAG'},
        H: {0.64: 'CAT', 0.36: 'CAC'},
        Q: {0.69: 'CAA', 0.31: 'CAG'},
        I: {0.46: 'ATT', 0.27: 'ATA', 0.26: 'ATC'},
        M: {1.0: 'ATG'},
        N: {0.59: 'AAT', 0.41: 'AAC'},
        K: {0.58: 'AAA', 0.42: 'AAG'},
        V: {0.39: 'GTT', 0.21: 'GTA', 0.19: 'GTG'},
        D: {0.65: 'GAT', 0.35: 'GAC'},
        E: {0.7: 'GAA', 0.3: 'GAG'},
        S: {0.26: 'TCT', 0.21: 'TCA', 0.16: 'AGT', 0.11: 'AGC', 0.1: 'TCG'},
        C: {0.63: 'TGT', 0.37: 'TGC'},
        W: {1.0: 'TGG'},
        P: {0.42: 'CCA', 0.31: 'CCT', 0.15: 'CCC', 0.12: 'CCG'},
        R: {0.48: 'AGA', 0.21: 'AGG', 0.14: 'CGT', 0.07: 'CGA', 0.06: 'CGC', 0.04: 'CGG'},
        T: {0.35: 'ACT', 0.3: 'ACA', 0.22: 'ACC', 0.14: 'ACG'},
        A: {0.38: 'GCT', 0.29: 'GCA', 0.22: 'GCC', 0.11: 'GCG'},
        G: {0.47: 'GGT', 0.22: 'GGA', 0.19: 'GGC', 0.12: 'GGG'},
    },
    "Arabidopsis thaliana": {
        F: {0.51: 'TTT', 0.49: 'TTC'},
        L: {0.26: 'CTT', 0.22: 'TTG', 0.17: 'CTC', 0.13: 'TTA', 0.11: 'CTG'},
        Y: {0.52: 'TAT', 0.48: 'TAC'},
        X: {0.44: 'TGA', 0.36: 'TAA', 0.2: 'TAG'},
        H: {0.61: 'CAT', 0.39: 'CAC'},
        Q: {0.56: 'CAA', 0.44: 'CAG'},
        I: {0.41: 'ATT', 0.35: 'ATC', 0.24: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.52: 'AAT', 0.48: 'AAC'},
        K: {0.52: 'AAG', 0.48: 'AAA'},
        V: {0.41: 'GTT', 0.26: 'GTG', 0.19: 'GTC', 0.15: 'GTA'},
        D: {0.68: 'GAT', 0.32: 'GAC'},
        E: {0.52: 'GAA', 0.49: 'GAG'},
        S: {0.28: 'TCT', 0.2: 'TCA', 0.16: 'AGT', 0.13: 'AGC', 0.1: 'TCG'},
        C: {0.59: 'TGT', 0.41: 'TGC'},
        W: {1.0: 'TGG'},
        P: {0.38: 'CCT', 0.33: 'CCA', 0.17: 'CCG', 0.11: 'CCC'},
        R: {0.35: 'AGA', 0.2: 'AGG', 0.17: 'CGT', 0.12: 'CGA', 0.09: 'CGG', 0.07: 'CGC'},
        T: {0.34: 'ACT', 0.3: 'ACA', 0.2: 'ACC', 0.15: 'ACG'},
        A: {0.44: 'GCT', 0.27: 'GCA', 0.16: 'GCC', 0.14: 'GCG'},
        G: {0.37: 'GGA', 0.34: 'GGT', 0.15: 'GGG', 0.14: 'GGC'},
    },
    "Cricetulus griseus (CHO)": {
        F: {0.53: 'TTC', 0.47: 'TTT'},
        L: {0.39: 'CTG', 0.19: 'CTC', 0.14: 'TTG', 0.13: 'CTT', 0.08: 'CTA', 0.07: 'TTA'},
        Y: {0.56: 'TAC', 0.44: 'TAT'},
        X: {0.53: 'TGA', 0.26: 'TAA', 0.22: 'TAG'},
        H: {0.56: 'CAC', 0.44: 'CAT'},
        Q: {0.76: 'CAG', 0.24: 'CAA'},
        I: {0.51: 'ATC', 0.35: 'ATT', 0.14: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.55: 'AAC', 0.45: 'AAT'},
        K: {0.61: 'AAG', 0.39: 'AAA'},
        V: {0.46: 'GTG', 0.24: 'GTC', 0.18: 'GTT', 0.12: 'GTA'},
        D: {0.53: 'GAC', 0.47: 'GAT'},
        E: {0.59: 'GAG', 0.41: 'GAA'},
        S: {0.22: 'AGC', 0.15: 'AGT', 0.14: 'TCA', 0.05: 'TCG'},
        C: {0.53: 'TGC', 0.47: 'TGT'},
        W: {1.0: 'TGG'},
        P: {0.32: 'CCC', 0.31: 'CCT', 0.29: 'CCA', 0.08: 'CCG'},
        R: {0.19: 'AGG', 0.18: 'CGC', 0.14: 'CGA', 0.11: 'CGT'},
        T: {0.37: 'ACC', 0.29: 'ACA', 0.26: 'ACT', 0.08: 'ACG'},
        A: {0.37: 'GCC', 0.32: 'GCT', 0.23: 'GCA', 0.07: 'GCG'},
        G: {0.34: 'GGC', 0.25: 'GGA', 0.21: 'GGG', 0.2: 'GGT'},
    },
    "Mouse": {
        F: {0.57: 'TTC', 0.43: 'TTT'},
        L: {0.39: 'CTG', 0.2: 'CTC', 0.13: 'CTT', 0.08: 'CTA', 0.06: 'TTA'},
        Y: {0.58: 'TAC', 0.43: 'TAT'},
        X: {0.52: 'TGA', 0.26: 'TAA', 0.22: 'TAG'},
        H: {0.6: 'CAC', 0.4: 'CAT'},
        Q: {0.75: 'CAG', 0.25: 'CAA'},
        I: {0.5: 'ATC', 0.34: 'ATT', 0.16: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.57: 'AAC', 0.43: 'AAT'},
        K: {0.61: 'AAG', 0.39: 'AAA'},
        V: {0.46: 'GTG', 0.25: 'GTC', 0.17: 'GTT', 0.12: 'GTA'},
        D: {0.56: 'GAC', 0.44: 'GAT'},
        E: {0.6: 'GAG', 0.4: 'GAA'},
        S: {0.24: 'AGC', 0.22: 'TCC', 0.19: 'TCT', 0.15: 'AGT', 0.14: 'TCA', 0.05: 'TCG'},
        C: {0.52: 'TGC', 0.48: 'TGT'},
        W: {1.0: 'TGG'},
        P: {0.31: 'CCC', 0.3: 'CCT', 0.28: 'CCA', 0.1: 'CCG'},
        R: {0.22: 'AGG', 0.21: 'AGA', 0.19: 'CGG', 0.18: 'CGC', 0.12: 'CGA', 0.09: 'CGT'},
        T: {0.35: 'ACC', 0.29: 'ACA', 0.25: 'ACT', 0.11: 'ACG'},
        A: {0.38: 'GCC', 0.29: 'GCT', 0.23: 'GCA', 0.1: 'GCG'},
        G: {0.33: 'GGC', 0.26: 'GGA', 0.23: 'GGG', 0.18: 'GGT'},
    },
    "Drosophila melanogaster": {
        F: {0.63: 'TTC', 0.37: 'TTT'},
        L: {0.43: 'CTG', 0.18: 'TTG', 0.15: 'CTC', 0.1: 'CTT', 0.09: 'CTA', 0.05: 'TTA'},
        Y: {0.63: 'TAC', 0.37: 'TAT'},
        X: {0.42: 'TAA', 0.32: 'TAG', 0.26: 'TGA'},
        H: {0.6: 'CAC', 0.4: 'CAT'},
        Q: {0.7: 'CAG', 0.3: 'CAA'},
        I: {0.47: 'ATC', 0.34: 'ATT', 0.19: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.56: 'AAC', 0.44: 'AAT'},
        K: {0.71: 'AAG', 0.29: 'AAA'},
        V: {0.47: 'GTG', 0.24: 'GTC', 0.18: 'GTT', 0.11: 'GTA'},
        D: {0.53: 'GAT', 0.47: 'GAC'},
        E: {0.67: 'GAG', 0.33: 'GAA'},
        S: {0.25: 'AGC', 0.24: 'TCC', 0.2: 'TCG', 0.14: 'AGT', 0.09: 'TCA', 0.08: 'TCT'},
        C: {0.71: 'TGC', 0.29: 'TGT'},
        W: {1.0: 'TGG'},
        P: {0.33: 'CCC', 0.29: 'CCG', 0.25: 'CCA', 0.13: 'CCT'},
        R: {0.33: 'CGC', 0.16: 'CGT', 0.15: 'CGG', 0.11: 'AGG', 0.09: 'AGA'},
        T: {0.38: 'ACC', 0.26: 'ACG', 0.19: 'ACA', 0.17: 'ACT'},
        A: {0.45: 'GCC', 0.19: 'GCG', 0.17: 'GCA'},
        G: {0.43: 'GGC', 0.29: 'GGA', 0.21: 'GGT', 0.07: 'GGG'},
    },
    "Pichia pastoris": {
        F: {0.56: 'TTT', 0.44: 'TTC'},
        L: {0.33: 'TTG', 0.17: 'CTT', 0.16: 'CTG', 0.15: 'TTA', 0.12: 'CTA', 0.08: 'CTC'},
        Y: {0.55: 'TAC', 0.45: 'TAT'},
        X: {0.53: 'TAA', 0.29: 'TAG', 0.18: 'TGA'},
        H: {0.54: 'CAT', 0.46: 'CAC'},
        Q: {0.62: 'CAA', 0.38: 'CAG'},
        I: {0.51: 'ATT', 0.31: 'ATC', 0.18: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.52: 'AAC', 0.48: 'AAT'},
        K: {0.53: 'AAG', 0.47: 'AAA'},
        V: {0.42: 'GTT', 0.23: 'GTC', 0.2: 'GTG', 0.16: 'GTA'},
        D: {0.59: 'GAT', 0.41: 'GAC'},
        E: {0.58: 'GAA', 0.42: 'GAG'},
        S: {0.29: 'TCT', 0.2: 'TCC', 0.19: 'TCA', 0.15: 'AGT', 0.09: 'AGC'},
        C: {0.65: 'TGT', 0.35: 'TGC'},
        W: {1.0: 'TGG'},
        P: {0.4: 'CCA', 0.35: 'CCT', 0.16: 'CCC', 0.1: 'CCG'},
        R: {0.47: 'AGA', 0.16: 'AGG', 0.11: 'CGA', 0.05: 'CGG'},
        T: {0.4: 'ACT', 0.25: 'ACA', 0.24: 'ACC', 0.11: 'ACG'},
        A: {0.45: 'GCT', 0.25: 'GCC', 0.24: 'GCA', 0.06: 'GCG'},
        G: {0.43: 'GGT', 0.32: 'GGA', 0.14: 'GGC', 0.1: 'GGG'},
    },
    "C.elegans": {
        F: {0.5: 'TTC'},
        L: {0.24: 'CTT', 0.23: 'TTG', 0.17: 'CTC', 0.14: 'CTG', 0.12: 'TTA', 0.09: 'CTA'},
        Y: {0.56: 'TAT', 0.44: 'TAC'},
        X: {0.44: 'TAA', 0.39: 'TGA', 0.17: 'TAG'},
        H: {0.61: 'CAT', 0.39: 'CAC'},
        Q: {0.66: 'CAA', 0.34: 'CAG'},
        I: {0.53: 'ATT', 0.31: 'ATC', 0.16: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.62: 'AAT', 0.38: 'AAC'},
        K: {0.59: 'AAA', 0.41: 'AAG'},
        V: {0.39: 'GTT', 0.23: 'GTG', 0.22: 'GTC', 0.16: 'GTA'},
        D: {0.68: 'GAT', 0.33: 'GAC'},
        E: {0.62: 'GAA', 0.38: 'GAG'},
        S: {0.25: 'TCA', 0.21: 'TCT', 0.15: 'AGT', 0.13: 'TCC', 0.1: 'AGC'},
        C: {0.55: 'TGT', 0.45: 'TGC'},
        W: {1.0: 'TGG'},
        P: {0.53: 'CCA', 0.2: 'CCG', 0.18: 'CCT', 0.09: 'CCC'},
        R: {0.29: 'AGA', 0.23: 'CGA', 0.21: 'CGT', 0.1: 'CGC', 0.09: 'CGG', 0.08: 'AGG'},
        T: {0.34: 'ACA', 0.33: 'ACT', 0.18: 'ACC', 0.15: 'ACG'},
        A: {0.36: 'GCT', 0.31: 'GCA', 0.2: 'GCC', 0.13: 'GCG'},
        G: {0.59: 'GGA', 0.2: 'GGT', 0.12: 'GGC', 0.08: 'GGG'},
    },
    "Insect": {
        F: {0.75: 'TTC', 0.25: 'TTT'},
        L: {0.31: 'CTG', 0.22: 'CTC', 0.2: 'TTG', 0.13: 'CTT', 0.08: 'CTA', 0.07: 'TTA'},
        Y: {0.75: 'TAC', 0.25: 'TAT'},
        X: {0.68: 'TAA', 0.17: 'TGA', 0.15: 'TAG'},
        H: {0.68: 'CAC', 0.32: 'CAT'},
        Q: {0.61: 'CAG', 0.39: 'CAA'},
        I: {0.59: 'ATC', 0.29: 'ATT', 0.12: 'ATA'},
        M: {1.0: 'ATG'},
        N: {0.71: 'AAC', 0.29: 'AAT'},
        K: {0.69: 'AAG', 0.31: 'AAA'},
        V: {0.35: 'GTG', 0.3: 'GTC', 0.2: 'GTT', 0.15: 'GTA'},
        D: {0.63: 'GAC', 0.37: 'GAT'},
        E: {0.59: 'GAG', 0.41: 'GAA'},
        S: {0.24: 'TCC', 0.19: 'TCT', 0.17: 'AGC', 0.16: 'TCA', 0.12: 'AGT'},
        C: {0.65: 'TGC', 0.35: 'TGT'},
        W: {1.0: 'TGG'},
        P: {0.31: 'CCC', 0.29: 'CCT', 0.24: 'CCA', 0.16: 'CCG'},
        R: {0.25: 'CGT', 0.24: 'CGC', 0.21: 'AGG', 0.16: 'AGA', 0.08: 'CGA', 0.05: 'CGG'},
        T: {0.36: 'ACC', 0.27: 'ACT', 0.21: 'ACA', 0.16: 'ACG'},
        A: {0.36: 'GCT', 0.3: 'GCC', 0.18: 'GCG', 0.16: 'GCA'},
        G: {0.36: 'GGT', 0.32: 'GGC', 0.27: 'GGA', 0.05: 'GGG'},
    }
};