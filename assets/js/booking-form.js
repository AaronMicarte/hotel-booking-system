/**
 * Booking Form Handler - Fixed Step Navigation
 */

let currentStep = 1;
const totalSteps = 3;

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        initializeBookingForm();
    }, 500);
});

function initializeBookingForm() {
    const bookingForm = document.getElementById('bookingForm');
    if (!bookingForm) return;

    setupFormValidation(bookingForm);
    setupDateRestrictions();
    setupRealTimeValidation(bookingForm);
    setupStepNavigation();
    initializeFormSteps();
    setupTimeSlotSystem();
}

/**
 * Setup date restrictions - FIXED
 */
function setupDateRestrictions() {
    // Check-in date should be today or future
    const checkinDate = document.querySelector('input[name="checkin_date"]');
    if (checkinDate) {
        const today = new Date().toISOString().split('T')[0];
        checkinDate.min = today;
    }

    // Date of birth should allow past dates (18+ years old max)
    const dateOfBirth = document.querySelector('input[name="date_of_birth"]');
    if (dateOfBirth) {
        const today = new Date();
        const maxAge = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
        const minAge = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

        dateOfBirth.min = maxAge.toISOString().split('T')[0]; // 100 years ago
        dateOfBirth.max = minAge.toISOString().split('T')[0]; // 18 years ago
    }
}

/**
 * Setup 24-hour time slot system
 */
function setupTimeSlotSystem() {
    const timeSlot = document.querySelector('input[name="time_slot"]');

    if (timeSlot) {
        // Set default time to current time + 1 hour
        const now = new Date();
        const defaultTime = new Date(now.getTime() + 60 * 60 * 1000);
        const timeString = defaultTime.toTimeString().slice(0, 5);
        timeSlot.value = timeString;

        // Update summary when time changes
        timeSlot.addEventListener('change', function () {
            updateBookingSummary();
        });
    }
}

/**
 * Update booking summary with checkout time
 */
function updateBookingSummary() {
    const checkinDate = document.querySelector('input[name="checkin_date"]').value;
    const timeSlot = document.querySelector('input[name="time_slot"]').value;

    if (checkinDate && timeSlot) {
        // Calculate checkout time (24 hours later)
        const checkinDateTime = new Date(`${checkinDate}T${timeSlot}:00`);
        const checkoutDateTime = new Date(checkinDateTime.getTime() + (24 * 60 * 60 * 1000));

        const checkoutDate = checkoutDateTime.toISOString().split('T')[0];
        const checkoutTime = checkoutDateTime.toTimeString().slice(0, 5);

        // Update the summary display
        const summaryContainer = document.querySelector('.alert-light');
        if (summaryContainer) {
            const existingCheckout = summaryContainer.querySelector('.checkout-info');
            if (existingCheckout) {
                existingCheckout.remove();
            }

            const checkoutInfo = document.createElement('div');
            checkoutInfo.className = 'checkout-info mt-2 pt-2 border-top';
            checkoutInfo.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span>Check-out:</span>
                    <span class="fw-bold">${checkoutDate} at ${checkoutTime}</span>
                </div>
                <small class="text-muted">24-hour stay period</small>
            `;
            summaryContainer.appendChild(checkoutInfo);
        }
    }
}

/**
 * Initialize form steps
 */
function initializeFormSteps() {
    showStep(1);
    updateProgressIndicators();
    updateNavigationButtons();
}

/**
 * Setup step navigation
 */
function setupStepNavigation() {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            console.log('Next button clicked, current step:', currentStep);
            if (validateCurrentStep()) {
                nextStep();
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            console.log('Previous button clicked, current step:', currentStep);
            prevStep();
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('Submit button clicked');
            if (validateCurrentStep()) {
                const form = document.getElementById('bookingForm');
                if (validateBookingForm(form)) {
                    showBookingConfirmation(form);
                }
            }
        });
    }
}

/**
 * Validate current step - FIXED
 */
function validateCurrentStep() {
    const currentStepEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    if (!currentStepEl) {
        console.error('Current step element not found:', currentStep);
        return false;
    }

    const requiredFields = currentStepEl.querySelectorAll('[required]:not([disabled])');
    let isValid = true;
    let firstError = null;

    // Clear previous validation
    requiredFields.forEach(field => {
        field.classList.remove('is-invalid');
    });

    // Check each required field in current step
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
            if (!firstError) {
                firstError = field;
            }
        }
    });

    // Additional validation for specific steps
    if (currentStep === 1 && isValid) {
        const email = currentStepEl.querySelector('input[name="email"]');
        const phone = currentStepEl.querySelector('input[name="phone_number"]');
        const dateOfBirth = currentStepEl.querySelector('input[name="date_of_birth"]');

        if (email && !validateEmail(email.value)) {
            email.classList.add('is-invalid');
            isValid = false;
            if (!firstError) firstError = email;
            showToast('Invalid Email', 'Please enter a valid email address.', 'error');
        }

        if (phone && !validatePhone(phone.value)) {
            phone.classList.add('is-invalid');
            isValid = false;
            if (!firstError) firstError = phone;
            showToast('Invalid Phone', 'Please enter a valid phone number.', 'error');
        }

        if (dateOfBirth && !validateDateOfBirth(dateOfBirth.value)) {
            dateOfBirth.classList.add('is-invalid');
            isValid = false;
            if (!firstError) firstError = dateOfBirth;
            showToast('Invalid Age', 'You must be at least 18 years old to book.', 'error');
        }
    }

    if (currentStep === 2 && isValid) {
        const checkinDate = currentStepEl.querySelector('input[name="checkin_date"]');
        if (checkinDate && !validateCheckinDate(checkinDate.value)) {
            checkinDate.classList.add('is-invalid');
            isValid = false;
            if (!firstError) firstError = checkinDate;
            showToast('Invalid Date', 'Check-in date cannot be in the past.', 'error');
        } else if (isValid) {
            updateBookingSummary();
        }
    }

    if (!isValid && firstError) {
        firstError.focus();
        const fieldLabel = firstError.previousElementSibling?.textContent || 'Required field';
        if (!fieldLabel.includes('Invalid')) {
            showToast('Validation Error', `Please fill in: ${fieldLabel.replace('*', '').trim()}`, 'error');
        }
    } else if (isValid && currentStep === 2) {
        updateFinalSummary();
    }

    console.log('Step validation result:', isValid);
    return isValid;
}

/**
 * Show specific step
 */
function showStep(step) {
    console.log('Showing step:', step);

    // Hide all steps
    document.querySelectorAll('.form-step').forEach(stepEl => {
        stepEl.classList.add('d-none');
        stepEl.classList.remove('active');
    });

    // Show current step
    const currentStepEl = document.querySelector(`.form-step[data-step="${step}"]`);
    if (currentStepEl) {
        currentStepEl.classList.remove('d-none');
        currentStepEl.classList.add('active');
        console.log('Step element found and shown:', step);
    } else {
        console.error('Step element not found:', step);
    }

    currentStep = step;
    updateProgressIndicators();
    updateNavigationButtons();
}

/**
 * Next step
 */
function nextStep() {
    if (currentStep < totalSteps) {
        showStep(currentStep + 1);
    }
}

/**
 * Previous step
 */
function prevStep() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
}

/**
 * Update progress indicators
 */
function updateProgressIndicators() {
    // Update step labels
    document.querySelectorAll('.step-label').forEach((label, index) => {
        label.classList.remove('active');
        if (index + 1 === currentStep) {
            label.classList.add('active');
        }
    });

    // Update progress bar
    const progressBar = document.getElementById('bookingProgress');
    if (progressBar) {
        const percentage = (currentStep / totalSteps) * 100;
        progressBar.style.width = `${percentage}%`;
    }
}

/**
 * Update navigation buttons
 */
function updateNavigationButtons() {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Previous button
    if (prevBtn) {
        if (currentStep === 1) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
        }
    }

    // Next/Submit button
    if (currentStep === totalSteps) {
        if (nextBtn) nextBtn.classList.add('d-none');
        if (submitBtn) submitBtn.classList.remove('d-none');
    } else {
        if (nextBtn) nextBtn.classList.remove('d-none');
        if (submitBtn) submitBtn.classList.add('d-none');
    }
}

/**
 * Update final summary
 */
function updateFinalSummary() {
    const form = document.getElementById('bookingForm');
    const formData = new FormData(form);
    const roomType = formData.get('room_type');
    const roomData = window.RoomData ? window.RoomData.getRoomData(roomType) : null;

    if (roomData) {
        // Update final summary elements
        const finalRoomType = document.getElementById('finalRoomType');
        const finalGuestName = document.getElementById('finalGuestName');
        const finalCheckinDate = document.getElementById('finalCheckinDate');
        const finalTimeSlot = document.getElementById('finalTimeSlot');
        const finalDownPayment = document.getElementById('finalDownPayment');

        if (finalRoomType) finalRoomType.textContent = roomData.title;
        if (finalGuestName) finalGuestName.textContent = `${formData.get('first_name')} ${formData.get('last_name')}`;
        if (finalCheckinDate) finalCheckinDate.textContent = formData.get('checkin_date');
        if (finalTimeSlot) {
            const timeValue = formData.get('time_slot');
            finalTimeSlot.textContent = timeValue || '';
        }
        if (finalDownPayment && window.RoomData) {
            finalDownPayment.textContent = `₱${window.RoomData.getDownPayment(roomType).toLocaleString()}`;
        }
    }
}

/**
 * Format time display
 */
function formatTimeDisplay(timeValue) {
    const hour = parseInt(timeValue.split(':')[0]);
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
}

/**
 * Setup form validation and submission - FIXED
 */
function setupFormValidation(form) {
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        console.log('Form submitted');

        if (!validateBookingForm(form)) {
            return;
        }
        showBookingConfirmation(form);
    });
}

/**
 * Validate booking form - FIXED
 */
function validateBookingForm(form) {
    console.log('Validating booking form...');

    // Get form data
    const formData = new FormData(form);

    // Check required fields
    const requiredFields = [
        'first_name', 'last_name', 'date_of_birth', 'email',
        'phone_number', 'id_type', 'id_number', 'checkin_date',
        'time_slot', 'guests', 'payment_method'
    ];

    for (const field of requiredFields) {
        const value = formData.get(field);
        if (!value || value.trim() === '') {
            showToast('Missing Field', `Please fill in: ${field.replace('_', ' ')}`, 'error');
            return false;
        }
    }

    const email = formData.get('email');
    if (!validateEmail(email)) {
        showToast('Invalid Email', 'Please enter a valid email address.', 'error');
        return false;
    }

    const phone = formData.get('phone_number');
    if (!validatePhone(phone)) {
        showToast('Invalid Phone', 'Please enter a valid phone number.', 'error');
        return false;
    }

    const dateOfBirth = formData.get('date_of_birth');
    if (!validateDateOfBirth(dateOfBirth)) {
        showToast('Invalid Age', 'You must be at least 18 years old to book.', 'error');
        return false;
    }

    const checkinDate = formData.get('checkin_date');
    const timeSlot = formData.get('time_slot');
    if (!validateCheckinDate(checkinDate)) {
        showToast('Invalid Date', 'Check-in date cannot be in the past.', 'error');
        return false;
    }

    console.log('Form validation passed');
    return true;
}

/**
 * Show booking confirmation dialog
 */
function showBookingConfirmation(form) {
    const formData = new FormData(form);
    const roomType = formData.get('room_type');
    const roomData = window.RoomData ? window.RoomData.getRoomData(roomType) : null;

    if (!roomData) {
        if (window.HotelUtils) {
            window.HotelUtils.showToast('Error', 'Room data not found', 'error');
        }
        return;
    }

    const downPayment = window.RoomData ? window.RoomData.getDownPayment(roomType) : 0;
    const timeSlot = formData.get('time_slot');
    const paymentData = window.PaymentHandler ? window.PaymentHandler.getSelectedPaymentData() : {};

    let paymentDisplay = formData.get('payment_method').toUpperCase();
    if (paymentData.method === 'ewallet' && paymentData.ewallet) {
        paymentDisplay = paymentData.ewallet.toUpperCase();
    }

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Confirm Booking Request',
            html: `
                <div class="text-start">
                    <p><strong>Room:</strong> ${roomData.title}</p>
                    <p><strong>Guest:</strong> ${formData.get('first_name')} ${formData.get('last_name')}</p>
                    <p><strong>Email:</strong> ${formData.get('email')}</p>
                    <p><strong>Phone:</strong> ${formData.get('phone')}</p>
                    <p><strong>Check-in:</strong> ${formData.get('checkin_date')} at ${timeSlot}</p>
                    <p><strong>Check-out:</strong> 24 hours later</p>
                    <p><strong>Guests:</strong> ${formData.get('guests')}</p>
                    <p><strong>Payment Method:</strong> ${paymentDisplay}</p>
                    <p><strong>Down Payment:</strong> ₱${downPayment.toLocaleString()}</p>
                    <div class="alert alert-warning mt-3">
                        <small><i class="fas fa-info-circle me-1"></i>
                        Your booking will be reviewed by our front desk team and confirmed via email.</small>
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#FF3366',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Submit Booking Request',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                submitBooking(formData, roomData);
            }
        });
    }
}

/**
 * Submit booking data - FIXED
 */
function submitBooking(formData, roomData) {
    showLoading('Processing Booking...', 'Please wait while we process your reservation.');

    const bookingData = {
        room: {
            type: roomData.type,
            title: roomData.title,
            price: roomData.price
        },
        guest: {
            firstName: formData.get('first_name'),
            lastName: formData.get('last_name'),
            middleName: formData.get('middle_name'),
            suffix: formData.get('suffix'),
            dateOfBirth: formData.get('date_of_birth'),
            email: formData.get('email'),
            phone: formData.get('phone_number'),
            idType: formData.get('id_type'),
            idNumber: formData.get('id_number')
        },
        booking: {
            checkinDate: formData.get('checkin_date'),
            timeSlot: formData.get('time_slot'),
            guests: formData.get('guests'),
            paymentMethod: formData.get('payment_method')
        }
    };

    // Simulate API call
    setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        if (success) {
            handleBookingSuccess(bookingData);
        } else {
            handleBookingError();
        }
    }, 2000);
}

function handleBookingSuccess(bookingData) {
    const referenceNumber = 'BK' + Date.now().toString().slice(-6);

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Booking Request Submitted!',
            html: `
                <div class="text-center">
                    <i class="fas fa-clock text-warning mb-3" style="font-size: 3rem;"></i>
                    <p>Your <strong>${bookingData.room.title}</strong> booking request has been submitted successfully.</p>
                    <p class="text-muted">Our front desk team will review and confirm your booking within 2-4 hours.</p>
                    <p>Confirmation details will be sent to <strong>${bookingData.guest.email}</strong></p>
                    <div class="alert alert-info mt-3">
                        <p class="mb-1"><strong>Reference Number:</strong> #${referenceNumber}</p>
                        <small>Please keep this reference number for your records.</small>
                    </div>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Understood',
            confirmButtonColor: '#FF3366'
        }).then(() => {
            document.getElementById('bookingForm').reset();
            showStep(1);
            if (window.HotelUtils) {
                window.HotelUtils.showToast('Request Submitted', 'Please wait for booking confirmation via email.', 'info');
            }
        });
    }
}

function handleBookingError() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Booking Failed',
            text: 'There was an error processing your booking. Please try again or contact support.',
            icon: 'error',
            confirmButtonText: 'Try Again'
        });
    }

    if (window.HotelUtils) {
        window.HotelUtils.showToast('Error', 'Failed to process booking. Please try again.', 'error');
    }
}

function setupRealTimeValidation(form) {
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', function () {
            if (this.hasAttribute('required') && !this.value.trim()) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });

        input.addEventListener('input', function () {
            if (this.classList.contains('is-invalid') && this.value.trim()) {
                this.classList.remove('is-invalid');
            }
        });
    });
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.length >= 10;
}

function validateDateOfBirth(dateString) {
    const selectedDate = new Date(dateString);
    const today = new Date();
    const age = today.getFullYear() - selectedDate.getFullYear();
    const monthDiff = today.getMonth() - selectedDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate())) {
        age--;
    }

    return age >= 18 && age <= 100;
}

/**
 * Validate check-in date - RENAMED
 */
function validateCheckinDate(dateString) {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
}

// Enhanced module export
export const BookingForm = {
    validateEmail,
    validatePhone,
    validateDate: validateDateOfBirth,
    showStep,
    nextStep,
    prevStep,
    validateCurrentStep,
    setupFormValidation,
    validateBookingForm
};

// Keep window export for backwards compatibility
window.BookingForm = BookingForm;

console.log('BookingForm module ready');
