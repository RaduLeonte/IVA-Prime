
let clickedOffset = 0;
let selectedText = '';

function updateMenuItems() {
  const insertionMenuItem = document.getElementById('insertion');
  const deletionMenuItem = document.getElementById('deletion');
  const mutationMenuItem = document.getElementById('mutation');
  const subcloningMenuItem = document.getElementById('subcloning');

  insertionMenuItem.disabled = selectedText.length > 0;
  deletionMenuItem.disabled = selectedText.length === 0;
  mutationMenuItem.disabled = selectedText.length === 0;
  subcloningMenuItem.disabled = selectedText.length === 0;

  insertionMenuItem.classList.toggle('disabled', selectedText.length > 0);
  deletionMenuItem.classList.toggle('disabled', selectedText.length === 0);
  mutationMenuItem.classList.toggle('disabled', selectedText.length === 0);
  subcloningMenuItem.classList.toggle('disabled', selectedText.length === 0);
}

document.addEventListener('DOMContentLoaded', function() {
    const targetElementId = 'forward_strand'; // Replace with the ID of your target element
  
    // Create a custom context menu element
    const contextMenu = document.createElement('div');
    contextMenu.className = 'custom-context-menu';
    contextMenu.innerHTML = `<ul>
                          <li id="insertion" ${selectedText.length > 0 ? 'disabled' : ''}>Insert sequence</li>
                          <li id="deletion" ${selectedText ? '' : 'disabled'}>Delete selection</li>
                          <li id="mutation" ${selectedText ? '' : 'disabled'}>Mutate selection</li>
                          <li id="subcloning" ${selectedText ? '' : 'disabled'}>Subclone</li>
                        </ul>`;
    document.body.appendChild(contextMenu);
  
    // Hide the custom context menu by default
    contextMenu.style.display = 'none';
  
    // Function to handle the context menu event
    function handleContextMenu(clientX, clientY) {
  
      const paragraph = document.getElementById(targetElementId);
  
      const selection = window.getSelection();
      selectedText = selection.toString().trim();

      if (!selectedText) {
        // Reset the selection to prevent automatic selection in Safari
        selection.removeAllRanges();
        const range = document.createRange();
        range.setStart(paragraph, 0);
        range.setEnd(paragraph, 0);
        selection.addRange(range);
      }
  
      clickedOffset = getCharacterOffset(paragraph, clientX, clientY);
  
      if (selectedText) {
        console.log('Selected text:', selectedText);
      }
  
      console.log('Clicked position:', clickedOffset);

      // Update disabled attribute of menu items
      updateMenuItems();
  
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
      //event.preventDefault(); // Prevent the default context menu from appearing
      if (event.target.matches(`#${targetElementId}`)) {
        handleContextMenu(event.clientX, event.clientY); // Pass the mouse coordinates to the handler function
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
      const menuItem = document.getElementById(menuItemId);
      if (menuItem.disabled) {
        return; // Return early if the clicked menu item is disabled
      }
  
      if (menuItemId === 'insertion') {
        console.log('Insertion selected');
        let currentCursorPosition = clickedOffset;
        // HTML elements
        let fwd_strand = document.getElementById('forward_strand');
        let rev_strand = document.getElementById('complementary_strand');

        // Insertions
        let seq = "AAAA"
        let insertion = "<span style='color: red; font-weight: bold;'>" + seq + "</span>"
        let insertionComplementary = "<span style='color: red; font-weight: bold;'>" + getComplementaryStrand(seq)  + "</span>"
        
        // Account for previous insertions
        let tagList = [];
        let currentIndex = 0;
        let strandInnerHTML = fwd_strand.innerHTML;
        console.log(strandInnerHTML)

        while (currentIndex < currentCursorPosition) {
          let startIndex = strandInnerHTML.indexOf("<", currentIndex);

          if (startIndex === -1 || startIndex >= currentCursorPosition) {
            break; // Exit the loop if no more tags or reaching the endIndex
          }

          let openingTagEndIndex = strandInnerHTML.indexOf(">", startIndex + 1);

          let closingTagStartIndex = strandInnerHTML.indexOf("</", openingTagEndIndex + 1);
          let closingTagEndIndex = strandInnerHTML.indexOf(">", closingTagStartIndex + 1);

          if (closingTagStartIndex !== -1 && closingTagEndIndex !== -1) {
            let openingTag = strandInnerHTML.substring(startIndex, openingTagEndIndex + 1);
            let closingTag = strandInnerHTML.substring(closingTagStartIndex, closingTagEndIndex + 1);

            // Check if the opening tag already exists in the list
            let existingOpeningTagIndex = tagList.findIndex(item => item.tag === openingTag);
            if (existingOpeningTagIndex !== -1) {
              tagList[existingOpeningTagIndex].count++; // Increment count
            } else {
              tagList.push({ tag: openingTag, count: 1 }); // Add opening tag
            }

            // Check if the closing tag already exists in the list
            let existingClosingTagIndex = tagList.findIndex(item => item.tag === closingTag);
            if (existingClosingTagIndex !== -1) {
              console.log("Already in list")
              tagList[existingClosingTagIndex].count++; // Increment count
            } else {
              tagList.push({ tag: closingTag, count: 1 }); // Add closing tag
            }

            currentIndex = closingTagEndIndex + 1; // Move the current index to the end of the closing tag
          } else {
            currentCursorPosition = strandInnerHTML.indexOf(">", openingTagEndIndex + 1);
            if (currentCursorPosition === -1) {
              break; // Exit the loop if a tag is not properly closed
            }

            let tag = strandInnerHTML.substring(startIndex, currentCursorPosition + 1);

            // Check if the tag already exists in the list
            let existingTagIndex = tagList.findIndex(item => item.tag === tag);
            if (existingTagIndex !== -1) {
              tagList[existingTagIndex].count++; // Increment count
            } else {
              tagList.push({ tag, count: 1 }); // Add tag
            }

            currentIndex = currentCursorPosition + 1; // Move the current index to the end of the tag
          }
        }

        console.log(tagList);

        let totalSum = tagList.reduce((sum, item) => sum + item.tag.length * item.count, 0);
        console.log(totalSum);


        let insertionPosition = clickedOffset + totalSum;
      

        // Change html
        fwd_strand.innerHTML = fwd_strand.innerHTML.slice(0, insertionPosition) + insertion + fwd_strand.innerHTML.slice(insertionPosition);
        rev_strand.innerHTML = rev_strand.innerHTML.slice(0, insertionPosition) + insertionComplementary + rev_strand.innerHTML.slice(insertionPosition);
      } else if (menuItemId === 'deletion') {
        console.log('Deletion selected');
      } else if (menuItemId === 'mutation') {
        console.log('Mutation selected');
      } else if (menuItemId === 'deletion') {
        console.log('Subcloning selected');
      }
  
      hideContextMenu();
    });
  
    // Function to get the character offset within an element
    function getCharacterOffset(element, clientX, clientY) {
      const range = document.caretRangeFromPoint(clientX, clientY);
      const clonedRange = range.cloneRange();
      clonedRange.selectNodeContents(element);
      clonedRange.setEnd(range.startContainer, range.startOffset);
      return clonedRange.toString().length;
    }
  })