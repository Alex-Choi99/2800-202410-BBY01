const showImagePopup = document.getElementById('profileImage');
const popupContainer = document.querySelector('.settingsDiv');
const exitIcon = document.getElementById('exitIcon');
var imageDiv = document.getElementById('defaultProfilePicture');
// Cloudinary image source
let originalImageSource = '<script type="text/javascript">document.write($.cloudinary.imageTag(\'<%- user.image_id %>\', { height: 100, width: 100, crop: "fit" }).toHtml());</script>';

// If statement that decides when to show the image popup. 
if (!showImagePopup) {
  console.log('No image popup.')
} else {
  showImagePopup.onclick = () => {
    popupContainer.classList.add('active');
  };
}

// If statement that decides when to close the image popup.
if (!exitIcon) {
  console.log('No exit icon.')
} else {
  exitIcon.onclick = () => {
    popupContainer.classList.remove('active');
  };
}

// Function that previews the user's profile picture inside
// the change image popup.
function previewImage(event) {
  imageDiv.innerHTML = '';
  var img = document.createElement('img');
  img.src = URL.createObjectURL(event.target.files[0]);
  img.height = 100;
  img.width = 100;
  img.style.objectFit = 'cover';
  imageDiv.appendChild(img);
}

// Function to update the user's profile info section
document.addEventListener('DOMContentLoaded', () => {
  const editNameButton = document.getElementById('editNameButton');
  const editNameForm = document.getElementById('editNameForm');
  const editDescriptionButton = document.getElementById('editDescriptionButton');
  const editDescriptionForm = document.getElementById('editDescriptionForm');
  const descriptionText = document.getElementById('descriptionText');

  editNameButton.addEventListener('click', () => {
    editNameForm.classList.remove('d-none');
    editNameButton.classList.add('d-none');
  });

  editDescriptionButton.addEventListener('click', () => {
    editDescriptionForm.classList.remove('d-none');
    editDescriptionButton.classList.add('d-none');
    descriptionText.classList.add('d-none');
  });
});