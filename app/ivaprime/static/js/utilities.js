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
};