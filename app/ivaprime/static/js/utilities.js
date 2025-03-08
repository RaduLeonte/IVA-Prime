const Utilities = new class {
    constructor () {
        this.updateTheme();

        this.defaultAnnotationColors = [
            "#ff7a8e", "#bc99ee", "#ff8756", "#5aa8d9", "#f45ba8", "#74e374", "#ffcc5c",
            "#7ec8e3", "#ffa07a", "#c3a6ff", "#ff6699", "#80ffdb", "#ffb3e6", "#a5f2e3",
            "#ff9a8a", "#95b8d1", "#ffad5a", "#91d18b", "#ff6b6b", "#c4e17f", "#a29bfe",
            "#fdcb6e", "#6c5ce7", "#00cec9", "#fab1a0", "#ff7675", "#55efc4", "#e17055",
            "#fd79a8", "#81ecec", "#ff9ff3", "#a8e6cf"
        ];


        /**
         * CTRL+C
         */
        document.addEventListener("keydown", function(event) {
            if ((event.ctrlKey || event.metaKey) && (event.key === "c" || event.key === "C")) {
                const currSelection = Session.activePlasmid().getSelectionIndices();
                if (currSelection && currSelection !== null && currSelection[1] !== null) {
                    console.log("Copying from viewer")
                    event.preventDefault();
    
                    if (event.altKey) {
                        Utilities.copySequence("reverse complement");
                    } else {
                        Utilities.copySequence();
                    };
                };
            };
        });


        document.addEventListener('DOMContentLoaded', function() {
            Utilities.getScrollbarWidth();
        });

        this.validators = {
            integer: (value) => /^-?\d+$/.test(value),
            float: (value) => /^-?\d*\.?\d*$/.test(value),
            dna: (value) => /^[ATCG]*$/i.test(value),
            aa: (value) => /^[ACDEFGHIKLMNPQRSTVWY*X-]*$/i.test(value)
        };
        document.addEventListener("DOMContentLoaded", function (event) {
            const inputElements = document.querySelectorAll("input[validator]");

            inputElements.forEach((input) => {
                const validatorType = input.getAttribute("validator");

                Utilities.addInputValidator(input, validatorType);
            });
        });
    };

    /**
     * Generates a random UUID.
     * 
     * @returns - UUID string
     */
    newUUID() {
        const uuidSegments = [];
        
        for (let i = 0; i < 36; i++) {
            if (i === 8 || i === 13 || i === 18 || i === 23) {
                uuidSegments[i] = '-';
            } else if (i === 14) {
                uuidSegments[i] = '4'; // The version 4 UUID identifier
            } else if (i === 19) {
                // The first character of this segment should be 8, 9, A, or B
                uuidSegments[i] = (Math.random() * 4 + 8 | 0).toString(16);
            } else {
                // Generate a random hex digit
                uuidSegments[i] = (Math.random() * 16 | 0).toString(16);
            };
        };
        
        // Combine the segments into a single string
        return uuidSegments.join('');
    };


    /**
     * Gives a random color from the default colors,
     * avoiding using the same color twice.
     * 
     * @param {String} recentColor - Hex color that was just used.
     * @returns {String}
     */
    getRandomDefaultColor(recentColor="") {
        const remainingColors = this.defaultAnnotationColors.filter(color => color !== recentColor);
        const randomIndex = Math.floor(Math.random() * remainingColors.length);

        return remainingColors[randomIndex];
    };


    /**
     * Decide if text should be black or white based on
     * background color luminance.
     * 
     * @param {String} bgColor - Hex color of background. 
     * @returns 
     */
    getTextColorBasedOnBg(bgColor) {
        if (!bgColor) return "black";
        // Remove the '#' if present
        const hex = bgColor.replace('#', '');
    
        // Parse the HEX color into RGB components
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
    
        // Calculate relative luminance
        const luminance = (r / 255) * 0.2126 + (g / 255) * 0.7152 + (b / 255) * 0.0722;
    
        // Return white for dark backgrounds and black for light backgrounds
        return luminance > 0.5 ? 'black' : 'white';
    };

    /**
     * Sort the features dict by span so that the features appear
     * in order in the sidebar.
     * 
     * @param {Object} inputDict - Dictionary to be sorted.
     * @returns {Object} - Sorted dictionary.
     */
    sortFeaturesDictBySpan(inputDict) {
        // Convert the dictionary to an array of key-value pairs
        const valueKey = "span";
        const features = Object.entries(inputDict);

        // Sort the array based on the first number in the value key
        features.sort((a, b) => {
            const rangeStartA = a[1][valueKey][0];
            const rangeStartB = b[1][valueKey][0];
            return rangeStartA - rangeStartB;
        });

        // Convert the sorted array back to a dictionary and return
        return Object.fromEntries(features);
    };


    deepClone(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        let copy = Array.isArray(obj) ? [] : {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = this.deepClone(obj[key]);
            };
        };
        return copy;
    };


    /**
     * Find width of the scrollbar by generating a temporary div.
     * 
     * @returns {Number} - Width of scrollbar.
     */
    getScrollbarWidth() {
        if (this._scrollbarWidth !== undefined) return this._scrollbarWidth; // Cache result

        const tempDiv = document.createElement('div');
        Object.assign(tempDiv.style, {
            position: 'absolute',
            top: '-9999px',
            width: '100px',
            height: '100px',
            overflow: 'scroll'
        });

        document.body.appendChild(tempDiv);
        this._scrollbarWidth = tempDiv.offsetWidth - tempDiv.clientWidth;
        document.body.removeChild(tempDiv);

        return this._scrollbarWidth;
    };


    /**
     * Count occurrences of a substring in an input string.
     * 
     * @param {String} subString - String to be searched for
     * @param {String} inputString - String to search inside for substring
     * @returns {Number} - Number of occurences
     */
    countSubstringOccurences(subString, inputString) {
        let count = 0;
        let currentIndex = inputString.indexOf(subString);
        while (currentIndex !== -1) {
          count++;
          currentIndex = inputString.indexOf(subString, currentIndex + 1);
        };
        return count;
    };


    /**
     * Modified slice() function that allows for negative indices or indices longer than the string length by assuming
     * the string loops.
     * 
     * Example:
     *         startIndex            endIndex
     *             ▼                    ▼
     *         -3 -2 -1 0 1 2 3 4 5 6 7 8 9
     * str ->    _  _  _ A B C D E F G _ _ _
     * 
     * Result -> FGABCDEFGA
     * 
     * @param {string} str - String to be sliced
     * @param {number} startIndex - Start index
     * @param {number} endIndex - End index
     * @returns {string}
     */
    repeatingSlice(str, startIndex, endIndex) {
        const repeatedStr = str.repeat(3); // Copy the string 3 times: ABC_ABC_ABC
        // Remap indices to new string then return
        return repeatedStr.slice(startIndex + str.length, endIndex + str.length);
    };


    /**
     * Get user browser and version
     */
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browserName = "Unknown";
        let browserVersion = "Unknown";

        if (/Edg\/(\d+\.\d+)/.test(userAgent)) {
            // Edge (Chromium-based)
            browserName = "Edge";
            browserVersion = userAgent.match(/Edg\/(\d+\.\d+)/)[1];
        } else if (/Chrome\/(\d+\.\d+)/.test(userAgent) && !/Edg|OPR|Brave/.test(userAgent)) {
            // Chrome (not Edge or Opera or Brave)
            browserName = "Chrome";
            browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)[1];
        } else if (/Firefox\/(\d+\.\d+)/.test(userAgent)) {
            // Firefox
            browserName = "Firefox";
            browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)[1];
        } else if (/Safari\/(\d+\.\d+)/.test(userAgent) && !/Chrome|Edg|OPR|Brave/.test(userAgent)) {
            // Safari (not Chrome, Edge, Opera, or Brave)
            browserName = "Safari";
            browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)[1];
        } else if (/OPR\/(\d+\.\d+)/.test(userAgent)) {
            // Opera
            browserName = "Opera";
            browserVersion = userAgent.match(/OPR\/(\d+\.\d+)/)[1];
        } else if (/MSIE (\d+\.\d+)|rv:(\d+\.\d+)/.test(userAgent)) {
            // Internet Explorer
            browserName = "Internet Explorer";
            browserVersion = userAgent.match(/MSIE (\d+\.\d+)|rv:(\d+\.\d+)/)[1];
        };

        return { browserName, browserVersion };
    };


    /**
     * 
     * @param {*} string 
     * @param {*} html 
     */
    copyToClipboard(string, html="") {
        if (this.getBrowserInfo().browserName !== "Safari") {
            function dummyCopyListener(event) {
                event.clipboardData.setData("text/html", (html === "") ? string: html);
                event.clipboardData.setData("text/plain", string);
                event.preventDefault();
            };
        
            document.addEventListener("copy", dummyCopyListener);
            document.execCommand("copy");
            document.removeEventListener("copy", dummyCopyListener);
        } else {
            const el = document.createElement('textarea');
            el.value = inputString;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        };
    };


    /**
     * 
     * @param {*} mode 
     * @returns 
     */
    copySequence(mode="") {
        const activePlasmid = Session.activePlasmid()
        const selectionIndices = activePlasmid.getSelectionIndices()
        if (!selectionIndices || selectionIndices === null || selectionIndices.filter(i => i !== null).length !== 2) {return};
        
        let selection = activePlasmid.sequence.slice(selectionIndices[0] - 1, selectionIndices[1]);

        switch (mode) {
            case "reverse":
                selection = selection.split("").reverse().join("");
                break;
            case "complement":
                selection = Nucleotides.complementary(selection);
                break;
            case "reverse complement":
                selection = Nucleotides.reverseComplementary(selection);
                break;
        };

        console.log("Utilities.copySequence ->", selection, mode);
        Alerts.showAlert(
            "Copied sequence to clipboard",
            `Sequence: "${selection}" (${selection.length} bp).`,
            3,
            "green",
        )
        this.copyToClipboard(selection);
    };


    /**
     * Remove traditionally made selections
     */
    removeUserSelection() {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        } else if (document.selection) { // IE
            document.selection.empty();
        };
    };



    /**
     * Update current theme.
     */
    updateTheme() {
        document.querySelector("html").setAttribute("data-theme", UserPreferences.get("theme"));
        Coloris({
            themeMode: UserPreferences.get("theme"),
            alpha: false
        });
    };


    addInputValidator(input, validatorType) {
        function validate() {
            const isValid = Utilities.validators[validatorType] ? Utilities.validators[validatorType](input.value) : true;
    
            if (!isValid) {
                input.setAttribute("incorrect", "true")
            } else {
                input.removeAttribute("incorrect")
            };
        };

        if (input.currentValidator) {
            input.removeEventListener("input", input.currentValidator);
        };
    
        input.currentValidator = validate;
        input.addEventListener("input", validate);
    };
};


/**
 * Configure Coloris color picker
 */
Coloris({
    el: '.coloris',
    wrap: true,
    theme: 'polaroid',
    swatches: Utilities.defaultAnnotationColors,
    closeButton: true,
    closeLabel: 'Save',
});