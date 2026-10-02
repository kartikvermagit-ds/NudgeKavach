/**
 * NudgeKavach Security Gateway &mdash; Auditor Login Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // 1. Mode Switcher (Ethical vs Sneaky Pattern Showcase)
  const tabEthical = document.getElementById('tab-ethical-mode');
  const tabDark = document.getElementById('tab-dark-mode');
  const containerEthical = document.getElementById('container-ethical-form');
  const containerDark = document.getElementById('container-dark-form');

  tabEthical?.addEventListener('click', () => {
    tabEthical.classList.add('active');
    tabDark?.classList.remove('active');
    if (containerEthical) containerEthical.style.display = 'block';
    if (containerDark) containerDark.style.display = 'none';
  });

  tabDark?.addEventListener('click', () => {
    tabDark.classList.add('active');
    tabEthical?.classList.remove('active');
    if (containerEthical) containerEthical.style.display = 'none';
    if (containerDark) containerDark.style.display = 'block';
  });

  // 2. Quick Demo Credentials Auto-Fill
  const btnQuickDemo = document.getElementById('btn-quick-demo');
  const inputEmail = document.getElementById('input-email');
  const inputPassword = document.getElementById('input-password');

  btnQuickDemo?.addEventListener('click', () => {
    if (inputEmail) inputEmail.value = 'auditor@nudgekavach.local';
    if (inputPassword) {
      inputPassword.value = 'NudgeKavach#2026!Sec';
      evaluatePasswordStrength(inputPassword.value);
    }
    btnQuickDemo.innerHTML = '<span class="quick-fill-bolt">&#10003;</span><span>Credentials Injected (Enclave Ready)</span>';
    btnQuickDemo.style.background = '#153828';
    btnQuickDemo.style.borderColor = 'var(--lime)';
    setTimeout(() => {
      btnQuickDemo.innerHTML = '<span class="quick-fill-bolt">&#9889;</span><span>Auto-Fill Auditor Demo Credentials</span>';
      btnQuickDemo.style.background = '';
      btnQuickDemo.style.borderColor = '';
    }, 2500);
  });

  // 3. Password Visibility Toggle
  const btnTogglePw = document.getElementById('btn-toggle-pw');
  const pwEyeIcon = document.getElementById('pw-eye-icon');

  btnTogglePw?.addEventListener('click', () => {
    if (!inputPassword) return;
    const isPw = inputPassword.type === 'password';
    inputPassword.type = isPw ? 'text' : 'password';
    if (pwEyeIcon) pwEyeIcon.innerHTML = isPw ? '&#128584;' : '&#128065;';
  });

  // 4. Live Password Strength Meter
  const meterBarFill = document.getElementById('meter-bar-fill');
  const meterStatusText = document.getElementById('meter-status-text');

  function evaluatePasswordStrength(val) {
    if (!meterBarFill || !meterStatusText) return;

    if (!val || val.length === 0) {
      meterBarFill.style.width = '0%';
      meterStatusText.textContent = 'Enter password';
      meterStatusText.style.color = 'var(--text-mute)';
      return;
    }

    let score = 0;
    if (val.length >= 8) score++;
    if (val.length >= 12) score++;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    switch (score) {
      case 1:
        meterBarFill.style.width = '20%';
        meterBarFill.style.background = '#ff5f56';
        meterStatusText.textContent = 'Very Weak';
        meterStatusText.style.color = '#ff5f56';
        break;
      case 2:
        meterBarFill.style.width = '40%';
        meterBarFill.style.background = '#ff8585';
        meterStatusText.textContent = 'Weak';
        meterStatusText.style.color = '#ff8585';
        break;
      case 3:
        meterBarFill.style.width = '65%';
        meterBarFill.style.background = '#ed942f';
        meterStatusText.textContent = 'Moderate';
        meterStatusText.style.color = '#ed942f';
        break;
      case 4:
        meterBarFill.style.width = '85%';
        meterBarFill.style.background = '#a8e442';
        meterStatusText.textContent = 'Strong';
        meterStatusText.style.color = '#a8e442';
        break;
      case 5:
        meterBarFill.style.width = '100%';
        meterBarFill.style.background = 'var(--lime)';
        meterStatusText.textContent = 'Cryptographic Enclave Grade';
        meterStatusText.style.color = 'var(--lime)';
        break;
      default:
        meterBarFill.style.width = '10%';
        meterBarFill.style.background = '#ff5f56';
        meterStatusText.textContent = 'Too Short';
        meterStatusText.style.color = '#ff5f56';
    }
  }

  inputPassword?.addEventListener('input', (e) => {
    evaluatePasswordStrength(e.target.value);
  });

  // 5. Biometric Passkey Modal Simulation
  const btnPasskey = document.getElementById('btn-passkey');
  const bioModal = document.getElementById('biometric-modal');
  const btnCancelBio = document.getElementById('btn-cancel-bio');
  const bioStatusMsg = document.getElementById('bio-status-msg');
  const authToast = document.getElementById('auth-toast');

  btnPasskey?.addEventListener('click', () => {
    if (!bioModal) return;
    bioModal.hidden = false;
    if (bioStatusMsg) bioStatusMsg.textContent = 'Scanning biometric hardware...';

    setTimeout(() => {
      if (bioStatusMsg) {
        bioStatusMsg.textContent = '✓ Hardware Touch ID Confirmed & Enclave Signed';
        bioStatusMsg.style.color = 'var(--lime)';
      }
      setTimeout(() => {
        bioModal.hidden = true;
        triggerSuccessfulLogin('Biometric Passkey (FIDO2)');
      }, 1000);
    }, 1800);
  });

  btnCancelBio?.addEventListener('click', () => {
    if (bioModal) bioModal.hidden = true;
  });

  // 6. Form Submission (Simulated Cryptographic Enclave Session)
  const loginForm = document.getElementById('auditor-login-form');
  const btnSubmitLogin = document.getElementById('btn-submit-login');
  const btnSpinner = document.getElementById('btn-spinner');

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailVal = inputEmail?.value.trim();
    const pwVal = inputPassword?.value;

    if (!emailVal || !pwVal) {
      alert('Please enter your email and master token, or click "Auto-Fill Auditor Demo Credentials".');
      return;
    }

    if (btnSubmitLogin) {
      btnSubmitLogin.disabled = true;
      const btnTxt = btnSubmitLogin.querySelector('.btn-txt');
      if (btnTxt) btnTxt.textContent = 'Verifying Enclave Token...';
      if (btnSpinner) btnSpinner.hidden = false;
    }

    setTimeout(() => {
      triggerSuccessfulLogin(emailVal);
    }, 1200);
  });

  function triggerSuccessfulLogin(identity) {
    if (authToast) {
      authToast.hidden = false;
      const toastContent = authToast.querySelector('.toast-content');
      if (toastContent) {
        toastContent.innerHTML = `
          <strong>Enclave Session Established</strong>
          <span>Signed as ${identity}. Redirecting to Demo Store...</span>
        `;
      }
    }

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1800);
  }

  // 7. Dark Pattern Simulator Mode Controls
  const fakeSessionTimer = document.getElementById('fake-session-timer');
  const trapCheckBox = document.getElementById('trap-check-box');
  const fakeShameBtn = document.getElementById('fake-shame-btn');
  const btnNeutralizeDemo = document.getElementById('btn-neutralize-demo');
  const neutralizeNote = document.getElementById('neutralize-note');
  let fakeSecs = 105;

  setInterval(() => {
    if (fakeSecs > 0) {
      fakeSecs--;
      const mins = Math.floor(fakeSecs / 60);
      const remSecs = fakeSecs % 60;
      if (fakeSessionTimer) {
        fakeSessionTimer.textContent = `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
      }
    }
  }, 1000);

  let isNeutralized = false;
  btnNeutralizeDemo?.addEventListener('click', () => {
    isNeutralized = !isNeutralized;
    const trapItems = document.querySelectorAll('.trap-item');

    if (isNeutralized) {
      trapItems.forEach((t) => t.classList.add('neutralized'));
      if (trapCheckBox) trapCheckBox.checked = false;
      if (fakeShameBtn) {
        fakeShameBtn.textContent = "No thanks, I'll pass (Ethical choice)";
        fakeShameBtn.style.color = 'var(--lime)';
        fakeShameBtn.style.borderColor = 'var(--border-active)';
      }
      if (btnNeutralizeDemo) {
        btnNeutralizeDemo.innerHTML = '<span>&#10003; Dark Patterns Intercepted &amp; Cleared</span>';
        btnNeutralizeDemo.style.background = 'var(--lime)';
        btnNeutralizeDemo.style.color = '#08140f';
      }
      if (neutralizeNote) {
        neutralizeNote.textContent = 'Rule 01, Rule 02, and Rule 03 successfully applied by NudgeKavach!';
        neutralizeNote.style.color = 'var(--lime)';
      }
    } else {
      trapItems.forEach((t) => t.classList.remove('neutralized'));
      if (trapCheckBox) trapCheckBox.checked = true;
      if (fakeShameBtn) {
        fakeShameBtn.textContent = 'No thanks, I prefer having my passwords stolen';
        fakeShameBtn.style.color = '#ff9e9e';
        fakeShameBtn.style.borderColor = '#6b3e3e';
      }
      if (btnNeutralizeDemo) {
        btnNeutralizeDemo.innerHTML = '<span class="n-shield">&#128737;&#65039;</span><span>Neutralize with NudgeKavach</span>';
        btnNeutralizeDemo.style.background = '';
        btnNeutralizeDemo.style.color = '';
      }
      if (neutralizeNote) {
        neutralizeNote.textContent = 'Click to uncheck add-on and neutralize guilt copy';
        neutralizeNote.style.color = '';
      }
    }
  });
});
