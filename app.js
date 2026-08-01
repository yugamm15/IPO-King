/* ==========================================================================
   IPO KING - Interactive Authentication, Navigation & Dashboard Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // --- State Variables ---
    let currentOtp = "849201";
    let timerInterval = null;
    let secondsRemaining = 120;
    let isDarkTheme = false;

    // --- DOM Elements ---
    const body = document.body;
    const authThemeToggle = document.getElementById('auth-theme-toggle');
    const dashThemeToggle = document.getElementById('dash-theme-toggle');
    
    const authThemeLabel = document.getElementById('auth-theme-label');
    const dashThemeLabel = document.getElementById('dash-theme-label');

    const loginForm = document.getElementById('login-form');
    const otpStep = document.getElementById('otp-step');
    const authContainer = document.getElementById('auth-container');
    const dashboardContainer = document.getElementById('dashboard-container');

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePwdBtn = document.getElementById('toggle-pwd-btn');

    const userEmailDisplay = document.getElementById('user-email-display');
    const otpDigits = document.querySelectorAll('.otp-digit');
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    const resendOtpBtn = document.getElementById('resend-otp-btn');
    const changeEmailBtn = document.getElementById('change-email-btn');
    const timerCount = document.getElementById('timer-count');

    const logoutBtn = document.getElementById('logout-btn');

    // Sidebar Items & Tab Panes
    const menuItems = document.querySelectorAll('.menu-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Excel Modal
    const excelModal = document.getElementById('excel-import-modal');
    const openExcelModalBtns = document.querySelectorAll('.open-excel-modal-btn');
    const closeExcelModalBtn = document.getElementById('close-excel-modal');
    const btnBrowseExcel = document.getElementById('btn-browse-excel');
    const excelFileInput = document.getElementById('excel-file-input');

    // --- Theme Toggle Logic ---
    function toggleTheme() {
        isDarkTheme = !isDarkTheme;
        if (isDarkTheme) {
            body.classList.add('dark-theme');
            if (authThemeLabel) authThemeLabel.textContent = "Light Mode";
            if (dashThemeLabel) dashThemeLabel.textContent = "Light Mode";
        } else {
            body.classList.remove('dark-theme');
            if (authThemeLabel) authThemeLabel.textContent = "Dark Mode";
            if (dashThemeLabel) dashThemeLabel.textContent = "Dark Mode";
        }
        if (window.lucide) lucide.createIcons();
    }

    if (authThemeToggle) authThemeToggle.addEventListener('click', toggleTheme);
    if (dashThemeToggle) dashThemeToggle.addEventListener('click', toggleTheme);

    // --- Password Toggle ---
    if (togglePwdBtn) {
        togglePwdBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
        });
    }

    // --- STEP 1: LOGIN SUBMISSION ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userEmail = emailInput.value.trim();
            if (!userEmail) return;

            currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
            userEmailDisplay.textContent = userEmail;

            loginForm.classList.remove('active');
            otpStep.classList.add('active');

            otpDigits.forEach(input => input.value = '');
            if (otpDigits[0]) otpDigits[0].focus();

            startOtpTimer();
        });
    }

    // --- STEP 2: OTP AUTO-ADVANCE & NAVIGATION ---
    otpDigits.forEach((digitInput, idx) => {
        digitInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.length === 1 && idx < otpDigits.length - 1) {
                otpDigits[idx + 1].focus();
            }
        });

        digitInput.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !digitInput.value && idx > 0) {
                otpDigits[idx - 1].focus();
            }
        });

        digitInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
            if (/^\d{6}$/.test(pasteData)) {
                pasteData.split('').forEach((char, i) => {
                    if (otpDigits[i]) otpDigits[i].value = char;
                });
                if (otpDigits[5]) otpDigits[5].focus();
            }
        });
    });

    // --- STEP 3: VERIFY OTP ---
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', () => {
            let enteredOtp = "";
            otpDigits.forEach(input => enteredOtp += input.value);

            if (enteredOtp.length !== 6) {
                alert("Please enter all 6 digits of your security OTP code.");
                return;
            }

            // Verify entered OTP strictly matches the real generated OTP
            if (enteredOtp !== currentOtp) {
                alert("Invalid OTP code. Please check your email and try again.");
                return;
            }

            // Success Verification
            clearInterval(timerInterval);
            authContainer.style.display = 'none';
            dashboardContainer.classList.remove('hidden');
        });
    }

    // Timer Logic
    function startOtpTimer() {
        clearInterval(timerInterval);
        secondsRemaining = 120;
        if (resendOtpBtn) resendOtpBtn.disabled = true;

        timerInterval = setInterval(() => {
            secondsRemaining--;
            const mins = String(Math.floor(secondsRemaining / 60)).padStart(2, '0');
            const secs = String(secondsRemaining % 60).padStart(2, '0');
            if (timerCount) timerCount.textContent = `${mins}:${secs}`;

            if (secondsRemaining <= 0) {
                clearInterval(timerInterval);
                if (timerCount) timerCount.textContent = "EXPIRED";
                if (resendOtpBtn) resendOtpBtn.disabled = false;
            }
        }, 1000);
    }

    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', () => {
            currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
            alert(`New 6-Digit Security OTP Code sent to your email`);
            startOtpTimer();
        });
    }

    if (changeEmailBtn) {
        changeEmailBtn.addEventListener('click', () => {
            clearInterval(timerInterval);
            otpStep.classList.remove('active');
            loginForm.classList.add('active');
        });
    }

    // --- SIDEBAR TAB NAVIGATION SYSTEM ---
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');

            // Set Active Menu Item
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');

            // Switch Active Content Pane
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `tab-${targetTab}`) {
                    pane.classList.add('active');
                }
            });

            if (window.lucide) lucide.createIcons();
        });
    });

    // --- BULK EXCEL IMPORT MODAL LOGIC ---
    openExcelModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (excelModal) excelModal.classList.add('active');
        });
    });

    if (closeExcelModalBtn) {
        closeExcelModalBtn.addEventListener('click', () => {
            if (excelModal) excelModal.classList.remove('active');
        });
    }

    if (excelModal) {
        excelModal.addEventListener('click', (e) => {
            if (e.target === excelModal) excelModal.classList.remove('active');
        });
    }

    if (btnBrowseExcel && excelFileInput) {
        btnBrowseExcel.addEventListener('click', () => excelFileInput.click());
        excelFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                alert(`Selected file: "${e.target.files[0].name}". Processing 17-column mapping...`);
                if (excelModal) excelModal.classList.remove('active');
            }
        });
    }

    // --- LOGOUT ACTION ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            dashboardContainer.classList.add('hidden');
            authContainer.style.display = 'flex';
            otpStep.classList.remove('active');
            loginForm.classList.add('active');
            emailInput.value = "admin@ipoking.com";
            passwordInput.value = "••••••••••••";
        });
    }

    // --- INTERACTIVE PROFIT & TDS CALCULATOR ---
    const calcAllotPrice = document.getElementById('calc-allot-price');
    const calcListPrice = document.getElementById('calc-list-price');
    const calcQty = document.getElementById('calc-qty');

    const resTotalProfit = document.getElementById('res-total-profit');
    const resCustShare = document.getElementById('res-cust-share');
    const resCompShare = document.getElementById('res-comp-share');
    const resTds = document.getElementById('res-tds');
    const resNetPayout = document.getElementById('res-net-payout');

    function calculateProfitAndTds() {
        if (!calcAllotPrice || !calcListPrice || !calcQty) return;

        const allot = parseFloat(calcAllotPrice.value) || 0;
        const list = parseFloat(calcListPrice.value) || 0;
        const qty = parseInt(calcQty.value) || 0;

        const profitPerShare = list - allot;
        const totalProfit = profitPerShare * qty;

        const customerShare = totalProfit * 0.40;
        const companyShare = totalProfit * 0.60;
        const tdsDeduction = customerShare * 0.10;
        const netPayout = customerShare - tdsDeduction;

        if (resTotalProfit) resTotalProfit.textContent = `₹ ${totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (resCustShare) resCustShare.textContent = `₹ ${customerShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (resCompShare) resCompShare.textContent = `₹ ${companyShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (resTds) resTds.textContent = `₹ ${tdsDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (resNetPayout) resNetPayout.textContent = `₹ ${netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }

    if (calcAllotPrice && calcListPrice && calcQty) {
        [calcAllotPrice, calcListPrice, calcQty].forEach(input => {
            input.addEventListener('input', calculateProfitAndTds);
        });
        calculateProfitAndTds();
    }
});
