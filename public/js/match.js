//Set match button to be disables and show pending when clicked on once. 
document.addEventListener('DOMContentLoaded', () => {
    const matches = document.querySelectorAll('.matchForm');
    matches.forEach((form) => {
        form.addEventListener('submit', (event) => {
            const button = form.querySelector('button');
            button.disabled = true;
            button.textContent = 'Pending';
        });
    });
});