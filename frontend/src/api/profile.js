// src/api/profile.js
const BASE_URL = 'http://127.0.0.1:8000/api';

// Fired after a successful profile update so the header can refresh the
// displayed name without a page reload.
export const PROFILE_EVENT = 'profileDetailsUpdated';

const getAuthHeaders = () => {
    const token = localStorage.getItem('prezence_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const fetchProfile = async () => {
    try {
        const response = await fetch(`${BASE_URL}/auth/me/`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Cannot connect to the server.' };
    }
};

export const updateFullName = async (fullName) => {
    try {
        const response = await fetch(`${BASE_URL}/auth/me/`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ full_name: fullName }),
        });
        const data = await response.json();

        if (response.ok) {
            window.dispatchEvent(new Event(PROFILE_EVENT));
            return { success: true, data };
        }
        return { success: false, error: data.full_name || 'Could not save your name.' };
    } catch (error) {
        return { success: false, error: 'Cannot connect to the server.' };
    }
};

export const changePassword = async (currentPassword, newPassword) => {
    try {
        const response = await fetch(`${BASE_URL}/auth/change-password/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
            }),
        });
        const data = await response.json();

        if (response.ok) return { success: true };

        // Django returns password rule failures as a list of messages.
        const firstError =
            data.current_password ||
            (Array.isArray(data.new_password) ? data.new_password[0] : data.new_password) ||
            'Could not change your password.';

        return { success: false, error: firstError };
    } catch (error) {
        return { success: false, error: 'Cannot connect to the server.' };
    }
};