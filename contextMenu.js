let clickedOffset = 0;

document.addEventListener('DOMContentLoaded', function() {
    const targetElementId = 'forward_strand'; // Replace with the ID of your target element
  
    // Create a custom context menu element
    const contextMenu = document.createElement('div');
    contextMenu.className = 'custom-context-menu';
    contextMenu.innerHTML = `<ul>
                                <li id="menu-item-1">Insert</li>
                                <li id="menu-item-2">Option 2</li>
                            </ul>`;
    document.body.appendChild(contextMenu);
  
    // Hide the custom context menu by default
    contextMenu.style.display = 'none';
  
    // Function to handle the context menu event
    function handleContextMenu(event) {
      event.preventDefault();
  
      const paragraph = document.getElementById(targetElementId);
  
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
  
      clickedOffset = getCharacterOffset(paragraph, event.clientX, event.clientY);
  
      if (selectedText) {
        console.log('Selected text:', selectedText);
        console.log(get_tm(selectedText, 100E-9, 0.5));
      }
  
      console.log('Clicked position:', clickedOffset);
  
      // Position the custom context menu
      contextMenu.style.top = event.pageY + 'px';
      contextMenu.style.left = event.pageX + 'px';
      contextMenu.style.display = 'block';
    }
  
    // Function to handle hiding the custom context menu
    function hideContextMenu() {
      contextMenu.style.display = 'none';
    }
  
    // Add event listeners for the context menu
    document.addEventListener('contextmenu', function(event) {
      if (event.target.matches(`#${targetElementId}`)) {
        handleContextMenu(event);
      } else {
        hideContextMenu();
      }
    });
  
    // Hide the context menu when clicking outside of it
    document.addEventListener('click', function(event) {
      if (!event.target.closest('.custom-context-menu')) {
        hideContextMenu();
      }
    });
  
    // Handle menu item clicks
    contextMenu.addEventListener('click', function(event) {
      const menuItemId = event.target.id;
  
      if (menuItemId === 'menu-item-1') {
        console.log('Insert');
        const fwd_strand = document.getElementById('forward_strand');
        const rev_strand = document.getElementById('complementary_strand');
        const seq = "AAAA"
        const insertion = "<span style='color: red; font-weight: bold;'>" + seq + "</span>"
        const insertionComplementary = "<span style='color: red; font-weight: bold;'>" + getComplementaryStrand(seq)  + "</span>"
        fwd_strand.innerHTML = fwd_strand.innerHTML.slice(0, clickedOffset) + insertion + fwd_strand.innerHTML.slice(clickedOffset);
        rev_strand.innerHTML = rev_strand.innerHTML.slice(0, clickedOffset) + insertionComplementary + rev_strand.innerHTML.slice(clickedOffset);
      } else if (menuItemId === 'menu-item-2') {
        console.log('Option 2 selected');
      }
  
      hideContextMenu();
    });
  
    // Function to get the character offset within an element
    function getCharacterOffset(element, clientX, clientY) {
      const caretPosition = document.caretPositionFromPoint(clientX, clientY);
      const range = new Range();
      range.setStart(element, 0);
      range.setEnd(caretPosition.offsetNode, caretPosition.offset);
      return range.toString().length;
    }
  });


function get_tm(sequence, c, m) {
    console.log(sequence)
    function find_in_dict(dictionary, pair) {
        let key = null;
      
        for (let [dictKey, value] of Object.entries(dictionary)) {
          if (dictKey.slice(0, 2).includes(pair)) {
            key = dictKey;
            break;
          } else if (dictKey.slice(0, 2).includes(pair.split('').reverse().join(''))) {
            key = dictKey;
            break;
          } else if (dictKey.slice(-2).includes(pair)) {
            key = dictKey;
            break;
          } else if (dictKey.slice(-2).includes(pair.split('').reverse().join(''))) {
            key = dictKey;
            break;
          }
        }
      
        return dictionary[key];
    }

    // Constants or params
    const R = 1.987; // cal mol-1 K-1 universal gas constant

    // cal mol-1
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

    // cal k-1 mol-1
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

    /*
    H0 and S0
    */
    let deltaH0 = 0; // cal * mol-1 enthalpy
    let deltaS0 = 0; // cal K-1 mol-1 entropy

    // Symmetry correction
    let symm_fraction = 4;
    const complementary = getComplementaryStrand(sequence);
    if (sequence === complementary) {
        deltaS0 += -1.4;
        symm_fraction = 1;
    }

    // Nucleation term
    if (sequence.includes("G") || sequence.includes("C")) {
        deltaH0 += 0.1E3;
        deltaS0 += -2.8;
    } else {
        deltaH0 += 2.3E3;
        deltaS0 += 4.1;
    }

    for (let i = 0; i < sequence.length - 1; i++) {
        const pair = sequence[i] + sequence[i + 1];

        const to_addH = find_in_dict(deltaH_dict, pair);
        deltaH0 += to_addH;

        const to_addS = find_in_dict(deltaS_dict, pair);
        deltaS0 += to_addS;
    }

    const tm = (deltaH0 / (deltaS0 + R * Math.log(c / symm_fraction))) - 273.15;
    const tm_corr = tm + 16.6 * Math.log(m);

    return tm_corr;
}