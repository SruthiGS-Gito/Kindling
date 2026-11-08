/* =========================================================
   AUTH — real accounts, real Log in / Sign up screens
   POST /api/auth/signup and POST /api/auth/login are real
   backend endpoints (bcrypt-hashed passwords, a real users
   table). An account is required to explore Kindling at all
   now - router.js's privateRoutes list is the one source of
   truth for that, not anything in here.

   Two screens, not tabs - #auth/login and #auth/signup are real
   routes (see router.js), so the browser back button steps
   between them and every entry point can link straight to the
   right one.

   There's no forgot-password endpoint anywhere in this backend,
   so per instruction there's no "Forgot password?" link here -
   adding one would promise something that doesn't work.

   The "What should we call you?" field is real: sent as `name` on
   signup, stored on the user row, and returned (or a real email-
   local-part fallback if left blank) by both /signup and /login as
   `name` on every AuthResponse - see K.getAuthName() in session.js.
   ========================================================= */

(() => {

    const K = window.Kindling;
    const { $, toast } = K;

    let authMode = 'login';

    const authCardInner = $('#authCardInner');
    const authHeading = $('#authHeading'), authSub = $('#authSub');
    const nameField = $('#nameField'), pwHint = $('#pwHint'), pwCheck = $('#pwCheck');
    const authForm = $('#authForm'), authErr = $('#authError'), emailErr = $('#emailError');
    const aName = $('#aName'), aEmail = $('#aEmail'), aPass = $('#aPass');
    const authSubmit = $('#authSubmit'), authSubmitLabel = $('#authSubmitLabel'), authSpinner = $('#authSpinner');
    const authSwitch = $('#authSwitch');
    const authForgot = $('#authForgot');
    const authFine = $('#authFine'), authConsent = $('#authConsent');

    function clearErrors() {
        authErr.textContent = '';
        emailErr.hidden = true;
        emailErr.textContent = '';
    }

    function setLoading(loading) {
        authSubmit.disabled = loading;
        authSpinner.hidden = !loading;
        authSubmitLabel.textContent = loading
            ? (authMode === 'signup' ? 'Creating account…' : 'Logging in…')
            : (authMode === 'signup' ? 'Create account' : 'Log in');
    }

    /*
     * One form, one set of inputs, for both screens - the email a
     * student already typed on Log in is still there if they switch
     * to Sign up (and back), since it's literally the same input,
     * not two forms to keep in sync. Only the surrounding chrome
     * (heading, subline, the optional name field, button/label text,
     * footer) changes between modes.
     */
    function applyMode(mode) {
        authMode = mode === 'signup' ? 'signup' : 'login';
        const isSignup = authMode === 'signup';

        // Short fade: hide, swap all the text/visibility synchronously
        // while invisible, then fade back in - a real crossfade
        // between two DOM trees isn't needed for a chrome-only swap,
        // and this can't show a half-updated in-between state.
        authCardInner.classList.add('is-switching');

        authHeading.textContent = isSignup ? 'Create your account' : 'Welcome back';
        authSub.textContent = isSignup
            ? 'It takes less than a minute. Your exploration stays private to you.'
            : 'Log in to pick up where you left off.';
        nameField.hidden = !isSignup;
        pwHint.hidden = !isSignup;
        authForgot.hidden = isSignup;
        aPass.autocomplete = isSignup ? 'new-password' : 'current-password';
        authSubmitLabel.textContent = isSignup ? 'Create account' : 'Log in';
        authSwitch.innerHTML = isSignup
            ? `Already have an account? <a href="#auth/login">Log in</a>`
            : `Don't have an account? <a href="#auth/signup">Sign up</a>`;
        authFine.hidden = isSignup;
        authConsent.hidden = !isSignup;
        clearErrors();

        requestAnimationFrame(() => {
            requestAnimationFrame(() => authCardInner.classList.remove('is-switching'));
        });

        // Focus the heading on every real screen entry (first arrival
        // at #auth or an in-page Log in <-> Sign up switch) so screen
        // readers announce the new screen and keyboard users land
        // somewhere sensible, per the accessibility requirement.
        authHeading.focus();
    }

    K.onRoute.auth = sub => applyMode(sub === 'signup' ? 'signup' : 'login');

    $('#pwToggle').addEventListener('click', e => {
        const show = aPass.type === 'password';
        aPass.type = show ? 'text' : 'password';
        e.target.textContent = show ? 'Hide' : 'Show';
    });

    aPass.addEventListener('input', () => {
        if (authMode !== 'signup') return;
        const met = aPass.value.length >= 8;
        pwCheck.textContent = met ? '✓' : '';
        pwHint.classList.toggle('is-met', met);
    });

    function applySignedInUI() {

        const signedIn = K.isSignedIn();
        const email = K.getAuthEmail() || '';
        const name = K.getAuthName();

        document.body.classList.toggle('signed-in', signedIn);

        // Landing's one hero CTA goes straight to Sign up if there's
        // no account yet, straight into Explore if there is.
        const heroCTA = $('#heroCTA');
        if (heroCTA) heroCTA.href = signedIn ? '#explore' : '#auth/signup';

        const acctEmail = $('#acctEmail');
        if (acctEmail) acctEmail.textContent = signedIn ? email : '';

        const acctName = $('#acctName');
        if (acctName) acctName.textContent = signedIn ? name : '';

        const avatar = $('#navAvatar');
        if (!avatar) return;

        if (signedIn) {
            const initial = (name.trim()[0] || 'K').toUpperCase();
            avatar.textContent = initial;
            avatar.setAttribute('aria-label', `Account menu, signed in as ${name}`);
        }

        const menuName = $('#menuName'), menuEmail = $('#menuEmail');
        if (menuName) menuName.textContent = name;
        if (menuEmail) menuEmail.textContent = email;

    }

    K.applySignedInUI = applySignedInUI;

    /* =====================================================
       ACCOUNT MENU
       Clicking the avatar opens a real dropdown (name, email,
       Settings, Log out) instead of jumping straight to Settings -
       same open/close/outside-click/Escape pattern as the thread
       row "..." menu in explore.js.
       ===================================================== */

    const accountMenuBtn = $('#navAvatar'), accountDropdown = $('#accountDropdown');

    function closeAccountMenu() {
        accountDropdown.hidden = true;
        accountMenuBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleAccountMenu() {
        const open = accountDropdown.hidden;
        accountDropdown.hidden = !open;
        accountMenuBtn.setAttribute('aria-expanded', String(open));
        if (open) accountDropdown.querySelector('a, button')?.focus();
    }

    accountMenuBtn.addEventListener('click', e => { e.stopPropagation(); toggleAccountMenu(); });
    document.addEventListener('click', e => {
        if (!accountDropdown.hidden && !e.target.closest('.account-menu')) closeAccountMenu();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !accountDropdown.hidden) { closeAccountMenu(); accountMenuBtn.focus(); }
    });
    accountDropdown.addEventListener('click', e => {
        if (e.target.closest('a, button')) closeAccountMenu();
    });

    $('#menuLogout').addEventListener('click', () => {
        K.clearAuth();
        // Same real reason Settings' own sign-out reloads (see
        // settings.js): explore.js guards its restore/fetch with a
        // module-scoped `started` flag that only resets on an actual
        // reload, so a later #explore visit wouldn't re-check auth
        // without one.
        K.clearSession();
        toast('Signed out');
        location.hash = 'home';
        location.reload();
    });

    authForm.addEventListener('submit', async e => {

        e.preventDefault();
        clearErrors();

        const email = aEmail.value.trim();
        const password = aPass.value;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emailErr.textContent = "That email doesn't look quite right.";
            emailErr.hidden = false;
            aEmail.focus();
            return;
        }

        if (password.length < 8) {
            authErr.textContent = 'Passwords need at least 8 characters.';
            aPass.focus();
            return;
        }

        const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
        const body = { email, password };
        if (authMode === 'signup' && aName.value.trim()) body.name = aName.value.trim();

        setLoading(true);

        try {

            const response = await fetch(`${K.API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {

                // Specific per-case text, always as plain text (never
                // a link) - the "Sign up"/"Log in" link already below
                // the button covers that, so the error never shows a
                // second, duplicate one.
                if (response.status === 429) {
                    authErr.textContent = data.detail || 'Too many attempts, try again in a few minutes.';
                }
                else if (response.status === 404) {
                    authErr.textContent = data.detail || "No account found with this email. Want to sign up?";
                }
                else if (response.status === 401) {
                    authErr.textContent = data.detail || "That password isn't right. Try again or reset it.";
                }
                else if (response.status === 409) {
                    // The one case that keeps its own link, per spec -
                    // ignores data.detail on purpose so the backend's
                    // plainer copy can't silently replace this exact
                    // wording+link.
                    authErr.innerHTML = `You already have an account with this email. <a href="#auth/login">Log in instead?</a>`;
                }
                else {
                    authErr.textContent = data.detail || 'Something went wrong. Please try again.';
                }

                return;
            }

            K.setAuth(data.token, data.email, data.name);
            applySignedInUI();

            authForm.reset();
            clearErrors();
            pwHint.classList.remove('is-met');
            pwCheck.textContent = '';

            toast(authMode === 'signup' ? `Welcome to Kindling, ${data.name}` : `Welcome back, ${data.name}`);

            // Land back wherever the router sent them here from (a
            // direct/bookmarked link to a private route while signed
            // out) - default to Explore if nothing was remembered.
            let redirect = 'explore';
            try {
                const remembered = sessionStorage.getItem('kindling_redirect_after_login');
                sessionStorage.removeItem('kindling_redirect_after_login');
                if (remembered) redirect = remembered;
            } catch (error) {}

            location.hash = redirect;

        }

        catch (error) {
            console.error('Auth request failed:', error);
            authErr.textContent = 'Something went wrong on our side. Please try again.';
        }

        finally {
            setLoading(false);
        }

    });

    const forgotPasswordLink = $('#forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', e => {
            e.preventDefault();
            clearErrors();
            authErr.textContent = "Password reset isn't available yet.";
        });
    }

    applySignedInUI();

})();
