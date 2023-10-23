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
        document.getElementById("primerConcSettingsInput").value = primerConc* 1E9; // Display as nM, 
        document.getElementById("saltConcSettingsInput").value = saltConc;
        document.getElementById("homoRegionTmSettingsInput").value = homoRegionTm;
        document.getElementById("tempRegionTmSettingsInput").value = tempRegionTm;
        document.getElementById("gridWithSettingsInput").value = gridWidth;
    };

    function updateGlobalVariables() {
        primerConc = parseFloat(document.getElementById("primerConcSettingsInput").value) * 1E-9;
        saltConc = parseFloat(document.getElementById("saltConcSettingsInput").value);
        homoRegionTm = parseFloat(document.getElementById("homoRegionTmSettingsInput").value);
        tempRegionTm = parseFloat(document.getElementById("tempRegionTmSettingsInput").value);
        if (parseInt(document.getElementById("gridWithSettingsInput").value) !== gridWidth) {
            makeContentGrid(1);
            if (sequence2 !== "") {
                makeContentGrid(2);
            };
            gridWidth = parseInt(document.getElementById("gridWithSettingsInput").value);
        };
    };

    // Event listener for input changes
    //document.getElementById("settings-window").addEventListener("input", function (event) {
    //    updateGlobalVariables();
    //});

    document.getElementById("save-settings-btn").addEventListener("click", function (event) {
        // Update the global variables when the user clicks "Save Settings"
        updateGlobalVariables();
        // You can also perform additional actions here, like sending data to a server or saving to local storage
        alert("Settings saved!");
    });

    populateSettings();
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
                hideAllHideableWindows();
                showHideableWindow(windowName);
            } else {
                hideAllHideableWindows();
            };
        });

        document.addEventListener('click', function (event) {
            event.stopPropagation();
            if (document.getElementById(windowName).style.display !== "none") {
                const currWindow = document.getElementById(windowName);
                const windowRect = currWindow.getBoundingClientRect();
                
                const clickX = event.clientX;
                const clickY = event.clientY;
                if (
                    clickX < windowRect.left || 
                    clickX > windowRect.right || 
                    clickY < windowRect.top || 
                    clickY > windowRect.bottom
                ) {
                    hideHideableWindow(windowName);
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