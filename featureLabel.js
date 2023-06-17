function createFloatingBox(paragraphId, startIndex, endIndex) {
  const initializeObserver = () => {
    const paragraph = document.getElementById(paragraphId);
    if (!paragraph) {
      const observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            const addedNodes = Array.from(mutation.addedNodes);
            if (addedNodes.some(node => node.id === paragraphId)) {
              observer.disconnect();
              createFloatingBox(paragraphId, startIndex, endIndex);
              break;
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      const textNode = paragraph.firstChild;
      const range = document.createRange();
      range.setStart(textNode, startIndex);
      range.setEnd(textNode, endIndex);

      const selectionRect = range.getBoundingClientRect();
      const paragraphRect = paragraph.getBoundingClientRect();

      const floatingBox = document.createElement('div');
      floatingBox.className = 'floating-box';
      floatingBox.textContent = textNode.textContent.substring(startIndex, endIndex);

      const floatingBoxWidth = floatingBox.offsetWidth;
      const floatingBoxHeight = floatingBox.offsetHeight;

      floatingBox.style.left = `${selectionRect.left - paragraphRect.left}px`;
      floatingBox.style.top = `${selectionRect.bottom - paragraphRect.top}px`;

      const contentDiv = document.querySelector('.content');
      contentDiv.appendChild(floatingBox);

      const scrollHandler = () => {
        const newSelectionRect = range.getBoundingClientRect();
        floatingBox.style.top = `${newSelectionRect.bottom - paragraphRect.top}px`;
      };

      contentDiv.addEventListener('scroll', scrollHandler);

      const resizeHandler = () => {
        const newSelectionRect = range.getBoundingClientRect();
        floatingBox.style.top = `${newSelectionRect.bottom - paragraphRect.top}px`;
      };

      window.addEventListener('resize', resizeHandler);

      const removeEventListeners = () => {
        contentDiv.removeEventListener('scroll', scrollHandler);
        window.removeEventListener('resize', resizeHandler);
      };

      // Cleanup on paragraph removal
      const mutationHandler = (mutationsList, observer) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList' && Array.from(mutation.removedNodes).includes(paragraph)) {
            observer.disconnect();
            removeEventListeners();
            break;
          }
        }
      };

      const mutationObserver = new MutationObserver(mutationHandler);
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeObserver);
  } else {
    initializeObserver();
  }
}

createFloatingBox('forward_strand', 6, 15); // Example usage: Create floating box for characters 6 to 15
