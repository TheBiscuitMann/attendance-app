// src/api/auth.js
import { request, setTokens, clearTokens, isLoggedIn } from './client';

// Django's LoginView authenticates with the email as the username, so
// whatever the teacher types in the first field is sent as `email`.
export const loginFaculty = async (username, password) => {
    const result = await request('/auth/login/', {
        method: 'POST',
        auth: false,
        body: { email: username, password },
        fallbackError: 'Login failed. Please check your credentials.',
    });

    if (result.success) {
        setTokens(result.data.access, result.data.refresh);
        return { success: true };
    }
    return result;
};

// Creates the account and signs the teacher straight in — the register
// endpoint returns tokens, so there's no reason to make them log in again.
export const registerFaculty = async (fullName, email, password) => {
    const result = await request('/auth/register/', {
        method: 'POST',
        auth: false,
        body: { full_name: fullName, email, password },
        fallbackError: 'Could not create your account. Please try again.',
    });

    if (result.success) {
        setTokens(result.data.access, result.data.refresh);
        return { success: true };
    }
    return result;
};

// Always resolves successfully — the API deliberately doesn't reveal
// whether an address has an account.
export const requestPasswordReset = (email) =>
    request('/auth/password-reset/', {
        method: 'POST',
        auth: false,
        body: { email },
        fallbackError: 'Could not send the reset email. Please try again.',
    });

export const confirmPasswordReset = (uid, token, newPassword) =>
    request('/auth/password-reset/confirm/', {
        method: 'POST',
        auth: false,
        body: { uid, token, new_password: newPassword },
        fallbackError: 'Could not reset your password. Please try again.',
    });

export const logoutFaculty = () => clearTokens();
export const checkIsLoggedIn = () => isLoggedIn();