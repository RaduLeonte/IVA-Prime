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
 * Add event listener to the export buttons
 */
function addExportButtonsListeners(pNr) {
  console.log("Enabling Export Buttons", pNr)
  let targetDropdown = (pNr === 1) ? '#export-dropdown': '#export-dropdown-second';
  targetDropdown = document.querySelector(targetDropdown);
  targetDropdown.style.display = "block";

  let targetButtonLink1 = (pNr === 1) ? '#export-btn-gb': '#export-second-btn-gb';
  targetButtonLink1 = document.querySelector(targetButtonLink1);
  let targetButtonLink2 = (pNr === 1) ? '#export-btn-dna': '#export-second-btn-dna';
  targetButtonLink2 = document.querySelector(targetButtonLink2);

  targetButtonLink1.addEventListener('click', function() {
    exportGBFile(pNr);
  });
  targetButtonLink2.addEventListener('click', function() {
    exportDNAFile(pNr);
  });
};


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
      let currentFileContent = e.target.result;
      if (pNr === 1) {
        importedFileContent1 = currentFileContent; // Read file content
      } else {
        importedFileContent2 = currentFileContent; // Read file content
      }
      
      
      // Depending on file extension pass the file content to the appropiate parser
      if (fileExtension === ".dna") {
        parseDNAFile(currentFileContent, pNr);
      } else {
        parseGBFile(currentFileContent, pNr);
      }
      
      // Update header with filename
      let targetHeadersListElement = (pNr === 1) ? "plasmid-file-name1" : "plasmid-file-name2";
      targetHeadersListElement = document.getElementById(targetHeadersListElement);
      targetHeadersListElement.innerHTML = file.name;
      // Update global variables
      if (pNr === 1) {
        originalFileExtension1 = fileExtension;
      } else {
        originalFileExtension2 = fileExtension;
      };
      
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
        firstPlasmidContainer.style.height = '50%';

        // Set overflow to auto
        firstPlasmidContainer.style.overflow = 'auto';
        secondPlasmidContainer.style.overflow = 'auto';
        
        secondPlasmidImported = true;
      };
    };

      // Run reader
      reader.readAsText(file);

      // Enable export buttons
      addExportButtonsListeners(pNr);
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
    // Get the first container div
    const firstPlasmidContainer = document.getElementById('first-plasmid-container');

    // After the second file is imported, create the second plasmid window
    const secondPlasmidContainer = document.getElementById('second-plasmid-container');
    secondPlasmidContainer.style.display = 'flex';

    // Set the height of the divs to 50vh
    firstPlasmidContainer.style.height = '50%';

    // Set overflow to auto
    firstPlasmidContainer.style.overflow = 'auto';
    secondPlasmidContainer.style.overflow = 'auto';
    
    secondPlasmidImported = true;
  };
    
  // Once the file is loaded, enable search function
  initiateSearchFunctionality(pNr);
  // Enable export buttons
  addExportButtonsListeners(pNr);
};


/**
 * Genebank file parser.
 * 
 * 
 * TO DO:
 * - fix joined features
 */
function parseGBFile(fileContent, pNr) {
  // Extract header
  let currFileHeader = fileContent.substring(0, fileContent.indexOf("FEATURES")).split('\n');
  let headerDict = {}
  const headerNrSpaces = 12;
  let lastAddedProperty = "";
  let propertyCounter = 0;
  for (l in currFileHeader) {
    console.log("FileHeader", currFileHeader[l])
    if (currFileHeader[l]) {
      let propertyName = currFileHeader[l].substring(0, headerNrSpaces).trim();
      if (propertyName !== "") {
        const leadingSpaces = currFileHeader[l].match(/^\s*/);
        const leadingSpacesNr = (leadingSpaces) ? leadingSpaces[0].length : 0;
        propertyName = " ".repeat(leadingSpacesNr) + propertyName;
        headerDict[propertyCounter] = {}
        headerDict[propertyCounter]["name"] = propertyName;
        headerDict[propertyCounter]["value"] = currFileHeader[l].substring(headerNrSpaces).replace("\r", "");
        lastAddedProperty = propertyCounter;
        propertyCounter++;
      } else {
        console.log("FileHeader2", lastAddedProperty, currFileHeader[l].substring(headerNrSpaces))
        headerDict[lastAddedProperty]["value"] = "" + headerDict[lastAddedProperty]["value"] + " " + currFileHeader[l].substring(headerNrSpaces);
        console.log("FileHeader2", headerDict[lastAddedProperty]["value"])
      };
    };
  };

  console.log("FileHeader", headerDict, fileContent)

  if (pNr === 1) {
    importedFileHeader1 = headerDict;
  } else {
    importedFileHeader2 = headerDict;
  }

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
      if (line === "ORIGIN") {
        break;
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
      const oldLines = feature.split('\n').map(line => line.trim()).filter(line => line);
      let lines = [];
      let lineToAppend = "";
      for (l in oldLines) {
        if(l !== 0 && oldLines[l].includes("/")) {
          lines.push(lineToAppend);
          lineToAppend = oldLines[l];
        } else {
          lineToAppend += oldLines[l];
        }
      }
      lines.push(lineToAppend);

      // Ignore joined features for now
      if (!lines[0].includes("join")) {
        // Get feature name
        let featureName = lines[0].substring(0, lines[0].indexOf(' '));
        const oldFeatureName = featureName;
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
        // Span is always on the first line
        const featureInfo = {
          span: lines[0].includes('complement') ? lines[0].substring(lines[0].indexOf('complement')) : lines[0].replace(oldFeatureName, '').trim()
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
  let featuresDict = {};
  const featuresList = xmlDoc.getElementsByTagName('Feature');
  for (let i = 0; i < featuresList.length; i++) {
      const feature = featuresList[i]; // Current feature
      let featureName = feature.getAttribute('type'); // Feature id

      let k = 0;
      while (featureName in featuresDict) {
        if (`${featureName}${k}` in featuresDict) {
          k++;
        } else {
          featureName = `${featureName}${k}`;
          break;
        }
      }

      // All the feature properties
      const featureInfo = {}
      featureInfo["label"] = feature.getAttribute('name'); // Display name
      const spanDirectionality = feature.getAttribute('directionality');
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
              if (spanDirectionality !== "1") {
                featureInfo["span"] = "complement(" + featureInfo["span"] + ")";
              };
              // Extract color
              featureInfo["color"] = child.getAttribute('color');
          };
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
              featureInfo[subNoteName] = subNoteEntry;
          }
      }
      featureInfo["note"] = featureInfo["note"].trim();

      // Append feature info the corresponding feature in the dict
      featuresDict[featureName] = featureInfo;
  };
  featuresDict = sortBySpan(featuresDict);

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
 * 
 */
function splitStringByMaxLength(inputString, maxLength) {
  const words = inputString.split(' ');
  const result = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxLength) {
      if (currentLine) {
        currentLine += ' ' + word;
      } else {
        currentLine = word;
      }
    } else {
      result.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    result.push(currentLine);
  }

  return result;
};


/**
 * Get file name from html element
 */
function getFileName(pNr) {
  const fileNameElement = document.getElementById("plasmid-file-name" + pNr);
  const fileExtensionMatch = fileNameElement.innerHTML.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/i);
  console.log("getFileName", pNr, fileExtensionMatch, fileNameElement.innerHTML)
  const outputName = (fileExtensionMatch) ? fileNameElement.innerHTML.replace(fileExtensionMatch[0], "") : fileNameElement.innerHTML;
  console.log("getFileName", pNr, outputName)
  return outputName;
};


/**
 * GB file exporter.
 */
function exportGBFile(pNr) {
  console.log("Export GB File")
  // Output file name
  const outputFileExtension = "gb";
  const outputFileName = getFileName(pNr);
  
  // Init variables
  let outputFileContent = "";
  let currLine = "";

  // Select target sequence and features
  const currSequence = (pNr === 1) ? sequence: sequence2;
  const currFeatures = (pNr === 1) ? sortBySpan(features): sortBySpan(features2);

  /**
   * Fil header
   */
  let currFileHeaderDict = null;
  const originalFileExtension = (pNr === 1) ? originalFileExtension1: originalFileExtension2;
  // GB -> GB
  console.log(originalFileExtension, outputFileExtension);
  if (originalFileExtension === outputFileExtension) {
    currFileHeaderDict = (pNr === 1) ? importedFileHeader1: importedFileHeader2;
  // DNA -> GB, make new header
  } else {
    /**
     * dict = {"0": {"name":"LOCUS","value":"[name]\t[seq length] bp"},
     *         "1": {"name":"DEFINITION","value":"."},
     *         }
     */
    currFileHeaderDict = {"0": {"name": "LOCUS", "value": outputFileName + "\t" + currSequence.length + " bp"},
                          "1": {"name":"DEFINITION","value":"."}};
  };
  console.log(JSON.stringify(currFileHeaderDict));

  // Apend the header
  const headerNrSpaces = 12; // Descriptor width
  const headerValueSpaces = 68; // Descriptor value width
  
  // Iterate over entries
  const fileHeaderEntries = Object.entries(currFileHeaderDict);
  for (const [pName, pData] of fileHeaderEntries) {
    if (pData["name"] === "LOCUS") {
      pData["value"] = pData["value"].replace(/\d+\s*bp/, currSequence.length + " bp");
    }
    console.log(`Key: [${pData["name"]}], Value: [${pData["value"]}]`);
    let test = pData["name"] + " ".repeat(headerNrSpaces - pData["name"].length)
    console.log("me when2:", test)

    let propertyLineToAppend = splitStringByMaxLength(pData["value"].replace("\r", ""), headerValueSpaces);
    console.log("Prop", propertyLineToAppend)
    for (l in propertyLineToAppend) {
      console.log("line", l, propertyLineToAppend[l])
      let anyLiners = "";
      if (l === "0") {
        anyLiners = test + propertyLineToAppend[l].trim() + "\n";
        console.log("Any liners", anyLiners)
        outputFileContent +=  anyLiners;
      } else {
        outputFileContent += " ".repeat(headerNrSpaces) + propertyLineToAppend[l].trim() + "\n";
      };
    };
  };


  /**
   * File features
   */
  const featureTitleShift = 5;
  const featureTitleWidth = 16;
  const featureValueWidth = 58;
  outputFileContent += "FEATURES             Location/Qualifiers\n";
  const entries = Object.entries(currFeatures);
  for (const [key, value] of entries) {
    if (key !== "LOCUS") {
      console.log(`Key: ${key}, Value: ${value}`);
      const featureName = key.replace(/\d+$/, '');
      outputFileContent += " ".repeat(featureTitleShift) + featureName + " ".repeat(featureTitleWidth - featureName.length) + value["span"] + "\n";
      const featureInfo = Object.entries(value);
      for (const [propertyName, propertyValue] of featureInfo) {
        if (propertyName !== "span") {
          let featureToAppend = "/" + propertyName + "=\"" + propertyValue + "\"";
          for (let i = 0; i < featureToAppend.length; i += featureValueWidth) {
            outputFileContent += " ".repeat(featureTitleWidth + featureTitleShift) + featureToAppend.slice(i, i + featureValueWidth) + "\n";
          }
        };
      };
    };
  };


  /**
   * File sequence
   */
  outputFileContent += "ORIGIN\n";
  let seqIndex = 1;
  let lastIndex = Math.floor(currSequence.length / 60) * 60 + 1;
  while (currSequence.slice(seqIndex)) {
    currLine = "";
    currLine +=  " ".repeat(lastIndex.toString().length + 1 - seqIndex.toString().length) + seqIndex

    for (let i = 0; i < 6; i++) {
      currLine += " " + currSequence.slice(seqIndex - 1 + i*10, seqIndex - 1 + i*10 + 10).toLowerCase();
    }

    outputFileContent += currLine + "\n";
    seqIndex += 60;
  };
  outputFileContent += "//";

  // Send for download
  downloadFile(outputFileName, outputFileContent, outputFileExtension);
};


/**
 * DNA file exporter.
 */
function exportDNAFile(pNr) {
  console.log("Export DNA File")
  // Output file name
  const outputFileExtension = "dna"
  const outputFileName =  getFileName(pNr);;

  // Select target sequence and features
  const currSequence = (pNr === 1) ? sequence: sequence2;
  const currFeatures = (pNr === 1) ? sortBySpan(features): sortBySpan(features2);


  /**
   * Integer to 4 bytes hex
   */
  function inToHexBytes(number) {
    const buffer = new ArrayBuffer(4); // 4 bytes
    const view = new DataView(buffer);
    view.setUint32(0, number, false); // true means little-endian (least significant byte first)

    // Convert the DataView to a string
    const byteArray = new Uint8Array(buffer);
    const byteString = Array.from(byteArray).map(byte => byte.toString(16).padStart(2, '0')).join(' ');

    return byteString;
  };


  function addBytes(byteString) {
    const bytesToAdd = byteString.split(' ').map(hex => parseInt(hex, 16));
    outputBytes.push(...bytesToAdd);
  };


  function stringToBytes(inputString) {
    const byteArray = [];
    for (let i = 0; i < inputString.length; i++) {
      const byteHex = inputString.charCodeAt(i).toString(16).padStart(2, '0');
      byteArray.push(byteHex);
    };
    return byteArray.join(' ');
  };


  /**
   * Fil header
   */
  const outputBytes = []
  // File magic bytes (19)
  addBytes("09 00 00 00 0e 53 6e 61 70 47 65 6e 65 00 01 00 0f 00 13");
  // File type designation byte (unknown 00, dna 01, rna 20, prot 15)
  addBytes("01");

  // sequence length +1 (4 bytes)
  addBytes(inToHexBytes(currSequence.length + 1));

  // plasmid type byte (ss+lin = 00, ss+circ=01, ds+lin=02, ds+circ=03)
  addBytes("03");

  /**
   * Sequence bytes
   */
  addBytes(stringToBytes(currSequence.toLowerCase()));
  // Stop byte sequence
  addBytes("02");

  /**
   * Alignable sequences
   */
  // length
  addBytes("00 00 00 2d"); //(default xml length)
  // content
  const defaultAlignableSequencesXML = "<AlignableSequences trimStringency=\"Medium\"/>";
  addBytes(stringToBytes(defaultAlignableSequencesXML));
  // stop byte
  addBytes("08");


  /**
   * Additional sequence properties
   */
  // length
  addBytes("00 00 01 07"); //(default xml length)
  // content
  const defaultAdditionalSequenceProperties = "<AdditionalSequenceProperties><UpstreamStickiness>0</UpstreamStickiness><DownstreamStickiness>0</DownstreamStickiness><UpstreamModification>Unmodified</UpstreamModification><DownstreamModification>Unmodified</DownstreamModification></AdditionalSequenceProperties>";
  addBytes(stringToBytes(defaultAdditionalSequenceProperties));
  // stop byte
  addBytes("0a");


  /**
   * FEATURES
   */
  // Create an XML document
  const parser = new DOMParser();
  const nrOfFeatures = Object.keys(currFeatures).filter(item => item !== "LOCUS").length;

  // Create the XML document with the correct root structure
  const xmlDoc = parser.parseFromString(
    '<?xml version="1.0" ?><Features nextValidID="' + nrOfFeatures + '"></Features>',
    'application/xml'
  );

  // Ensure the "Features" element is correctly added as the root element
  const root = xmlDoc.documentElement;
  let i = 0;
  for (const key in currFeatures) {
    if (key !== "LOCUS") {
      const value = currFeatures[key];
      console.log(`Key: ${key}, Value: ${value}`);
      console.log(value);

      if (key === "source") {
        // Feature
        const xmlFeatureElement = xmlDoc.createElement('Feature');
        xmlFeatureElement.setAttribute('recentID', i + "");
        i++;
        xmlFeatureElement.setAttribute('name', "source");
        xmlFeatureElement.setAttribute('type', "source");
        xmlFeatureElement.setAttribute('allowSegmentOverlaps', "0");
        xmlFeatureElement.setAttribute('consecutiveTranslationNumbering', "1");
        xmlFeatureElement.setAttribute('visible', "0");

        // Segment
        const xmlSegmentElement = xmlDoc.createElement('Segment');
        xmlSegmentElement.selfClosing = true;
        xmlSegmentElement.setAttribute('range', removeNonNumeric(value["span"]).replace("..", "-"));
        if (value["color"]) {
          xmlSegmentElement.setAttribute('color', value["color"]);
        } else {
          xmlSegmentElement.setAttribute('color', "#ffffff");
        };
        xmlSegmentElement.setAttribute('type', "standard");
        xmlFeatureElement.appendChild(xmlSegmentElement) // Append

        // Q mol_type
        if (value["mol_type"]) {
          const xmlQmoltype = xmlDoc.createElement('Q');
          xmlQmoltype.setAttribute('name', "mol_type");

          const xmlVmoltype = xmlDoc.createElement('V');
          xmlVmoltype.selfClosing = true;
          xmlVmoltype.setAttribute('predef', value["mol_type"]);

          xmlQmoltype.appendChild(xmlVmoltype) // Apend
          xmlFeatureElement.appendChild(xmlQmoltype) // Apend
        };

        // Q organism
        if (value["organism"]) {
          const xmlQOrganism = xmlDoc.createElement('Q');
          xmlQOrganism.setAttribute('name', "organism");

          const xmlVOrganism = xmlDoc.createElement('V');
          xmlVOrganism.selfClosing = true;
          xmlVOrganism.setAttribute('text', value["organism"]);

          xmlQOrganism.appendChild(xmlVOrganism) // Apend
          xmlFeatureElement.appendChild(xmlQOrganism) // Apend
        };
        
        root.appendChild(xmlFeatureElement);
      } else {
        // Feature
        const xmlFeatureElement = xmlDoc.createElement('Feature');
        xmlFeatureElement.setAttribute('recentID', i + "");
        i++;
        xmlFeatureElement.setAttribute('name', value["label"].replace(/\d+$/, '').trim());
        xmlFeatureElement.setAttribute('directionality', (!value["span"].includes("complement")) ? "1": "2");
        xmlFeatureElement.setAttribute('type', key.replace(/\d+$/, '').trim());
        xmlFeatureElement.setAttribute('allowSegmentOverlaps', "0");
        xmlFeatureElement.setAttribute('consecutiveTranslationNumbering', "1");

        // Segment
        const xmlSegmentElement = xmlDoc.createElement('Segment');
        xmlSegmentElement.selfClosing = true;
        xmlSegmentElement.setAttribute('range', removeNonNumeric(value["span"]).replace("..", "-"));
        if (value["color"]) {
          xmlSegmentElement.setAttribute('color', value["color"]);
        } else {
          xmlSegmentElement.setAttribute('color', "#ffffff");
        };
        xmlSegmentElement.setAttribute('type', "standard");
        xmlFeatureElement.appendChild(xmlSegmentElement) // Append

        // Q Label
        if (value["label"]) {
          const xmlQLabel = xmlDoc.createElement('Q');
          xmlQLabel.setAttribute('name', "label");

          const xmlVLabel = xmlDoc.createElement('V');
          xmlVLabel.selfClosing = true;
          xmlVLabel.setAttribute('text', value["label"]);

          xmlQLabel.appendChild(xmlVLabel) // Apend
          xmlFeatureElement.appendChild(xmlQLabel) // Apend
        };

        // Q Note
        if (value["note"]) {
          const xmlQNote = xmlDoc.createElement('Q');
          xmlQNote.setAttribute('name', "note");

          const xmlVNote = xmlDoc.createElement('V');
          xmlVNote.selfClosing = true;
          xmlVNote.setAttribute('text', value["note"]);

          xmlQNote.appendChild(xmlVNote) // Apend
          xmlFeatureElement.appendChild(xmlQNote) // Apend
        };

        // Q Translation
        if (value["translation"]) {
          const xmlQCodonStart = xmlDoc.createElement('Q');
          xmlQCodonStart.setAttribute('name', "codon_start");

          const xmlVCodonStart = xmlDoc.createElement('V');
          xmlVCodonStart.selfClosing = true;
          xmlVCodonStart.setAttribute('int', "1");

          xmlQCodonStart.appendChild(xmlVCodonStart) // Apend
          xmlFeatureElement.appendChild(xmlQCodonStart) // Apend

          const xmlQTranslatable = xmlDoc.createElement('Q');
          xmlQTranslatable.setAttribute('name', "transl_table");

          const xmlVTranslatable = xmlDoc.createElement('V');
          xmlVTranslatable.selfClosing = true;
          xmlVTranslatable.setAttribute('int', "1");

          xmlQTranslatable.appendChild(xmlVTranslatable) // Apend
          xmlFeatureElement.appendChild(xmlQTranslatable) // Apend

          const xmlQTranslation = xmlDoc.createElement('Q');
          xmlQTranslation.setAttribute('name', "translation");

          const xmlVTranslation = xmlDoc.createElement('V');
          xmlVTranslation.selfClosing = true;
          xmlVTranslation.setAttribute('text', value["translation"]);

          xmlQTranslation.appendChild(xmlVTranslation) // Apend
          xmlFeatureElement.appendChild(xmlQTranslation) // Apend
        };

        root.appendChild(xmlFeatureElement);
      };
    };
  };

  // Serialize the XML tree to a string
  const serializer = new XMLSerializer();
  const xmlString = serializer.serializeToString(xmlDoc).replace(/[\n\r]/g, '');;

  // Now, xmlString contains the XML structure as a string
  //downloadFile('featuresXMLTree', xmlString, 'xml');

  const emptyFeaturesXML = "<?xml version=\"1.0\"?><Features nextValidID=\"1\"><Feature recentID=\"0\" name=\"Feature 1\" type=\"misc_feature\" allowSegmentOverlaps=\"0\" consecutiveTranslationNumbering=\"1\"><Segment range=\"2-3\" color=\"#a6acb3\" type=\"standard\"/></Feature></Features>";
  // length
  addBytes(inToHexBytes(xmlString.length));
  // content
  addBytes(stringToBytes(xmlString));
  // stop byte
  addBytes("0a 05");


  /**
   * Primers
   */
  // length
  addBytes("00 00 00 d9"); //(default xml length)
  // content
  const defaultPrimersXML = "<AdditionalSequenceProperties><UpstreamStickiness>0</UpstreamStickiness><DownstreamStickiness>0</DownstreamStickiness><UpstreamModification>Unmodified</UpstreamModification><DownstreamModification>Unmodified</DownstreamModification></AdditionalSequenceProperties>";
  addBytes(stringToBytes(defaultPrimersXML));
  // stop byte
  addBytes("0a 06");

  /**
   * NOTES
   */
  const notesXML = "<Notes><UUID>17fd1982-6b89-48df-b1f8-fcd952b74b3f</UUID><Type>Natural</Type><Created UTC=\"21:39:38\">2023.10.19</Created><LastModified UTC=\"21:39:38\">2023.10.19</LastModified><SequenceClass>UNA</SequenceClass><TransformedInto>unspecified</TransformedInto></Notes>";
  // length
  addBytes(inToHexBytes(notesXML.length));
  // content
  addBytes(stringToBytes(notesXML));
  // stop byte
  addBytes("0a 0d");

  /**
   * Closing bytes
   */
  const closingBytes = "00 00 01 59 01 00 00 00 01 00 00 4b 00 00 00 00 00 00 00 00 00 03 55 6e 69 71 75 65 20 36 2b 20 43 75 74 74 65 72 73 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 19 ff 00 64 00 00 00 00 00 54 48 4f 00 ff fe 00 00 00 00 00 00 00 00 00 00 00 00 01 01 01 01 00 01 00 45 00 00 00 00 00 00 00 00 00 00 00 00 01 00 00 01 ff ff ff ff 01 59 01 f4 01 01 3f 00 50 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 1c 00 00 00 33 3c 3f 78 6d 6c 20 76 65 72 73 69 6f 6e 3d 22 31 2e 30 22 3f 3e 3c 45 6e 7a 79 6d 65 56 69 73 69 62 69 6c 69 74 69 65 73 20 76 61 6c 73 3d 22 22 2f 3e 0a 0e 00 00 00 29 3c 3f 78 6d 6c 20 76 65 72 73 69 6f 6e 3d 22 31 2e 30 22 3f 3e 3c 43 75 73 74 6f 6d 45 6e 7a 79 6d 65 53 65 74 73 2f 3e 0a";
  addBytes(closingBytes);

  // Send for download
  console.log(outputBytes)
  downloadFile(outputFileName, outputBytes, outputFileExtension);
};


/**
 * Download file.
 */
function downloadFile(downloadFileName, downloadFileContent, downloadFileType) {
  console.log("downloadFile:", downloadFileName, downloadFileContent, downloadFileType)
  // Create a Blob
  let blobURL = null;
  let blob = null;
  if (downloadFileType === "dna") {
    const byteArray = new Uint8Array(downloadFileContent);
    blob = new Blob([byteArray]);
  } else {
    blob = new Blob([downloadFileContent], { type: "text/plain" });
  };
  if (blobURL !== null) {
    window.URL.revokeObjectURL(blobURL);
  }
  blobURL = window.URL.createObjectURL(blob);

  // Create a download link
  const downloadLink = document.createElement("a");
  downloadLink.href = blobURL;
  downloadLink.download = downloadFileName + "." + downloadFileType; // File name
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(downloadLink);
  // document.body.appendChild(downloadLink);
  downloadLink.style.display = "none";

  // Start the download
  downloadLink.click();

  // Clean up by revoking the Blob URL once the download is complete
  setTimeout(() => {
    window.URL.revokeObjectURL(blobURL);
  }, 1000);
};


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
  };

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
  console.log("Siderbar:", currFeatures)
  for (const featureName in currFeatures) {
    if (!featureName.includes("LOCUS") && !featureName.includes("source")) { // Skip LOCUS and source
      console.log("Siderbar:", featureName, currFeatures[featureName])
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
      labelCell.id = "sidebar-label";
      labelCell.classList.add("editable");
      row.appendChild(labelCell);
  
      // Add feature range
      const rangeCell = document.createElement('td');
      rangeCell.textContent = feature.span
      rangeCell.className = 'wrap-text';
      row.appendChild(rangeCell);
  
      // Add feature note
      const noteCell = document.createElement('td');
      if (feature.note && feature.note.includes("note: ")) {
        console.log("Note col:", feature.note)
        const keyValuePairs = feature.note.split(/\s*(?::| )\s*/);
        console.log("Note col:", keyValuePairs)
        const noteDict = {};
        for (let i = 0; i < keyValuePairs.length; i += 2) {
          const key = keyValuePairs[i];
          const value = keyValuePairs[i + 1];
          if (key && value) {
            noteDict[key] = value;
          };
        };
        console.log("Note col:", noteDict)
        noteCell.textContent = noteDict["note"];
      } else {
        noteCell.textContent = feature.note || '';
      };
      noteCell.className = 'wrap-text';
      noteCell.id = "sidebar-note";
      noteCell.classList.add("editable");
      row.appendChild(noteCell);
  
      // Append the row to the table
      sidebarTable.appendChild(row);
    };
  };
};


/**  
 * Remove everything but numbers and ".." in order to have a clean span
*/
function removeNonNumeric(inputString) {
  const cleanedString = inputString.replace(/[^\d.]/g, '');
  return cleanedString;
};


/**
 * Check the annotation overlap to see how many rows are needed to accomodate all the annotations.
 * Also changes the gridstructure if more rows are needed for annotations.
 */
function checkAnnotationOverlap(inputFeatures, pNr) {
  console.log("Grid structures before:", gridStructure);
  let maximumOverlap = 0;
  
  // Iterate over all features and add their spans to a list
  const spansList = [];
  Object.entries(inputFeatures).forEach(([key, value]) => {
    if (value.span && !key.includes("source")) { // Exclude source

      // Get the current span and push it to the spans list
      const spanList = removeNonNumeric(value.span);
      const range = spanList.split("..").map(Number);
      const rangeStart = range[0];
      const rangeEnd = range[1];
      spansList.push([rangeStart, rangeEnd])
    };
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
        };
      };
    };

    // IF a new maximum overlap was found, replace the previous one
    if (currentOverlap > maximumOverlap) {
      maximumOverlap = currentOverlap;
    };
  };
  // Increase once more for good measure
  maximumOverlap++;

  // Adjust the grid structure according to maximumOverlap
  let count = 0;
  let listInsertPos = 0;
  if (pNr === 1) { // First plasmid
    // Count how many rows are already dedicated to annotations
    for (let i = 0; i < gridStructure.length; i++) {
      if (gridStructure[i] === "Annotations") {
        count++;
      };
    };
    
    listInsertPos = gridStructure.indexOf("Annotations");
    // If more rows are needed, append them
    if (count !== maximumOverlap) {
      for (let i = 0; i < maximumOverlap - count; i++) {
        gridStructure.splice(listInsertPos, 0 , "Annotations")
        console.log("Grid structures:", i, gridStructure);
      };
    };
  } else { // Same as for the first plasmid
    for (let i = 0; i < gridStructure2.length; i++) {
      if (gridStructure2[i] === "Annotations") {
        count++;
      };
    };
    
    listInsertPos = gridStructure.indexOf("Annotations");
    if (count !== maximumOverlap) {
      for (let i = 0; i < maximumOverlap - count; i++) {
        gridStructure2.splice(listInsertPos, 0 , "Annotations")
      };
    };
  };
  console.log("Grid structures after:", gridStructure, listInsertPos, maximumOverlap);
  return;
};


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
    };

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
      } ;
      row.id = currGridStructure[i % currGridStructureLength] + "-row";
      // Populate the sequence cells with the corresponding base
      for (let j = 0; j < gridWidth; j++) {
        const cell = document.createElement('td'); // Create the cell
        let currentChar = ""
        let linesCreated = Math.floor(i / currGridStructureLength) // Check how many "lines" have been created so far
  
        if ((i + 1) % currGridStructureLength === 1) { // If we're on the forward strand
          currentChar = currSequence[linesCreated*gridWidth + j] // Add the corrseponding char
        } else if ((i + 1) % currGridStructureLength === 2) {// If we're on the comlpementary strand
          currentChar = currComplementarySequence[linesCreated*gridWidth + j]
        };
        // If we've run out of bases to add add nothing
        if (!currentChar) {
          currentChar = ""
        };

        // Insert the base to the cell's text content
        cell.textContent = currentChar;
        // Add a cell id to distinguish the cells
        cell.id = currGridStructure[i % currGridStructureLength];
        // Add a cell class
        cell.classList.add(currGridStructure[i % currGridStructureLength].replace(" ", ""));
        if (cell.id === "Forward Strand" && currentChar !== "") {
          cell.classList.add("forward-strand-base");
        };

        // Append the cell to the row
        row.appendChild(cell);
      };
    };

    // Get cell width in current window for annotation triangles
    window.addEventListener('resize', updateAnnotationTrianglesWidth);
    updateAnnotationTrianglesWidth();
    
    // Iterate over the features and create the annotatations
    //console.log("Here6", currFeatures)
    Object.entries(currFeatures).forEach(([key, value]) => {
      if (value.span && !key.includes("source")) { // If the feature includes a span and is not "source"
        // Get the current feature's span
        const direction = (value.span.includes("complement")) ? "left": "right";
        const spanList = removeNonNumeric(value.span);
        const range = spanList.split("..").map(Number);
        const rangeStart = range[0];
        const rangeEnd = range[1];
        const annotText = (value.label) ? value.label: key;
        const annotationColor = generateRandomUniqueColor();
        if (!value["color"]) {
          value["color"] = annotationColor;
        };
        recentColor = annotationColor; // Store the colour history
        console.log(annotText, rangeStart + ".." + rangeEnd)
        // Make the annotation at the specified indices
        makeAnnotation(rangeStart - 1, rangeEnd - 1, annotText, key, annotationColor, pNr, currGridStructure);

  
        const triangleID = key;
        const table = (pNr === 1) ? document.getElementById("sequence-grid"): document.getElementById("sequence-grid2");
        const featureCells = [];
        for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
          for (let colIdx = 0; colIdx < table.rows[rowIdx].cells.length; colIdx++) {
              const cell = table.rows[rowIdx].cells[colIdx];
              const featureId = cell.getAttribute("feature-id");
      
              // Check if the cell has the attribute "feature-id" with the value "terminator"
              if (featureId === triangleID) {
                featureCells.push({ row: rowIdx, col: colIdx });
              };
          };
        } ;
        console.log("Triangles, found cells:", featureCells)

        if (featureCells.length > 0) {
          let lowestCell = featureCells[0];
          let highestCell = featureCells[0];
      
          for (const cell of featureCells) {
              if (cell.row < lowestCell.row || (cell.row === lowestCell.row && cell.col < lowestCell.col)) {
                  lowestCell = cell;
              };
              if (cell.row > highestCell.row || (cell.row === highestCell.row && cell.col > highestCell.col)) {
                  highestCell = cell;
              };
          };
      
          console.log("Triangles, Top-left cell:", lowestCell);
          console.log("Triangles, Bottom-right cell:", highestCell);
          console.log("Triangles:", direction)

          if (direction === "left") {
            const targetRow = table.rows[lowestCell.row];
            const targetCell = targetRow.cells[lowestCell.col];
            console.log("Triangles, target cell:", targetRow, targetCell)
            const newCell = document.createElement("td");
            // Copy attributes from targetCell to newCell
            newCell.id = targetCell.id;
            newCell.class = targetCell.class;
            newCell["feature-id"] = targetCell["feature-id"];
            // Append the new cell right before the target cell
            targetRow.insertBefore(newCell, targetCell);

            if (targetCell.colSpan > 1) {
              targetCell.colSpan--;
            } else {
              targetRow.removeChild(targetCell);
            };
            createFilledTriangle(key, annotationColor, "left", lowestCell.row, lowestCell.col, pNr);
          } else {
            const targetRow = table.rows[highestCell.row];
            const targetCell = targetRow.cells[highestCell.col];
            console.log("Triangles, target cell:", targetRow, targetCell)
            const newCell = document.createElement("td");
            // Copy attributes from targetCell to newCell
            newCell.id = targetCell.id;
            newCell.class = targetCell.class;
            newCell["feature-id"] = targetCell["feature-id"];
            // Append the new cell right before the target cell
            targetRow.parentNode.insertBefore(newCell, targetRow.nextSibling);

            if (targetCell.colSpan > 1) {
              targetCell.colSpan--;
            } else {
              targetRow.removeChild(targetCell);
            };
            createFilledTriangle(key, annotationColor, "right", highestCell.row, highestCell.col + 1, pNr);
          };
        };

        // Check if feature needs to be translated
        //console.log(currFeatures[key]);
        if ((currFeatures[key]["translation"]) || (currFeatures[key]["note"] && (currFeatures[key]["note"].includes(" translation: ")))) {
          //console.log("Translating: ", value.label, rangeStart, rangeEnd, pNr)
          const targetStrand = (!value.span.includes("complement")) ? "fwd": "comp";
          translateSpan(targetStrand, rangeStart, rangeEnd, pNr);
        };
      };
    });


    // Check the sequence for common promotes and start the translation there
    //promoterTranslation(pNr);
    // Start the transaltion at the beginning of each feature
    //featureTranslation(pNr);

    // Clean up cells that are not longer in a tr
    cleanLostCells();

    // Enable feature cell editing
    enableSequenceGridFeatureEditing(pNr);

    // Change the cursor's icon to normal
    document.body.classList.remove('loading');
    if (typeof callback === 'function') {
      callback();
    };
  }, 1);
};


/**
 * Creates the annoations from the span's start to the end, breaking the feature up into
 * multiple if it spans multiple lines.
 * 
 * TO DO:
 * - at the moment it is very slow, maybe find a better way
 * - !!find a way to make this rescale on window resize
 */
function makeAnnotation(rStart, rEnd, text, featureId, annotationColor, pNr, currGridStructure) {

  // Convert from sequence coords to table coords
  let row = (Math.floor(rStart / gridWidth)) * currGridStructure.length;
  let col = rStart - (row/currGridStructure.length)*gridWidth;
  row += currGridStructure.indexOf("Annotations");
  console.log("here", text, rStart, row, currGridStructure.length, gridWidth, col)


  // Annotaiton span length
  const annotationSpan = rEnd - rStart + 1;
  let currentSpan = annotationSpan; // Current span to draw
  let carryOver = annotationSpan; // Carry over for next line
  
  let i = 0; // Iteration counter
  // Draw until there is no more carry over
  while (carryOver > 0) {
    // If the feature spans multiple lines, add "..." to the beginning of the feature
    if (i != 0) {
        text = "..." + text.replace("...", "");
    };

    // Merge the corresponding cells to draw the annoation
    console.log("MA0:", text, col, currentSpan, gridWidth)
    if (col + currentSpan >= gridWidth) {
      // If the currenspan would not fit on the line, draw it until we reach the end and
      // put the rest into carry over
      console.log("MA1:", text, row, col, 1, currentSpan, featureId, annotationColor, pNr,currGridStructure);
      // Calculate carry over
      carryOver = col + currentSpan - gridWidth;
      // Calculate length of the current annoation
      currentSpan = gridWidth - col;
      // Merge the corresponding cells and create the annotaion
      mergeCells(row, col, 1, currentSpan, text + "...", featureId, annotationColor, pNr,currGridStructure);
      // Adjust the current span
      currentSpan = carryOver;
      // Increment the row
      row = row + currGridStructure.length;
      // Reset cell index
      col = 0;
    } else if (currentSpan === gridWidth) {
      // If the currentspan covers exactly the current line there is some weird behaviour
      // so fill in the current line and one additional cell in the the following row
      console.log("MA2:", text, row, col, 1, currentSpan, featureId, annotationColor, pNr,currGridStructure);
      mergeCells(row, col, 1, currentSpan, text, featureId, annotationColor, pNr,currGridStructure);
      mergeCells(row + currGridStructure.length, col, 1, 1, text, featureId, annotationColor, pNr,currGridStructure);
      // Set carry over to 0 to signify that we're done
      carryOver = 0;
    } else {
      // The annotation can be fully drawn on the current row
      console.log("MA3:", text, row, col, 1, currentSpan, featureId, annotationColor, pNr,currGridStructure);
      mergeCells(row, col, 1, currentSpan, text, featureId, annotationColor, pNr, currGridStructure);
      // Set carry over to 0 to signify that we're done
      carryOver = 0;
    };
    // Increment iteration counter
    i++;
  };
};


/**
 * Draws the annotation by merging the specified cells, adding th text and adding the color.
 * 
 */
function mergeCells(row, col, rowspan, colspan, text, featureId, color, pNr, currGridStructure) {
  console.log("Merge cells1: ", row, col, colspan, text)
  // Check which grid were doing
  let table = null;
  if (pNr === 1){
    table = document.getElementById('sequence-grid');
  } else {
    table = document.getElementById('sequence-grid2');
  };

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
          };
        } else {
          occupiedCellsList.push(false);
        };
      };
      
      console.log(col, col+colspan-1, row, occupiedCellsList);
      if (occupiedCellsList.slice(col, col + colspan - 1).every(value => value !== true)) {
        console.log("Go right ahead sir.")
        break;
      } else {
        console.log("Try next row.")
        row++;
      };
    };
  };
  
  let nrOccupiedCells = occupiedCellsList.slice(0, col).filter(value => value === true).length;
  console.log("nrOccupiedCells ", nrOccupiedCells, occupiedCellsList.slice(0, col))
  console.log("Merge cells1.5 : ", row, col, colspan, text)
  console.log("Zamboni", nrOccupiedCells, occupiedCellsList.length)
  if (nrOccupiedCells === occupiedCellsList.length-1){
    row++;
  };

  // Adjust row and col
  occupiedCellsList = [];
  occupiedCellsCounter = 0;
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
          };
        } else {
          occupiedCellsList.push(false);
        };
      };
      
      console.log(col, col+colspan-1, row, occupiedCellsList);
      if (occupiedCellsList.slice(col, col + colspan - 1).every(value => value !== true)) {
        console.log("Go right ahead sir.")
        break;
      } else {
        console.log("Try next row.")
        row++;
      };
    };
  };

  nrOccupiedCells = occupiedCellsList.slice(0, col).filter(value => value === true).length;
  console.log("nrOccupiedCells2 ", nrOccupiedCells, occupiedCellsList.slice(0, col))
  console.log("Merge cells1.5.2 : ", row, col, colspan, text)


  if (nrOccupiedCells !== 0) {
    col -= nrOccupiedCells;
    col += occupiedCellsCounter;
  };
  console.log("Merge cells2: ", row, col, colspan, text)
  let mainCell = table.rows[row].cells[col];
  mainCell.rowSpan = rowspan;
  mainCell.colSpan = colspan;
  mainCell.classList.add("editable")
  mainCell.style.backgroundColor = color;
  // Add text to the center of the merged cell
  if (text.length > colspan)  {
    if (colspan <= 3) {
      text = "";
      for (let l = 0; l < colspan; l++) {
        text += ".";
      };
    } else {
      text = text.slice(0, colspan - 3).replace(/\./g, "") + "...";
    };
  };
  const textNode = document.createTextNode(text);
  mainCell.appendChild(textNode);
  mainCell.style.textAlign = 'center';
  mainCell.setAttribute("feature-id", featureId)

  // Remove extra cells
  let k = 0;
  colspan--;
  //console.log("Merge cells, to delete: ", row, col, colspan, table.rows[row].cells.length);
  for (let j = col + 1; j < col + colspan; j++) {
    const cell = table.rows[row].cells[j - k];
    if (cell) {
      //console.log("Merge cells, deleting: ", row, j-k, table.rows[row].cells.length)
      cell.parentNode.removeChild(cell);
    };
    k++;
  };
  //console.log("Merge cells, after del: ",table.rows[row].cells.length)
};


/**
 * Generates a random color that was not used recently.
 */
function generateRandomUniqueColor() {
  const baseColors = ["#FFB6C1", "#FFDAB9", "#FFA07A", "#FFC0CB", "#87CEFA", "#98FB98", "#FF69B4", "#90EE90"];

  const remainingColors = baseColors.filter(color => color !== recentColor);
  const randomIndex = Math.floor(Math.random() * remainingColors.length);
  const randomColor = remainingColors[randomIndex];

  return randomColor;
};


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
};


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
    };
  
    return indices;
  };

  // Select the correct sequence to search
  let currSequence = "";
  if (pNr === 1) {
    currSequence = sequence;
  } else {
    currSequence = sequence2;
  };

  // Iterate over the promotes, finds a list of indices for all the positions where it can be found
  // then starts the translation at the first ATG it finds from there.
  for (let promoter in promoters) {
    // Get all occurences of the promoter sequence in the plasmid sequence
    const occurrences = findAllOccurrences(currSequence, promoters[promoter]);
    // If any occurences were found, iterate over them and start looking for "ATG" and start translating there
    if (occurrences.length !== 0) {
      for (let i = 0; i < occurrences.length; i++) {
        startTranslation(currSequence.indexOf("ATG", occurrences[i] + promoter.length) + 1, pNr);
      };
    };
  };
};


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
  };

  // Iterate over features and start the translation at the beginning of its span
  Object.entries(currFreatures).forEach(([key, value]) => {
    if (value.span && !key.includes("source")) {
      const spanList = removeNonNumeric(value.span);
      const range = spanList.split("..").map(Number);
      const rangeStart = range[0];
      const rangeEnd = range[1];
      startTranslation(rangeStart, pNr);
    };
  });
};


/**
 * Convert sequence indices to table coordinates
 */
function seqIndexToCoords(inputIndex, targetRow, currGridStructure) {
  //console.log("Translating, seqIndexCoords before:", inputIndex, targetRow)
  let outputRow = (Math.floor(inputIndex / gridWidth))*currGridStructure.length + targetRow;
  let outputIndex = inputIndex - Math.floor(inputIndex / gridWidth)*gridWidth - 1;
  if (outputIndex < 0) {
    outputRow -= currGridStructure.length;
    outputIndex = gridWidth - 1;
  } else if (outputIndex >= gridWidth) {

  };
  //console.log("Translating, seqIndexCoords done:", outputRow, outputIndex)
  return [outputRow, outputIndex];
};


/**
 * Starts a translation at the specified position and populates the amino acid row with the translation.
 * 
 * TO DO:
 * - add an option to start translating immediately or inside selected text
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
  };

  // Convert to table coordinates based on the row order in the grid structure
  const rowIndexAA = currGridStructure.indexOf("Amino Acids");
  let tableCoords = seqIndexToCoords(codonPos, rowIndexAA, currGridStructure);

  // Get the row and column, increment the column by 1 because the amino acids are
  // displayed in the middle cell of a group of 3 cells
  let row = tableCoords[0];
  let col = tableCoords[1] + 1;

  // Start translating until a stop codon is encountered
  //console.log("Starting translationa at " + codonPos + "(" + row + ", " + col + ").");
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
    };
    // If the last displayed amino acid was a stop codon or we've reached the end of the sequence, stop
    if (aminoAcid === "-" || codonPos > currSequence.length){
      break;
    };
  };
};


/**
 * Translate specific span
 */
function translateSpan(targetStrand, rangeStart, rangeEnd, pNr) {
  //console.log("Translating:", targetStrand, rangeStart, rangeEnd, pNr);
  // Select the corresponding features and sequence
  let currGridStructure = null;
  let currSequence = "";
  if (pNr === 1) {
    currSequence = (targetStrand === "fwd") ? sequence: complementaryStrand;
    currGridStructure = gridStructure;
  } else {
    currSequence = (targetStrand === "fwd") ? sequence2: complementaryStrand2;
    currGridStructure = gridStructure2;
  };

  const codonStartPos = (targetStrand === "fwd") ? rangeStart: rangeEnd;
  const codonEndPos = (targetStrand === "fwd") ? rangeEnd + 1: rangeStart;
  let codonPos = codonStartPos;
  const dir = (targetStrand === "fwd") ? 1: -1;

  // Convert to table coordinates based on the row order in the grid structure
  let tableCoords = seqIndexToCoords(codonStartPos, currGridStructure.indexOf("Amino Acids"), currGridStructure);

  // Get the row and column, increment the column by 1 because the amino acids are
  // displayed in the middle cell of a group of 3 cells
  let row = tableCoords[0];
  let col = tableCoords[1] + 1*dir;
  //console.log("Translating, tableCoords:", codonStartPos, tableCoords, row, col, dir)

  //console.log("Translating:", targetStrand, col, row, codonPos, codonStartPos, codonEndPos)
  // Start translating until a stop codon is encountered
  //console.log("Starting translationa at " + codonPos + "(" + row + ", " + col + ").");
  while (true) {
    // Select current codon
    let codon = repeatingSlice(currSequence, codonPos - 1, codonPos + 2);
    if (targetStrand !== "fwd") {
      codon = repeatingSlice(currSequence, codonPos - 3, codonPos).split("").reverse().join("");
      //console.log("Translating:", codon)
    };
    // Get the corresponding amino acid
    let aminoAcid = translateCodon(codon);

    // Fill the cells
    fillAACells(row, col, aminoAcid, pNr, dir);
    // Jump to next position
    col += 3*dir;
    codonPos += 3*dir;
    // If we've jumped off of the table go to the next row
    if (col > gridWidth || col < 0) {
      col -= gridWidth*dir;
      row += currGridStructure.length*dir;
    };
    // If the last displayed amino acid was a stop codon or we've reached the end of the sequence, stop
    const breakCondition = (codonEndPos - codonPos)*dir <= 0;
    //console.log("Translating, checking if we've reached the end:", codonPos, codonEndPos, aminoAcid, breakCondition, dir)
    //if (codonPos > currSequence.length || codonPos*dir >= codonEndPos) {
    if (codonPos > currSequence.length || breakCondition) {
      break;
    };
  };
};


/**
 * Merge 3 cells in the amino acids row in order to display the amino acid.
 * 
 */
function fillAACells(row, col, text, pNr, dir) {
  //console.log("Translating, filling cells:", row, col, text, pNr)
  // Select the corresponding features and sequence
  let table = null;
  let currGridStructure = null;
  if (pNr === 1) {
    table = document.getElementById('sequence-grid');
    currGridStructure = gridStructure;
  } else {
    table = document.getElementById('sequence-grid2');
    currGridStructure = gridStructure2;
  };

  // Select the middle cell
  if (col < 0) {
    row -= currGridStructure.length;
    col = col + gridWidth;
  };
  let mainCell = table.rows[row].cells[col];
  if (!mainCell) { // If the cell does not exist, try the next row over at the beginning
    row += currGridStructure.length;
    col = col - gridWidth;

    mainCell = table.rows[row].cells[col];
  };
  //console.log("Translating, filling cells2:", row, col, text, pNr)

  // Select the left and right cells
  const leftCell = table.rows[row].cells[col-1];
  const rightCell = table.rows[row].cells[col+1];
  // Check and clear text in leftCell
  if (leftCell && leftCell.textContent) {
    leftCell.textContent = '';
  };

  // Check and clear text in rightCell
  if (rightCell && rightCell.textContent) {
    rightCell.textContent = '';
  };

  // Add text to the center of the merged cell
  mainCell.textContent = text;
  mainCell.style.textAlign = 'center';
};


/**
 * 
 */
function createFilledTriangle(featureID, triangleColor, orientation, row, col, pNr) {
  console.log("Triangles:", featureID, triangleColor, orientation, row, col)
  // Select the table cell using the row and col indices
  const tableID = (pNr === 1) ? "sequence-grid": "sequence-grid2";
  const table = document.getElementById(tableID);
  let cell = table.rows[row].cells[col];
  if (!cell) {
    const newCell = document.createElement("td")
    newCell.id = "Test"
    console.log("Hi:", row, col)
    table.rows.appendChild(newCell);
    cell = table.rows[row].cells[col];
  };
  cell.classList.add("triangle-cell");
  cell.setAttribute("feature-id", featureID)

  // Create a div element for the triangle
  const triangle = document.createElement("div");
  triangle.id = featureID.replace("/", "-") + "-triangle"
  /**
   * .triangle-right {
  width: 0px;
  height: 0px;
  border-top: var(--triangle-size) solid transparent;
  border-bottom: var(--triangle-size) solid transparent;
  border-left: var(--triangle-size) solid green;
}
   */
  const triangleColorVariable = pNr + triangle.id + "-color";
  document.documentElement.style.setProperty(`--${triangleColorVariable}`, triangleColor);
  triangle.style.width = 0 + "px";
  triangle.style.height = 0 + "px";
  triangle.style.borderTop = "var(--triangle-height) solid transparent";
  triangle.style.borderBottom = "var(--triangle-height) solid transparent";
  if (orientation === "right") {
    triangle.style.borderLeft = `var(--triangle-width) var(--${triangleColorVariable}) solid`;
  } else {
    triangle.style.borderRight = `var(--triangle-width) var(--${triangleColorVariable}) solid`;
    triangle.style.position = "absolute";
    triangle.style.right = "0px";
    triangle.style.top = "0px";
  };

  const styleElement = document.createElement('style');
  const borderClasName = featureID.replace("/", "-") + "-cell-borders" + pNr;
  const dynamicCSS = `
    .${borderClasName} {
      border-right: 3px solid var(--${triangleColorVariable});
      border-left: 3px solid var(--${triangleColorVariable});
    }
  `;
  styleElement.textContent = dynamicCSS;
  document.head.appendChild(styleElement);
  cell.classList.add(borderClasName);

  // Add the triangle div to the table cell
  cell.appendChild(triangle);
};


/**
 * Update the global variables controlling the width of annotation triangles
 */
function updateAnnotationTrianglesWidth() {
  const randomCell = document.getElementById("Forward Strand");
  document.documentElement.style.setProperty('--triangle-width', randomCell.offsetWidth + 'px');
};


/**
 * Clean up cells that dont have a parent tr
 */
function cleanLostCells() {
  for (i = 1; i < 3; i++) {
    const tableID = (i === 1) ? "sequence-grid": "sequence-grid2";
    var table = document.getElementById(tableID);
    var cells = table.querySelectorAll("td"); // Select all table cells (td elements)

    // Step 2: Check if each cell is a child of a <tr> element, and remove if not
    cells.forEach(function (cell) {
      if (!cell.parentElement || cell.parentElement.tagName.toLowerCase() !== "tr") {
        // If the cell is not a child of a <tr> element, remove it
        cell.remove();
      };
    });
  }
};