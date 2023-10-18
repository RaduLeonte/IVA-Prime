/**
 * Melting temperature calculator for DNA duplexes.
 * 
 * sequence - primer of interest
 * c - primer concentration in M
 * m - salt concentration in M
 */
function get_tm(sequence, c, m) {

    /**
     * Find nucleotide pair in the enthalpy or entropy dictionaries. Function searches for the presence of the 
     * nucleotide pair or its reverse in the dictionary keys.
     */
    function find_in_dict(dictionary, pair) {
      let key = null;

      // Check for pair in the first 2 characters of dict keys
      for (const dictKey of Object.keys(dictionary)) {
        if (dictKey.slice(0, 2) === pair) {
          key = dictKey;
          return dictionary[key];
        }
      }
    
      // Check for reverse of pair in the first 2 characters of dict keys
      for (const dictKey of Object.keys(dictionary)) {
        if (dictKey.slice(0, 2) === pair.split('').reverse().join('')) {
          key = dictKey;
          return dictionary[key];
        }
      }
    
      // Check for pair in the last 2 characters of dict keys
      for (const dictKey of Object.keys(dictionary)) {
        if (dictKey.slice(-2) === pair) {
          key = dictKey;
          return dictionary[key];
        }
      }
    
      // Check for reverse of pair in the last 2 characters of dict keys
      for (const dictKey of Object.keys(dictionary)) {
        if (dictKey.slice(-2) === pair.split('').reverse().join('')) {
          key = dictKey;
          return dictionary[key];
        }
      }
    
      return null;
    }

    // Constants or params
    const R = 1.987; // cal mol-1 K-1 universal gas constant

    // Enthalpy data (cal mol-1)
    const deltaH_dict = {
        "AA/TT": -7.9E3,
        "AT/TA": -7.2E3,
        "TA/AT": -7.2E3,
        "CA/GT": -8.5E3,
        "GT/CA": -8.4E3,
        "CT/GA": -7.8E3,
        "GA/CT": -8.2E3,
        "CG/GC": -10.6E3,
        "GC/CG": -9.8E3,
        "GG/CC": -8.0E3
    }; 

    // Entropy data (cal k-1 mol-1)
    const deltaS_dict = {
        "AA/TT": -22.2,
        "AT/TA": -20.4,
        "TA/AT": -21.3,
        "CA/GT": -22.7,
        "GT/CA": -22.4,
        "CT/GA": -21.0,
        "GA/CT": -22.2,
        "CG/GC": -27.2,
        "GC/CG": -24.4,
        "GG/CC": -19.9
    };

    /**
     * Initialize enthalpy and entropy
     */
    let deltaH0 = 0; // cal * mol-1 enthalpy
    let deltaS0 = 0; // cal K-1 mol-1 entropy

    // Symmetry correction
    // If the primer is completely symmetric, there is an entropy gain and the symmetry fraction
    // is different
    let symm_fraction = 4;
    const complementary = getComplementaryStrand(sequence);
    if (sequence === complementary) {
        console.log("Symmetric")
        deltaS0 += -1.4;
        symm_fraction = 1;
    }

    // Nucleation term
    // The first pair to anneal is the nucleation point, but since G-C bonds are so strong it basically
    // always starts annealing there. If there is a G or C anywhere in the sequence add GC contributions
    // otherwise, the AT contributions.
    if (sequence.includes("G") || sequence.includes("C")) {
        deltaH0 += 0.1E3;
        deltaS0 += -2.8;
    } else {
        deltaH0 += 2.3E3;
        deltaS0 += 4.1;
    }

    // Loop over the sequence and add the contributions of each pair of nucleotides.
    for (let i = 0; i < sequence.length - 1; i++) {
        const pair = sequence[i] + sequence[i + 1];

        const to_addH = find_in_dict(deltaH_dict, pair);
        deltaH0 += to_addH;

        const to_addS = find_in_dict(deltaS_dict, pair);
        deltaS0 += to_addS
    }
    
    // Calculate the melting temperature and convert from K to C
    const tm = (deltaH0 / (deltaS0 + R * Math.log(c / symm_fraction))) - 273.15; 
    // Add a salt correction
    const tm_corr = tm + 16.6 * Math.log(m);

    return tm_corr;
};


/**
 * Melting temperature calculator window.
 */
document.addEventListener('DOMContentLoaded', function () {
  // Creat the popup window and immediately hide it.
  const tmCalcWindow = document.createElement('div');
  tmCalcWindow.id = "tm-calc-window"
  tmCalcWindow.className = 'tm-calc-window';
  tmCalcWindow.innerHTML = `
    <h2 id="tm-calc-header">Calculate melting temperatures:</h2>
    <div>
      <label for="tm-calc-primer-input1">Primer 1 TM = <span id="tm-calc-primer-tm1">--</span> °C</label>
      <input type="text" id="tm-calc-primer-input1"  class="popup-window-input">
    </div>
    <div>
      <label for="tm-calc-primer-input2">Primer 2 TM = <span id="tm-calc-primer-tm2">--</span> °C</label>
      <input type="text" id="tm-calc-primer-input2"  class="popup-window-input">
    </div>
  `;
  tmCalcWindow.style.display = 'none';
  document.body.appendChild(tmCalcWindow);

  /**
   * Input listeners
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
    }
    
  }
});


/**
 * Display melting temperature calculator window.
 */
function showTmCalcWindow() {
  console.log("Show me! 2")
  const tmCalcWindow = document.getElementById('tm-calc-window');
  tmCalcWindow.style.display = 'block';
  //tmCalcWindow.style.position = "fixed";

  repositionTmCalcWindow();
}


/**
 * Hide melting temperature calculator window.
 */
function hideTmCalcWindow() {
  console.log("Goodbye! 2")
  const tmCalcWindow = document.getElementById('tm-calc-window');
  tmCalcWindow.style.display = 'none';
}


/**
 * Reposition window on resize
 */
function repositionTmCalcWindow() {
  const tmCalcWindow = document.getElementById('tm-calc-window');
  const rectButton = document.getElementById('tm-calc-btn').getBoundingClientRect();
  const rectHeader = document.getElementsByTagName("header")[0].getBoundingClientRect();

  tmCalcWindow.style.right = (window.innerWidth - rectButton.right) + "px";
  tmCalcWindow.style.top = rectHeader.bottom + "px";
}

/**
 * Button listener.
 */
document.addEventListener('DOMContentLoaded', function () {
  const tmCalcButton = document.getElementById("tm-calc-btn");
  tmCalcButton.addEventListener('click', function(event) {
    event.stopPropagation();
    if (!isTmCalcWindowVisible) {
      console.log("Show me! 1");
      showTmCalcWindow();
      isTmCalcWindowVisible = true;
    }
  });

  document.addEventListener('click', function (event) {
    event.stopPropagation();
    if (isTmCalcWindowVisible && !event.target.closest('#tm-calc-window')) {
      console.log("Goodbye! 1");
      hideTmCalcWindow();
      isTmCalcWindowVisible = false;
    }
  });

  window.addEventListener('resize', function () {
    if (isTmCalcWindowVisible) {
      repositionTmCalcWindow();
    };
  });
});