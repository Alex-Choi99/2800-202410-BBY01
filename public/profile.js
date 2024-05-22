const showImagePopup = document.getElementById('profileImage');
const popupContainer = document.querySelector('.settingsDiv');

showImagePopup.onclick = () => {
    popupContainer.classList.add('active');
};