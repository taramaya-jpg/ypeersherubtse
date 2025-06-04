document.addEventListener('DOMContentLoaded', function () {
  const menuToggle = document.getElementById('menu-toggle');
  const navbar = document.getElementById('navbar');
  const modal = document.getElementById('editModal');
  const closeBtn = document.querySelector('.modal .close');

  // Toggle hamburger menu
  menuToggle.addEventListener('click', function () {
    navbar.classList.toggle('active');
  });

  // Close navbar if clicked outside
  document.addEventListener('click', function (event) {
    if (!menuToggle.contains(event.target) && !navbar.contains(event.target)) {
      navbar.classList.remove('active');
    }
  });

  // Close modal when clicking on 'x'
  if (closeBtn) {
    closeBtn.onclick = function () {
      modal.style.display = 'none';
    };
  }

  // Close modal if clicked outside
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
});

// Expose modal function to global scope
function openEditModal(id, title, description, imageUrl, eventDate) {
  const modal = document.getElementById('editModal');
  modal.style.display = 'block';

  document.getElementById('edit_id').value = id;
  document.getElementById('edit_title').value = title;
  document.getElementById('edit_description').value = description;
  document.getElementById('edit_image_url').value = imageUrl;
  document.getElementById('edit_event_date').value = new Date(eventDate).toISOString().slice(0, 16);
}

// Make function accessible from HTML onclick
window.openEditModal = openEditModal;
