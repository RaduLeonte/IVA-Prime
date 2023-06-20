window.onload = function() {
    const fileContentDiv = document.getElementById('file-content');
    const contentDiv = document.querySelector('.content');

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file.name.includes(".gbk") && !file.name.includes(".dna")) {
          return
        }
        const reader = new FileReader();

        reader.onload = function(e) {
            const fileContent = e.target.result;
            
            // Parse the file content into variables
            const { sequence, complementaryStrand, features } = parsePlasmidFile(fileContent);
            
            
            // Create content grid
            makeContentGrid(sequence, complementaryStrand, features);

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
                // console.log(feature.label)
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

            contentDiv.style.overflow = 'auto'; // Enable scrolling after file import
        };

        reader.readAsText(file);
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

const gridStructure = ["Forward Strand",
                        "Complementary Strand",
                        "Annotations",
                        "Empty"];
const gridWidth = 40;

function makeContentGrid(sequence, complementarySequence, features) {
  const sequenceGrid = document.getElementById('sequence-grid');
  sequenceGrid.innerHTML = ''; // Clear previous grid contents

  const gridHeight = Math.ceil(sequence.length / gridWidth) * gridStructure.length;
  console.log(sequence.length, gridHeight, Math.ceil(sequence.length / gridWidth), sequenceGrid.rows)

  for (let i = 0; i < gridHeight; i++) {
    //console.log(i)
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
      row.appendChild(cell);
    }
  }
  
  Object.entries(features).forEach(([key, value]) => {
    if (value.span && !key.includes("source")) {
      console.log(`Key: ${key}, Value: ${value}`);
      function removeNonNumeric(inputString) {
        const cleanedString = inputString.replace(/[^\d.]/g, '');
        return cleanedString;
      }
      console.log(value.span)
      value.span = removeNonNumeric(value.span);
      console.log(value.span)
      const range = value.span.split("..").map(Number);
      const rangeStart = range[0];
      const rangeEnd = range[1];

      makeAnnotation(rangeStart - 1, rangeEnd, value.label); 
    }
  });
  
}

function makeAnnotation(rStart, rEnd, text) {
  const annotationColor = getRandomBackgroundColor();
  Math.floor(rStart / gridWidth)
  let {row, col} = basePositionToCoord(rStart);
  const annotationSpan = rEnd - rStart;
  let currentSpan = annotationSpan;
  for (let i = 0; i < Math.floor(annotationSpan/gridWidth + 1); i++) {
    if (i != 0) {
        text = "..." + text.replace("...", "");
      }
    if (col + currentSpan > gridWidth) {
      let carryOver = col + currentSpan - gridWidth;
      currentSpan = gridWidth - col;
      mergeCells(row, col, 1, currentSpan, text, annotationColor);
      currentSpan = carryOver;
      row = row + gridStructure.length;
      col = 0;
    } else {
      mergeCells(row, col, 1, currentSpan, text, annotationColor);
    }
  }

}

function basePositionToCoord(pos) {
  let row = (Math.floor(pos / gridWidth)) * gridStructure.length;
  const col = pos - (row/gridStructure.length)*gridWidth;
  row = row + 2
  return {row, col};
}

function mergeCells(row, col, rowspan, colspan, text, color) {
  const table = document.getElementById('sequence-grid');
  console.log(row, col);
  console.log(table);
  const mainCell = table.rows[row].cells[col];

  mainCell.rowSpan = rowspan;
  mainCell.colSpan = colspan;
  mainCell.style.backgroundColor = color;

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

