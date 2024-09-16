
/**
 * Display an alert popup at the bottom right of the screen.
 * 
 * @param {string} title - Title/header
 * @param {string} body - Main text
 * @param {string} color - Border and icon color
 * @param {number} lifetime - Lifetime of alert [s] (-1 for immortal alert)
 */
function alert(title, body, color="orange", lifetime=-1) {
    // Container
    const popup = document.createElement('div');
    popup.classList.add("alert")
    popup.style.borderLeft = "5px solid " + color;

    // Icon
    const popupIcon = document.createElement('svg');
    popupIcon.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M9.82664 2.22902C10.7938 0.590326 13.2063 0.590325 14.1735 2.22902L23.6599 18.3024C24.6578 19.9933 23.3638 22 21.4865 22H2.51362C0.63634 22 -0.657696 19.9933 0.340215 18.3024L9.82664 2.22902ZM10.0586 7.05547C10.0268 6.48227 10.483 6 11.0571 6H12.9429C13.517 6 13.9732 6.48227 13.9414 7.05547L13.5525 14.0555C13.523 14.5854 13.0847 15 12.554 15H11.446C10.9153 15 10.477 14.5854 10.4475 14.0555L10.0586 7.05547ZM14 18C14 19.1046 13.1046 20 12 20C10.8954 20 10 19.1046 10 18C10 16.8954 10.8954 16 12 16C13.1046 16 14 16.8954 14 18Z" fill="${color}"/>
    </svg>
  `;

    const titleBody = document.createElement('div');
    // Title
    const popupTitle = document.createElement('h4');
    popupTitle.textContent = title;
    // Body
    const popupBody = document.createElement('p');
    popupBody.textContent = body;
    titleBody.append(popupTitle, popupBody)

    // Close button
    const closeButton = document.createElement('span');
    closeButton.classList.add("alert-close-btn")
    closeButton.textContent = '×';

    popup.appendChild(popupIcon);
    popup.appendChild(titleBody);
    popup.appendChild(closeButton);
    document.body.appendChild(popup);


    function removePopup() {popup.remove()};
    closeButton.addEventListener('click', removePopup);

    if (lifetime !== -1) {
        setTimeout(removePopup, lifetime*1000);
    };
};