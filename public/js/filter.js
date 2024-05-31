/*
Prevent filter menu from closing:
    - Listens for click events on the #filterMenu element and stops the event 
        from propagating to the body, thus preventing the menu from closing.
    - Parameters: event (e)
    - Return value: None
*/
$('body').on('click', '#filterMenu', async function (e) {
    e.stopPropagation();
});

/* 
Toggle active class for selected checkboxes:
    - Listens for change events on checkboxes within the #filterMenu. 
    Toggles the active class on the parent <li> element based on whether the checkbox is checked.
    - Parameters: None
    - Return value: None
*/
$('body').on("change", "#filterMenu input[type='checkbox']", async function () {
    $(this).closest("li").toggleClass("active", this.checked);
    console.log("ACTIVE");
});

/*
Initialize active class for already selected checkboxes on page load:
    - When the DOM content is loaded, adds the active class to <li> elements containing checked checkboxes.
    - Parameters: None
    - Return value: None
*/
document.addEventListener('DOMContentLoaded', function () {
    const checkboxes = document.querySelectorAll('#filterMenu input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.closest('li').classList.add('active');
        }
    });
});

/*
Deselect all checkboxes:
    - Listens for click events on the #deselectAllButton. Unchecks all checkboxes within the #filterMenu and removes the active class from their parent <li> elements.
    - Parameters: None
    - Return value: None
*/
document.addEventListener('DOMContentLoaded', function () {
    $('body').on('click', '#deselectAllButton', async function () {
        const checkboxes = document.querySelectorAll('#filterMenu input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('li').classList.remove('active');
        });
        console.log("DESELECTED ALL");
    });
});