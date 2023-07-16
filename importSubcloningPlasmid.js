let secondPlasmidIported = false;

function handleFileSelectSecond(event) {

    const file = event.target.files[0];
        const fileExtension =  /\.([0-9a-z]+)(?:[\?#]|$)/i.exec(file.name)[0];
        const acceptedFileExtensions = [".gbk", ".gb", ".dna"]
        if (acceptedFileExtensions.includes(fileExtension)) {
          const reader = new FileReader();

          reader.onload = function(e) {
              const fileContent = e.target.result;
              
              // Parse the file content into variables
              if (fileExtension === ".dna") {
                parseDNAFile(fileContent, 2);
              } else {
                parsePlasmidFile(fileContent, 2);
              }

              // Update header with filename
              const headerList = document.getElementById('header-list');
              headerList.innerHTML = headerList.innerHTML + "<li><a>" + file.name + "</a></li>";
              

              // Sidebar contents
              const sidebarTable = document.getElementById('sidebar-table2');
              sidebarTable.innerHTML = `
                  <tr>
                      <th>Feature</th>
                      <th>Label</th>
                      <th>Range</th>
                      <th>Note</th>
                  </tr>
              `; // Set table headers

              // SIDEBAR
              for (const featureName in features2) {
                  if (!featureName.includes("LOCUS") && !featureName.includes("source")) {
                    const feature = features2[featureName];
              
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
                
                    // Add feature notes
                    const noteCell = document.createElement('td');
                    noteCell.textContent = feature.note || '';
                    noteCell.className = 'wrap-text';
                    row.appendChild(noteCell);
                
                    sidebarTable.appendChild(row);
                  }
                  
              }

              // Create content grid
              makeContentGrid(2);
              initiateSearchFunctionality(2);
          };

          reader.readAsText(file);
          }

    // After the second file is imported, create the second plasmid window
    createSecondPlasmidWindow();
    secondPlasmidIported = true;
}

function createSecondPlasmidWindow() {
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
}
