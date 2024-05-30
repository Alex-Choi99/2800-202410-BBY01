$('body').on('click', '#filterMenu', async function (e) {
    e.stopPropagation();
});

$('body').on("change", "#filterMenu input[type='checkbox']", async function () {
    $(this).closest("li").toggleClass("active", this.checked);
    console.log("ACTIVE");
});

document.addEventListener('DOMContentLoaded', function() {
    const checkboxes = document.querySelectorAll('#filterMenu input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.closest('li').classList.add('active');
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    $('body').on('click', '#deselectAllButton', async function () {
        const checkboxes = document.querySelectorAll('#filterMenu input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false; // Uncheck the checkbox
            checkbox.closest('li').classList.remove('active'); // Remove the active class from the parent <li>
        });
        console.log("DESELECTED ALL");
    });
});