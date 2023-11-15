/**
 * TM Calc input listeners
 */
document.addEventListener('DOMContentLoaded', function () {
    /**
     * Melting temp calc inputs.
     */
    const primerInput1 = document.getElementById("tm-calc-primer-input1");
    const primerInput2 = document.getElementById("tm-calc-primer-input2");
    const primerTmSpan1 = document.getElementById("tm-calc-primer-tm1");
    const primerTmSpan2 = document.getElementById("tm-calc-primer-tm2");

    // Add input event listeners to both input elements
    primerInput1.addEventListener("input", function () {
        updateTmSpan(primerInput1, primerTmSpan1);
    });
    primerInput2.addEventListener("input", function () {
        updateTmSpan(primerInput2, primerTmSpan2);
    });

    // Function to update the <span> element with the input value
    function updateTmSpan(inputElement, tmSpan) {
        // Get the value from the input element
        const inputValue = inputElement.value;
        if (inputValue !== "" && /^[ACTG]+$/.test(inputValue)) {
            tmSpan.textContent = parseFloat(get_tm(inputValue, primerConc, saltConc).toFixed(2));
        } else {
            tmSpan.textContent = "--";
        };
    };

    /**
     * Settings inputs.
     */
    function populateSettings() {
        document.getElementById("primerConcSettingsInput").value = parseFloat(primerConc * 1E9).toFixed(2); // Display as nM, 
        document.getElementById("saltConcSettingsInput").value = saltConc;
        document.getElementById("homoRegionTmSettingsInput").value = homoRegionTm;
        document.getElementById("tempRegionTmSettingsInput").value = tempRegionTm;
        document.getElementById("upperBoundShortInsertionsInput").value = upperBoundShortInsertions;
        document.getElementById("gridWithSettingsInput").value = gridWidth;
    };


    function updateGlobalVariables() {
        // Primer concentration
        const unroundedPrimerConc = parseFloat(document.getElementById("primerConcSettingsInput").value)
        primerConc = unroundedPrimerConc.toFixed(2) * 1E-9;
        saveUserPreference("primerConc", primerConc, 30, true, true);

        // Salt correction
        applyingSaltCorrection = document.getElementById("applyingSaltCorrectionCheckbox").checked;
        saveUserPreference("applyingSaltCorrection", applyingSaltCorrection, 30, true, true);

        saltConc = parseFloat(document.getElementById("saltConcSettingsInput").value);
        saveUserPreference("saltConc", saltConc, 30, true, true);

        saltCorrectionEquation = document.getElementById("saltCorrectionEquation").value;
        saveUserPreference("saltCorrectionEquation", saltCorrectionEquation, 30, true, true);

        // DMSO correction
        applyingDMSOCorrection = document.getElementById("applyingDMSOCorrectionCheckbox").checked;
        saveUserPreference("applyingDMSOCorrection", applyingDMSOCorrection, 30, true, true);

        dmsoConc = parseFloat(document.getElementById("dmsoConcSettingsInput").value);
        saveUserPreference("dmsoConc", dmsoConc, 30, true, true);

        // Primer settings
        homoRegionTm = parseFloat(document.getElementById("homoRegionTmSettingsInput").value);
        saveUserPreference("homoRegionTm", homoRegionTm, 30, true, true);

        tempRegionTm = parseFloat(document.getElementById("tempRegionTmSettingsInput").value);
        saveUserPreference("tempRegionTm", tempRegionTm, 30, true, true);

        upperBoundShortInsertions = parseFloat(document.getElementById("upperBoundShortInsertionsInput").value);
        saveUserPreference("upperBoundShortInsertions", upperBoundShortInsertions, 30, true, true);

        if (parseInt(document.getElementById("gridWithSettingsInput").value) !== gridWidth) {
            if (sequence !== "") {
                makeContentGrid(1);
            };
            if (sequence2 !== "") {
                makeContentGrid(2);
            };
            gridWidth = parseInt(document.getElementById("gridWithSettingsInput").value);
            saveUserPreference("gridWidth", gridWidth, 30, true, true);
        };
        console.log(document.cookie);
    };

    // Event listener for input changes
    //document.getElementById("settings-window").addEventListener("input", function (event) {
    //    updateGlobalVariables();
    //});

    document.getElementById("save-settings-btn").addEventListener("click", function (event) {
        // Update the global variables when the user clicks "Save Settings"
        updateGlobalVariables();
        // You can also perform additional actions here, like sending data to a server or saving to local storage
        //alert("Settings saved!");
        hideAllHideableWindows();
    });

    populateSettings();

    /**
     * Salt correction equation listener
     */
    const saltCorrectionSelect = document.getElementById("saltCorrectionEquation");
    const saltCorrectionEquationImage = document.getElementById("saltCorrectionEquationImage");

    function updateSaltCorrectionImageSource() {
        console.log("Change", saltCorrectionSelect.value, "assets/" + saltCorrectionEquation + " equation.png")
        saltCorrectionEquationImage.src = "assets/" + saltCorrectionSelect.value + " equation.png";
        saveUserPreference("saltCorrectionEquation", saltCorrectionSelect.value, 30, true, true);
        saltCorrectionEquation = saltCorrectionSelect.value;
    };
    saltCorrectionSelect.addEventListener("change", updateSaltCorrectionImageSource);
    updateSaltCorrectionImageSource();
});


/**
 * Display window.
 */
function showHideableWindow(windowID) {
    const targetWindow = document.getElementById(windowID);
    targetWindow.style.display = 'block';

    repositionHideableWindow(windowID);
};


/**
 * Hide window.
 */
function hideHideableWindow(windowID) {
    const targetWindow = document.getElementById(windowID);
    targetWindow.style.display = 'none';
};


/**
 * Reposition window on resize
 */
function repositionHideableWindow(windowID) {
    const targetWindow = document.getElementById(windowID);
    const rectButton = document.getElementById(windowID.replace("-window", "") + "-btn").getBoundingClientRect();
    const rectHeader = document.getElementsByTagName("header")[0].getBoundingClientRect();
  
    targetWindow.style.right = (window.innerWidth - rectButton.right) + "px";
    targetWindow.style.top = rectHeader.bottom + "px";
};


/**
 * Hide all hideable windows.
 */
function hideAllHideableWindows() {
    const popupWindows = document.querySelectorAll('.hideable-window');
    for (const popupWindow of popupWindows) {
        popupWindow.style.display = 'none';
    };
};


/**
 * Button listener.
 */
document.addEventListener('DOMContentLoaded', function () {
    const elementsWithHideableClass = document.querySelectorAll('.hideable-window');
    const listOfWindows = Array.from(elementsWithHideableClass).map(element => element.id);
    for (const windowName of listOfWindows) {
        const button = document.getElementById(windowName.replace("-window", "") + '-btn');
        
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            event.stopImmediatePropagation()
            if (document.getElementById(windowName).style.display === "none") {
                //console.log("Hiding windows1")
                hideAllHideableWindows();
                showHideableWindow(windowName);
            } else {
                hideAllHideableWindows();
                //console.log("Hiding windows2")
            };
        });

        document.addEventListener('click', function (event) {
            event.stopPropagation();
            if (document.getElementById(windowName).style.display !== "none") {
                const currWindow = document.getElementById(windowName);
                const windowRect = currWindow.getBoundingClientRect();
                
                const clickX = event.clientX;
                const clickY = event.clientY;
                console.log("Hiding windows", clickX, clickY, windowRect.left, windowRect.right, windowRect.top, windowRect.bottom)
                console.log("Hiding windows", clickX < windowRect.left, clickX > windowRect.right,clickY < windowRect.top, clickY > windowRect.bottom)
                if (clickX !== 0, clickY !== 0) {
                    if (
                        clickX < windowRect.left || 
                        clickX > windowRect.right || 
                        clickY < windowRect.top || 
                        clickY > windowRect.bottom
                    ) {
                        hideHideableWindow(windowName);
                        console.log("Hiding windows3")
                    };
                };
            };
        });

        window.addEventListener('resize', function () {
            if (document.getElementById(windowName).style.display !== "none") {
                repositionHideableWindow(windowName);
            };
        });
    };
});