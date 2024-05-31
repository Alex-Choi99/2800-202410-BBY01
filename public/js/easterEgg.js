//Set up for easter egg trigger condition
document.addEventListener('DOMContentLoaded', function () {
    
    // Define the correct sequence of button data-ids
    const correctSequence = ['1', '2', '3', '4', '5']; 
    let clickSequence = [];

    document.querySelectorAll('.img-btn').forEach(button => {
        button.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            clickSequence.push(id);
            console.log('Button clicked:', id);
            console.log('Current sequence:', clickSequence);

            // Check if the clicked sequence matches the correct sequence
            if (clickSequence.length === correctSequence.length) {
                if (clickSequence.every((value, index) => value === correctSequence[index])) {
                    console.log('Correct sequence entered. Redirecting...');
                    // Redirect to the easter egg page
                    window.location.href = '/circle'; 
                } else {
                    console.log('Incorrect sequence. Resetting...');
                    alert('Incorrect sequence. Please try again.');
                }
                // Reset the sequence for the next attempt
                clickSequence = []; 
            }
        });
    });
});