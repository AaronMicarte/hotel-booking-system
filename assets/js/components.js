/**
 * Components Module - Handle Header and Footer Injection
 */

export function loadHeader(containerId, basePath = '') {
    const headerHTML = `
        <!-- Navigation -->
        <nav class="navbar navbar-expand-lg navbar-light bg-white fixed-top shadow-sm">
            <div class="container">
                <a class="navbar-brand d-flex align-items-center" href="${basePath}index.html">
                    <img src="${basePath}assets/images/hellhotel-logo2.png" alt="HellHotel Logo" height="50" class="me-2">
                    <span class="brand-text">HellHotel</span>
                </a>

                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item"><a class="nav-link" href="${basePath}index.html#home">Home</a></li>
                        <li class="nav-item"><a class="nav-link" href="${basePath}index.html#about">About</a></li>
                        <li class="nav-item"><a class="nav-link" href="${basePath}index.html#rooms">Rooms</a></li>
                        <li class="nav-item"><a class="nav-link" href="${basePath}index.html#contact">Contact</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    `;
    document.getElementById(containerId).innerHTML = headerHTML;
}

export function loadFooter(containerId, basePath = '') {
    const footerHTML = `
        <!-- Enhanced Footer -->
        <footer class="bg-dark text-white py-5">
            <div class="container">
                <div class="row">
                    <div class="col-lg-4 mb-4">
                        <h5>HellHotel</h5>
                        <p>Luxury accommodation in the heart of Cagayan de Oro City.</p>
                    </div>
                    <div class="col-lg-2 mb-4">
                        <h6>Quick Links</h6>
                        <ul class="list-unstyled">
                            <li><a href="${basePath}index.html#home" class="text-white-50">Home</a></li>
                            <li><a href="${basePath}index.html#about" class="text-white-50">About</a></li>
                            <li><a href="${basePath}index.html#rooms" class="text-white-50">Rooms</a></li>
                        </ul>
                    </div>
                    <div class="col-lg-2 mb-4">
                        <h6>Legal</h6>
                        <ul class="list-unstyled">
                            <li><a href="${basePath}pages/terms-of-service.html" class="text-white-50">Terms</a></li>
                            <li><a href="${basePath}pages/privacy-policy.html" class="text-white-50">Privacy</a></li>
                        </ul>
                    </div>
                    <div class="col-lg-4 mb-4">
                        <h6>Contact Info</h6>
                        <p class="mb-1"><i class="fas fa-map-marker-alt me-2"></i>Corrales Street, CDO</p>
                        <p class="mb-1"><i class="fas fa-phone me-2"></i>+63 992 507 7173</p>
                        <p><i class="fas fa-envelope me-2"></i>hellhotel@gmail.com</p>
                    </div>
                </div>
                <hr class="my-4">
                <div class="row">
                    <div class="col-md-6">
                        <p class="mb-0">&copy; 2025 HellHotel. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </footer>
    `;
    document.getElementById(containerId).innerHTML = footerHTML;
}

// Auto-initialize components when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('Components module loaded');
});
