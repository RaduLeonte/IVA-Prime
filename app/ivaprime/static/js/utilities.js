const Utilities = new class {
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
        const remainingColors = defaultAnnotationColors.filter(color => color !== recentColor);
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


    /**
     * Find width of the scrollbar by generating a temporary div.
     * 
     * @returns {Number} - Width of scrollbar.
     */
    getScrollbarWidth() {
        const tempDiv = document.createElement('div');
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.overflow = 'scroll';
        document.body.appendChild(tempDiv);
        
        const innerTempDiv = document.createElement('div');
        tempDiv.appendChild(innerTempDiv);
        
        const scrollbarWidth = (tempDiv.offsetWidth - innerTempDiv.offsetWidth);
        
        tempDiv.parentNode.removeChild(tempDiv);
        
        return scrollbarWidth;
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

        this.copyToClipboard(selection);
    };
};