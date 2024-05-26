const showImagePopup = document.getElementById('profileImage');
const popupContainer = document.querySelector('.settingsDiv');
const exitIcon = document.getElementById('exitIcon');
var imageDiv = document.getElementById('defaultProfilePicture');
let originalImageSource = '<script type="text/javascript">document.write($.cloudinary.imageTag(\'<%- user.image_id %>\', { height: 100, width: 100, crop: "fit" }).toHtml());</script>';

// showImagePopup.onclick = () => {
//     popupContainer.classList.add('active');
// };

if (!showImagePopup) {
  // Handle the case where showImagePopup is null
  // console.error("showImagePopup is null!");
} else {
  showImagePopup.onclick = () => {
    popupContainer.classList.add('active');
  };
}

// exitIcon.onclick = () => {
//     popupContainer.classList.remove('active');
//     // imageDiv.innerHTML = '';
//     // let scriptElement = document.createElement('script');
//     // scriptElement.innerHTML = originalImageSource;
//     // imageDiv.appendChild(scriptElement);
// };

if (!exitIcon) {
  // Handle the case where exitIcon is null
  // console.error("exitIcon is null!");
} else {
  exitIcon.onclick = () => {
    popupContainer.classList.remove('active');
  };
}

function previewImage(event) {
    imageDiv.innerHTML = '';
    var img = document.createElement('img');
    img.src = URL.createObjectURL(event.target.files[0]);
    img.height = 100;
    img.width = 100;
    img.style.objectFit = 'cover';
    imageDiv.appendChild(img);
}
