const overlayParagraph = document.querySelector('.complementary_strand');

overlayParagraph.addEventListener('mousedown', function(event) {
  overlayParagraph.style.pointerEvents = 'none'; // Disable pointer events to allow text selection in the underlying paragraph
});

overlayParagraph.addEventListener('mouseup', function(event) {
  overlayParagraph.style.pointerEvents = 'all'; // Enable pointer events in the overlay paragraph again
});