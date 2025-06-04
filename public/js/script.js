// Mobile menu toggle functionality
const menuToggle = document.getElementById('menu-toggle');
const navbar = document.getElementById('navbar');
let isAnimating = false;

// Function to toggle menu with animation
const toggleMenu = (show) => {
  if (isAnimating) return;
  isAnimating = true;

  if (show) {
    navbar.style.display = 'flex';
    navbar.style.opacity = '0';
    navbar.style.transform = 'translateY(-10px)';
    
    // Trigger reflow
    navbar.offsetHeight;

    navbar.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    navbar.style.opacity = '1';
    navbar.style.transform = 'translateY(0)';
    navbar.classList.add('active');
  } else {
    navbar.style.opacity = '0';
    navbar.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      navbar.style.display = 'none';
      navbar.classList.remove('active');
      isAnimating = false;
    }, 300);
  }

  setTimeout(() => {
    if (show) isAnimating = false;
  }, 300);
};

// Toggle menu on hamburger click
menuToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const isActive = navbar.classList.contains('active');
  toggleMenu(!isActive);
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (!menuToggle.contains(e.target) && !navbar.contains(e.target) && navbar.classList.contains('active')) {
    toggleMenu(false);
  }
});

// Close menu on window resize if screen becomes larger than mobile breakpoint
window.addEventListener('resize', () => {
  if (window.innerWidth > 768 && navbar.classList.contains('active')) {
    navbar.style = ''; // Reset inline styles
    navbar.classList.remove('active');
    isAnimating = false;
  }
});

// Contact button click handler
const contactButtons = document.querySelectorAll('.contact-btn');

contactButtons.forEach(button => {
  button.addEventListener('click', function() {
    const memberName = this.parentElement.querySelector('p').textContent;
    alert(`Contact form for ${memberName} will be implemented soon!`);
  });
});

// Add smooth scroll behavior for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      // Close mobile menu after clicking a link
      navbar.classList.remove('active');
    }
  });
});
