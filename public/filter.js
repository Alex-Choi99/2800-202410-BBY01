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