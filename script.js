// ===== DOM Elements =====
const enquiryForm = document.getElementById('enquiryForm');
const successModal = document.getElementById('successModal');
const header = document.querySelector('.header');

// ===== EmailJS Configuration (public key only — restrict domains in EmailJS dashboard) =====
const EMAILJS_PUBLIC_KEY = 'yqVW82_dX_A0zAsBW';
const EMAILJS_SERVICE_ID = 'service_458dc8j';
const EMAILJS_TEMPLATE_ID = 'template_7ab1dc8';

const ALLOWED_SERVICES = {
    service: 'Service',
    repair: 'Repair',
    installation: 'Installation'
};

const ALLOWED_APPLIANCES = {
    'air-conditioner': 'Air Conditioner',
    'washing-machine': 'Washing Machine',
    fridge: 'Fridge',
    geyser: 'Geyser',
    tv: 'TV',
    microwave: 'Microwave Oven'
};

const RATE_LIMIT_KEY = 'bharatWorldEnquiryRate';
const RATE_LIMIT_MS = 60 * 1000; // 1 submission per minute per browser
const ENQUIRIES_STORAGE_KEY = 'bharatWorldEnquiries';
const LEGACY_ENQUIRIES_STORAGE_KEY = 'bhartWorldEnquiries';
const MAX_STORED_ENQUIRIES = 20;

// Initialize EmailJS (SDK v4 requires an options object with publicKey)
function initEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
        return true;
    }
    return false;
}
if (!initEmailJS()) {
    // SDK is loaded with `defer`; retry after DOM is ready
    document.addEventListener('DOMContentLoaded', initEmailJS);
}

function sanitizeText(value, maxLength) {
    return String(value || '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function isRateLimited() {
    try {
        const last = Number(sessionStorage.getItem(RATE_LIMIT_KEY) || 0);
        return last && Date.now() - last < RATE_LIMIT_MS;
    } catch (_) {
        return false;
    }
}

function markRateLimited() {
    try {
        sessionStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
    } catch (_) {
        // Ignore storage failures
    }
}

// ===== Header Scroll Effect =====
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        header.style.background = 'rgba(15, 23, 42, 0.98)';
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    } else {
        header.style.background = 'rgba(15, 23, 42, 0.9)';
        header.style.boxShadow = 'none';
    }
}, { passive: true });

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (!href || href === '#' || !/^#[A-Za-z][\w:-]*$/.test(href)) {
            return;
        }

        const target = document.getElementById(href.slice(1));
        if (!target) return;

        e.preventDefault();
        const headerHeight = header.offsetHeight;
        const targetPosition = target.offsetTop - headerHeight - 20;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    });
});

// ===== Form Validation & Submission =====
if (!enquiryForm) {
    console.warn('Enquiry form not found');
} else enquiryForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Honeypot: bots usually fill hidden fields
    const honeypot = document.getElementById('company_website');
    if (honeypot && honeypot.value.trim() !== '') {
        return;
    }

    if (isRateLimited()) {
        showError('Please wait a minute before sending another enquiry.');
        return;
    }
    
    const name = sanitizeText(document.getElementById('name').value, 80);
    const mobile = sanitizeText(document.getElementById('mobile').value, 10).replace(/\D/g, '');
    const email = sanitizeText(document.getElementById('email').value, 120);
    const serviceType = document.getElementById('serviceType').value;
    const appliance = document.getElementById('appliance').value;
    const message = sanitizeText(document.getElementById('message').value, 800);
    
    if (!name || name.length < 2 || !mobile || !serviceType || !appliance) {
        showError('Please fill in all required fields');
        return;
    }

    if (!ALLOWED_SERVICES[serviceType] || !ALLOWED_APPLIANCES[appliance]) {
        showError('Please select a valid service and appliance');
        return;
    }
    
    if (!/^[6-9][0-9]{9}$/.test(mobile)) {
        showError('Please enter a valid 10-digit mobile number');
        return;
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    const templateParams = {
        from_name: name,
        from_mobile: mobile,
        from_email: email || 'Not provided',
        service_type: ALLOWED_SERVICES[serviceType],
        appliance_type: ALLOWED_APPLIANCES[appliance],
        message: message || 'No additional details provided',
        to_email: 'bharatworldprofessionalservice@gmail.com',
        submission_date: new Date().toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            dateStyle: 'full',
            timeStyle: 'short'
        })
    };
    
    const submitBtn = enquiryForm.querySelector('.submit-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.replaceChildren();
    const spinner = document.createElement('i');
    spinner.className = 'fas fa-spinner fa-spin';
    spinner.setAttribute('aria-hidden', 'true');
    submitBtn.append(spinner, document.createTextNode(' Sending...'));
    submitBtn.disabled = true;
    
    try {
        if (typeof emailjs === 'undefined') {
            throw new Error('Email service unavailable');
        }

        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, {
            publicKey: EMAILJS_PUBLIC_KEY
        });
        markRateLimited();
        saveEnquiry(templateParams);
        showSuccessModal();
        enquiryForm.reset();
    } catch (error) {
        showError('Failed to send enquiry. Please try calling us directly.');
        saveEnquiry(templateParams);
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

// ===== Save Enquiry to LocalStorage (local browser backup only) =====
function safeParseJson(value, fallback) {
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch (_) {
        return fallback;
    }
}

function getStoredEnquiries() {
    try {
        const current = localStorage.getItem(ENQUIRIES_STORAGE_KEY);
        if (current) {
            return safeParseJson(current, []);
        }

        const legacy = localStorage.getItem(LEGACY_ENQUIRIES_STORAGE_KEY);
        if (legacy) {
            const migrated = safeParseJson(legacy, []);
            localStorage.setItem(ENQUIRIES_STORAGE_KEY, JSON.stringify(migrated));
            localStorage.removeItem(LEGACY_ENQUIRIES_STORAGE_KEY);
            return migrated;
        }
    } catch (_) {
        // Private mode / blocked storage
    }

    return [];
}

function saveEnquiry(enquiry) {
    try {
        const enquiries = getStoredEnquiries();
        enquiries.push({
            from_name: enquiry.from_name,
            from_mobile: enquiry.from_mobile,
            service_type: enquiry.service_type,
            appliance_type: enquiry.appliance_type,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(
            ENQUIRIES_STORAGE_KEY,
            JSON.stringify(enquiries.slice(-MAX_STORED_ENQUIRIES))
        );
    } catch (_) {
        // Ignore storage failures
    }
}

// ===== Show Error Message (XSS-safe) =====
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.setAttribute('role', 'alert');

    const icon = document.createElement('i');
    icon.className = 'fas fa-exclamation-circle';
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.textContent = String(message || 'Something went wrong');

    toast.append(icon, text);
    
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.95rem;
        box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Show Success Modal =====
function showSuccessModal() {
    if (!successModal) return;
    successModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ===== Close Modal =====
function closeModal() {
    if (!successModal) return;
    successModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on outside click / Escape
if (successModal) {
    successModal.addEventListener('click', function(e) {
        if (e.target === successModal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && successModal.classList.contains('active')) {
            closeModal();
        }
    });
}

// ===== Input Animations =====
const formInputs = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea');

formInputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
});

// ===== Mobile Number Input - Only Numbers =====
const mobileInput = document.getElementById('mobile');
if (mobileInput) {
    mobileInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
    });
}

// ===== Intersection Observer for Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Observe elements for animation
if (!prefersReducedMotion) {
    document.querySelectorAll('.service-card, .feature-card, .enquiry-wrapper, .pricing-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Add animation class styles
const style = document.createElement('style');
style.textContent = `
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .form-group.focused label {
        color: #3b82f6;
    }
    
    .form-group.focused label i {
        color: #f97316;
    }
`;
document.head.appendChild(style);

// ===== Service Card Stagger Animation =====
const serviceCards = document.querySelectorAll('.service-card');
serviceCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.1}s`;
});

const featureCards = document.querySelectorAll('.feature-card');
featureCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.1}s`;
});

// ===== WhatsApp Integration =====
function sendToWhatsApp() {
    const name = document.getElementById('name').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const serviceType = document.getElementById('serviceType').value;
    const appliance = document.getElementById('appliance').value;
    const message = document.getElementById('message').value.trim();
    
    const whatsappMessage = `
*New Service Enquiry*
------------------------
*Name:* ${name}
*Mobile:* ${mobile}
*Service:* ${serviceType}
*Appliance:* ${appliance}
*Message:* ${message || 'No additional details'}
    `.trim();
    
    const whatsappUrl = `https://wa.me/919798092738?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

// ===== Google Reviews Carousel =====
(function initGoogleReviewsCarousel() {
    const track = document.getElementById('reviewsTrack');
    const dotsWrap = document.getElementById('reviewsDots');
    const prevBtn = document.querySelector('.reviews-nav--prev');
    const nextBtn = document.querySelector('.reviews-nav--next');
    const carousel = document.querySelector('.reviews-carousel');

    if (!track || !dotsWrap) return;

    const cards = Array.from(track.querySelectorAll('.review-card'));
    if (!cards.length) return;

    let index = 0;
    let timer = null;
    let touchStartX = 0;

    cards.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'reviews-dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', `Go to review ${i + 1}`);
        dot.addEventListener('click', () => {
            goTo(i);
            restart();
        });
        dotsWrap.appendChild(dot);
    });

    const dots = Array.from(dotsWrap.querySelectorAll('.reviews-dot'));

    function goTo(i) {
        index = (i + cards.length) % cards.length;
        track.style.transform = `translateX(-${index * 100}%)`;
        cards.forEach((card, cardIndex) => {
            card.classList.toggle('is-active', cardIndex === index);
        });
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('is-active', dotIndex === index);
        });
    }

    function next() {
        goTo(index + 1);
    }

    function prev() {
        goTo(index - 1);
    }

    function start() {
        stop();
        if (prefersReducedMotion) return;
        timer = setInterval(next, 4500);
    }

    function stop() {
        if (timer) clearInterval(timer);
        timer = null;
    }

    function restart() {
        stop();
        start();
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prev();
            restart();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            next();
            restart();
        });
    }

    if (carousel) {
        carousel.addEventListener('mouseenter', stop);
        carousel.addEventListener('mouseleave', start);
        carousel.addEventListener('focusin', stop);
        carousel.addEventListener('focusout', start);

        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            stop();
        }, { passive: true });

        carousel.addEventListener('touchend', (e) => {
            const delta = e.changedTouches[0].screenX - touchStartX;
            if (Math.abs(delta) > 40) {
                if (delta < 0) next();
                else prev();
            }
            start();
        }, { passive: true });

        if ('IntersectionObserver' in window) {
            const watcher = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) start();
                    else stop();
                });
            }, { threshold: 0.25 });
            watcher.observe(carousel);
        }
    }

    goTo(0);
    start();
})();

// ===== Console Welcome Message =====
console.log('%c Bharat World Professional Service Center ', 
    'background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; font-size: 16px; padding: 10px 20px; border-radius: 5px;');
console.log('%c Website developed with care ', 
    'color: #f97316; font-size: 12px;');

// ===== Hero Carousel =====
const carouselSlides = document.querySelectorAll('.carousel-slide');
const indicators = document.querySelectorAll('.indicator');
let currentSlide = 0;
let carouselInterval;

function showSlide(index) {
    // Remove active class from all slides and indicators
    carouselSlides.forEach((slide, i) => {
        slide.classList.remove('active', 'prev', 'next');
        if (i < index) slide.classList.add('prev');
        if (i > index) slide.classList.add('next');
    });
    indicators.forEach(ind => ind.classList.remove('active'));
    
    // Add active class to current slide and indicator
    carouselSlides[index].classList.add('active');
    indicators[index].classList.add('active');
    
    currentSlide = index;
}

function nextSlide() {
    const next = (currentSlide + 1) % carouselSlides.length;
    showSlide(next);
}

function prevSlide() {
    const prev = (currentSlide - 1 + carouselSlides.length) % carouselSlides.length;
    showSlide(prev);
}

// Auto-advance carousel
function startCarousel() {
    carouselInterval = setInterval(nextSlide, 3500);
}

function stopCarousel() {
    clearInterval(carouselInterval);
}

// Initialize carousel
if (carouselSlides.length > 0) {
    const carousel = document.querySelector('.hero-carousel');
    const prevBtn = document.querySelector('.carousel-nav--prev');
    const nextBtn = document.querySelector('.carousel-nav--next');

    const restartCarousel = () => {
        stopCarousel();
        if (!prefersReducedMotion) startCarousel();
    };

    if (!prefersReducedMotion) startCarousel();

    // Click on indicators
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            showSlide(index);
            restartCarousel();
        });
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            restartCarousel();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            restartCarousel();
        });
    }

    // Pause on hover / touch
    if (carousel) {
        carousel.addEventListener('mouseenter', stopCarousel);
        carousel.addEventListener('mouseleave', () => {
            if (!prefersReducedMotion) startCarousel();
        });
        carousel.addEventListener('focusin', stopCarousel);
        carousel.addEventListener('focusout', () => {
            if (!prefersReducedMotion) startCarousel();
        });
    }

    // Pause when carousel is off-screen (saves battery/CPU)
    if ('IntersectionObserver' in window && carousel) {
        const carouselWatcher = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    if (!prefersReducedMotion) startCarousel();
                } else {
                    stopCarousel();
                }
            });
        }, { threshold: 0.2 });
        carouselWatcher.observe(carousel);
    }
}
