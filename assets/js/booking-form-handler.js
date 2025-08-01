/**
 * Booking Form Handler - 24-Hour Slot System - CORRECTED
 */

class BookingFormHandler {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.selectedRoomType = null;
        this.roomData = null;

        this.initialize();
    }

    initialize() {
        this.loadSelectedRoom();
        this.setupComponents();
        this.setupEventListeners();
        this.setupDateRestrictions();
        this.populateBookingSummary();
        this.showStep(1);
        this.setupRealtimeValidation();
    }

    loadSelectedRoom() {
        const roomType = sessionStorage.getItem('selectedRoomType') || 'regular';

        if (!window.RoomData) {
            console.warn('RoomData not loaded, using fallback');
        }

        this.selectedRoomType = roomType;
        this.roomData = window.RoomData ? window.RoomData.getRoomData(roomType) : {
            id: 'regular',
            title: 'Regular Room',
            price: 3000,
            capacity: 2
        };

        // Set hidden form fields
        const roomTypeField = document.getElementById('roomTypeHidden');
        const roomPriceField = document.getElementById('roomPriceHidden');

        if (roomTypeField) roomTypeField.value = roomType;
        if (roomPriceField) roomPriceField.value = this.roomData.price;

        console.log('Room loaded:', this.roomData);
    }

    setupComponents() {
        // Load header and footer
        if (window.Components) {
            window.Components.loadHeader('header-container', '../');
            // window.Components.loadFooter('footer-container', '../');
        }
    }

    setupEventListeners() {
        // Step navigation
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const form = document.getElementById('bookingForm');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevStep());
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitBooking();
            });
        }

        // 24-hour auto calculation
        const checkinDate = document.querySelector('input[name="checkin_date"]');
        const checkinTime = document.querySelector('input[name="checkin_time"]');

        if (checkinDate) {
            checkinDate.addEventListener('change', () => this.calculate24HourSlot());
        }

        if (checkinTime) {
            checkinTime.addEventListener('change', () => this.calculate24HourSlot());
        }
    }

    setupDateRestrictions() {
        const checkinDate = document.querySelector('input[name="checkin_date"]');
        const dateOfBirth = document.querySelector('input[name="date_of_birth"]');

        if (checkinDate) {
            const today = new Date().toISOString().split('T')[0];
            checkinDate.min = today;
            checkinDate.value = today;
        }

        if (dateOfBirth) {
            const today = new Date();
            const maxAge = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
            const minAge = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

            dateOfBirth.min = maxAge.toISOString().split('T')[0];
            dateOfBirth.max = minAge.toISOString().split('T')[0];
        }

        // Set default check-in time
        const checkinTime = document.querySelector('input[name="checkin_time"]');
        if (checkinTime) {
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            checkinTime.value = currentTime;
            this.calculate24HourSlot();
        }
    }

    calculate24HourSlot() {
        const checkinDate = document.querySelector('input[name="checkin_date"]').value;
        const checkinTime = document.querySelector('input[name="checkin_time"]').value;

        if (!checkinDate || !checkinTime) return;

        // Calculate checkout time (24 hours later)
        const checkinDateTime = new Date(`${checkinDate}T${checkinTime}`);
        const checkoutDateTime = new Date(checkinDateTime.getTime() + (24 * 60 * 60 * 1000));

        // Update checkout display
        const checkoutTimeDisplay = document.getElementById('checkoutTimeDisplay');
        if (checkoutTimeDisplay) {
            const checkoutDate = checkoutDateTime.toLocaleDateString();
            const checkoutTime = checkoutDateTime.toTimeString().slice(0, 5);
            checkoutTimeDisplay.value = `${checkoutDate} at ${checkoutTime}`;
        }

        // Update duration summary
        this.updateDurationSummary(checkinDateTime, checkoutDateTime);
    }

    updateDurationSummary(checkinDateTime, checkoutDateTime) {
        const displayCheckin = document.getElementById('displayCheckinDateTime');
        const displayCheckout = document.getElementById('displayCheckoutDateTime');

        if (displayCheckin) {
            displayCheckin.textContent = this.formatDateTime(checkinDateTime);
        }

        if (displayCheckout) {
            displayCheckout.textContent = this.formatDateTime(checkoutDateTime);
        }
    }

    formatDateTime(dateTime) {
        const date = dateTime.toLocaleDateString();
        const time = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${date} at ${time}`;
    }

    populateBookingSummary() {
        const summaryContainer = document.getElementById('bookingSummaryContent');
        if (!summaryContainer || !this.roomData) return;

        const downPayment = this.roomData.price * 0.5;
        const balance = this.roomData.price - downPayment;

        summaryContainer.innerHTML = `
            <div class="room-summary mb-4">
                <h6 class="text-primary"><i class="fas fa-bed me-2"></i>${this.roomData.title}</h6>
                <div class="room-details">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">Capacity:</span>
                        <span>${this.roomData.capacity} guests</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">Size:</span>
                        <span>${this.roomData.size}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">Duration:</span>
                        <span class="fw-bold">24 Hours</span>
                    </div>
                </div>
            </div>

            <div class="pricing-summary">
                <div class="d-flex justify-content-between mb-2">
                    <span>Room Rate (24hrs):</span>
                    <span class="fw-bold">₱${this.roomData.price.toLocaleString()}</span>
                </div>
                <hr>
                <div class="d-flex justify-content-between mb-2">
                    <span class="text-success">Down Payment (50%):</span>
                    <span class="fw-bold text-success">₱${downPayment.toLocaleString()}</span>
                </div>
                <div class="d-flex justify-content-between mb-3">
                    <span class="text-warning">Balance at Check-in:</span>
                    <span class="fw-bold text-warning">₱${balance.toLocaleString()}</span>
                </div>
            </div>

            <div class="alert alert-info small">
                <i class="fas fa-info-circle me-1"></i>
                <strong>24-Hour Policy:</strong> Your stay period starts at check-in time and ends exactly 24 hours later.
            </div>
        `;

        // Populate guest capacity options
        this.populateGuestOptions();
    }

    populateGuestOptions() {
        const guestSelect = document.getElementById('guestSelect');
        if (!guestSelect || !this.roomData) return;

        guestSelect.innerHTML = '<option value="">Select number of guests</option>';

        for (let i = 1; i <= this.roomData.capacity; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} Guest${i > 1 ? 's' : ''}`;
            guestSelect.appendChild(option);
        }
    }

    setupRealtimeValidation() {
        const form = document.getElementById('bookingForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            input.addEventListener('input', () => {
                if (input.classList.contains('is-invalid')) {
                    this.validateField(input);
                }
            });
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const isRequired = field.hasAttribute('required');
        let isValid = true;

        field.classList.remove('is-invalid');

        if (isRequired && !value) {
            isValid = false;
        }

        if (value && field.type === 'email') {
            isValid = this.validateEmail(value);
        }

        if (value && field.name === 'phone_number') {
            isValid = this.validatePhone(value);
        }

        if (value && field.name === 'date_of_birth') {
            isValid = this.validateDateOfBirth(value);
        }

        if (!isValid) {
            field.classList.add('is-invalid');
        }

        return isValid;
    }

    validateCurrentStep() {
        const currentStepEl = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        if (!currentStepEl) return false;

        const fields = currentStepEl.querySelectorAll('input, select');
        let isValid = true;
        let firstError = null;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
                if (!firstError) {
                    firstError = field;
                }
            }
        });

        if (!isValid && firstError) {
            firstError.focus();
            const fieldLabel = this.getFieldLabel(firstError);
            if (window.HotelUtils) {
                window.HotelUtils.showToast('Validation Error', `Please check: ${fieldLabel}`, 'error');
            }
        } else if (isValid && this.currentStep === 2) {
            this.calculate24HourSlot();
        }

        return isValid;
    }

    getFieldLabel(field) {
        const label = field.parentElement.querySelector('label');
        return label ? label.textContent.replace('*', '').trim() : field.name.replace('_', ' ');
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phoneRegex.test(phone) && phone.length >= 10;
    }

    validateDateOfBirth(dateString) {
        const selectedDate = new Date(dateString);
        const today = new Date();
        const age = today.getFullYear() - selectedDate.getFullYear();
        const monthDiff = today.getMonth() - selectedDate.getMonth();

        let calculatedAge = age;
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate())) {
            calculatedAge--;
        }

        return calculatedAge >= 18 && calculatedAge <= 100;
    }

    nextStep() {
        if (!this.validateCurrentStep()) {
            return;
        }

        if (this.currentStep === 2) {
            this.populateConfirmation();
        }

        if (this.currentStep < this.totalSteps) {
            this.showStep(this.currentStep + 1);
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }

    showStep(step) {
        document.querySelectorAll('.form-step').forEach(stepEl => {
            stepEl.classList.add('d-none');
            stepEl.classList.remove('active');
        });

        const currentStepEl = document.querySelector(`.form-step[data-step="${step}"]`);
        if (currentStepEl) {
            currentStepEl.classList.remove('d-none');
            currentStepEl.classList.add('active');
        }

        this.currentStep = step;
        this.updateProgressIndicators();
        this.updateNavigationButtons();
    }

    updateProgressIndicators() {
        document.querySelectorAll('.step-label').forEach((label, index) => {
            label.classList.toggle('active', index + 1 === this.currentStep);
        });

        const progressBar = document.getElementById('bookingProgress');
        if (progressBar) {
            const percentage = (this.currentStep / this.totalSteps) * 100;
            progressBar.style.width = `${percentage}%`;
        }
    }

    updateNavigationButtons() {
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const submitBtn = document.getElementById('submitBtn');

        if (prevBtn) {
            prevBtn.style.display = this.currentStep === 1 ? 'none' : 'block';
        }

        if (this.currentStep === this.totalSteps) {
            if (nextBtn) nextBtn.classList.add('d-none');
            if (submitBtn) submitBtn.classList.remove('d-none');
        } else {
            if (nextBtn) nextBtn.classList.remove('d-none');
            if (submitBtn) submitBtn.classList.add('d-none');
        }
    }

    populateConfirmation() {
        const confirmationEl = document.getElementById('finalConfirmationSummary');
        if (!confirmationEl) return;

        const form = document.getElementById('bookingForm');
        const formData = new FormData(form);

        const guestName = `${formData.get('first_name')} ${formData.get('last_name')}`;
        const checkinDate = formData.get('checkin_date');
        const checkinTime = formData.get('checkin_time');
        const guests = formData.get('guests');

        // Calculate checkout
        const checkinDateTime = new Date(`${checkinDate}T${checkinTime}`);
        const checkoutDateTime = new Date(checkinDateTime.getTime() + (24 * 60 * 60 * 1000));

        confirmationEl.innerHTML = `
            <div class="confirmation-grid">
                <div class="row g-3">
                    <div class="col-6">
                        <strong>Guest:</strong><br>
                        <span class="text-muted">${guestName}</span>
                    </div>
                    <div class="col-6">
                        <strong>Room:</strong><br>
                        <span class="text-muted">${this.roomData.title}</span>
                    </div>
                    <div class="col-6">
                        <strong>Check-in:</strong><br>
                        <span class="text-muted">${this.formatDateTime(checkinDateTime)}</span>
                    </div>
                    <div class="col-6">
                        <strong>Check-out:</strong><br>
                        <span class="text-muted">${this.formatDateTime(checkoutDateTime)}</span>
                    </div>
                    <div class="col-6">
                        <strong>Guests:</strong><br>
                        <span class="text-muted">${guests} person${guests > 1 ? 's' : ''}</span>
                    </div>
                    <div class="col-6">
                        <strong>Duration:</strong><br>
                        <span class="text-muted fw-bold">24 Hours</span>
                    </div>
                </div>
                
                <hr>
                
                <div class="pricing-final">
                    <div class="d-flex justify-content-between">
                        <span>Total Amount:</span>
                        <span class="fw-bold">₱${this.roomData.price.toLocaleString()}</span>
                    </div>
                    <div class="d-flex justify-content-between text-success">
                        <span>Down Payment Required:</span>
                        <span class="fw-bold">₱${(this.roomData.price * 0.5).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
    }

    async submitBooking() {
        if (!this.validateCurrentStep()) {
            return;
        }

        if (window.HotelUtils) {
            window.HotelUtils.showLoading('Processing Booking', 'Please wait while we process your 24-hour slot reservation...');
        }

        try {
            const form = document.getElementById('bookingForm');
            const formData = new FormData(form);

            const completeBookingData = {
                room: {
                    type: this.selectedRoomType,
                    title: this.roomData.title,
                    price: this.roomData.price
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
                    checkinTime: formData.get('checkin_time'),
                    guests: formData.get('guests'),
                    paymentMethod: formData.get('payment_method'),
                    slotType: '24-hour'
                },
                submittedAt: new Date().toISOString()
            };

            const success = await this.processBookingSubmission(completeBookingData);

            if (success) {
                this.handleBookingSuccess(completeBookingData);
            } else {
                this.handleBookingError();
            }

        } catch (error) {
            console.error('Booking submission error:', error);
            this.handleBookingError();
        }
    }

    async processBookingSubmission(bookingData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(Math.random() > 0.1);
            }, 2000);
        });
    }

    handleBookingSuccess(bookingData) {
        const referenceNumber = 'HH24-' + Date.now().toString().slice(-6);

        // Clear room selection
        sessionStorage.removeItem('selectedRoomType');

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '24-Hour Slot Booked!',
                html: `
                    <div class="text-center">
                        <i class="fas fa-check-circle text-success mb-3" style="font-size: 3rem;"></i>
                        <p>Your <strong>24-hour slot</strong> booking has been submitted successfully!</p>
                        <div class="alert alert-info">
                            <strong>Reference: ${referenceNumber}</strong>
                        </div>
                        <p class="text-muted">
                            Confirmation will be sent to <strong>${bookingData.guest.email}</strong> 
                            within 2-4 hours.
                        </p>
                        <div class="small text-muted mt-3">
                            <i class="fas fa-clock me-1"></i>
                            Remember: Your stay is exactly 24 hours from check-in time
                        </div>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: 'Return to Home',
                confirmButtonColor: '#28a745'
            }).then(() => {
                window.location.href = '../index.html';
            });
        } else {
            alert(`24-Hour slot booked successfully! Reference: ${referenceNumber}`);
            window.location.href = '../index.html';
        }
    }

    handleBookingError() {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Booking Failed',
                text: 'There was an error processing your 24-hour slot booking. Please try again.',
                icon: 'error',
                confirmButtonText: 'Try Again'
            });
        } else {
            alert('Booking failed. Please try again.');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Only initialize if we're on the booking form page
    if (document.getElementById('bookingForm')) {
        if (!window.bookingFormHandler) {
            window.bookingFormHandler = new BookingFormHandler();
        }
    }
});

window.BookingFormHandler = BookingFormHandler;
document.addEventListener('DOMContentLoaded', function () {
    window.bookingFormHandler = new BookingFormHandler();
});

window.BookingFormHandler = BookingFormHandler;
