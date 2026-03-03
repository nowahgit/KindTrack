// Global Application Logic
document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Intersection Observer for Scroll Animations
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.glass-card').forEach(card => {
        observer.observe(card);
    });

    // Global Counter Animation
    const counterElement = document.getElementById('global-counter');
    if (counterElement) {
        let currentCount = 42540; // Initial value
        const targetCount = 43812;
        const duration = 3000;
        const startTime = performance.now();

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (outQuad)
            const easedProgress = 1 - (1 - progress) * (1 - progress);

            const value = Math.floor(currentCount + (targetCount - currentCount) * easedProgress);
            counterElement.textContent = value.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };

        // Start counter when visible
        const counterObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                requestAnimationFrame(updateCounter);
                counterObserver.disconnect();
            }
        });
        counterObserver.observe(counterElement);
    }
});
