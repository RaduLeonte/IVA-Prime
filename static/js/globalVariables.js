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
let currentSearchResult = null;
let indicesResultsDNA = null;
let indicesResultsAA = null;


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


/**
 * Codon frequency tables
 * from: https://www.genscript.com/tools/codon-frequency-table
 */

const codonTablesDict = {
    "Escherichia coli": {
        F: {0.5781006746237675: 'TTT', 0.4218993253762325: 'TTC'},
        L: {0.49550146794204: 'CTG', 0.12993654702149826: 'TTA', 0.1262430154370679: 'TTG', 0.1078700634529785: 'CTT', 0.10370300217823657: 'CTC', 0.036745903968178804: 'CTA'},
        I: {0.5066286289645914: 'ATT', 0.4141634502433294: 'ATC', 0.0792079207920792: 'ATA'},
        M: {1.0: 'ATG'},
        V: {0.3687349140991054: 'GTG', 0.2609683373562402: 'GTT', 0.21468124378815842: 'GTC', 0.1556155047564958: 'GTA'},
        S: {0.27148703956343795: 'AGC', 0.15381991814461118: 'AGT', 0.1504092769440655: 'TCC', 0.1498976807639836: 'TCG', 0.14648703956343792: 'TCT', 0.12789904502046384: 'TCA'},
        P: {0.5187713310580204: 'CCG', 0.19158134243458474: 'CCA', 0.16359499431171787: 'CCT', 0.1260523321956769: 'CCC'},
        T: {0.42568943179714974: 'ACC', 0.2687395891171571: 'ACG', 0.16620396076253932: 'ACT', 0.13936701832315382: 'ACA'},
        A: {0.34800971386337237: 'GCG', 0.270509977827051: 'GCC', 0.2174004856931686: 'GCA', 0.16407982261640797: 'GCT'},
        Y: {0.5720309205903022: 'TAT', 0.4279690794096978: 'TAC'},
        X: {0.6203703703703703: 'TAA', 0.308641975308642: 'TGA', 0.07098765432098766: 'TAG'},
        H: {0.574966231427285: 'CAT', 0.42503376857271497: 'CAC'},
        Q: {0.660645743960262: 'CAG', 0.33935425603973807: 'CAA'},
        N: {0.5432036382011117: 'AAC', 0.45679636179888833: 'AAT'},
        K: {0.7601169064748201: 'AAA', 0.23988309352517984: 'AAG'},
        D: {0.6276863504356244: 'GAT', 0.37231364956437557: 'GAC'},
        E: {0.6841650837506476: 'GAA', 0.31583491624935245: 'GAG'},
        C: {0.5506108202443281: 'TGC', 0.4493891797556719: 'TGT'},
        W: {1.0: 'TGG'},
        R: {0.389410914347669: 'CGC', 0.37441272135887244: 'CGT', 0.10263823635706541: 'CGG', 0.0657752078062884: 'CGA', 0.04246476328153235: 'AGA', 0.02529815684857246: 'AGG'},
        G: {0.39487741405286947: 'GGC', 0.33611833995343104: 'GGT', 0.15436241610738258: 'GGG', 0.11464182988631695: 'GGA'},
    },
    "Human (Homo sapiens)": {
        F: {0.5049104563835932: 'TTC', 0.49508954361640667: 'TTT'},
        L: {0.3699528591924576: 'CTG', 0.1825169092027055: 'CTC', 0.1442918630866981: 'CTT', 0.13773314203730275: 'TTG', 0.0892600942816151: 'TTA', 0.07624513219922117: 'CTA'},
        I: {0.4318760120286838: 'ATC', 0.38121674762896135: 'ATT', 0.18690724034235484: 'ATA'},
        M: {1.0: 'ATG'},
        V: {0.44064043604156017: 'GTG', 0.22892181911088397: 'GTC', 0.19996593425310846: 'GTT', 0.13047181059444726: 'GTA'},
        S: {0.22852831940575677: 'AGC', 0.2010213556174559: 'TCC', 0.19649489322191271: 'TCT', 0.16411327762302694: 'TCA', 0.1630687093779016: 'AGT', 0.04677344475394615: 'TCG'},
        P: {0.30380742605412203: 'CCT', 0.30066079295154186: 'CCC', 0.2976714915040906: 'CCA', 0.09786028949024543: 'CCG'},
        T: {0.32921431206196977: 'ACC', 0.3046846182220583: 'ACA', 0.2630025820730358: 'ACT', 0.10309848764293618: 'ACG'},
        A: {0.38123340218353496: 'GCC', 0.28017114192977277: 'GCT', 0.25140159339038065: 'GCA', 0.0871938624963116: 'GCG'},
        Y: {0.526953125: 'TAC', 0.473046875: 'TAT'},
        X: {0.5: 'TGA', 0.27848101265822783: 'TAA', 0.22151898734177214: 'TAG'},
        H: {0.5532477341389728: 'CAC', 0.4467522658610272: 'CAT'},
        Q: {0.7164750957854406: 'CAG', 0.2835249042145594: 'CAA'},
        N: {0.5017696705690171: 'AAT', 0.49823032943098283: 'AAC'},
        K: {0.5362025316455696: 'AAG', 0.46379746835443036: 'AAA'},
        D: {0.5024844720496895: 'GAC', 0.4975155279503106: 'GAT'},
        E: {0.5410529187124933: 'GAG', 0.45894708128750683: 'GAA'},
        C: {0.5096652522395096: 'TGC', 0.49033474776049035: 'TGT'},
        W: {1.0: 'TGG'},
        R: {0.23765211166785968: 'AGA', 0.2170722977809592: 'AGG', 0.19309234073013598: 'CGG', 0.15586972083035075: 'CGC', 0.1148890479599141: 'CGA', 0.08142448103078023: 'CGT'},
        G: {0.31367887145347917: 'GGC', 0.2713583769218577: 'GGA', 0.24330321762561422: 'GGG', 0.17165953399904899: 'GGT'},
    },
    "Mouse  (Mus musculus)": {
        F: {0.5384389671361502: 'TTC', 0.4615610328638498: 'TTT'},
        L: {0.3775183386713504: 'CTG', 0.19103213141853498: 'CTC', 0.13803078830457693: 'CTT', 0.13524124393015807: 'TTG', 0.08244653373282365: 'CTA', 0.07573096394255606: 'TTA'},
        I: {0.47930542340627963: 'ATC', 0.34871550903901044: 'ATT', 0.1719790675547098: 'ATA'},
        M: {1.0: 'ATG'},
        V: {0.44359626802374896: 'GTG', 0.24529262086513998: 'GTC', 0.18422391857506362: 'GTT', 0.12688719253604752: 'GTA'},
        S: {0.2359083763754772: 'AGC', 0.2060408713227038: 'TCC', 0.196609027621828: 'TCT', 0.16123961374354367: 'AGT', 0.15180777004266785: 'TCA', 0.04839434089377947: 'TCG'},
        P: {0.3161179591199875: 'CCT', 0.3019191761585271: 'CCA', 0.2866281791231081: 'CCC', 0.09533468559837728: 'CCG'},
        T: {0.3326083016131956: 'ACC', 0.3066884176182708: 'ACA', 0.2564799709987312: 'ACT', 0.10422330976980243: 'ACG'},
        A: {0.36856010568031705: 'GCC', 0.29810656098634963: 'GCT', 0.2484955232643476: 'GCA', 0.08483781006898578: 'GCG'},
        Y: {0.5641732283464568: 'TAC', 0.43582677165354333: 'TAT'},
        X: {0.5: 'TGA', 0.26351351351351354: 'TAA', 0.23648648648648649: 'TAG'},
        H: {0.5743957703927492: 'CAC', 0.42560422960725075: 'CAT'},
        Q: {0.7364851386395372: 'CAG', 0.2635148613604628: 'CAA'},
        N: {0.5526610644257702: 'AAC', 0.44733893557422966: 'AAT'},
        K: {0.5840753424657534: 'AAG', 0.41592465753424657: 'AAA'},
        D: {0.5392016376663255: 'GAC', 0.46079836233367455: 'GAT'},
        E: {0.5738180812828311: 'GAG', 0.4261819187171689: 'GAA'},
        C: {0.5044538209095172: 'TGC', 0.49554617909048293: 'TGT'},
        W: {1.0: 'TGG'},
        R: {0.2325088339222615: 'AGA', 0.22703180212014132: 'AGG', 0.18515901060070672: 'CGG', 0.1507067137809187: 'CGC', 0.12279151943462897: 'CGA', 0.08180212014134275: 'CGT'},
        G: {0.3164068777117146: 'GGC', 0.26932347742246504: 'GGA', 0.23654186083882373: 'GGG', 0.17772778402699663: 'GGT'},
    },
    "Rat (Rattus norvegicus)": {
        F: {0.5456401283172937: 'TTC', 0.45435987168270636: 'TTT'},
        L: {0.3773818106911113: 'CTG', 0.1911628386033577: 'CTC', 0.13801627356061386: 'CTT', 0.13513235142651148: 'TTG', 0.08301575857451848: 'CTA', 0.07529096714388711: 'TTA'},
        I: {0.4768398777333647: 'ATC', 0.3494004232306607: 'ATT', 0.1737596990359746: 'ATA'},
        M: {1.0: 'ATG'},
        V: {0.44358425300609455: 'GTG', 0.24394663152693133: 'GTC', 0.1859660681930489: 'GTT', 0.12650304727392522: 'GTA'},
        S: {0.23279514485285696: 'AGC', 0.20634375357838086: 'TCC', 0.19661055765487234: 'TCT', 0.16248711782892478: 'AGT', 0.15298293828008702: 'TCA', 0.04878048780487805: 'TCG'},
        P: {0.31622176591375767: 'CCT', 0.3004264729110725: 'CCA', 0.2858948033486021: 'CCC', 0.09745695782656767: 'CCG'},
        T: {0.33260830161319566: 'ACC', 0.30523835417799533: 'ACA', 0.25575493927859344: 'ACT', 0.10639840493021571: 'ACG'},
        A: {0.3700485937269916: 'GCC', 0.2948019437490797: 'GCT', 0.2467972316300987: 'GCA', 0.08835223089383007: 'GCG'},
        Y: {0.5695415695415695: 'TAC', 0.4304584304584304: 'TAT'},
        X: {0.5064935064935066: 'TGA', 0.25974025974025977: 'TAA', 0.23376623376623376: 'TAG'},
        H: {0.5807692307692307: 'CAC', 0.41923076923076924: 'CAT'},
        Q: {0.7351329409376903: 'CAG', 0.2648670590623098: 'CAA'},
        N: {0.5554609929078014: 'AAC', 0.44453900709219857: 'AAT'},
        K: {0.5826321104005385: 'AAG', 0.4173678895994615: 'AAA'},
        D: {0.5476093175316715: 'GAC', 0.4523906824683286: 'GAT'},
        E: {0.5718579234972677: 'GAG', 0.4281420765027322: 'GAA'},
        C: {0.5063529411764706: 'TGC', 0.49364705882352944: 'TGT'},
        W: {1.0: 'TGG'},
        R: {0.23461606667848914: 'AGA', 0.2273452739847491: 'AGG', 0.1824791629721582: 'CGG', 0.14825323638943075: 'CGC', 0.12271679375775849: 'CGA', 0.08458946621741444: 'CGT'},
        G: {0.31479690522243714: 'GGC', 0.26918117343649256: 'GGA', 0.2379110251450677: 'GGG', 0.1781108961960026: 'GGT'},
    },
    "Baker's yeast (Saccharomyces cerevisiae)": {
        F: {0.5946557971014493: 'TTT', 0.4053442028985507: 'TTC'},
        L: {0.27903055848261327: 'TTG', 0.2773445732349842: 'TTA', 0.14257112750263434: 'CTA', 0.13003161222339304: 'CTT', 0.1125395152792413: 'CTG', 0.05848261327713382: 'CTC'},
        I: {0.46017428527748055: 'ATT', 0.280232380369974: 'ATA', 0.2595933343525455: 'ATC'},
        M: {1.0: 'ATG'},
        V: {0.3866258111031002: 'GTT', 0.21755587599134824: 'GTA', 0.20223503965392933: 'GTC', 0.1935832732516222: 'GTG'},
        S: {0.26011367435640254: 'TCT', 0.21230357739886324: 'TCA', 0.16259890783461495: 'AGT', 0.15658085367212748: 'TCC', 0.11122255655856458: 'AGC', 0.09718043017942718: 'TCG'},
        P: {0.40690759377859104: 'CCA', 0.310384263494968: 'CCT', 0.15827996340347666: 'CCC', 0.12442817932296434: 'CCG'},
        T: {0.34253769269862777: 'ACT', 0.30797899373200066: 'ACA', 0.21124851770286296: 'ACC', 0.13823479586650855: 'ACG'},
        A: {0.36927567962050717: 'GCT', 0.29666119321291734: 'GCA', 0.22112753147235903: 'GCC', 0.11293559569421639: 'GCG'},
        Y: {0.5665083135391924: 'TAT', 0.4334916864608076: 'TAC'},
        X: {0.4731707317073171: 'TAA', 0.29756097560975614: 'TGA', 0.22926829268292684: 'TAG'},
        H: {0.6419012459621596: 'CAT', 0.3580987540378403: 'CAC'},
        Q: {0.6854103343465046: 'CAA', 0.31458966565349544: 'CAG'},
        N: {0.5960534898891063: 'AAT', 0.4039465101108937: 'AAC'},
        K: {0.5843340611353711: 'AAA', 0.4156659388646288: 'AAG'},
        D: {0.6512425021422451: 'GAT', 0.34875749785775495: 'GAC'},
        E: {0.7005978844090143: 'GAA', 0.29940211559098573: 'GAG'},
        C: {0.6213438735177865: 'TGT', 0.3786561264822134: 'TGC'},
        W: {1.0: 'TGG'},
        R: {0.4736486486486487: 'AGA', 0.2132882882882883: 'AGG', 0.14144144144144144: 'CGT', 0.07027027027027027: 'CGA', 0.059684684684684686: 'CGC', 0.04166666666666667: 'CGG'},
        G: {0.45441710367083504: 'GGT', 0.22569584509883017: 'GGA', 0.19745865268253326: 'GGC', 0.12242839854780155: 'GGG'},
    },
    "Zebrafish  (Danio rerio)": {
        F: {0.5235602094240839: 'TTC', 0.4764397905759163: 'TTT'},
        L: {0.3903446776122649: 'CTG', 0.1791888659345439: 'CTC', 0.14385125584429706: 'CTT', 0.13297814504729805: 'TTG', 0.07817766663042297: 'TTA', 0.07545938893117321: 'CTA'},
        I: {0.47863626300642026: 'ATC', 0.3471330529112243: 'ATT', 0.17423068408235556: 'ATA'},
        M: {1.0: 'ATG'},
        V: {0.4269369074861065: 'GTG', 0.23014056881333766: 'GTC', 0.22670807453416145: 'GTT', 0.11621444916639424: 'GTA'},
        S: {0.21084469863616367: 'AGC', 0.20963484381874173: 'TCT', 0.17872855257369116: 'TCA', 0.17421909370875494: 'TCC', 0.16937967443906732: 'AGT', 0.057193136823581174: 'TCG'},
        P: {0.3280812324929972: 'CCT', 0.3174019607843137: 'CCA', 0.22759103641456582: 'CCC', 0.12692577030812324: 'CCG'},
        T: {0.3325831024930748: 'ACA', 0.27631578947368424: 'ACC', 0.27354570637119113: 'ACT', 0.11755540166204986: 'ACG'},
        A: {0.32893900889453626: 'GCT', 0.2895489199491741: 'GCC', 0.2725540025412961: 'GCA', 0.10895806861499366: 'GCG'},
        Y: {0.5658855167114868: 'TAC', 0.43411448328851326: 'TAT'},
        X: {0.5063291139240507: 'TGA', 0.3164556962025316: 'TAA', 0.17721518987341772: 'TAG'},
        H: {0.5635191505498673: 'CAC', 0.43648084945013277: 'CAT'},
        Q: {0.7066368078175895: 'CAG', 0.2933631921824104: 'CAA'},
        N: {0.5748804429901837: 'AAC', 0.42511955700981624: 'AAT'},
        K: {0.5083964438590715: 'AAA', 0.4916035561409286: 'AAG'},
        D: {0.5088880484114978: 'GAC', 0.4911119515885023: 'GAT'},
        E: {0.6136773477597448: 'GAG', 0.38632265224025525: 'GAA'},
        C: {0.5285242809995285: 'TGT', 0.47147571900047147: 'TGC'},
        W: {1.0: 'TGG'},
        R: {0.2829983704508419: 'AGA', 0.19319210573963425: 'AGG', 0.16295491580662683: 'CGC', 0.12275936990765887: 'CGA', 0.12257830889009595: 'CGT', 0.11551692920514212: 'CGG'},
        G: {0.3496562133154453: 'GGA', 0.2637933925876237: 'GGC', 0.22136508468891494: 'GGT', 0.1651853094080161: 'GGG'},
    },
    "Fruit fly (Drosophila melanogaster)": {
        F: {0.6201879357381025: 'TTC', 0.3798120642618975: 'TTT'},
        L: {0.42184989671792517: 'CTG', 0.1810879045214597: 'TTG', 0.152742712875832: 'CTC', 0.09926554969015378: 'CTT', 0.09260959375717237: 'CTA', 0.05244434243745697: 'TTA'},
        I: {0.4600418410041841: 'ATC', 0.3422594142259414: 'ATT', 0.19769874476987448: 'ATA'},
        M: {1.0: 'ATG'},
        V: {0.46288359334819135: 'GTG', 0.2316132350420024: 'GTC', 0.1937253557346134: 'GTT', 0.11177781587519287: 'GTA'},
        S: {0.24446761673039047: 'AGC', 0.22789943227899434: 'TCC', 0.2029892248870351: 'TCG', 0.14100335998146216: 'AGT', 0.09882979955972655: 'TCA', 0.08481056656239139: 'TCT'},
        P: {0.32106089687663586: 'CCC', 0.2905252137497819: 'CCG', 0.2584191240621183: 'CCA', 0.12999476531146398: 'CCT'},
        T: {0.36885386328593456: 'ACC', 0.2556107589515162: 'ACG', 0.2030152475586774: 'ACA', 0.17252013020387183: 'ACT'},
        A: {0.44058280978478814: 'GCC', 0.1931559951878091: 'GCT', 0.18914583611816602: 'GCG', 0.17711535890923671: 'GCA'},
        Y: {0.6190815236739053: 'TAC', 0.38091847632609466: 'TAT'},
        X: {0.3926380368098159: 'TAA', 0.3312883435582822: 'TAG', 0.2760736196319018: 'TGA'},
        H: {0.5930801053027454: 'CAC', 0.40691989469725465: 'CAT'},
        Q: {0.6910599078341014: 'CAG', 0.3089400921658986: 'CAA'},
        N: {0.5448232323232324: 'AAC', 0.4551767676767677: 'AAT'},
        K: {0.6996524602158405: 'AAG', 0.3003475397841595: 'AAA'},
        D: {0.5385210994967093: 'GAT', 0.46147890050329077: 'GAC'},
        E: {0.6586046511627907: 'GAG', 0.3413953488372093: 'GAA'},
        C: {0.6932418162618796: 'TGC', 0.30675818373812036: 'TGT'},
        W: {1.0: 'TGG'},
        R: {0.32557713448149506: 'CGC', 0.16361304507145474: 'CGT', 0.15665078783437159: 'CGA', 0.14767314034444853: 'CGG', 0.11212898497618176: 'AGG', 0.09435690729204838: 'AGA'},
        G: {0.4215889189619488: 'GGC', 0.2880114631428117: 'GGA', 0.21684445152045853: 'GGT', 0.07355516637478109: 'GGG'},
    },
    "Caenorhabditis elegans": {
        F: {0.5228158679202018: 'TTC', 0.4771841320797982: 'TTT'},
        L: {0.25041936256889524: 'CTT', 0.23244668104481184: 'TTG', 0.1732566498921639: 'CTC', 0.14378145219266714: 'CTG', 0.10939372154325425: 'TTA', 0.09070213275820752: 'CTA'},
        I: {0.5343263139873309: 'ATT', 0.3148433487416538: 'ATC', 0.15083033727101525: 'ATA'},
        M: {1.0: 'ATG'},
        V: {0.39018503620273537: 'GTT', 0.23362831858407082: 'GTG', 0.2189863234111022: 'GTC', 0.15720032180209173: 'GTA'},
        S: {0.2577519379844962: 'TCA', 0.2072432170542636: 'TCT', 0.15564437984496127: 'TCG', 0.14958817829457366: 'AGT', 0.12863372093023256: 'TCC', 0.10113856589147288: 'AGC'},
        P: {0.5365332296929654: 'CCA', 0.19937815779246015: 'CCG', 0.17819665759813447: 'CCT', 0.08589195491643994: 'CCC'},
        T: {0.3454606141522029: 'ACA', 0.3262683578104139: 'ACT', 0.17456608811749: 'ACC', 0.1537049399198932: 'ACG'},
        A: {0.35747161706044794: 'GCT', 0.3149739183798711: 'GCA', 0.19668610003068424: 'GCC', 0.1308683645289966: 'GCG'},
        Y: {0.5582862836267021: 'TAT', 0.4417137163732979: 'TAC'},
        X: {0.49056603773584906: 'TAA', 0.330188679245283: 'TGA', 0.1792452830188679: 'TAG'},
        H: {0.6121394748170469: 'CAT', 0.38786052518295305: 'CAC'},
        Q: {0.6528293135435993: 'CAA', 0.34717068645640076: 'CAG'},
        N: {0.624317513649727: 'AAT', 0.37568248635027296: 'AAC'},
        K: {0.5831994860263411: 'AAA', 0.4168005139736588: 'AAG'},
        D: {0.6803021927400037: 'GAT', 0.3196978072599963: 'GAC'},
        E: {0.6245391535171804: 'GAA', 0.37546084648281963: 'GAG'},
        C: {0.5556695741405848: 'TGT', 0.44433042585941507: 'TGC'},
        W: {1.0: 'TGG'},
        R: {0.2895386367951396: 'AGA', 0.2369470286690716: 'CGA', 0.21568255173723183: 'CGT', 0.09531042339092463: 'CGC', 0.09113347256502753: 'CGG', 0.0713878868426049: 'AGG'},
        G: {0.5912786400591279: 'GGA', 0.20639320029563932: 'GGT', 0.12398373983739838: 'GGC', 0.07834441980783445: 'GGG'},
    }
};