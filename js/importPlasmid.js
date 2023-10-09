/**
 * Global variables
 */

// Grid structure, each entry is a row in the table
const gridStructure = ["Forward Strand",
                        "Complementary Strand",
                        "Indices",
                        "Amino Acids",
                        "Annotations"];
const gridStructure2 = ["Forward Strand",
                        "Complementary Strand",
                        "Indices",
                        "Amino Acids",
                        "Annotations"];
const gridWidth = 60; // Amount of cells per row
// Initialise empty sequence and features variables
let sequence = "";
let complementaryStrand = "";
let features = null;
let sequence2 = "";
let complementaryStrand2 = "";
let features2 = null;



/**
 * On window load.
 */
window.onload = function() {

    // Select content div
    const contentDiv = document.querySelector('.content');

    /**
     * Handles file selection functionality.
     */
    function handleFileSelect(event) {
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
              parseDNAFile(fileContent, 1);
            } else {
              parseGBFile(fileContent, 1);
            }
            
            // Update header with filename
            const headerList = document.getElementById('header-list');
            headerList.innerHTML = headerList.innerHTML + "<li><a>" + file.name + "</a></li>";
            
            // Create the sidebar
            createSideBar(1);

            // Create content grid
            makeContentGrid(1, function() {
              contentDiv.style.overflow = 'auto'; // Enable scrolling after file import
              
              // Show the second import button after the first file is imported
              const importSecondButton = document.getElementById('import-second-btn');
              importSecondButton.style.display = 'block';

              // Add an event listener to the second import button
              const fileInputSecond = document.createElement('input');
              fileInputSecond.setAttribute('type', 'file');
              fileInputSecond.addEventListener('change', handleFileSelectSecond);
              // Button listener
              importSecondButton.addEventListener('click', function(event) {
                  event.preventDefault();
                  fileInputSecond.click();
              });
            });
            
            // Once the file is loaded, enable search function
            initiateSearchFunctionality(1);
          };

            // Run reader
            reader.readAsText(file);
          }
        
    };

    // Create file input element and run the file select on click
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.addEventListener('change', handleFileSelect);
    const importLink = document.querySelector('nav ul li a');
    importLink.addEventListener('click', function(event) {
        event.preventDefault();
        fileInput.click();
    });
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
 * Populate the sidebar-
 * 
 * TO DO:
 * - 
 */
function createSideBar(pNr) {
  // Sidebar contents
  let currFeatures = null;
  let sidebarTable = null;
  if (pNr === 1) {
    currFeatures = features;
    sidebarTable = document.getElementById('sidebar-table');
  } else {
    currFeatures = features2;
    sidebarTable = document.getElementById('sidebar-table2');
  }

  sidebarTable.innerHTML = `
      <tr>
          <th>Feature</th>
          <th>Label</th>
          <th>Range</th>
          <th>Note</th>
      </tr>
  `; // Set table headers

  for (const featureName in currFeatures) {
    if (!featureName.includes("LOCUS") && !featureName.includes("source")) {
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
  
      sidebarTable.appendChild(row);
    }
    
  }
}

function checkAnnotationOverlap(inputFeatures, pNr) {
  console.log("CAO: ", gridStructure)
  let maximumOverlap = 0;
  const spansList = [];
  Object.entries(inputFeatures).forEach(([key, value]) => {
    if (value.span && !key.includes("source")) {

      function removeNonNumeric(inputString) {
        const cleanedString = inputString.replace(/[^\d.]/g, '');
        return cleanedString;
      }

      value.span = removeNonNumeric(value.span);
      const range = value.span.split("..").map(Number);
      const rangeStart = range[0];
      const rangeEnd = range[1];
      spansList.push([rangeStart, rangeEnd])
    }
  });

  for (let i = 0; i < spansList.length; i++) {
    const [startA, endA] = spansList[i];
    let currentOverlap = 0;
    for (let j = 0; j < spansList.length; j++) {
      if (i !== j) {
        const [startB, endB] = spansList[j];
        console.log(startA, endA, startB, endB)
        if (startA >= startB && startA <= endB) {
          console.log("++")
          currentOverlap++;
        } else if (endA >= startB && endA <= endB) {
          console.log("++")
          currentOverlap++;
        }
      }
    }
  
    if (currentOverlap > maximumOverlap) {
      maximumOverlap = currentOverlap;
    }
  }
  console.log(maximumOverlap)
  maximumOverlap++;

  let count = 0;

  if (pNr === 1) {
    for (let i = 0; i < gridStructure.length; i++) {
      if (gridStructure[i] === "Annotations") {
        count++;
      }
    }
      
    if (count !== maximumOverlap) {
      for (let i = 0; i < maximumOverlap - count; i++) {
        gridStructure.push("Annotations")
      }
    }
  } else {
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
  console.log("CAO2: ", gridStructure)
  return
}

function changeCursorIcon(state) {
  if (state ==="loading") {
    document.body.classList.add('loading');
  }
}


function makeContentGrid(pNr, callback) {
  document.body.classList.add('loading');
  setTimeout(function() {
    let currSequence = null;
    let currComplementarySequence = null;
    let currFeatures = null;
    let sequenceGrid = null;
    let gridHeight = 0;
    let currGridStructure = null;
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
    checkAnnotationOverlap(currFeatures, pNr);
    let currGridStructureLength = currGridStructure.length;
    gridHeight = Math.ceil(currSequence.length / gridWidth) * currGridStructureLength;
    sequenceGrid.innerHTML = ''; // Clear previous grid contents


    for (let i = 0; i < gridHeight; i++) {
      let row = sequenceGrid.rows[i]; // Get the corresponding row
      if (!row) {
        // If the row doesn't exist, create a new one
        row = sequenceGrid.insertRow(i);
      } 
      for (let j = 0; j < gridWidth; j++) {
        const cell = document.createElement('td');
        let currentChar = ""
        let test = Math.floor(i / currGridStructureLength)
        if ((i + 1) % currGridStructureLength === 1) {
          currentChar = currSequence[test*gridWidth + j]
        } else if ((i + 1) % currGridStructureLength === 2) {
          currentChar = currComplementarySequence[test*gridWidth + j]
        }
        if (!currentChar) {
          currentChar = ""
        }
        cell.textContent = currentChar;
        cell.id = currGridStructure[i % currGridStructureLength];
        cell.classList.add(currGridStructure[i % currGridStructureLength].replace(" ", ""));
        row.appendChild(cell);
      }
    }
    
    Object.entries(currFeatures).forEach(([key, value]) => {
      if (value.span && !key.includes("source")) {
        function removeNonNumeric(inputString) {
          const cleanedString = inputString.replace(/[^\d.]/g, '');
          return cleanedString;
        }
        value.span = removeNonNumeric(value.span);
        const range = value.span.split("..").map(Number);
        const rangeStart = range[0];
        const rangeEnd = range[1];

        console.log(value.label, rangeStart + ".." + rangeEnd)
        makeAnnotation(rangeStart - 1, rangeEnd - 1, value.label, pNr, currGridStructure); 
      }
    });

    promoterTranslation(pNr);
    featureTranslation(pNr);
    document.body.classList.remove('loading');
    if (typeof callback === 'function') {
      callback();
    };
  }, 1);
}

function makeAnnotation(rStart, rEnd, text, pNr, currGridStructure) {
  const annotationColor = generateRandomUniqueColor();
  recentColor = annotationColor;
  let row = (Math.floor(rStart / gridWidth)) * currGridStructure.length;
  let col = rStart - (row/currGridStructure.length)*gridWidth;
  row = row + currGridStructure.indexOf("Annotations");
  const annotationSpan = rEnd - rStart;

  let currentSpan = annotationSpan;
  let carryOver = annotationSpan;
  
  let i = 0;
  while (carryOver > 0) {
    if (i != 0) {
        text = "..." + text.replace("...", "");
    }
    if (col + currentSpan >= gridWidth) {
      console.log("MA1");
      carryOver = col + currentSpan - gridWidth;
      currentSpan = gridWidth - col;
      mergeCells(row, col, 1, currentSpan, text + "...", annotationColor, pNr,currGridStructure);
      currentSpan = carryOver;
      row = row + currGridStructure.length;
      col = 0;
    } else if (currentSpan === gridWidth) {
      console.log("MA2");
      mergeCells(row, col, 1, currentSpan, text, annotationColor, pNr,currGridStructure);
      mergeCells(row + currGridStructure.length, col, 1, 1, text, annotationColor, pNr,currGridStructure);
      carryOver = 0;
    } else {
      console.log("MA3");
      mergeCells(row, col, 1, currentSpan + 1
        , text, annotationColor, pNr, currGridStructure);
      carryOver = 0;
    }
    i++;
  }
}

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

function getRandomBackgroundColor() {
  const baseColors = ["#FFB6C1", "#FFDAB9", "#FFA07A", "#FFC0CB", "#87CEFA", "#98FB98", "#FF69B4", "#90EE90"];

  const remainingColors = baseColors.filter(color => color !== recentColor);
  const randomIndex = Math.floor(Math.random() * remainingColors.length);
  const randomColor = remainingColors[randomIndex];

  return randomColor;
}

function shiftColor(color) {
  const colorValue = parseInt(color.slice(1), 16);
  const shiftAmount = 30; // Adjust the shift amount as desired

  const r = (colorValue >> 16) & 0xff;
  const g = (colorValue >> 8) & 0xff;
  const b = colorValue & 0xff;

  const shiftedR = Math.max(0, Math.min(255, r + shiftAmount));
  const shiftedG = Math.max(0, Math.min(255, g + shiftAmount));
  const shiftedB = Math.max(0, Math.min(255, b + shiftAmount));

  const shiftedHex = `#${(shiftedR << 16 | shiftedG << 8 | shiftedB).toString(16).padStart(6, '0')}`;

  return shiftedHex;
}

let recentColor = '';

function generateRandomUniqueColor() {
  let randomColor = getRandomBackgroundColor();
  
  // Ensure the generated color is different from the recent color
  while (randomColor === recentColor) {
    randomColor = getRandomBackgroundColor();
  }
  
  // Update the recent color to the newly generated color
  recentColor = randomColor;

  return randomColor;
}

const promoters = {
  "CMV": "CGCAAATGGGCGGTAGGCGTG",
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
  "HindIII": "AGGATCCCCACTGACCGGCCCGGGTTCGTCAGGCTGGCTCCTAGCACCAT"
};

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

function promoterTranslation(pNr) {
  function findAllOccurrences(string, substring) {
    const indices = [];
    let index = string.indexOf(substring);
  
    while (index !== -1) {
      indices.push(index);
      index = string.indexOf(substring, index + 1);
    }
  
    return indices;
  }

  let currSequence = "";
  if (pNr === 1) {
    currSequence = sequence;
  } else {
    currSequence = sequence2;
  }


  for (let promoter in promoters) {
    let promoterSeq = promoters[promoter];
    const occurrences = findAllOccurrences(currSequence, promoterSeq);
    if (occurrences.length !== 0) {
      for (let i = 0; i < occurrences.length; i++) {
        startTranslation(currSequence.indexOf("ATG", occurrences[i] + promoter.length) + 1, pNr);
      }
    }
  }
}

function featureTranslation(pNr) {

  let currSequence = "";
  let currFreatures = [];
  if (pNr === 1) {
    currSequence = sequence;
    currFreatures = features;
  } else {
    currSequence = sequence2;
    currFreatures = features2;
  }

  Object.entries(currFreatures).forEach(([key, value]) => {
    if (value.span && !key.includes("source")) {
      function removeNonNumeric(inputString) {
        const cleanedString = inputString.replace(/[^\d.]/g, '');
        return cleanedString;
      }
      value.span = removeNonNumeric(value.span);
      const range = value.span.split("..").map(Number);
      const rangeStart = range[0];
      const rangeEnd = range[1];
      startTranslation(rangeStart, pNr);
    }
  });
}

function seqIndexToCoords(inputIndex, targetRow, currGridStructure) {
  const outputRow = (Math.floor(inputIndex / gridWidth))*currGridStructure.length + targetRow;
  const outputIndex = inputIndex - Math.floor(inputIndex / gridWidth)*gridWidth - 1;
  return [outputRow, outputIndex];
}

function startTranslation(codonPos, pNr) {
  let currGridStructure = null;
  let currSequence = "";
  if (pNr === 1) {
    currSequence = sequence;
    currGridStructure = gridStructure;
  } else {
    currSequence = sequence2;
    currGridStructure = gridStructure2;
  }
  const rowIndexAA = currGridStructure.indexOf("Amino Acids");
  let tableCoords = seqIndexToCoords(codonPos, rowIndexAA, currGridStructure);

  let row = tableCoords[0];
  let col = tableCoords[1] + 1;
  console.log("Starting translationa at " + codonPos + "(" + row + ", " + col + ").");

  while (true) {
    let codon = repeatingSlice(currSequence, codonPos - 1, codonPos + 2);
    let aminoAcid = translateCodon(codon);

    fillAACells(row, col, aminoAcid, pNr);
    col += 3;
    codonPos += 3;
    if (col > gridWidth) {
      col -= gridWidth;
      row += currGridStructure.length;
    }
    if (aminoAcid === "-" || codonPos > currSequence.length){
      break;
    }
  }
}

function fillAACells(row, col, text, pNr) {

  let table = null;
  let currGridStructure = null;
  if (pNr === 1) {
    table = document.getElementById('sequence-grid');
    currGridStructure = gridStructure;
  } else {
    table = document.getElementById('sequence-grid2');
    currGridStructure = gridStructure2;
  }
  let mainCell = table.rows[row].cells[col];
  if (!mainCell) {
    row += currGridStructure.length;
    col = col - gridWidth;

    mainCell = table.rows[row].cells[col];
  }

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