function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const burger = document.getElementById('burger');
    menu.classList.toggle('open');
    burger.classList.toggle('open');
}

function closeMobileMenu() {
    document.getElementById('mobileMenu').classList.remove('open');
    document.getElementById('burger').classList.remove('open');
}

function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const delay = parseFloat(entry.target.style.transitionDelay) || 0;
            setTimeout(() => entry.target.classList.add('visible'), delay * 1000);
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.1 });

    revealElements.forEach((el) => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    document.getElementById('burger').addEventListener('click', toggleMobileMenu);
    document.querySelectorAll('.mobile-menu a').forEach((link) => {
        link.addEventListener('click', closeMobileMenu);
    });

    initScrollReveal();
});
