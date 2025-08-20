// Dynamically load sidebar into #sidebar-container and highlight active link

function loadSidebar() {
    const container = document.getElementById('sidebar-container');
    if (!container) return;
    fetch('sidebar.html')
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            highlightActiveSidebar();
        });
}

// Highlight the active sidebar link
function highlightActiveSidebar() {
    const path = window.location.pathname.split('/').pop();
    document.querySelectorAll('#sidebar-container .sidebar-menu li').forEach(li => {
        const a = li.querySelector('a');
        if (!a) return;
        const href = a.getAttribute('href');
        if (href === path) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });
}

// For SPA navigation, also call highlightActiveSidebar on popstate or after content load
window.addEventListener('popstate', highlightActiveSidebar);

document.addEventListener('DOMContentLoaded', loadSidebar);
