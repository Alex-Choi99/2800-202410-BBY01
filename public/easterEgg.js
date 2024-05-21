document.addEventListener('DOMContentLoaded', function() {
    const correctSequence = ['1', '2', '3', '4', '5']; // Define the correct sequence of button data-ids
    let clickSequence = [];

    document.querySelectorAll('.img-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            clickSequence.push(id);
            console.log('Button clicked:', id);
            console.log('Current sequence:', clickSequence);

            // Check if the clicked sequence matches the correct sequence
            if (clickSequence.length === correctSequence.length) {
                if (clickSequence.every((value, index) => value === correctSequence[index])) {
                    console.log('Correct sequence entered. Redirecting...');
                    window.location.href = '/newpage'; // Redirect to the new page
                } else {
                    console.log('Incorrect sequence. Resetting...');
                    alert('Incorrect sequence. Please try again.');
                }
                clickSequence = []; // Reset the sequence for the next attempt
            }
        });
    });
});