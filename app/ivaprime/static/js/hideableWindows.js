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
    const primerTmInfo1 = document.getElementById("tm-calc-info-span1");
    const primerTmInfo2 = document.getElementById("tm-calc-info-span2");

    // Add input event listeners to both input elements
    primerInput1.addEventListener("input", function () {
        updateTmSpan(primerInput1, primerTmSpan1, primerTmInfo1);
    });
    primerInput2.addEventListener("input", function () {
        updateTmSpan(primerInput2, primerTmSpan2, primerTmInfo2);
    });

    // Function to update the <span> element with the input value
    function updateTmSpan(inputElement, tmSpan, infoSpan) {
        // Get the value from the input element
        const inputValue = inputElement.value;
        if (inputValue !== "" && /^[ACTG]+$/.test(inputValue)) {
            tmSpan.textContent = parseFloat(get_tm(inputValue, primerConc, saltConc).toFixed(2));
        } else {
            tmSpan.textContent = "--";
        };
        infoSpan.textContent = "(" + meltingTempAlgorithmChoice + ", " + Math.round(primerConc) + " nM";
        if (applyingSaltCorrection) {infoSpan.textContent += ", " + saltCorrectionEquation + ", " + saltConc + " M";};
        infoSpan.textContent += ")";
    };

    /**
     * Settings inputs.
     */
    function populateSettings() {
        const container = document.getElementById("settings-window");
        const setingsElements = container.querySelectorAll('input[type="text"], input[type="checkbox"], input[type="number"], select');

        setingsElements.forEach(function (element) {
            // Get the variable name based on the element's ID
            var variableName = element.id.replace("SettingsElement", "");

            // Check if the variable exists
            if (eval(variableName) !== undefined) {
                // Set the element's value to the variable's value
                console.log(eval(variableName))
                element.value = eval(variableName);
            };
        });
    };


    /**
     * Settings inputs.
     */
    function resetDefaultSettings() {
        const container = document.getElementById("settings-window");
        const setingsElements = container.querySelectorAll('input[type="text"], input[type="checkbox"], input[type="number"], select');

        setingsElements.forEach(function (element) {
            // Get the variable name based on the element's ID
            var variableName = element.id.replace("SettingsElement", "");

            // Check if the variable exists
            if (eval(variableName) !== undefined) {
                if (element.type === "text" || element.type === "number" || element.tagName === "SELECT") {
                    element.value = defaultSetingsDict[variableName];
                } else if (element.type === "checkbox") {
                    element.checked = defaultSetingsDict[variableName];
                };
            };
        });
        updateGlobalVariables()
    };


    function updateGlobalVariables() {
        const container = document.getElementById("settings-window");
        const setingsElements = container.querySelectorAll('input[type="text"], input[type="checkbox"], input[type="number"], select');

        setingsElements.forEach(function (element) {
            // Get the variable name based on the element's ID
            var variableName = element.id.replace("SettingsElement", "");

            // Check if the variable exists
            if (eval(variableName) !== undefined) {
                // Set the element's value to the variable's value
                console.log(element, element.tagName, element.type)
                if (element.type === "text") {
                    console.log(variableName + " = parseFloat(document.getElementById(\"" + variableName + "SettingsElement\"" +").value)")
                    eval(variableName + " = parseFloat(document.getElementById(\"" + variableName + "SettingsElement\"" + ").value)");
                } else if (element.tagName === "SELECT") {
                    eval(variableName + " = document.getElementById(\"" + variableName + "SettingsElement\"" + ").value");
                } else if (element.type === "checkbox") {
                    eval(variableName + " = document.getElementById(\"" + variableName + "SettingsElement\"" + ").checked");
                } else if (element.type === "number") {
                    if (variableName === "gridWidth") {
                        if (gridWidth !== parseInt(document.getElementById(variableName + "SettingsElement").value)) {
                            if (sequence !== "") {
                                makeContentGrid(1);
                            };
                            if (sequence2 !== "") {
                                makeContentGrid(2);
                            };
                        };
                    };
                    eval(variableName + " = parseInt(document.getElementById(\"" + variableName + "SettingsElement\"" + ").value)");
                };
                saveUserPreference(variableName, eval(variableName), 30, true, true);
            };
        });
        updateMeltingTemperatureAlgorithmImageSource();
        updateSaltCorrectionImageSource
        console.log("Updating settings:", JSON.stringify(JSON.parse(getCookieValue('userPreferences') || '{}'), null, 2));
    };

    // Event listener for input changes
    //document.getElementById("settings-window").addEventListener("input", function (event) {
    //    updateGlobalVariables();
    //});

    document.getElementById("reset-default-settings-btn").addEventListener("click", function (event) {
        resetDefaultSettings();
    });

    document.getElementById("save-settings-btn").addEventListener("click", function (event) {
        // Update the global variables when the user clicks "Save Settings"
        updateGlobalVariables();
        // You can also perform additional actions here, like sending data to a server or saving to local storage
        //alert("Settings saved!");
        hideAllHideableWindows();
    });

    populateSettings();

    /**
     * Melting temperature calculator algorithm listener
     */
    const meltingTempAlgorithmSelect = document.getElementById("meltingTempAlgorithmChoiceSettingsElement");
    const meltingTempAlgorithmEquationImage = document.getElementById("meltingTempAlgorithmEquationImage");

    function updateMeltingTemperatureAlgorithmImageSource() {
        const newPath = "/static/" + meltingTempAlgorithmSelect.value + "%20equation.png"
        console.log("Change", meltingTempAlgorithmSelect.value, newPath)
        meltingTempAlgorithmEquationImage.src = newPath;
        saveUserPreference("meltingTempAlgorithmChoice", meltingTempAlgorithmSelect.value, 30, true, true);
        meltingTempAlgorithmChoice = meltingTempAlgorithmSelect.value;
    };
    meltingTempAlgorithmSelect.addEventListener("change", updateMeltingTemperatureAlgorithmImageSource);
    updateMeltingTemperatureAlgorithmImageSource();

    /**
     * Salt correction equation listener
     */
    const saltCorrectionSelect = document.getElementById("saltCorrectionEquationSettingsElement");
    const saltCorrectionEquationImage = document.getElementById("saltCorrectionEquationImage");

    function updateSaltCorrectionImageSource() {
        const newPath = "/static/" + saltCorrectionSelect.value + "%20equation.png"
        console.log("Change", saltCorrectionSelect.value, newPath)
        saltCorrectionEquationImage.src = newPath;
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