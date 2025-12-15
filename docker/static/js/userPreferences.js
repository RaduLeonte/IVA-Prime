const UserPreferences = new class {
    constructor() {
        this.cookieName = 'user_prefs';
        this.expiryDays = 365;

        this.defaultSettings = {
            "theme": "light",
            "cookieConsentGiven": false,

            "modifyPlasmidAfterOperation": true,
            "onlyModifyPlasmid": false,
            "symmetricPrimers": false,
            "HRMinLength": 18,
            "HRTm": 50,
            "HRSubcloningTm": 55,
            "TBRTm": 60,
            "maxTmSi": 49.5,
            "primerConc": 100,
            "TmAlgorithm": "oligoCalc",
            "saltConc": 0,
            "saltCorr": "SchildkrautLifson",
            "dmsoConc": 0,

            "useGCClamp": false,

            "baseWidth": 16,

            "preferredOrganism": "Escherichia coli",

            "overwriteSnapGeneColors": true,
        };

        const savedPreferences = this.loadPreferences();
        //console.log(`UserPreferences -> savedPreferences=\n${JSON.stringify(savedPreferences, null, 2)}`);
        this.preferences = { ...this.defaultSettings, ...savedPreferences };
        //console.log(`UserPreferences -> merged=\n${JSON.stringify(this.preferences, null, 2)}`);
        this.savePreferences();
    };

    /**
     * Load preferences from cookie.
     * 
     * @returns {Object} - Dictionary of settings
     */
    loadPreferences() {
        const cookies = document.cookie.split('; ');
        let userPrefsCookie = null;
        for (let cookie of cookies) {
            let [key, value] = cookie.split('=');
            if (key === this.cookieName) {
                userPrefsCookie = decodeURIComponent(value);
            };
        };
        return userPrefsCookie ? JSON.parse(userPrefsCookie) : {};
    };

    
    /**
     * Save current preferences to the cookie.
     */
    savePreferences() {
        let expires = '';
        if (this.expiryDays) {
            const date = new Date();
            date.setTime(date.getTime() + this.expiryDays * 24 * 60 * 60 * 1000);
            expires = `; expires=${date.toUTCString()}`;
        };

        document.cookie = `${this.cookieName}=${JSON.stringify(this.preferences)}${expires}; path=/`;
    };


    /**
     * Delete user preferences cookie
     */
    deleteCookie() {
        document.cookie = `${this.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        location.reload();
    };


    /**
     * Set user preference.
     * 
     * @param {String} key - Name of entry
     * @param {any} value - Value of entry
     */
    set(key, value) {
        this.preferences[key] = value;
        this.savePreferences();
    };


    setBulk(prefs) {
        Object.assign(this.preferences, prefs); 
        this.savePreferences();
    };


    /**
     * Get specific user preference value
     * 
     * @param {String} key - Name of entry
     * @returns {any} - Value of entry
     */
    get(key) {
        console.assert(key in this.preferences, `User preference "${key}" does not exist.`);
        return this.preferences[key];
    };
};
