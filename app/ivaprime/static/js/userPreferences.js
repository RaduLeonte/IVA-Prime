/**
 * Create and save the site cookie.
 * 
 * @param {string} name - Cookie name
 * @param {any} value - Cookie value
 * @param {number} daysToExpire - Days until expiration
 * @param {boolean} isSecure - Secure flag
 * @param {boolean} isCrossSite - Cross site flag
 */
function setCookie(name, value, daysToExpire, isSecure=true, isCrossSite=true) {
    let cookieValue = `${name}=${value}; path=/`;
    
    if (daysToExpire) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + daysToExpire);
        cookieValue += `; expires=${expirationDate.toUTCString()}`;
    };

    if (isSecure && location.protocol == 'https:') {cookieValue += '; Secure'};
    if (isCrossSite) {cookieValue += '; SameSite=None'};
    document.cookie = cookieValue;
};


/**
 * Read site cookie and return dict.
 * 
 * @param {string} name 
 * @returns 
 */
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


/**
 * Updates user preferences in site cookie.
 * 
 * @param {string} preferenceName - Key
 * @param {any} preferenceValue - Value
 * @param {number} daysToExpire - Days until expiration
 * @param {boolean} isSecure - Secure flag
 * @param {boolean} isCrossSite - Cross site flag
 */
function saveUserPreference(preferenceName, preferenceValue, daysToExpire, isSecure=true, isCrossSite=true) {
    // Get current user preferences
    const userPreferences = JSON.parse(getCookieValue('userPreferences') || '{}');
    
    // Update or set the preference
    userPreferences[preferenceName] = preferenceValue;

    // Save the updated user preferences to the cookie
    setCookie('userPreferences', JSON.stringify(userPreferences), daysToExpire, isSecure, isCrossSite);
};


/**
 * Returns specific user preference from site cookie
 * 
 * @param {string} preferenceName - Key
 * @returns {any}
 */
function getUserPreference(preferenceName) {
    // Get current user preferences
    const userPreferences = JSON.parse(getCookieValue('userPreferences') || '{}');

    // Check if the preference exists, and return its value; otherwise, return a default value or null
    if (userPreferences.hasOwnProperty(preferenceName)) {
        return userPreferences[preferenceName];
    } else {
        return null;
    };
};


/**
 * Default settings
 */
const defaultSetingsDict = {
    "colorTheme": "lightTheme",
    "cookieWarningDontShowAgain": false,
    "primerDistribution": true,
    "homoRegionMinLength": 18,
    "homoRegionTm": 50,
    "homoRegionSubcloningTm": 55,
    "tempRegionTm": 60,
    "upperBoundShortInsertions": 49.5,
    "primerConc": 100,
    "meltingTempAlgorithmChoice": "oligoCalc",
    "saltConc": 0,
    "saltCorrectionEquation": "SchildkrautLifson",
    "dmsoConc": 0,
    "gridWidth": 60,
    "preferredOrganism" : "Escherichia coli"
};
/**
 * Set user preferences and global variables
 */
for (let setting in defaultSetingsDict) {
    window[setting] = (getUserPreference(setting) !== null) ? getUserPreference(setting) : defaultSetingsDict[setting];
};


document.addEventListener('DOMContentLoaded', function () {
    console.log(getUserPreference("cookieWarningDontShowAgain"))
    const dontShowAgain = (getUserPreference("cookieWarningDontShowAgain") !== null) ? getUserPreference("cookieWarningDontShowAgain") : false;
    if (dontShowAgain === false) {
        const ele = document.getElementById("cookie-warning-popup");
        ele.style.display = "flex";
    }

})

function cookieWarningUnderstood() {
    saveUserPreference("cookieWarningDontShowAgain", true, 30);

    const ele = document.getElementById("cookie-warning-popup");
    ele.style.display = "none";
}