// src/api/auth.js

const BASE_URL = 'http://127.0.0.1:8000/api';

// Django's LoginView authenticates with the email as the username, so
// whatever the teacher types in the first field is sent as `email`.
export const loginFaculty = async (username, password) => {
    try {
        const response = await fetch(`${BASE_URL}/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('prezence_token', data.access);
            localStorage.setItem('prezence_refresh', data.refresh);
            return { success: true };
        }
        return {
            success: false,
            error: data.error || data.detail || 'Login failed. Please check your credentials.',
        };
    } catch (error) {
        return { success: false, error: 'Cannot connect to the server. Is Django running?' };
    }
};

// Creates the account and signs the teacher straight in — the register
// endpoint returns tokens, so there's no reason to make them log in again.
export const registerFaculty = async (fullName, email, password) => {
    try {
        const response = await fetch(`${BASE_URL}/auth/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: fullName, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('prezence_token', data.access);
            localStorage.setItem('prezence_refresh', data.refresh);
            return { success: true };
        }

        // DRF returns errors as { field: ["message", ...] }. Pull out the
        // first real message rather than showing the raw object.
        const firstError =
            (Array.isArray(data.email) && data.email[0]) ||
            (Array.isArray(data.password) && data.password[0]) ||
            (Array.isArray(data.full_name) && data.full_name[0]) ||
            data.detail ||
            'Could not create your account. Please try again.';

        return { success: false, error: firstError };
    } catch (error) {
        return { success: false, error: 'Cannot connect to the server. Is Django running?' };
    }
};

export const logoutFaculty = () => {
    localStorage.removeItem('prezence_token');
    localStorage.removeItem('prezence_refresh');
};

export const checkIsLoggedIn = () => {
    return localStorage.getItem('prezence_token') !== null;
};