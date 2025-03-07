const Alerts = new class {
    constructor () {
        document.addEventListener("DOMContentLoaded", () => {
            if (!UserPreferences.get("cookieConsentGiven")) Alerts.showCookieConsentDisclaimer();
        });
    };
    /**
     * Create an orange alert with a lifetime of 5 s.
     * 
     * @param {String} title - Title of the alert 
     * @param {String} body  - Body of alert, can also be html
     * @param {number} lifetime - Alert lifetime in s
     * @param {String} color - CSS color for left border and svg icon
     */
    warning(title, body, lifetime=5, color="orange", ) {
        this.showAlert(
            title,
            body,
            lifetime,
            color,
        );
    };


    /**
     * Create a red alert with infinite lifetime.
     * 
     * @param {String} title - Title of the alert 
     * @param {String} body  - Body of alert, can also be html
     * @param {number} lifetime - Alert lifetime in s
     * @param {String} color - CSS color for left border and svg icon
     */
    error(title, body, lifetime=-1, color="red") {
        this.showAlert(
            title,
            body,
            lifetime,
            color,
        );
    };


    /**
     * Create an alert and append it to the alert container.
     * 
     * @param {String} title - Title of the alert 
     * @param {String} body  - Body of alert, can also be html
     * @param {number} lifetime - Alert lifetime in s
     * @param {String} color - CSS color for left border and svg icon
     */
    showAlert(title, body, lifetime=5, color="orange", ) {
        // Select alert parent container
        const alertsContainer = document.getElementById("alerts-container");
        
        // Create new alert element
        const alert = document.createElement('div');
        alert.classList.add("alert");
        alert.style.borderColor = color;

        // Alert icon
        const alertIconContainer = document.createElement("DIV");
        alertIconContainer.classList.add("alert-icon-container");
        alert.appendChild(alertIconContainer);
        const alertIcon = document.createElement('svg');
        alertIcon.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M9.82664 2.22902C10.7938 0.590326 13.2063 0.590325 14.1735 2.22902L23.6599 18.3024C24.6578 19.9933 23.3638 22 21.4865 22H2.51362C0.63634 22 -0.657696 19.9933 0.340215 18.3024L9.82664 2.22902ZM10.0586 7.05547C10.0268 6.48227 10.483 6 11.0571 6H12.9429C13.517 6 13.9732 6.48227 13.9414 7.05547L13.5525 14.0555C13.523 14.5854 13.0847 15 12.554 15H11.446C10.9153 15 10.477 14.5854 10.4475 14.0555L10.0586 7.05547ZM14 18C14 19.1046 13.1046 20 12 20C10.8954 20 10 19.1046 10 18C10 16.8954 10.8954 16 12 16C13.1046 16 14 16.8954 14 18Z" fill="${color}"/>
            </svg>
        `;
        alertIconContainer.appendChild(alertIcon);

        // Alert main body for title and text
        const alertBody = document.createElement('div');
        alertBody.classList.add("alert-body")
        
        // Title
        const alertTitle = document.createElement('h4');
        alertTitle.innerHTML = title;
        
        // Alert text
        const alertText = document.createElement("div");
        alertText.classList.add("alert-text")
        alertText.innerHTML = body;
        
        
        alertBody.append(alertTitle)
        alertBody.append(alertText)
        alert.appendChild(alertBody);

        // Close button
        const closeButton = document.createElement('span');
        closeButton.classList.add("alert-close-button")
        closeButton.textContent = '×';
        closeButton.addEventListener('click', function (e) {
            Alerts.removeAlert(alert)
        });
        alert.appendChild(closeButton);

        alertsContainer.insertBefore(alert, alertsContainer.firstChild);


        if (lifetime !== -1) {
            setTimeout(function (e) {
                Alerts.removeAlert(alert)
            }, lifetime*1000);
        };
    };


    /**
     * Remove alert after playing animation
     * 
     * @param {HTMLElement} alert - Alert HTML element
     * @param {number} animationDuration - Duration of fade out animation in s
     */
    removeAlert(alert, animationDuration=0.5) {
        // Create temporary css class to set the height of the alert
        // to its current height
        const currentHeight = alert.offsetHeight;
        const tempClass = 'alter-temp-fixed-height-' + Utilities.newUUID();
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `.${tempClass} { height: ${currentHeight}px; }`;
        document.head.appendChild(styleEl);
        alert.classList.add(tempClass);
        alert.offsetHeight; // Force update the height by reading it

        // Add class
        alert.classList.add('alert-collapsed');
        
        // Remove alert and temporary css class after animation is done
        setTimeout(() => {
            alert.remove();
            styleEl.parentNode.removeChild(styleEl);
        }, animationDuration*1000);
    };


    showCookieConsentDisclaimer() {
        // Select alert parent container
        const alertsContainer = document.getElementById("alerts-container");
        
        // Create new alert element
        const alert = document.createElement('div');
        alert.classList.add("alert");
        alert.classList.add("cookie-consent")
        alert.style.borderColor = "#45a049";

        // Alert main body for title and text
        const alertBody = document.createElement('div');
        alertBody.classList.add("alert-body");
        alertBody.classList.add("cookie-consent-body");
        
        // Title
        const alertTitle = document.createElement('h4');
        alertTitle.innerHTML = "Cookie disclaimer";
        
        // Alert text
        const alertText = document.createElement("div");
        alertText.classList.add("alert-text");
        alertText.innerHTML = `
        <p>
            IVA Prime uses cookies to store user preferences across sessions. No third-party cookies are used to track or profile users.
        </p>
        <p>
            <a href="/about#privacy-policy" target="_blank" class="underlined-link">Click here for more details</a>
        </p>`;
        
        
        // Close button
        const agreeButton = document.createElement('span');
        agreeButton.classList.add("round-button");
        agreeButton.classList.add("cookie-consent-agree-button");
        agreeButton.textContent = "Understood";
        agreeButton.addEventListener('click', function (e) {
            UserPreferences.set("cookieConsentGiven", true);
            Alerts.removeAlert(alert);
        });
        
        //alertBody.append(alertTitle)
        alertBody.append(alertText)
        alertBody.appendChild(agreeButton);
        alert.appendChild(alertBody);


        alertsContainer.insertBefore(alert, alertsContainer.firstChild);
    };
};