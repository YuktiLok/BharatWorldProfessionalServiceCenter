// ===== DOM Elements =====
const enquiryForm = document.getElementById('enquiryForm');
const successModal = document.getElementById('successModal');
const header = document.querySelector('.header');

// ===== Header Scroll Effect =====
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        header.style.background = 'rgba(15, 23, 42, 0.98)';
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    } else {
        header.style.background = 'rgba(15, 23, 42, 0.9)';
        header.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
});

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerHeight = header.offsetHeight;
            const targetPosition = target.offsetTop - headerHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Form Validation & Submission =====
enquiryForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const email = document.getElementById('email').value.trim();
    const serviceType = document.getElementById('serviceType').value;
    const appliance = document.getElementById('appliance').value;
    const message = document.getElementById('message').value.trim();
    
    // Validate required fields
    if (!name || !mobile || !serviceType || !appliance) {
        showError('Please fill in all required fields');
        return;
    }
    
    // Validate mobile number
    if (!/^[0-9]{10}$/.test(mobile)) {
        showError('Please enter a valid 10-digit mobile number');
        return;
    }
    
    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    // Create enquiry object
    const enquiry = {
        name,
        mobile,
        email: email || 'Not provided',
        serviceType,
        appliance,
        message: message || 'No additional details',
        timestamp: new Date().toISOString()
    };
    
    // Store in localStorage (for demo purposes)
    saveEnquiry(enquiry);
    
    // Show success modal
    showSuccessModal();
    
    // Reset form
    enquiryForm.reset();
    
    // Log enquiry (in production, this would be sent to a server)
    console.log('New Enquiry:', enquiry);
});

// ===== Save Enquiry to LocalStorage =====
function saveEnquiry(enquiry) {
    let enquiries = JSON.parse(localStorage.getItem('bhartWorldEnquiries')) || [];
    enquiries.push(enquiry);
    localStorage.setItem('bhartWorldEnquiries', JSON.stringify(enquiries));
}

// ===== Show Error Message =====
function showError(message) {
    // Create error toast
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Add styles
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
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Show Success Modal =====
function showSuccessModal() {
    successModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ===== Close Modal =====
function closeModal() {
    successModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on outside click
successModal.addEventListener('click', function(e) {
    if (e.target === successModal) {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && successModal.classList.contains('active')) {
        closeModal();
    }
});

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
mobileInput.addEventListener('input', function(e) {
    this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
});

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

// Observe elements for animation
document.querySelectorAll('.service-card, .feature-card, .enquiry-wrapper').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

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

// ===== WhatsApp Integration (Optional) =====
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
    window.open(whatsappUrl, '_blank');
}

// ===== Console Welcome Message =====
console.log('%c Bhart World Professional Service Center ', 
    'background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; font-size: 16px; padding: 10px 20px; border-radius: 5px;');
console.log('%c Website developed with care ', 
    'color: #f97316; font-size: 12px;');
