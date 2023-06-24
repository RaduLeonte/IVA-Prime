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
  console.log("Mergin cells: ", row, col, rowspan, colspan, text, color);
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
    col++;
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
  console.log("Cell content above: ", mainCell.innerText)

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

