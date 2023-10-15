/**
 * On window load.
 */
window.onload = function() {
    // Create file input element and run the file select on click
    addImportButtonListener(1);

    // Demo buttoon functionality
    const demoButton = document.getElementById("import-demo-btn");
    demoButton.addEventListener('click', function() {
      importDemoFile(1);
    });
};


/**
 * Add event listener to the first import button.
 */
function addImportButtonListener(pNr) {
  const targetButton = (pNr === 1) ? '#import-btn a': '#import-second-btn a';
  console.log(targetButton);
  document.querySelector(targetButton).addEventListener('click', function (event) {
    event.preventDefault();
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', handleFileSelect);
    fileInput.pNr = pNr;
    fileInput.click();
  });
}


/**
 * Handles file selection functionality.
 */
function handleFileSelect(event) {
  const pNr = event.target.pNr;
  console.log("Importing plasmid nr: ", pNr);
  const file = event.target.files[0]; // Get file path.
  const fileExtension =  /\.([0-9a-z]+)(?:[\?#]|$)/i.exec(file.name)[0]; // Fish out file extension of the file
  // If the file has an acceptable file extension start parsing
  const acceptedFileExtensions = [".gbk", ".gb", ".dna"]
  if (acceptedFileExtensions.includes(fileExtension)) {
    // Initialise file reader
    const reader = new FileReader();

    // Define reader
    reader.onload = function(e) {
      const fileContent = e.target.result; // Read file content
      
      // Depending on file extension pass the file content to the appropiate parser
      if (fileExtension === ".dna") {
        parseDNAFile(fileContent, pNr);
      } else {
        parseGBFile(fileContent, pNr);
      }
      
      // Update header with filename
      let targetHeadersListElement = (pNr === 1) ? "plasmid-file-name1" : "plasmid-file-name2";
      targetHeadersListElement = document.getElementById(targetHeadersListElement);
      targetHeadersListElement.innerHTML = file.name;
      
      // Create the sidebar
      createSideBar(pNr);

      // Create content grid
      if (pNr === 1) {
        makeContentGrid(1, function() {
            const contentDiv = document.querySelector('.content')
            contentDiv.style.overflow = 'auto'; // Enable scrolling after file import

            // Hide the import demo file button
            const demoButton = document.getElementById("import-demo-btn");
            demoButton.style.display = 'none';
            
            // Show the second import button after the first file is imported
            const importSecondButton = document.getElementById('import-second-btn');
            importSecondButton.style.display = 'block';

            // Add an event listener to the second import button
            addImportButtonListener(2);
            addImportButtonListener(1);
          });
      } else {
        makeContentGrid(2);
      };
      
      // Once the file is loaded, enable search function
      initiateSearchFunctionality(pNr);

      if (pNr === 2) {
        // Get the first container div
        const firstPlasmidContainer = document.getElementById('first-plasmid-container');

        // After the second file is imported, create the second plasmid window
        const secondPlasmidContainer = document.getElementById('second-plasmid-container');
        secondPlasmidContainer.style.display = 'flex';

        // Set the height of the divs to 50vh
        firstPlasmidContainer.style.height = '50vh';
        secondPlasmidContainer.style.height = '50vh';

        // Set overflow to auto
        firstPlasmidContainer.style.overflow = 'auto';
        secondPlasmidContainer.style.overflow = 'auto';
        
        secondPlasmidImported = true;
      };
    };

      // Run reader
      reader.readAsText(file);
    }
};


/**
 * Import demo file.
 */
function importDemoFile(pNr) {
  console.log("Importing demo")
  // Initialise file reader
  const fileName = "pET-28 a (+).gb"
  
  parseGBFile(pet28aPlus, pNr);
    
  // Update header with filename
  let targetHeadersListElement = (pNr === 1) ? "plasmid-file-name1" : "plasmid-file-name2";
  targetHeadersListElement = document.getElementById(targetHeadersListElement);
  targetHeadersListElement.innerHTML = fileName;
  
  // Create the sidebar
  createSideBar(pNr);

  // Create content grid
  if (pNr === 1) {
    makeContentGrid(pNr, function() {
      const contentDiv = document.querySelector('.content')
      contentDiv.style.overflow = 'auto'; // Enable scrolling after file import

      // Hide the import demo file button
      const demoButton = document.getElementById("import-demo-btn");
      demoButton.style.display = 'none';

      // Show the second import button after the first file is imported
      const importSecondButton = document.getElementById('import-second-demo-btn');
      importSecondButton.style.display = 'block';


      // Add an event listener to the second import button
      const secondDemoButton = document.getElementById("import-second-demo-btn");
      secondDemoButton.addEventListener('click', function() {
        importDemoFile(2);
      });
      addImportButtonListener(1);
    });
  } else {
    makeContentGrid(pNr);
    addImportButtonListener(1);
    // Hide  the second import button after the first file is imported
    const importSecondButton = document.getElementById('import-second-demo-btn');
    importSecondButton.style.display = 'none';
  }

  if (pNr === 2) {
    // After the second file is imported, create the second plasmid window
    const secondPlasmidContainer = document.getElementById('second-plasmid-container');
    secondPlasmidContainer.style.display = 'flex';
    const divider = document.getElementById('divider');
    divider.style.display = 'block';

    // Get the first container div
    const firstPlasmidContainer = document.querySelector('.container');

    // Set the height of the divs to 50vh
    firstPlasmidContainer.style.height = '50vh';
    secondPlasmidContainer.style.height = '50vh';

    // Set overflow to auto
    firstPlasmidContainer.style.overflow = 'auto';
    secondPlasmidContainer.style.overflow = 'auto';
    
    secondPlasmidIported = true;
  };
    
  // Once the file is loaded, enable search function
  initiateSearchFunctionality(pNr);
};


/**
 * Genebank file parser.
 * 
 * 
 * TO DO:
 * - fix joined features
 * - retain all information about the features (colour, complementary strand features)
 */
function parseGBFile(fileContent, pNr) {

  /**
   * Extracts the sequence from the end of the file.
   * Data is structure as:
   * ORIGIN      
        1 tcaatattgg ccattagcca tattattcat tggttatata gcataaatca atattggcta
       61 ttggccattg catacgttgt atctatatca taatatgtac atttatattg gctcatgtcc
      121 aatatgaccg ccatgttggc attgattatt gactagttat taatagtaat caattacggg
   */
  function extractSequence(input) {
    // Find "ORIGIN" and delete everything before the sequence
    input = input.substring(input.indexOf("ORIGIN") + "ORIGIN".length);
    // Regular expressions to get the sequence out
    let output = input.replace(/\n/g, '').replace(/\/\//g, '').split(' ').filter(x => !/\d/.test(x));
    output = output.join('').toUpperCase().trim().replace(/[\r\n]+/g, "")
    return output;
  }
  

  /**
   * Extracts the features.
   * Data structure:
   * regulatory      1..742
                     /regulatory_class="promoter"
                     /note="CMV immediate/early promoter"
                     /label="CMV immediate/early promoter regulatory"
     intron          857..989
                     /note="chimeric intron"
                     /label="chimeric intron"
     regulatory      1033..1052
                     /regulatory_class="promoter"
                     /note="T7 RNA polymerase promoter"
                     /label="T7 RNA polymerase promoter regulatory"
   */
  function extractFeatures(input) {
    // Convert file content to list of lines
    const inputLines = input.split('\n').map(line => line.trim()).filter(line => line);
    
    const featuresDict = {}; // initialise features dict

    // Add LOCUS feature which is defined on the first line
    const firstLine = inputLines[0];
    const locusNote = firstLine.trim();
    featuresDict['LOCUS'] = { note: locusNote.replace("LOCUS ", ""), span: "", label: ""};

    // Start deleting lines until we find the lines with "FEATURES"
    while (inputLines.length > 0 && !inputLines[0].includes("FEATURES")) {
        inputLines.shift(); // Remove the first item
    }
    inputLines.shift(); // Remove the line with "FEATURES"
    

    // Iterate over the remaining lines and group the lines based on what feature they belong to
    const featureList = [];
    let currentFeature = '';
    for (const line of inputLines) {
      if (line.includes('..')) { // If the line has .., then its probalby the line with the span
        if (currentFeature !== '') {
          featureList.push(currentFeature); // If this is not the first loop, send the feature with the lines collected so far
        }
        currentFeature = ''; // Reset
      }
      // Add the current line to the current feature
      currentFeature += line + '\n';
    }
    
    // If theres still a feature not yet pushed, push it
    if (currentFeature !== '') {
      featureList.push(currentFeature);
    }
    
    
    // Iterate over the list of features and parse them into a dict
    for (const feature of featureList) {
      // Split current feature into a list of lines
      const lines = feature.split('\n').map(line => line.trim()).filter(line => line);

      // Ignore joined features for now
      if (!lines[0].includes("join")) {
        // Get feature name
        let featureName = lines[0].substring(0, lines[0].indexOf(' '));
        // If theres an identical feature in the dict, give it a different name
        let i = 0;
        while (featureName in featuresDict) {
          if (`${featureName}${i}` in featuresDict) {
            i++;
          } else {
            featureName = `${featureName}${i}`;
            break;
          }
        }
        
        // Start collecting info about the feature, starting with the span
        // Span is always on the first line, for now ignore complement spans
        const featureInfo = {
          span: lines[0].includes('complement') ? lines[0].substring(lines[0].indexOf('complement')) : lines[0].replace(featureName, '').trim()
        };
      
        // Iterate over the rest of the lines and save the properties to the feature info dict
        for (let j = 1; j < lines.length; j++) {
          const property = lines[j];
          const propertyName = property.substring(0, property.indexOf('=')).replace('/', '').replace('"', '');
          const propertyBody = property.substring(property.indexOf('=') + 1).replace(/"/g, '').trim();
      
          featureInfo[propertyName] = propertyBody;
        }
      
        // Add the feature info dict to the features dict
        featuresDict[featureName] = featureInfo;
      }
    }
    
    // Return the dict
    return featuresDict;
  }
    

  // Extract the sequence and features and save it to the specified plasmid variables
  if (pNr === 1) {
    features = extractFeatures(fileContent);
    sequence = extractSequence(fileContent);
    complementaryStrand = getComplementaryStrand(sequence);
  } else {
    features2 = extractFeatures(fileContent);
    sequence2 = extractSequence(fileContent);
    complementaryStrand2 = getComplementaryStrand(sequence2);
  }
}


/**
 * Snapgene file parser.
 * 
 * 
 * TO DO:
 * - try more dna files to make sure parses works
 */
function parseDNAFile(fileContent, pNr) {
  // File needs to be read as byte stream
  let fileBA = new TextEncoder().encode(fileContent);

  /**
   * Return the index of the matching subarray of bytes in the input byteArray.
   */
  function findSubarrayIndex(byteArray, subarray) {
    for (let i = 0; i <= byteArray.length - subarray.length; i++) {
      let match = true;
      for (let j = 0; j < subarray.length; j++) {
        if (byteArray[i + j] !== subarray[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        return i;
      }
    }
    return -1;
  }

  // Extract sequence data
  // Sequence data USUALLY ends in byte array 02 00 00, so find that and keep only stuff before it
  let sequenceBA = fileBA.slice(25, findSubarrayIndex(fileBA, [2, 0, 0]));
  let currSequence = new TextDecoder().decode(sequenceBA).toUpperCase().replace(/[^TACG]/gi, ''); // Convert to string and only keep ACTG
  let currComplementarySequence = getComplementaryStrand(currSequence); // Create complementary strand

  // Extract features
  // Towards the end of the file there is an XML tree containing the data for the features
  // Extract XML tree
  let featuresString = fileContent.slice(fileContent.indexOf("<Features"), fileContent.indexOf("</Feature></Features>") + "</Feature></Features>".length);

  // Parse the string into an XML object
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(featuresString, 'text/xml');
  
  // Initialize dict and iterate over all feature elements in the object
  const featuresDict = {};
  const featuresList = xmlDoc.getElementsByTagName('Feature');
  for (let i = 0; i < featuresList.length; i++) {
      const feature = featuresList[i]; // Current feature
      const featureName = feature.getAttribute('name') + i; // Feature id

      // All the feature properties
      const featureInfo = {}
      featureInfo["label"] = feature.getAttribute('name'); // Display name
      featureInfo["span"] = "";
      featureInfo["note"] = "";
      let spanStart = null;
      let spanEnd = null;

      // Iterate over children to find properties
      const featureChildren = feature.children;
      for (let j = 0; j < featureChildren.length; j++) {
          const child = featureChildren[j]; // Current child
          const childName = child.nodeName; // Get the node name

          // Nodes with the name "Segment" contain:
          // span, color, type, translated
          if (childName === "Segment") {
              let currSpan = child.getAttribute('range').split("-"); // Get span and split into list
              // Add span to feature info
              featureInfo["span"] = currSpan[0] + ".." + currSpan[1];
          }
          // Nodes with the name "Q" contain:
          // feature name, "V" nodes (contains the note text or a number)
          if (childName === "Q") {
              const subNoteName = child.getAttribute('name'); // Get name
              let subNoteEntry = "";
              // If the V node is an int
              if (child.children[0].attributes.getNamedItem("int")) {
                  subNoteEntry = child.children[0].getAttribute("int");
              }
              // If the V node has text
              if (child.children[0].attributes.getNamedItem("text")) {
                  subNoteEntry = child.children[0].getAttribute("text"); // Get text entry
                  subNoteEntry = new DOMParser().parseFromString(subNoteEntry, 'text/html').body.textContent; // Sometimes the text contains html
              }
              // Save note to the dict
              featureInfo["note"] += subNoteName + ": " + subNoteEntry + "; ";
          }
      }

      // Append feature info the corresponding feature in the dict
      featuresDict[featureName] = featureInfo;

  }

  // Extract the sequence and features and save it to the specified plasmid variables
  if (pNr === 1) {
      sequence = currSequence;
      complementaryStrand = currComplementarySequence;
      features = featuresDict;
  } else {
      sequence2 = currSequence;
      complementaryStrand2 = currComplementarySequence;
      features2 = featuresDict;
  }
}


/**
 * Populate the sidebar with the features from the specified plasmid.
 */
function createSideBar(pNr) {
  // Sidebar contents
  let currFeatures = null;
  let sidebarTable = null;
  // Select the target sidebar table and select the appropriate features dict
  if (pNr === 1) {
    currFeatures = features;
    sidebarTable = document.getElementById('sidebar-table');
  } else {
    currFeatures = features2;
    sidebarTable = document.getElementById('sidebar-table2');
  }

  // Set table headers
  sidebarTable.innerHTML = `
      <tr>
          <th class = 'wrap-text'>Feature</th>
          <th class = 'wrap-text'>Label</th>
          <th class = 'wrap-text'>Range</th>
          <th class = 'wrap-text'>Note</th>
      </tr>
  `;

  // Iterate over the features and populate the table
  for (const featureName in currFeatures) {
    if (!featureName.includes("LOCUS") && !featureName.includes("source")) { // Skip LOCUS and source
      const feature = currFeatures[featureName];

      // Create a new table row
      let row = document.createElement('tr');
  
      // Add feature name
      const nameCell = document.createElement('td');
      nameCell.textContent = featureName;
      nameCell.className = 'wrap-text';
      row.appendChild(nameCell);
  
      // Add feature label
      const labelCell = document.createElement('td');
      labelCell.textContent = feature.label || '';
      labelCell.className = 'wrap-text';
      row.appendChild(labelCell);
  
      // Add feature range
      const rangeCell = document.createElement('td');
      rangeCell.textContent = feature.span.replace("misc_feature ", "");
      rangeCell.className = 'wrap-text';
      row.appendChild(rangeCell);
  
      // Add feature note
      const noteCell = document.createElement('td');
      noteCell.textContent = feature.note || '';
      noteCell.className = 'wrap-text';
      row.appendChild(noteCell);
  
      // Append the row to the table
      sidebarTable.appendChild(row);
    }
    
  }
}


/**  
 * Remove everything but numbers and ".." in order to have a clean span
*/
function removeNonNumeric(inputString) {
  const cleanedString = inputString.replace(/[^\d.]/g, '');
  return cleanedString;
}


/**
 * Check the annotation overlap to see how many rows are needed to accomodate all the annotations.
 * Also changes the gridstructure if more rows are needed for annotations.
 */
function checkAnnotationOverlap(inputFeatures, pNr) {
  let maximumOverlap = 0;
  
  // Iterate over all features and add their spans to a list
  const spansList = [];
  Object.entries(inputFeatures).forEach(([key, value]) => {
    if (value.span && !key.includes("source")) { // Exclude source

      // Get the current span and push it to the spans list
      value.span = removeNonNumeric(value.span);
      const range = value.span.split("..").map(Number);
      const rangeStart = range[0];
      const rangeEnd = range[1];
      spansList.push([rangeStart, rangeEnd])
    }
  });

  // Check each span against the rest
  for (let i = 0; i < spansList.length; i++) {
    // Get the i-th span
    const [startA, endA] = spansList[i];
    let currentOverlap = 0;
    // Check against every other span to see how many it overlaps
    for (let j = 0; j < spansList.length; j++) {
      if (i !== j) { // Excludes itself
        const [startB, endB] = spansList[j]; // Overlap to cehck against
        
        // Increment the current overlap if they do overlap
        if (startA >= startB && startA <= endB) {
          console.log("++")
          currentOverlap++;
        } else if (endA >= startB && endA <= endB) {
          console.log("++")
          currentOverlap++;
        }
      }
    }

    // IF a new maximum overlap was found, replace the previous one
    if (currentOverlap > maximumOverlap) {
      maximumOverlap = currentOverlap;
    }
  }
  // Increase once more for good measure
  maximumOverlap++;

  // Adjust the grid structure according to maximumOverlap
  let count = 0;
  if (pNr === 1) { // First plasmid
    // Count how many rows are already dedicated to annotations
    for (let i = 0; i < gridStructure.length; i++) {
      if (gridStructure[i] === "Annotations") {
        count++;
      }
    }
    
    // If more rows are needed, append them
    if (count !== maximumOverlap) {
      for (let i = 0; i < maximumOverlap - count; i++) {
        gridStructure.push("Annotations")
      }
    }
  } else { // Same as for the first plasmid
    for (let i = 0; i < gridStructure2.length; i++) {
      if (gridStructure2[i] === "Annotations") {
        count++;
      }
    }
      
    if (count !== maximumOverlap) {
      for (let i = 0; i < maximumOverlap - count; i++) {
        gridStructure2.push("Annotations")
      }
    }
  }
  return
}


// Creat the content table grid
function makeContentGrid(pNr, callback) {
  // Changes the cursor to have a loading icon
  document.body.classList.add('loading');

  setTimeout(function() {
    // Init variables
    let currSequence = null;
    let currComplementarySequence = null;
    let currFeatures = null;
    let sequenceGrid = null;
    let gridHeight = 0;
    let currGridStructure = null;
    // Assign variables from the specified plasmid
    if (pNr === 1) {
      currSequence = sequence;
      currComplementarySequence = complementaryStrand;
      currFeatures = features;
      sequenceGrid = document.getElementById('sequence-grid');
      currGridStructure = gridStructure;
    } else {
      currSequence = sequence2;
      currComplementarySequence = complementaryStrand2;
      currFeatures = features2;
      sequenceGrid = document.getElementById('sequence-grid2');
      currGridStructure = gridStructure2;
    }

    // Check the annotation overlap to see if the grid structure has enough "Annotations" rows
    checkAnnotationOverlap(currFeatures, pNr);

    // Create the grid
    let currGridStructureLength = currGridStructure.length; // How many rows per line 
    // Sequence length / gridWidth rounded up to the nearest multiple to see how many lines are needed
    // Multiply with the amount of rows per line to get the total amount of table rows
    gridHeight = Math.ceil(currSequence.length / gridWidth) * currGridStructureLength;

    // Clear previous grid contents
    sequenceGrid.innerHTML = '';
    // Iterate over each row 
    for (let i = 0; i < gridHeight; i++) {
      let row = sequenceGrid.rows[i]; // Get the corresponding row$
      // If the row doesn't exist, create a new one
      if (!row) {
        row = sequenceGrid.insertRow(i);
      } 
      // Populate the sequence cells with the corresponding base
      for (let j = 0; j < gridWidth; j++) {
        const cell = document.createElement('td'); // Create the cell
        let currentChar = ""
        let linesCreated = Math.floor(i / currGridStructureLength) // Check how many "lines" have been created so far
  
        if ((i + 1) % currGridStructureLength === 1) { // If we're on the forward strand
          currentChar = currSequence[linesCreated*gridWidth + j] // Add the corrseponding char
        } else if ((i + 1) % currGridStructureLength === 2) {// If we're on the comlpementary strand
          currentChar = currComplementarySequence[linesCreated*gridWidth + j]
        }
        // If we've run out of bases to add add nothing
        if (!currentChar) {
          currentChar = ""
        }

        // Insert the base to the cell's text content
        cell.textContent = currentChar;
        // Add a cell id to distinguish the cells
        cell.id = currGridStructure[i % currGridStructureLength];
        // Add a cell class
        cell.classList.add(currGridStructure[i % currGridStructureLength].replace(" ", ""));
        // Append the cell to the row
        row.appendChild(cell);
      }
    }
    
    // Iterate over the features and create the annotatations
    Object.entries(currFeatures).forEach(([key, value]) => {
      if (value.span && !key.includes("source")) { // If the feature includes a span and is not "source"
        // Get the current feature's span
        value.span = removeNonNumeric(value.span);
        const range = value.span.split("..").map(Number);
        const rangeStart = range[0];
        const rangeEnd = range[1];

        console.log(value.label, rangeStart + ".." + rangeEnd)
        // Make the annotation at the specified indices
        makeAnnotation(rangeStart - 1, rangeEnd - 1, value.label, pNr, currGridStructure); 
      }
    });

    // Check the sequence for common promotes and start the translation there
    promoterTranslation(pNr);
    // Start the transaltion at the beginning of each feature
    featureTranslation(pNr);

    // Change the cursor's icon to normal
    document.body.classList.remove('loading');
    if (typeof callback === 'function') {
      callback();
    };
  }, 1);
}


/**
 * Creates the annoations from the span's start to the end, breaking the feature up into
 * multiple if it spans multiple lines.
 * 
 * TO DO:
 * - at the moment it is very slow, maybe find a better way
 * - use the feature's color from the file instead of giving it a random one every time
 */
function makeAnnotation(rStart, rEnd, text, pNr, currGridStructure) {
  // Get a random annoation color
  const annotationColor = generateRandomUniqueColor();
  recentColor = annotationColor; // Store the colour history

  // Convert from sequence coords to table coords
  let row = (Math.floor(rStart / gridWidth)) * currGridStructure.length;
  let col = rStart - (row/currGridStructure.length)*gridWidth;
  row += currGridStructure.indexOf("Annotations");
  console.log("here", rStart, row, currGridStructure.length, gridWidth, col)

  // Annotaiton span length
  const annotationSpan = rEnd - rStart;
  let currentSpan = annotationSpan; // Current span to draw
  let carryOver = annotationSpan; // Carry over for next line
  
  let i = 0; // Iteration counter
  // Draw until there is no more carry over
  while (carryOver > 0) {
    // If the feature spans multiple lines, add "..." to the beginning of the feature
    if (i != 0) {
        text = "..." + text.replace("...", "");
    }

    // Merge the corresponding cells to draw the annoation
    if (col + currentSpan >= gridWidth) {
      // If the currenspan would not fit on the line, draw it until we reach the end and
      // put the rest into carry over
      console.log("MA1");
      // Calculate carry over
      carryOver = col + currentSpan - gridWidth;
      // Calculate length of the current annoation
      currentSpan = gridWidth - col;
      // Merge the corresponding cells and create the annotaion
      mergeCells(row, col, 1, currentSpan, text + "...", annotationColor, pNr,currGridStructure);
      // Adjust the current span
      currentSpan = carryOver;
      // Increment the row
      row = row + currGridStructure.length;
      // Reset cell index
      col = 0;
    } else if (currentSpan === gridWidth) {
      // If the currentspan covers exactly the current line there is some weird behaviour
      // so fill in the current line and one additional cell in the the following row
      console.log("MA2");
      mergeCells(row, col, 1, currentSpan, text, annotationColor, pNr,currGridStructure);
      mergeCells(row + currGridStructure.length, col, 1, 1, text, annotationColor, pNr,currGridStructure);
      // Set carry over to 0 to signify that we're done
      carryOver = 0;
    } else {
      // The annotation can be fully drawn on the current row
      console.log("MA3");
      mergeCells(row, col, 1, currentSpan + 1, text, annotationColor, pNr, currGridStructure);
      // Set carry over to 0 to signify that we're done
      carryOver = 0;
    }
    // Increment iteration counter
    i++;
  }
}


/**
 * Draws the annotation by merging the specified cells, adding th text and adding the color.
 * 
 * TO DO:
 * - 
 */
function mergeCells(row, col, rowspan, colspan, text, color, pNr, currGridStructure) {
  console.log("Merge cells1: ", row, col, colspan, text)
  // Check which grid were doing
  let table = null;
  if (pNr === 1){
    table = document.getElementById('sequence-grid');
  } else {
    table = document.getElementById('sequence-grid2');
  }

  // Adjust row and col
  let occupiedCellsList = [];
  let occupiedCellsCounter = 0;
  for (let i = 0; i < currGridStructure.length; i++) {
    if (currGridStructure[i] === "Annotations") {
      // Find already occupied cells
      occupiedCellsList = [];
      occupiedCellsCounter = 0;
      for (let i = 0; i < table.rows[row].cells.length; i++) {
        if (table.rows[row].cells[i].attributes.hasOwnProperty('colspan')) {
          let currColSpan = parseInt(table.rows[row].cells[i].attributes["colspan"].value);
          console.log("Colspan ", currColSpan);
          occupiedCellsCounter++;
          for (let i = 0; i <  currColSpan; i++) {
            occupiedCellsList.push(true);
          }
        } else {
          occupiedCellsList.push(false);
        }
      }
      
      console.log(col, col+colspan-1, row, occupiedCellsList);
      if (occupiedCellsList.slice(col, col + colspan - 1).every(value => value !== true)) {
        console.log("Go right ahead sir.")
        break;
      } else {
        console.log("Try next row.")
        row++;
      }
    }
  }
  
  let nrOccupiedCells = occupiedCellsList.slice(0, col).filter(value => value === true).length;
  console.log("nrOccupiedCells ", nrOccupiedCells, occupiedCellsList.slice(0, col))
  console.log("Merge cells1.5 : ", row, col, colspan, text)
  if (nrOccupiedCells !== 0) {
    col -= nrOccupiedCells;
    col += occupiedCellsCounter;
  }
  console.log("Merge cells2: ", row, col, colspan, text)
  let mainCell = table.rows[row].cells[col];
  mainCell.rowSpan = rowspan;
  mainCell.colSpan = colspan;
  mainCell.style.backgroundColor = color;
  // Add text to the center of the merged cell
  if (text.length > colspan)  {
    if (colspan <= 3) {
      text = "";
      for (let l = 0; l < colspan; l++) {
        text += ".";
      }
    } else {
      text = text.slice(0, colspan - 3).replace(/\./g, "") + "...";
    }
  }
  const textNode = document.createTextNode(text);
  mainCell.appendChild(textNode);
  mainCell.style.textAlign = 'center';

  // Remove extra cells
  let k = 0;
  for (let j = col + 1; j < col + colspan; j++) {
    const cell = table.rows[row].cells[j - k];
    cell.parentNode.removeChild(cell);
    k++;
  }
}


/**
 * Generates a random color that was not used recently.
 */
function generateRandomUniqueColor() {
  const baseColors = ["#FFB6C1", "#FFDAB9", "#FFA07A", "#FFC0CB", "#87CEFA", "#98FB98", "#FF69B4", "#90EE90"];

  const remainingColors = baseColors.filter(color => color !== recentColor);
  const randomIndex = Math.floor(Math.random() * remainingColors.length);
  const randomColor = remainingColors[randomIndex];

  return randomColor;
}

/**
 * Function that translates the input codon into its corresponding amino acid.
 */
function translateCodon(codon) {
  const codonTable = {
    'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
    'TGT': 'C', 'TGC': 'C',
    'GAT': 'D', 'GAC': 'D',
    'GAA': 'E', 'GAG': 'E',
    'TTT': 'F', 'TTC': 'F',
    'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
    'CAT': 'H', 'CAC': 'H',
    'ATT': 'I', 'ATC': 'I', 'ATA': 'I',
    'AAA': 'K', 'AAG': 'K',
    'TTA': 'L', 'TTG': 'L', 'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
    'ATG': 'M',
    'AAT': 'N', 'AAC': 'N',
    'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
    'CAA': 'Q', 'CAG': 'Q',
    'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R', 'AGA': 'R', 'AGG': 'R',
    'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S', 'AGT': 'S', 'AGC': 'S',
    'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
    'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
    'TGG': 'W',
    'TAT': 'Y', 'TAC': 'Y',
    'TAA': '-', 'TAG': '-', 'TGA': '-'
  };

  return codonTable[codon] || '';
}


/**
 * Searches the specified sequence for the common promotes and starts translation wherever it finds one.
 */
function promoterTranslation(pNr) {
  // List of common promoters
  const promoters = {"CMV": "CGCAAATGGGCGGTAGGCGTG",
                      "EF1α": "CCACGGGACACCATCTTTAC",
                      "RSV": "CGCGTGCTAGAACAGATGAGGACCCTGGGAGCTCTCTC",
                      "PGK": "TCCATTTGCCTAGCTGTTTGA",
                      "T7": "TAATACGACTCACTATAGGG",
                      "Lac": "TTACAGCTCATGCGGCGTTCT",
                      "Tet": "TATAAATGCTAGATGCTAGTTATCATGCTATACGAAGTTGT",
                      "Hsp70": "CCACCCACAGCTCAGACGTTGTTGCTGCTGCTGCACGCGTG",
                      "GAPDH": "CTGACCTGCCGTCTAGAAAA",
                      "CMV-IE": "CGCAGGGTTTTCCCAGTCACGAC",
                      "EF1α-HTLV": "CCACGGGACACCATCTTTAC",
                      "U6": "GACGCTCATGGAAGACGCCAAA",
                      "CAG": "AGGATCCCCACTGACCGGCCCGGGTTC",
                      "SV5": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGGTTTTCCCAGTCACGAC",
                      "CAAG": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGGAATGCCACCGCCGCCG",
                      "β-actin": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT",
                      "PGK1": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGATATCATGACAAGAGCA",
                      "HTLV": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGACTCCGCTTTGCTGAAA",
                      "EF1": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGCTGGCTGGAGTTCA",
                      "RR": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGACTAGCCACCATGTTTT",
                      "SV": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGAGATCCGCCACCATTGG",
                      "5xGal4AD": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGAGGAGAAGACCACAGCC",
                      "Rous Sarcoma Virus": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGAGATCCGCCACCATTGG",
                      "MSCV": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGAGATCCGCCACCATTGG",
                      "Bsd": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT",
                      "Kozak": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT",
                      "FspI": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT",
                      "Sp6": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT",
                      "SeAP": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT",
                      "SphI": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT",
                      "BamHI": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT",
                      "SalI": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT",
                      "XhoI": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT",
                      "HindIII": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT"};
  // Function that generates a list of all occurences of the subtring in the input string
  function findAllOccurrences(string, substring) {
    const indices = [];
    let index = string.indexOf(substring);
  
    while (index !== -1) {
      indices.push(index);
      index = string.indexOf(substring, index + 1);
    }
  
    return indices;
  }

  // Select the correct sequence to search
  let currSequence = "";
  if (pNr === 1) {
    currSequence = sequence;
  } else {
    currSequence = sequence2;
  }

  // Iterate over the promotes, finds a list of indices for all the positions where it can be found
  // then starts the translation at the first ATG it finds from there.
  for (let promoter in promoters) {
    // Get all occurences of the promoter sequence in the plasmid sequence
    const occurrences = findAllOccurrences(currSequence, promoters[promoter]);
    // If any occurences were found, iterate over them and start looking for "ATG" and start translating there
    if (occurrences.length !== 0) {
      for (let i = 0; i < occurrences.length; i++) {
        startTranslation(currSequence.indexOf("ATG", occurrences[i] + promoter.length) + 1, pNr);
      }
    }
  }
}


// Star a translation at the beginning of each feature
function featureTranslation(pNr) {
  // Select the corresponding features and sequence
  let currSequence = "";
  let currFreatures = [];
  if (pNr === 1) {
    currSequence = sequence;
    currFreatures = features;
  } else {
    currSequence = sequence2;
    currFreatures = features2;
  }

  // Iterate over features and start the translation at the beginning of its span
  Object.entries(currFreatures).forEach(([key, value]) => {
    if (value.span && !key.includes("source")) {
      value.span = removeNonNumeric(value.span);
      const range = value.span.split("..").map(Number);
      const rangeStart = range[0];
      const rangeEnd = range[1];
      startTranslation(rangeStart, pNr);
    }
  });
}


/**
 * Convert sequence indices to table coordinates
 */
function seqIndexToCoords(inputIndex, targetRow, currGridStructure) {
  const outputRow = (Math.floor(inputIndex / gridWidth))*currGridStructure.length + targetRow;
  const outputIndex = inputIndex - Math.floor(inputIndex / gridWidth)*gridWidth - 1;
  return [outputRow, outputIndex];
}


/**
 * Starts a translation at the specified position and populates the amino acid row with the translation.
 * 
 * TO DO:
 * - allow translation to loop over to the beginning of the plasmid
 */
function startTranslation(codonPos, pNr) {
  // Select the corresponding features and sequence
  let currGridStructure = null;
  let currSequence = "";
  if (pNr === 1) {
    currSequence = sequence;
    currGridStructure = gridStructure;
  } else {
    currSequence = sequence2;
    currGridStructure = gridStructure2;
  }

  // Convert to table coordinates based on the row order in the grid structure
  const rowIndexAA = currGridStructure.indexOf("Amino Acids");
  let tableCoords = seqIndexToCoords(codonPos, rowIndexAA, currGridStructure);

  // Get the row and column, increment the column by 1 because the amino acids are
  // displayed in the middle cell of a group of 3 cells
  let row = tableCoords[0];
  let col = tableCoords[1] + 1;

  // Start translating until a stop codon is encountered
  console.log("Starting translationa at " + codonPos + "(" + row + ", " + col + ").");
  while (true) {
    // Select current codon
    let codon = repeatingSlice(currSequence, codonPos - 1, codonPos + 2);
    // Get the corresponding amino acid
    let aminoAcid = translateCodon(codon);

    // Fill the cells
    fillAACells(row, col, aminoAcid, pNr);
    // Jump to next position
    col += 3;
    codonPos += 3;
    // If we've jumped off of the table go to the next row
    if (col > gridWidth) {
      col -= gridWidth;
      row += currGridStructure.length;
    }
    // If the last displayed amino acid was a stop codon or we've reached the end of the sequence, stop
    if (aminoAcid === "-" || codonPos > currSequence.length){
      break;
    }
  }
}


/**
 * Merge 3 cells in the amino acids row in order to display the amino acid.
 * 
 * TO DO:
 * - 
 */
function fillAACells(row, col, text, pNr) {
  // Select the corresponding features and sequence
  let table = null;
  let currGridStructure = null;
  if (pNr === 1) {
    table = document.getElementById('sequence-grid');
    currGridStructure = gridStructure;
  } else {
    table = document.getElementById('sequence-grid2');
    currGridStructure = gridStructure2;
  }

  // Select the middle cell
  let mainCell = table.rows[row].cells[col];
  if (!mainCell) { // If the cell does not exist, try the next row over at the beginning
    row += currGridStructure.length;
    col = col - gridWidth;

    mainCell = table.rows[row].cells[col];
  }

  // Select the left and right cells
  const leftCell = table.rows[row].cells[col-1];
  const rightCell = table.rows[row].cells[col+1];
  // Check and clear text in leftCell
  if (leftCell && leftCell.textContent) {
    leftCell.textContent = '';
  }

  // Check and clear text in rightCell
  if (rightCell && rightCell.textContent) {
    rightCell.textContent = '';
  }

  // Add text to the center of the merged cell
  mainCell.textContent = text;
  mainCell.style.textAlign = 'center';
}