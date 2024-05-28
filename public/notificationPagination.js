

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#prevButton').forEach(button => {
        button.addEventListener('click', () => {
            if (currentPage != 1) {
                currentPage -= 1;
                window.location.href = `/notifications?page=${currentPage}`;
            }
        });
    })
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#nextButton').forEach(button => {
        button.addEventListener('click', () => {
            if (currentPage < numPages) {
                currentPage += 1;
                window.location.href = `/notifications?page=${currentPage}`;
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.numberedButtons').forEach(button => {
        button.addEventListener('click', (event) => {
            currentPage = Number(event.target.value);
            window.location.href = `/notifications?page=${currentPage}`;
        });
    });
});