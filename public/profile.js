const showImagePopup = document.getElementById('profileImage');
const popupContainer = document.querySelector('.settingsDiv');
const exitIcon = document.getElementById('exitIcon');
var imageDiv = document.getElementById('editImagePicture');
let originalImageSource = '<script type="text/javascript">document.write($.cloudinary.imageTag(\'<%- user.image_id %>\', { height: 100, width: 100, crop: "fit" }).toHtml());</script>';

showImagePopup.onclick = () => {
    popupContainer.classList.add('active');
};

exitIcon.onclick = () => {
    popupContainer.classList.remove('active');
    // imageDiv.innerHTML = '';
    // let scriptElement = document.createElement('script');
    // scriptElement.innerHTML = originalImageSource;
    // imageDiv.appendChild(scriptElement);
};

function previewImage(event) {
    imageDiv.innerHTML = '';
    var img = document.createElement('img');
    img.src = URL.createObjectURL(event.target.files[0]);
    img.height = 100;
    img.width = 100;
    img.style.objectFit = 'cover';
    imageDiv.appendChild(img);
}