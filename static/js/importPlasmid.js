/**
 * On window load.
 */
window.onload = function() {
    // Create file input element and run the file select on click
    const targetButton = '#import-btn a';
    document.querySelector(targetButton).addEventListener('click', function (event) {
      event.preventDefault();
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      fileInput.addEventListener('change', function(event) {
        handleFileSelect(event, plasmidIndex=nextFreePlasmidIndex(), serverFile=null);
      });
      fileInput.click();
    });

    // Demo buttoon functionality
    const demoButton = document.getElementById("import-demo-btn");
    demoButton.addEventListener('click', function() {
      handleFileSelect(null, plasmidIndex=nextFreePlasmidIndex(), serverFile="\\static\\plasmids\\pET-28a(+).dna");
    });
};


/**
 * 
 */
function nextFreePlasmidIndex() {
  const entriesList = Object.keys(plasmidDict);
  if (entriesList.length !== 0) {
    return parseInt(entriesList[entriesList.length - 1]) + 1;
  } else {
    return 0;
  };
};


/**
 * 
 */
function isPlasmidDictEmpty() {
  return Object.keys(plasmidDict).length === 0;
};


/**
 * Handles file selection functionality.
 */
async function handleFileSelect(event, plasmidIndex=0, serverFile=null) {
  document.body.classList.add('loading');
  let file = null;
  if (serverFile) {
    console.log("Importing demo file:", serverFile);
    const response = await fetch(serverFile);

    const fileContent = await response.text();
    file = new Blob([fileContent]);
    file.name = serverFile.match(/[^\\/]*$/)[0];
  } else {
    file = event.target.files[0];
  };

  console.log(file)
  const fileExtension =  /\.([0-9a-z]+)(?:[\?#]|$)/i.exec(file.name)[0]; // Fish out file extension of the file
  // If the file has an acceptable file extension start parsing
  const acceptedFileExtensions = [".gbk", ".gb", ".dna"]
  if (acceptedFileExtensions.includes(fileExtension)) {
    // Initialise file reader
    const reader = new FileReader();

    // Define reader
    reader.onload = function(e) {
      let fileContent = e.target.result;
      // Depending on file extension pass the file content to the appropiate parser
      let parsedFile = null;
      if (fileExtension === ".dna") {
        parsedFile = parseDNAFile(fileContent);
      } else {
        parsedFile = parseGBFile(fileContent);
      };

      const firstImport = isPlasmidDictEmpty();

      plasmidDict[plasmidIndex] = {};
      plasmidDict[plasmidIndex]["fileName"] = file.name;
      plasmidDict[plasmidIndex]["fileExtension"] = fileExtension;
      plasmidDict[plasmidIndex]["fileHeader"] = parsedFile.fileHeader;
      plasmidDict[plasmidIndex]["fileSequence"] = parsedFile.fileSequence;
      plasmidDict[plasmidIndex]["fileComplementarySequence"] = parsedFile.fileComplementarySequence;
      plasmidDict[plasmidIndex]["fileFeatures"] = parsedFile.fileFeatures;
      plasmidDict[plasmidIndex]["selectedText"] = "";
      plasmidDict[plasmidIndex]["selectionStartPos"] = null;
      plasmidDict[plasmidIndex]["selectionEndPos"] = null;
      plasmidDict[plasmidIndex]["sidebarPrimers"] = null;
      plasmidDict[plasmidIndex]["operationNr"] = 1;

      // Add plasmid tab
      const plasmidTabsList = document.getElementById("plasmid-tabs-list");
      const plasmidTabId = "plasmid-tab-" + plasmidIndex;
      let liElement = document.getElementById(plasmidTabId);
      // Check if tab element already exists and
      if (!liElement) {
        liElement = document.createElement("LI");
        plasmidTabsList.appendChild(liElement);
      };
      liElement.id = "plasmid-tab-" + plasmidIndex;
      liElement.innerHTML = `
      <a href="#" onclick="switchPlasmidTab(${plasmidIndex})">${plasmidDict[plasmidIndex]["fileName"]}</a>
      <a class="plasmid-tab-dropdown" href="#"  onclick="togglePlasmidTabDropdownMenu(event, ${plasmidIndex})">▼</a>
      `;
      liElement.classList.add("plasmid-tab");
      if (firstImport === true) {
        liElement.classList.add("plasmid-tab-selected");
        currentlyOpenedPlasmid = plasmidIndex;
      };
      
      // Create the sidebar
      plasmidDict[plasmidIndex]["sidebarTable"] = createSidebarTable(plasmidIndex);

      // Create content grid
      plasmidDict[plasmidIndex]["contentGrid"] = makeContentGrid(plasmidIndex);

      // Create file history
      plasmidDict[plasmidIndex]["fileHistory"] = [];
      // [sidebarPrimers, sidebarTable, contentGrid]
      savePrimers();
      plasmidDict[plasmidIndex]["fileHistoryTracker"] = 0;
      saveProgress(plasmidIndex);
      
      // Once the file is loaded, enable search function
      if (firstImport === true) {
        initiateSearchFunctionality();
        switchPlasmidTab(plasmidIndex);
        updateAnnotationTrianglesWidth();
      };
    };

      // Run reader
      reader.readAsText(file);
    };
  document.body.classList.remove('loading');
};


/**
 * Genebank file parser.
 * 
 * 
 * TO DO:
 * - fix joined features
 */
function parseGBFile(fileContent) {
  const headerNrSpaces = 12;
  // Extract header
  let currFileHeader = fileContent.substring(0, fileContent.indexOf("FEATURES")).split('\n');
  
  let fileHeader = {}
  let lastAddedProperty = "";
  let propertyCounter = 0;
  for (l in currFileHeader) {
    if (currFileHeader[l]) {
      let propertyName = currFileHeader[l].substring(0, headerNrSpaces).trim();
      if (propertyName !== "") {
        const leadingSpaces = currFileHeader[l].match(/^\s*/);
        const leadingSpacesNr = (leadingSpaces) ? leadingSpaces[0].length : 0;
        propertyName = " ".repeat(leadingSpacesNr) + propertyName;
        fileHeader[propertyCounter] = {}
        fileHeader[propertyCounter]["name"] = propertyName;
        fileHeader[propertyCounter]["value"] = currFileHeader[l].substring(headerNrSpaces).replace("\r", "");
        lastAddedProperty = propertyCounter;
        propertyCounter++;
      } else {
        console.log("FileHeader2", lastAddedProperty, currFileHeader[l].substring(headerNrSpaces))
        fileHeader[lastAddedProperty]["value"] = "" + fileHeader[lastAddedProperty]["value"] + " " + currFileHeader[l].substring(headerNrSpaces);
        console.log("FileHeader2", fileHeader[lastAddedProperty]["value"])
      };
    };
  };

  const fileSequence = extractGBSequence(fileContent);
  const fileComplementarySequence = getComplementaryStrand(fileSequence);
  const fileFeatures = extractGBFeatures(fileContent);
  return {fileHeader, fileSequence, fileComplementarySequence, fileFeatures};
};


/**
 * Extracts the sequence from the end of the file.
 * Data is structure as:
 * ORIGIN      
      1 tcaatattgg ccattagcca tattattcat tggttatata gcataaatca atattggcta
      61 ttggccattg catacgttgt atctatatca taatatgtac atttatattg gctcatgtcc
    121 aatatgaccg ccatgttggc attgattatt gactagttat taatagtaat caattacggg
  */
function extractGBSequence(input) {
  // Find "ORIGIN" and delete everything before the sequence
  input = input.substring(input.indexOf("ORIGIN") + "ORIGIN".length);
  // Regular expressions to get the sequence out
  let output = input.replace(/\n/g, '').replace(/\/\//g, '').split(' ').filter(x => !/\d/.test(x));
  output = output.join('').toUpperCase().trim().replace(/[\r\n]+/g, "");
  return output;
};
    
  
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
function extractGBFeatures(input) {
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
  };
  inputLines.shift(); // Remove the line with "FEATURES"
  

  // Iterate over the remaining lines and group the lines based on what feature they belong to
  const featureList = [];
  let currentFeature = '';
  for (const line of inputLines) {
    if (line.includes('..')) { // If the line has .., then its probalby the line with the span
      if (currentFeature !== '') {
        featureList.push(currentFeature); // If this is not the first loop, send the feature with the lines collected so far
      };
      currentFeature = ''; // Reset
    };
    if (line === "ORIGIN") {break};
    // Add the current line to the current feature
    currentFeature += line + '\n';
  };
  
  // If theres still a feature not yet pushed, push it
  if (currentFeature !== '') {
    featureList.push(currentFeature);
  };
  
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
      };
    };
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
        };
      };
      
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
      };
    
      // Add the feature info dict to the features dict
      featuresDict[featureName] = featureInfo;
    };
  };
  
  // Return the dict
  return featuresDict;
};


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
      };
    };
    if (match) {
      return i;
    };
  };
  return -1;
};


/**
 * Snapgene file parser.
 */
function parseDNAFile(fileContent) {
  // File needs to be read as byte stream
  let fileBA = new TextEncoder().encode(fileContent);

  // Extract sequence data
  // Sequence data USUALLY ends in byte array 02 00 00, so find that and keep only stuff before it
  let sequenceBA = fileBA.slice(25, findSubarrayIndex(fileBA, [2, 0, 0]));
  let fileSequence = new TextDecoder().decode(sequenceBA).toUpperCase().replace(/[^TACGN]/gi, ''); // Convert to string and only keep ACTG
  let fileComplementarySequence = getComplementaryStrand(fileSequence); // Create complementary strand

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
        };
      };

      // All the feature properties
      const featureInfo = {}
      featureInfo["label"] = feature.getAttribute('name'); // Display name
      const spanDirectionality = feature.getAttribute('directionality');
      featureInfo["span"] = "";
      featureInfo["note"] = "";

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
          };
      };
      featureInfo["note"] = featureInfo["note"].trim();

      // Append feature info the corresponding feature in the dict
      featuresDict[featureName] = featureInfo;
  };

  const fileFeatures = sortBySpan(featuresDict);
  const fileHeader = null;
  return {fileHeader, fileSequence, fileComplementarySequence, fileFeatures};
};


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
function getFileName(plasmidIndex) {
  const fileName = plasmidDict[plasmidIndex]["fileName"];
  const fileExtensionMatch = fileName.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/i);
  const outputName = (fileExtensionMatch) ? fileName.replace(fileExtensionMatch[0], "") : fileName;
  return outputName;
};


/**
 * FASTA file exporter.
 */
function exportFASTAFile(plasmidIndex) {
  // Output file name
  const outputFileExtension = "fasta";
  const outputFileName = getFileName(plasmidIndex);
  
  // Init variables
  let outputFileContent = "";

  // Select target sequence and features
  const currSequence = plasmidDict[plasmidIndex]["fileSequence"];

  outputFileContent += ">" + outputFileName + "\n";
  outputFileContent += "currSequence";

  // Send for download
  downloadFile(outputFileName, outputFileContent, outputFileExtension);
};


/**
 * GB file exporter.
 * TO DO:
 * - rn scrubs most info in the header
 */
function exportGBFile(plasmidIndex) {
  // Output file name
  const outputFileExtension = "gb";
  const outputFileName = getFileName(plasmidIndex);
  
  // Init variables
  let outputFileContent = "";
  let currLine = "";

  // Select target sequence and features
  const currSequence = plasmidDict[plasmidIndex]["fileSequence"];
  const currFeatures = plasmidDict[plasmidIndex]["fileFeatures"];

  /**
   * File header
   */
  //let currFileHeaderDict = null;
  //const originalFileExtension = plasmidDict[plasmidIndex]["fileExtension"];
  //// GB -> GB
  //if (originalFileExtension === outputFileExtension) {
  //  currFileHeaderDict = plasmidDict[plasmidIndex]["fileHeader"];
  //// DNA -> GB, make new header
  //} else {
  //  /**
  //   * dict = {"0": {"name":"LOCUS","value":"[name]\t[seq length] bp"},
  //   *         "1": {"name":"DEFINITION","value":"."},
  //   *         }
  //   */
  //  currFileHeaderDict = {"0": {"name": "LOCUS", "value": outputFileName + "\t" + currSequence.length + " bp"},
  //              };
  //};

  // Apend the header
  const headerNrSpaces = 12; // Descriptor width
  const headerValueSpaces = 68; // Descriptor value width
  
  // Iterate over entries
  let truncatedName = outputFileName;
  const truncatedNameLength = 16;
  if (truncatedName.length > truncatedNameLength) {
    // Truncate longer strings
    truncatedName = truncatedName.substring(0, truncatedNameLength);
  } else if (truncatedName.length < truncatedNameLength) {
      // Fill shorter strings with text
      truncatedName = truncatedName + fillChar.repeat(truncatedNameLength - truncatedName.length);
  };

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const currentDate = new Date();
  const day = currentDate.getDate().toString().padStart(2, '0');
  const month = months[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const fileHeaderDate = `${day}-${month}-${year}`;
  outputFileContent += "LOCUS       " + truncatedName + "        " + currSequence.length + " bp DNA     circular SYN " + fileHeaderDate + "\n";

  /**
   * File header boilerplate
   */

  const fileHeaderBoilerplate = "DEFINITION  .\nACCESSION   .\nVERSION     .\nKEYWORDS    .\nSOURCE      .\n  ORGANISM  .\n  REFERENCE   1  (bases 1 to 2686)\n  AUTHORS   .\n  TITLE     Direct Submission\n  JOURNAL   Exported with IVA Prime :)\n            https://www.ivaprime.com\n"
  outputFileContent += fileHeaderBoilerplate;

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
        if (propertyName !== "span" && propertyName !== "color") {
          let featureToAppend;
          if (propertyName === "label" || propertyName === "codon_start" || propertyName === "direction") {
            featureToAppend = "/" + propertyName + "=" + propertyValue + "";
          } else {
            featureToAppend = "/" + propertyName + "=\"" + propertyValue + "\"";
          }
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
  outputFileContent += "//\n";

  // Send for download
  downloadFile(outputFileName, outputFileContent, outputFileExtension);
};


/**
 * DNA file exporter.
 */
function exportDNAFile(plasmidIndex) {
  console.log("Export DNA File")
  // Output file name
  const outputFileExtension = "dna"
  const outputFileName =  getFileName(plasmidIndex);;

  // Select target sequence and features
  const currSequence = plasmidDict[plasmidIndex]["fileSequence"];
  const currFeatures = plasmidDict[plasmidIndex]["fileFeatures"];


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
    const encoder = new TextEncoder('utf-8');
    const bytes = encoder.encode(inputString);
  
    const byteArray = [];
    for (let i = 0; i < bytes.length; i++) {
      const byteHex = bytes[i].toString(16).padStart(2, '0');
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
  addBytes("00");

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
        xmlFeatureElement.setAttribute('name', value["label"]);
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

        // If feature is translated, add segment attribute
        if (value["translation"]) {
          xmlSegmentElement.setAttribute('translated', "1");
        };

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
  const xmlString = serializer.serializeToString(xmlDoc).replace(/[\n\r]/g, '').replace(" encoding=\"UTF-8\"", "");

  // Now, xmlString contains the XML structure as a string
  //downloadFile('featuresXMLTree', xmlString, 'xml');

  const emptyFeaturesXML = "<?xml version=\"1.0\"?><Features nextValidID=\"1\"><Feature recentID=\"0\" name=\"Feature 1\" type=\"misc_feature\" allowSegmentOverlaps=\"0\" consecutiveTranslationNumbering=\"1\"><Segment range=\"2-3\" color=\"#a6acb3\" type=\"standard\"/></Feature></Features>";
  // length
  // testing adding 1 to the length
  addBytes(inToHexBytes(xmlString.length + 1));
  // content
  addBytes(stringToBytes(xmlString));
  // stop byte
  addBytes("0a 05");


  /**
   * Primers
   */
  // length
  //addBytes("00 00 00 d9"); //(default xml length)
  //// content
  //const defaultPrimersXML = "<AdditionalSequenceProperties><UpstreamStickiness>0</UpstreamStickiness><DownstreamStickiness>0</DownstreamStickiness><UpstreamModification>Unmodified</UpstreamModification><DownstreamModification>Unmodified</DownstreamModification></AdditionalSequenceProperties>";
  //addBytes(stringToBytes(defaultPrimersXML));
  //// stop byte
  //addBytes("0a 06");

  /**
   * NOTES
   */
  // Universally unique identifier
  let uuid = crypto.randomUUID();
  if (!uuid) {
    uuid = "00000000-0000-0000-0000-000000000000"
  };
  // Time and date
  const currentTime = Date.now();
  const currentDate = new Date(currentTime);
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds  = currentDate.getSeconds().toString().padStart(2, '0');
  const timeHMS = `${hours}:${minutes}:${seconds}`

  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString()
  const day = currentDate.getDate().toString()
  const dateYMD = `${year}.${month}.${day}`;

  // added line feeds \n
  const notesXML = `<Notes>\n<UUID>${uuid}</UUID>\n<Type>Natural</Type>\n<Created UTC=\"${timeHMS}\">${dateYMD}</Created>\n<LastModified UTC=\"${timeHMS}\">${dateYMD}</LastModified>\n<SequenceClass>UNA</SequenceClass>\n<TransformedInto>unspecified</TransformedInto>\n</Notes>`;
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
 * Get user browser
 */
function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserName;
  let browserVersion;

  // Check for Chrome
  if (userAgent.indexOf("Chrome") > -1) {
    browserName = "Chrome";
    browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)[1];
  }
  // Check for Firefox
  else if (userAgent.indexOf("Firefox") > -1) {
    browserName = "Firefox";
    browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)[1];
  }
  // Check for Safari
  else if (userAgent.indexOf("Safari") > -1) {
    browserName = "Safari";
    browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)[1];
  }
  // Check for Edge
  else if (userAgent.indexOf("Edg") > -1) {
    browserName = "Edge";
    browserVersion = userAgent.match(/Edg\/(\d+\.\d+)/)[1];
  }
  // Check for Internet Explorer
  else if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident") > -1) {
    browserName = "Internet Explorer";
    browserVersion = userAgent.match(/(?:MSIE|rv:)\s?(\d+\.\d+)/)[1];
  }
  // Default to unknown
  else {
    browserName = "Unknown";
    browserVersion = "Unknown";
  }

  return {
    browserName,
    browserVersion,
  };
};


/**
 * Download file.
 */
function downloadFile(downloadFileName, downloadFileContent, downloadFileType) {
  console.log("downloadFile:", getBrowserInfo(), downloadFileName, downloadFileContent, downloadFileType)
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
  const userBrowser = getBrowserInfo().browserName
  if (userBrowser === "Safari") {
    console.log("Safari hack.");
    const reader = new FileReader();
    reader.onload = function () {
      downloadLink.href = reader.result;
      downloadLink.download = downloadFileName + "." + downloadFileType;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    reader.readAsDataURL(blob);
  } else {
    const blobURL = window.URL.createObjectURL(blob);
    downloadLink.href = blobURL;
    downloadLink.download = downloadFileName + "." + downloadFileType;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    setTimeout(() => {
      window.URL.revokeObjectURL(blobURL);
    }, 1000);
  }
};


/**
 * Populate the sidebar with the features from the specified plasmid.
 */
function createSidebarTable(plasmidIndex) {
  let currFeatures = plasmidDict[plasmidIndex]["fileFeatures"];


  // Set table headers
  const sidebarTable = document.createElement("TABLE");
  sidebarTable.id = "sidebar-table";
  sidebarTable.classList.add("sidebar-table");
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

  return sidebarTable;
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
function checkAnnotationOverlap(inputFeatures, plasmidIndex) {
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
  let currentGridStructure = plasmidDict[plasmidIndex]["gridStructure"];
  if (!currentGridStructure) {currentGridStructure = defaultGridStructure}
  // Count how many rows are already dedicated to annotations
  for (let i = 0; i < currentGridStructure.length; i++) {
    if (currentGridStructure[i] === "Annotations") {
      count++;
    };
  };
    
  listInsertPos = currentGridStructure.indexOf("Annotations");
  // If more rows are needed, append them
  if (count < maximumOverlap) {
    for (let i = 0; i < maximumOverlap - count; i++) {
      currentGridStructure.splice(listInsertPos, 0 , "Annotations")
    };
  } else if (count > maximumOverlap) {
    let difference = count - maximumOverlap
    for (let i = currentGridStructure.length - 1; i >= 0; i--) {
      if (currentGridStructure[i] === "Annotations") {
          currentGridStructure.splice(i, 1);
          difference--;
          if (difference === 0) {
              break;
          };
      };
    };
  };
  console.log("checkAnnotationOverlap", maximumOverlap, count, currentGridStructure)
  return currentGridStructure;
};


/**
 * 
 * 
 */
window.addEventListener('resize', function () {
  let resizeTimeout;
  clearTimeout(resizeTimeout);
  document.getElementById("file-content").style.display = "none";

  resizeTimeout = setTimeout(function() {
    document.getElementById("file-content").style.display = "block";
    updateAnnotationTrianglesWidth();
  }, 1000);
});


// Creat the content table grid
function makeContentGrid(plasmidIndex) {
  // Init variables
  let currSequence = plasmidDict[plasmidIndex]["fileSequence"];
  let currComplementarySequence = plasmidDict[plasmidIndex]["fileComplementarySequence"];
  let currFeatures = plasmidDict[plasmidIndex]["fileFeatures"];
  
  const currentGridId = "sequence-grid-" + plasmidIndex;
  let sequenceGrid = document.createElement("TABLE");
  sequenceGrid.id = currentGridId;
  sequenceGrid.classList.add("sequence-grid");

  let gridHeight = 0;
  console.log("checkAnnotationOverlap", plasmidIndex);
  for (const key in plasmidDict) {console.log(`checkAnnotationOverlap B4 ${key} ${plasmidDict[key]["gridStructure"] ? plasmidDict[key]["gridStructure"].length : null} ${plasmidDict[key]["gridStructure"]}`)};
  const newGridStructure = checkAnnotationOverlap(currFeatures, plasmidIndex);
  console.log("checkAnnotationOverlap newGS", newGridStructure)
  plasmidDict[plasmidIndex]["gridStructure"] = JSON.parse(JSON.stringify(newGridStructure));
  for (const key in plasmidDict) {console.log(`checkAnnotationOverlap AF ${key} ${plasmidDict[key]["gridStructure"] ? plasmidDict[key]["gridStructure"].length : null} ${plasmidDict[key]["gridStructure"]}`)};
  let currGridStructure = plasmidDict[plasmidIndex]["gridStructure"];

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

    if (currGridStructure[i % currGridStructureLength] === "Spacer") {
      const cell = document.createElement('td');
      cell.id = currGridStructure[i % currGridStructureLength];
      cell.classList.add(currGridStructure[i % currGridStructureLength].replace(" ", ""));
      cell.colSpan = gridWidth;
      // Append the cell to the row
      row.appendChild(cell);
    } else {
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
    }
  };

  
  // Iterate over the features and create the annotatations
  Object.entries(currFeatures).forEach(([key, value]) => {
    if (value.span && !key.includes("source")) { // If the feature includes a span and is not "source"
      // Get the current feature's span
      const direction = (value.span.includes("complement")) ? "left": "right";
      const spanList = removeNonNumeric(value.span);
      const range = spanList.split("..").map(Number);
      const rangeStart = range[0];
      const rangeEnd = range[1];
      let annotText = (value.label) ? value.label: key;
      if (Math.abs(rangeEnd - rangeStart) < 3) {
        annotText = annotText.slice(0, 3)
      };
      
      // Check if color for this item already exists
      const globalColors = Array.from(window.getComputedStyle(document.documentElement))
                                .filter(name => name.startsWith('--')) // Filter only variables
                                .map(name => name.trim()); // Trim any extra whitespace
      const annotationColorVariable = plasmidIndex + key + "-annotation-color";

      // If color not in list, add generate one and add it
      let annotColor = generateRandomUniqueColor();
      recentColor = annotColor; // Store the colour history
      if (globalColors.indexOf("--" + annotationColorVariable) === -1) {
        document.documentElement.style.setProperty(`--${annotationColorVariable}`, annotColor);
      } else {
        annotColor = window.getComputedStyle(document.documentElement).getPropertyValue(`--${annotationColorVariable}`).trim();;
      };

      if (!value["color"]) {
        value["color"] = annotColor;
      };

      console.log("Make annotation", key, annotText, rangeStart + ".." + rangeEnd)
      // Make the annotation at the specified indices
      makeAnnotation(rangeStart - 1, rangeEnd - 1, annotText, key, annotationColorVariable, sequenceGrid, currGridStructure);


      const triangleID = key;
      const featureCells = [];
      for (let rowIdx = 0; rowIdx < sequenceGrid.rows.length; rowIdx++) {
        for (let colIdx = 0; colIdx < sequenceGrid.rows[rowIdx].cells.length; colIdx++) {
            const cell = sequenceGrid.rows[rowIdx].cells[colIdx];
            const featureId = cell.getAttribute("feature-id");
    
            // Check if the cell has the attribute "feature-id" with the value "terminator"
            if (featureId === triangleID) {
              featureCells.push({ row: rowIdx, col: colIdx });
            };
        };
      } ;
      console.log("Triangles, found cells:", triangleID, featureCells)

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
    
        console.log("Triangles, Top-left cell:", triangleID, lowestCell);
        console.log("Triangles, Bottom-right cell:", triangleID, highestCell);
        console.log("Triangles:", triangleID, direction)

        if (direction === "left") {
          const targetRow = sequenceGrid.rows[lowestCell.row];
          const targetCell = targetRow.cells[lowestCell.col];
          console.log("Triangles, target cell:", targetRow, targetCell)
          const newCell = document.createElement("td");
          // Copy attributes from targetCell to newCell
          newCell.id = targetCell.id;
          newCell.class = targetCell.class;
          newCell["feature-id"] = targetCell["feature-id"];
          newCell.colSpan = 1;
          // Append the new cell right before the target cell
          targetRow.insertBefore(newCell, targetCell);

          if (targetCell.colSpan > 1) {
            targetCell.colSpan--;
          } else {
            targetRow.removeChild(targetCell);
          };
          createFilledTriangle(key, annotationColorVariable, "left", lowestCell.row, lowestCell.col, sequenceGrid, plasmidIndex);
        } else {
          const targetRow = sequenceGrid.rows[highestCell.row];
          const targetCell = targetRow.cells[highestCell.col];
          console.log("Triangles, target cell:", triangleID, targetRow.cells.length, targetRow, targetCell)
          const newCell = document.createElement("td");
          // Copy attributes from targetCell to newCell
          newCell.id = targetCell.id;
          newCell.class = targetCell.class;
          newCell["feature-id"] = targetCell["feature-id"];
          newCell.colSpan = 1;
          // Append the new cell right after the target cell
          targetRow.insertBefore(newCell, targetCell.nextSibling);

          let colPos = highestCell.col;
          if (targetCell.colSpan > 1) {
            targetCell.colSpan--;
            colPos++;
          } else {
            targetRow.removeChild(targetCell);
          };
          console.log("Triangles, target cell:", targetRow.cells.length, targetRow)
          createFilledTriangle(key, annotationColorVariable, "right", highestCell.row, colPos, sequenceGrid, plasmidIndex);
        };
      };

      // Check if feature needs to be translated
      //console.log(currFeatures[key]);
      if ((currFeatures[key]["translation"]) || (currFeatures[key]["note"] && (currFeatures[key]["note"].includes(" translation: ")))) {
        const targetStrand = (!value.span.includes("complement")) ? "fwd": "comp";
        console.log("Translating: ", value.label, rangeStart, rangeEnd, targetStrand)
        translateSpan(targetStrand, rangeStart, rangeEnd, sequenceGrid, currGridStructure, plasmidIndex);
      };
    };
  });


  // Clean up cells that are not longer in a tr
  cleanLostCells(sequenceGrid);
  addCellSelection(sequenceGrid, plasmidIndex);
  addCellBorderOnHover(sequenceGrid, plasmidIndex);

  return sequenceGrid;
};


/**
 * Creates the annoations from the span's start to the end, breaking the feature up into
 * multiple if it spans multiple lines.
 * 
 * TO DO:
 * - at the moment it is very slow, maybe find a better way
 * - !!find a way to make this rescale on window resize
 */
function makeAnnotation(rStart, rEnd, text, featureId, annotationColorVariable, targetTable, currGridStructure) {

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
      console.log("MA1:", text, row, col, 1, currentSpan, featureId, annotationColorVariable, targetTable,currGridStructure);
      // Calculate carry over
      carryOver = col + currentSpan - gridWidth;
      // Calculate length of the current annoation
      currentSpan = gridWidth - col;
      // Merge the corresponding cells and create the annotaion
      mergeCells(row, col, 1, currentSpan, text + "...", featureId, annotationColorVariable, targetTable,currGridStructure);
      // Adjust the current span
      currentSpan = carryOver;
      // Increment the row
      row = row + currGridStructure.length;
      // Reset cell index
      col = 0;
    } else if (currentSpan === gridWidth) {
      // If the currentspan covers exactly the current line there is some weird behaviour
      // so fill in the current line and one additional cell in the the following row
      console.log("MA2:", text, row, col, 1, currentSpan, featureId, annotationColorVariable, targetTable,currGridStructure);
      mergeCells(row, col, 1, currentSpan, text, featureId, annotationColorVariable, targetTable,currGridStructure);
      mergeCells(row + currGridStructure.length, col, 1, 1, text, featureId, annotationColorVariable, targetTable,currGridStructure);
      // Set carry over to 0 to signify that we're done
      carryOver = 0;
    } else {
      // The annotation can be fully drawn on the current row
      console.log("MA3:", text, row, col, 1, currentSpan, featureId, annotationColorVariable, targetTable,currGridStructure);
      mergeCells(row, col, 1, currentSpan, text, featureId, annotationColorVariable, targetTable, currGridStructure);
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
function mergeCells(row, col, rowspan, colspan, text, featureId, annotationColorVariable, targetTable, currGridStructure) {
  console.log("Merge cells1: ", row, col, colspan, text, targetTable)

  // Adjust row and col
  let occupiedCellsList = [];
  let occupiedCellsCounter = 0;
  for (let i = 0; i < currGridStructure.length; i++) {
    if (currGridStructure[i] === "Annotations") {
      // Find already occupied cells
      occupiedCellsList = [];
      occupiedCellsCounter = 0;
      console.log("occupiedCells", targetTable.rows[row].cells.length, targetTable.rows[row].cells)
      if (targetTable.rows[row].cells.length === 1) {
        console.log("Try next row.")
        row++;
      } else {
        for (let i = 0; i < targetTable.rows[row].cells.length; i++) {
          console.log("occupiedCell", targetTable.rows[row].cells[i], targetTable.rows[row].cells[i].attributes.hasOwnProperty('feature-id'))
          if (targetTable.rows[row].cells[i].attributes.hasOwnProperty('feature-id')) {
            let currColSpan = parseInt(targetTable.rows[row].cells[i].colSpan);
            console.log("Colspan ", currColSpan);
            occupiedCellsCounter++;
            for (let i = 0; i <  currColSpan; i++) {
              occupiedCellsList.push(true);
            };
          } else {
            occupiedCellsList.push(false);
          };
        };
        
        console.log(col, col+colspan, row, occupiedCellsList, occupiedCellsList.slice(col, col + colspan));
        if (occupiedCellsList.slice(col, col + colspan).every(value => value !== true)) {
          console.log("Go right ahead sir.")
          break;
        } else {
          console.log("Try next row.")
          row++;
        };
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
      for (let i = 0; i < targetTable.rows[row].cells.length; i++) {
        if (targetTable.rows[row].cells[i].attributes.hasOwnProperty('feature-id')) {
          let currColSpan = parseInt(targetTable.rows[row].cells[i].colSpan);
          console.log("Colspan", currColSpan);
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
  console.log("Merge cells2: ", row, col, colspan, text, targetTable.rows[row].cells)
  let mainCell = targetTable.rows[row].cells[col];
  mainCell.rowSpan = rowspan;
  mainCell.colSpan = colspan;
  //mainCell.classList.add("editable")
  mainCell.style.backgroundColor = "var(--" + annotationColorVariable + ")";
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
  colspan--;
  console.log("Merge cells, to delete: ", row, col, colspan, targetTable.rows[row].cells.length);
  for (let j = 0; j < colspan; j++) {
    const cell = targetTable.rows[row].cells[col + 1];
    if (cell) {
      //console.log("Merge cells, deleting: ", row, col + 1, j, targetTable.rows[row].cells.length)
      cell.parentNode.removeChild(cell);
    };
  };
  console.log("Merge cells, after del: ",targetTable.rows[row].cells.length)
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
 * Common promoters
 */
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


/**
 * Convert sequence indices to table coordinates
 */
function seqIndexToCoords(inputIndex, targetRow, inputGridStructure) {
  //console.log("Translating, seqIndexCoords before:", inputIndex, targetRow, inputGridStructure)
  let outputRow = (Math.floor((inputIndex - 0.5) / gridWidth))*inputGridStructure.length + targetRow;
  let outputIndex = inputIndex - Math.floor((inputIndex - 0.5) / gridWidth)*gridWidth - 1;
  //console.log("Translating, seqIndexCoords done:", outputRow, outputIndex, inputGridStructure)
  return [outputRow, outputIndex];
};


/**
 * Starts a translation at the specified position and populates the amino acid row with the translation.
 * 
 * TO DO:
 * - add an option to start translating immediately or inside selected text
 */
function startTranslation(codonPos) {
  // Select the corresponding features and sequence
  let currSequence = plasmidDict[currentlyOpenedPlasmid]["fileSequence"];
  let currGridStructure = plasmidDict[currentlyOpenedPlasmid]["gridStructure"];
  let currTable = document.getElementById("sequence-grid-" + currentlyOpenedPlasmid)

  // Convert to table coordinates based on the row order in the grid structure
  const rowIndexAA = currGridStructure.indexOf("Amino Acids");
  let tableCoords = seqIndexToCoords(codonPos, rowIndexAA, currGridStructure);

  // Get the row and column, increment the column by 1 because the amino acids are
  // displayed in the middle cell of a group of 3 cells
  let row = tableCoords[0];
  let col = tableCoords[1] + 1;

  // Start translating until a stop codon is encountered
  //console.log("Starting translationa at " + codonPos + "(" + row + ", " + col + ").");
  let aaIndex = 1;
  while (true) {
    // Select current codon
    let codon = repeatingSlice(currSequence, codonPos - 1, codonPos + 2);
    // Get the corresponding amino acid
    let aminoAcid = translateCodon(codon);

    // Fill the cells
    fillAACells(row, col, aminoAcid, currTable, currGridStructure, aaIndex);
    aaIndex++;
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
function translateSpan(targetStrand, rangeStart, rangeEnd, targetTable, currGridStructure, plasmidIndex) {
  console.log("Translating:", targetStrand, rangeStart, rangeEnd, targetTable, currGridStructure, plasmidIndex);
  // Select the corresponding features and sequence
  let currSequence = (targetStrand === "fwd") ? plasmidDict[plasmidIndex]["fileSequence"]: plasmidDict[plasmidIndex]["fileComplementarySequence"];

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
  console.log("Translating: tableCoords:", codonStartPos, tableCoords, row, col, dir)

  //console.log("Translating:", targetStrand, col, row, codonPos, codonStartPos, codonEndPos)
  // Start translating until a stop codon is encountered
  //console.log("Starting translationa at " + codonPos + "(" + row + ", " + col + ").");
  let aaIndex = 1;
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
    fillAACells(row, col, aminoAcid, targetTable, currGridStructure, aaIndex);
    aaIndex++;
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
function fillAACells(row, col, text, targetTable, currGridStructure, aaIndex) {
  //console.log("Translating, filling cells:", row, col, text, targetTable, currGridStructure, aaIndex)

  // Select the middle cell
  if (col < 0) {
    row -= currGridStructure.length;
    col = col + gridWidth;
  };
  let mainCell = targetTable.rows[row].cells[col];
  if (!mainCell) { // If the cell does not exist, try the next row over at the beginning
    row += currGridStructure.length;
    col = col - gridWidth;

    mainCell = targetTable.rows[row].cells[col];
  };
  //console.log("Translating, filling cells2:", row, col, text, pNr)

  // Select the left and right cells
  const leftCell = targetTable.rows[row].cells[col-1];
  const rightCell = targetTable.rows[row].cells[col+1];
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
  mainCell.setAttribute("aaIndex", aaIndex);
};


/**
 * 
 */
function createFilledTriangle(featureID, annotationColorVariable, orientation, row, col, targetTable, plasmidIndex) {
  console.log("Triangles:", featureID, annotationColorVariable, orientation, row, col)
  // Select the table cell using the row and col indices
  let cell = targetTable.rows[row].cells[col];
  if (!cell) {
    const newCell = document.createElement("td")
    newCell.id = "Test"
    console.log("Hi:", row, col)
    targetTable.rows.appendChild(newCell);
    cell = targetTable.rows[row].cells[col];
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
  triangle.style.width = 0 + "px";
  triangle.style.height = 0 + "px";
  triangle.style.borderTop = "var(--triangle-height) solid transparent";
  triangle.style.borderBottom = "var(--triangle-height) solid transparent";
  if (orientation === "right") {
    triangle.style.borderLeft = `var(--triangle-width) var(--${annotationColorVariable}) solid`;
  } else {
    triangle.style.borderRight = `var(--triangle-width) var(--${annotationColorVariable}) solid`;
    //triangle.style.position = "absolute";
    triangle.style.right = "0px";
    triangle.style.top = "0px";
  };

  const styleElement = document.createElement('style');
  const borderClasName = featureID.replace("/", "-") + "-cell-borders" + plasmidIndex;
  const dynamicCSS = `
    .${borderClasName} {
      border-right: 3px solid var(--${annotationColorVariable});
      border-left: 3px solid var(--${annotationColorVariable});
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
  if (randomCell) {
     document.documentElement.style.setProperty('--triangle-width', (randomCell.offsetWidth - 4) + 'px');
  };
};


/**
 * Clean up cells that dont have a parent tr
 */
function cleanLostCells(targetTable) {
  let cells = targetTable.querySelectorAll("td"); // Select all table cells (td elements)

  cells.forEach(function (cell) {
    if (!cell.parentElement || cell.parentElement.tagName.toLowerCase() !== "tr") {
      // If the cell is not a child of a <tr> element, remove it
      cell.remove();
    };
  });
};