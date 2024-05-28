$('body').on('click', '#filterMenu', async function (e) {
    e.stopPropagation();
});

$('body').on("change", "#filterMenu input[type='checkbox']", async function () {
    $(this).closest("li").toggleClass("active", this.checked);
    console.log("ACTIVE");
});

