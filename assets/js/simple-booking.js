/**
 * Simple Booking System - ES6 Module Support
 */

// Room data (simple and clean)
const ROOM_DATA = {
    regular: {
        name: 'Regular Room',
        price: 999,
        capacity: 2,
        size: '20m²',
        image: '../assets/images/family/family-1.webp',
        features: [
            { icon: 'fas fa-bed', text: 'Double bed' },
            { icon: 'fas fa-wifi', text: 'Free WiFi' },
            { icon: 'fas fa-snowflake', text: 'Air conditioning' },
            { icon: 'fas fa-tv', text: '28" LED TV' }
        ]
    },
    deluxe: {
        name: 'Deluxe Room',
        price: 1999,
        capacity: 3,
        size: '24m²',
        image: '../assets/images/deluxe/deluxe-1.jpg',
        features: [
            { icon: 'fas fa-bed', text: 'Queen bed' },
            { icon: 'fas fa-wifi', text: 'High-speed WiFi' },
            { icon: 'fas fa-snowflake', text: 'Air conditioning' },
            { icon: 'fas fa-tv', text: '32" LED TV' }
        ]
    },
    executive: {
        name: 'Executive Suite',
        price: 2999,
        capacity: 4,
        size: '35m²',
        image: '../assets/images/executive/executive-1.jpg',
        features: [
            { icon: 'fas fa-bed', text: 'King bed' },
            { icon: 'fas fa-wifi', text: 'Premium WiFi' },
            { icon: 'fas fa-snowflake', text: 'Climate control' },
            { icon: 'fas fa-tv', text: '43" Smart TV' }
        ]
    }
};

// Simple booking form handler
let currentStep = 1;
const totalSteps = 3;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log('Simple booking system initializing...');

    // Only run on room template page
    if (window.location.pathname.includes('room-template.html')) {
        console.log('Room template page detected');
        // Don't auto-initialize here, let the main template handle it
    }

    // Run on all pages for room cards
    initializeRoomCards();
});

function initializeRoomPage() {
    // Get room type from URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomType = urlParams.get('type') || 'regular';

    // Load room data
    loadRoomData(roomType);

    // Setup booking form
    setupBookingForm();

    // Hide loading, show content
    setTimeout(() => {
        document.getElementById('roomLoading').classList.add('d-none');
        document.getElementById('roomContent').classList.remove('d-none');
    }, 1000);
}

function loadRoomData(roomType) {
    const room = ROOM_DATA[roomType];
    if (!room) return;

    // Update page elements
    document.getElementById('roomTitle').textContent = room.name;
    document.getElementById('roomPrice').textContent = `₱${room.price.toLocaleString()}`;
    document.getElementById('roomPeriod').textContent = '24 hours';
    document.getElementById('roomDescription').textContent = `Experience comfort in our ${room.name.toLowerCase()}.`;
    document.getElementById('roomCapacity').textContent = `${room.capacity} guests`;
    document.getElementById('roomSize').textContent = room.size;
    document.getElementById('roomCheckIn').textContent = 'From 12:00 PM';
    document.getElementById('roomCheckOut').textContent = 'Until 12:00 PM';

    // Update image
    const roomImage = document.getElementById('roomImage');
    roomImage.src = room.image;
    roomImage.alt = room.name;

    // Load features
    const featuresContainer = document.getElementById('roomFeatures');
    featuresContainer.innerHTML = '';
    room.features.forEach(feature => {
        featuresContainer.innerHTML += `
            <div class="col-6">
                <div class="feature-item">
                    <i class="${feature.icon} text-primary me-2"></i>
                    <span>${feature.text}</span>
                </div>
            </div>
        `;
    });

    // Update booking summary
    const downPayment = room.price * 0.5;
    document.getElementById('summaryRoomRate').textContent = `₱${room.price.toLocaleString()}`;
    document.getElementById('summaryDownPayment').textContent = `₱${downPayment.toLocaleString()}`;

    // Set hidden form fields
    document.querySelector('input[name="room_type"]').value = roomType;
    document.querySelector('input[name="room_price"]').value = room.price;

    // Populate guest options
    const guestSelect = document.getElementById('guestSelect');
    guestSelect.innerHTML = '<option value="">Select guests</option>';
    for (let i = 1; i <= room.capacity; i++) {
        guestSelect.innerHTML += `<option value="${i}">${i} Guest${i > 1 ? 's' : ''}</option>`;
    }
}

function setupBookingForm() {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('input[name="checkin_date"]').min = today;

    // Setup step navigation
    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('prevBtn').addEventListener('click', prevStep);

    // Setup form submission
    document.getElementById('bookingForm').addEventListener('submit', function (e) {
        e.preventDefault();
        submitBooking();
    });

    // Show first step
    showStep(1);
}

function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(stepEl => {
        stepEl.classList.add('d-none');
    });

    // Show current step
    document.querySelector(`.form-step[data-step="${step}"]`).classList.remove('d-none');

    // Update progress
    const progress = (step / totalSteps) * 100;
    document.getElementById('bookingProgress').style.width = `${progress}%`;

    // Update step labels
    document.querySelectorAll('.step-label').forEach((label, index) => {
        label.classList.toggle('active', index + 1 === step);
    });

    // Update buttons
    document.getElementById('prevBtn').style.display = step === 1 ? 'none' : 'block';
    document.getElementById('nextBtn').classList.toggle('d-none', step === totalSteps);
    document.getElementById('submitBtn').classList.toggle('d-none', step !== totalSteps);

    // Update final summary on last step
    if (step === 3) {
        updateFinalSummary();
    }
}

function validateCurrentStep() {
    const currentStepEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const requiredFields = currentStepEl.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        field.classList.remove('is-invalid');
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        }
    });

    if (!isValid) {
        showAlert('Please fill in all required fields.', 'warning');
    }

    return isValid;
}

function updateFinalSummary() {
    const form = document.getElementById('bookingForm');
    const formData = new FormData(form);
    const roomType = formData.get('room_type');
    const room = ROOM_DATA[roomType];

    document.getElementById('finalRoomType').textContent = room.name;
    document.getElementById('finalGuestName').textContent =
        `${formData.get('first_name')} ${formData.get('last_name')}`;
    document.getElementById('finalCheckinDate').textContent = formData.get('checkin_date');
    document.getElementById('finalTimeSlot').textContent = formData.get('time_slot');
    document.getElementById('finalDownPayment').textContent =
        `₱${(room.price * 0.5).toLocaleString()}`;
}

function submitBooking() {
    // Show loading
    showAlert('Processing your booking...', 'info');

    // Simulate processing time
    setTimeout(() => {
        const success = Math.random() > 0.2; // 80% success rate

        if (success) {
            const bookingRef = 'BK' + Date.now().toString().slice(-6);
            showAlert(
                `Booking submitted successfully! Reference: ${bookingRef}. 
                You will receive confirmation via email within 2-4 hours.`,
                'success'
            );

            // Reset form after 3 seconds
            setTimeout(() => {
                document.getElementById('bookingForm').reset();
                currentStep = 1;
                showStep(1);
            }, 3000);
        } else {
            showAlert('Booking failed. Please try again.', 'error');
        }
    }, 2000);
}

function initializeRoomCards() {
    // Setup room card clicks on home page
    document.querySelectorAll('.book-room-btn').forEach(button => {
        button.addEventListener('click', function () {
            const roomType = this.getAttribute('data-room-type');
            window.location.href = `rooms/room-template.html?type=${roomType}`;
        });
    });
}

function showAlert(message, type = 'info') {
    // Simple alert system using SweetAlert if available, otherwise alert()
    if (typeof Swal !== 'undefined') {
        const iconMap = { success: 'success', error: 'error', warning: 'warning', info: 'info' };
        Swal.fire({
            icon: iconMap[type],
            title: type.charAt(0).toUpperCase() + type.slice(1),
            text: message,
            timer: type === 'success' ? 5000 : 3000,
            showConfirmButton: type === 'error'
        });
    } else {
        alert(message);
    }
}

// Enhanced export for ES6 modules
export const SimpleBooking = {
    ROOM_DATA,
    showAlert,
    nextStep,
    prevStep,
    initializeRoomPage,
    loadRoomData,
    setupBookingForm
};

// Export for global use (backwards compatibility)
window.SimpleBooking = SimpleBooking;

console.log('SimpleBooking module loaded');
