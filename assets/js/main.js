/**
 * Main JavaScript - Simple and Clean
*/



document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    setupSmoothScrolling();
    setupNavbarEffects();
    setupDateInputs();
    console.log('HellHotel app initialized!');
}

function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function setupNavbarEffects() {
    window.addEventListener('scroll', function () {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        }
    });
}

function setupDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.min = today;
    });
}

function showToast(title, message, type = 'info') {
    if (typeof Swal !== 'undefined') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });

        Toast.fire({
            icon: type,
            title: title,
            text: message
        });
    } else {
        alert(`${title}: ${message}`);
    }
}

// Global utilities
window.HotelUtils = { showToast };
if (window.scrollY > 100) {
    navbar.style.background = 'rgba(255, 255, 255, 0.98)';
} else {
    navbar.style.background = 'rgba(255, 255, 255, 0.95)';
}

/**
 * Set minimum date for check-in inputs
 */
function setMinimumDate() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];

    dateInputs.forEach(input => {
        input.min = today;
    });
}

/**
 * Show toast notification
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, warning, info)
 */
function showToast(title, message, type = 'info') {
    console.log('showToast called:', { title, message, type });

    // Check if SweetAlert is available
    if (typeof Swal === 'undefined') {
        console.warn('SweetAlert not loaded, using fallback');
        showFallbackToast(title, message, type);
        return;
    }

    try {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        const iconMap = {
            success: 'success',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        Toast.fire({
            icon: iconMap[type] || 'info',
            title: title,
            text: message
        });

        console.log('Toast displayed successfully');
    } catch (error) {
        console.error('Error showing SweetAlert toast:', error);
        showFallbackToast(title, message, type);
    }
}

/**
 * Fallback toast implementation
 */
function showFallbackToast(title, message, type) {
    const toast = document.createElement('div');
    toast.className = 'fallback-toast';

    const bgColors = {
        success: '#d4edda',
        error: '#f8d7da',
        warning: '#fff3cd',
        info: '#d1ecf1'
    };

    const textColors = {
        success: '#155724',
        error: '#721c24',
        warning: '#856404',
        info: '#0c5460'
    };

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColors[type] || bgColors.info};
        color: ${textColors[type] || textColors.info};
        padding: 15px 20px;
        border-radius: 8px;
        border-left: 4px solid ${textColors[type] || textColors.info};
        z-index: 9999;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        animation: slideIn 0.3s ease-out;
    `;

    // Add CSS animation if not exists
    if (!document.querySelector('#fallback-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'fallback-toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    toast.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
        ${message ? `<div>${message}</div>` : ''}
    `;

    document.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);

    console.log('Fallback toast displayed');
}

/**
 * Show loading alert
 * @param {string} title - Loading title
 * @param {string} text - Loading text
 */
function showLoading(title = 'Processing...', text = 'Please wait') {
    if (typeof Swal === 'undefined') {
        console.warn('SweetAlert not available for loading dialog');
        showFallbackToast(title, text, 'info');
        return;
    }

    Swal.fire({
        title: title,
        text: text,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

/**
 * Validate form fields
 * @param {HTMLFormElement} form - Form to validate
 * @returns {boolean} - Validation result
 */
function validateForm(form) {
    if (!form) return false;

    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    let firstError = null;

    // Clear previous validation
    requiredFields.forEach(field => {
        field.classList.remove('is-invalid');
    });

    // Check each required field
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;

            if (!firstError) {
                firstError = field;
            }
        }
    });

    // Show validation message only if there are errors
    if (!isValid && firstError) {
        firstError.focus();
        const fieldLabel = firstError.previousElementSibling?.textContent ||
            firstError.getAttribute('placeholder') ||
            'Required field';
        showToast('Validation Error', `Please fill in: ${fieldLabel.replace('*', '').trim()}`, 'error');
    }

    return isValid;
}

// Prevent Flash of Unstyled Content (FOUC)
document.addEventListener('DOMContentLoaded', function () {
    // Create page transition overlay if it doesn't exist
    if (!document.querySelector('.page-transition-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'page-transition-overlay';
        overlay.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
        document.body.appendChild(overlay);

        // Remove the loading class from body
        document.body.classList.remove('loading');

        // Add a small delay before fading out the overlay
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.remove();
            }, 300); // Match transition duration
        }, 100);
    }
});

// Add loading class to body on page load
document.body.classList.add('loading');

// Add event listener for page transitions
window.addEventListener('beforeunload', function () {
    document.body.classList.add('loading');
});

// Export utilities properly for regular scripts
window.HotelUtils = {
    showToast: showToast,
    showLoading: showLoading,
    validateForm: validateForm
};

console.log('HotelUtils attached to window:', window.HotelUtils);

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});
