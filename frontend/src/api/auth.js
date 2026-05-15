// src/api/auth.js

const BASE_URL = 'http://127.0.0.1:8000/api';

export const loginFaculty = async (username, password) => {
    try {
        const response = await fetch(`${BASE_URL}/auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Django sends back an 'access' token. We save it to the browser.
            localStorage.setItem('prezence_token', data.access);
            return { success: true };
        } else {
            return { success: false, error: data.detail || 'Login failed. Please check your credentials.' };
        }
    } catch (error) {
        return { success: false, error: 'Cannot connect to the server. Is Django running?' };
    }
};

export const logoutFaculty = () => {
    localStorage.removeItem('prezence_token');
};

export const checkIsLoggedIn = () => {
    // If the token exists in local storage, they are logged in
    return localStorage.getItem('prezence_token') !== null;
};