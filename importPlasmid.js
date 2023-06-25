const gridStructure = ["Forward Strand",
                        "Complementary Strand",
                        "Indices",
                        "Amino Acids",
                        "Annotations"];
const gridWidth = 40;
let sequence = "";
let complementaryStrand = "";
let features = null;

window.onload = function() {
    const fileContentDiv = document.getElementById('file-content');
    const contentDiv = document.querySelector('.content');

    function handleFileSelect(event) {
        const file = event.target.files[0];
        const fileExtension =  /\.([0-9a-z]+)(?:[\?#]|$)/i.exec(file.name)[0];
        const acceptedFileExtensions = [".gbk", ".gb"]
        if (acceptedFileExtensions.includes(fileExtension)) {
          const reader = new FileReader();

          reader.onload = function(e) {
              const fileContent = e.target.result;
              
              // Parse the file content into variables
              parsePlasmidFile(fileContent);
              

              // Update header with filename
              const headerList = document.getElementById('header-list');
              headerList.innerHTML = headerList.innerHTML + "<li><a>" + file.name + "</a></li>";
              

              // Sidebar contents
              const sidebarTable = document.getElementById('sidebar-table');
              sidebarTable.innerHTML = `
                  <tr>
                      <th>Feature</th>
                      <th>Label</th>
                      <th>Range</th>
                      <th>Note</th>
                  </tr>
              `; // Set table headers

              // SIDEBAR
              for (const featureName in features) {
                  if (!featureName.includes("LOCUS") && !featureName.includes("source")) {
                    const feature = features[featureName];
              
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

              // Create content grid
              makeContentGrid(sequence, complementaryStrand, features);

              // Check for promoters and translation
              promoterTranslation();

              contentDiv.style.overflow = 'auto'; // Enable scrolling after file import
          };

          reader.readAsText(file);
          }
        
    }

    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.addEventListener('change', handleFileSelect);
    const importLink = document.querySelector('nav ul li a');
    importLink.addEventListener('click', function(event) {
        event.preventDefault();
        fileInput.click();
    });
};

function checkAnnotationOverlap(features) {
  let maximumOverlap = 0;
  const spansList = [];
  Object.entries(features).forEach(([key, value]) => {
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
        if (startA <= endB && endA >= startB) {
          currentOverlap++;
        }
      }
    }
  
    if (currentOverlap > maximumOverlap) {
      maximumOverlap = currentOverlap;
    }
  }

  let count = 0;

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

  return
}


function makeContentGrid(sequence, complementarySequence, features) {
  checkAnnotationOverlap(features);
  const sequenceGrid = document.getElementById('sequence-grid');
  sequenceGrid.innerHTML = ''; // Clear previous grid contents

  const gridHeight = Math.ceil(sequence.length / gridWidth) * gridStructure.length;

  for (let i = 0; i < gridHeight; i++) {
    let row = sequenceGrid.rows[i]; // Get the corresponding row
    if (!row) {
      // If the row doesn't exist, create a new one
      row = sequenceGrid.insertRow(i);
    } 
    for (let j = 0; j < gridWidth; j++) {
      const cell = document.createElement('td');
      let currentChar = ""
      let test = Math.floor(i / gridStructure.length)
      if ((i + 1) % gridStructure.length === 1) {
        currentChar = sequence[test*gridWidth + j]
      } else if ((i + 1) % gridStructure.length === 2) {
        currentChar = complementarySequence[test*gridWidth + j]
      }
      if (!currentChar) {
        currentChar = ""
      }
      cell.textContent = currentChar;
      cell.id = gridStructure[i % gridStructure.length];
      cell.classList.add(gridStructure[i % gridStructure.length].replace(" ", ""));
      row.appendChild(cell);
    }
  }
  
  Object.entries(features).forEach(([key, value]) => {
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
      makeAnnotation(rangeStart - 1, rangeEnd - 1, value.label); 
    }
  });
  
}

function makeAnnotation(rStart, rEnd, text) {
  const annotationColor = getRandomBackgroundColor();
  let row = (Math.floor(rStart / gridWidth)) * gridStructure.length;
  let col = rStart - (row/gridStructure.length)*gridWidth;
  row = row + gridStructure.indexOf("Annotations");
  const annotationSpan = rEnd - rStart;

  let currentSpan = annotationSpan;
  let carryOver = annotationSpan;
  console.log("Annotation: ", rStart, rEnd, row, col, text, annotationSpan);
  
  //for (let i = 0; i < Math.floor((annotationSpan + col)/gridWidth + 1); i++) {
  let i = 0;
  while (carryOver > 0) {
    console.log("Current part: ", i + 1, "/", Math.floor((annotationSpan + col)/gridWidth + 1))
    if (i != 0) {
        text = "..." + text.replace("...", "");
    }
    if (col + currentSpan > gridWidth) {
      carryOver = col + currentSpan - gridWidth;
      console.log("Carry over: " + carryOver);
      currentSpan = gridWidth - col;
      console.log("Current span1: " + currentSpan);
      mergeCells(row, col, 1, currentSpan, text, annotationColor);
      currentSpan = carryOver;
      row = row + gridStructure.length;
      col = 0;
    } else if (currentSpan === 40) {
      console.log("Current span2: " + currentSpan);
      mergeCells(row, col, 1, currentSpan, text, annotationColor);
      mergeCells(row + gridStructure.length, col, 1, 1, text, annotationColor);
      carryOver = 0;
    } else {
      console.log("Current span3: " + currentSpan);
      mergeCells(row, col, 1, currentSpan + 1, text, annotationColor);
      carryOver = 0;
    }
    i++;
  }

  // if (carryOver !== 0) {
  //   console.log(carryOver + 1);
  //   mergeCells(row, col, 1, carryOver + 1, "..." + text.replace("...", ""), annotationColor);
  // }
}



function mergeCells(row, col, rowspan, colspan, text, color) {
  const table = document.getElementById('sequence-grid');
  
  // Adjust col pos
  let occupiedCells = 0;
  if (table.rows[row].cells.length !== gridWidth) {
    for (let i = 0; i < table.rows[row].cells.length; i++) {
      if (i + occupiedCells <= col){
        if (table.rows[row].cells[i].attributes.colspan) {
          occupiedCells += parseInt(table.rows[row].cells[i].attributes.colspan.value);
        }
      }
    }
    console.log(col + 1, gridWidth, (col + 1 >= gridWidth));
    if ((col + 1 < gridWidth)) {
      col++;
    }
  }
  
  if (col - occupiedCells < 0) {
    row++;
    col--;
  } else {
    col = col - occupiedCells;
  }

  
  let mainCell = 0;
  for (let i = 0; i < gridStructure.filter(item => item === "Annotations").length; i++) {
    mainCell = table.rows[row].cells[col];
    if (!mainCell) {
      row++;
      mainCell = table.rows[row].cells[col];
    }
  }

  if (mainCell.innerText.trim() !== '') {
    row++;
    col = col + occupiedCells;
    occupiedCells = 0;
    if (table.rows[row].cells.length !== gridWidth) {
      for (let i = 0; i < table.rows[row].cells.length; i++) {
        if (i + occupiedCells < col){
          if (table.rows[row].cells[i].attributes.colspan) {
            occupiedCells += parseInt(table.rows[row].cells[i].attributes.colspan.value);
          }
        }
      }
    }
    
    if (col - occupiedCells < 0) {
      row++;
      col--;
    } else {
      col = col - occupiedCells;
    }
    mainCell= table.rows[row].cells[col];
  }

  // If fails again, just abort the function call
  console.log("Mergin cells: ", row, col, rowspan, colspan, text, color);
  mainCell.rowSpan = rowspan;
  if (col + colspan > gridWidth) {
    console.log(col, colspan)
    colspan = gridWidth - col;
  };
  mainCell.colSpan = colspan;
  mainCell.style.backgroundColor = color;

  //throw new Error('Script aborted due to a specific condition.');

  // Remove extra cells
  for (let i = row; i < row + rowspan; i++) {
    let k = 0;
    for (let j = col + 1; j < col + colspan; j++) {
      const cell = table.rows[i].cells[j - k];
      cell.parentNode.removeChild(cell);
      k++;
    }
  }

  // Add text to the center of the merged cell
  const textNode = document.createTextNode(text);
  mainCell.appendChild(textNode);
  mainCell.style.textAlign = 'center';
}

function getRandomBackgroundColor() {
  const colors = ["#FFB6C1", "#FFDAB9", "#FFA07A", "#FFC0CB", "#87CEFA", "#98FB98", "#FF69B4", "#90EE90"];

  const randomIndex = Math.floor(Math.random() * colors.length);
  const randomColor = colors[randomIndex];

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

function promoterTranslation() {
  function findAllOccurrences(string, substring) {
    const indices = [];
    let index = string.indexOf(substring);
  
    while (index !== -1) {
      indices.push(index);
      index = string.indexOf(substring, index + 1);
    }
  
    return indices;
  }


  for (let promoter in promoters) {
    let promoterSeq = promoters[promoter];
    console.log(promoter + ": " + promoterSeq);
    const occurrences = findAllOccurrences(sequence, promoterSeq);
    console.log(occurrences)
    if (occurrences.length !== 0) {
      for (let i = 0; i < occurrences.length; i++) {
        startTranslation(sequence.indexOf("ATG", occurrences[i] + promoter.length) + 1);
      }
    }
  }
}

function seqIndexToCoords(inputIndex, targetRow) {
  const outputRow = (Math.floor(inputIndex / gridWidth))*gridStructure.length + targetRow;
  const outputIndex = inputIndex - Math.floor(inputIndex / gridWidth)*gridWidth - 1;
  return [outputRow, outputIndex];
}

function startTranslation(codonPos) {
  let rowIndex = 0;
  let cellIndex = 0;
  console.log("Starting translationa at " + codonPos + "(" + rowIndex + ", " + cellIndex + ").");
  const rowIndexAA = gridStructure.indexOf("Amino Acids");
  let tableCoords = seqIndexToCoords(codonPos, rowIndexAA);
  //console.log(tableCoords);
  let row = tableCoords[0];
  let col = tableCoords[1] + 1;

  while (true) {
    let codon = sequence.slice(codonPos - 1, codonPos + 2);
    let aminoAcid = translateCodon(codon);
    //console.log(codon, aminoAcid);
    fillAACells(row, col, aminoAcid);
    col += 3;
    codonPos += 3;
    if (col > gridWidth) {
      col -= gridWidth;
      row += gridStructure.length;
    }
    if (aminoAcid === "-"){
      break;
    }
  }
}

function fillAACells(row, col, text) {
  //console.log(row, col ,text);
  const table = document.getElementById('sequence-grid');
  let mainCell = table.rows[row].cells[col];
  if (!mainCell) {
    row += gridStructure.length;
    col = col - gridWidth;
    //console.log(row, col ,text);
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


