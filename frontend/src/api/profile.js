// src/api/profile.js
import { request } from './client';

// Fired after a successful profile update so the header can refresh the
// displayed name without a page reload.
export const PROFILE_EVENT = 'profileDetailsUpdated';

export const fetchProfile = () =>
    request('/auth/me/', { fallbackError: 'Could not load your profile.' });

export const updateFullName = async (fullName) => {
    const result = await request('/auth/me/', {
        method: 'PATCH',
        body: { full_name: fullName },
        fallbackError: 'Could not save your name.',
    });

    if (result.success) window.dispatchEvent(new Event(PROFILE_EVENT));
    return result;
};

export const changePassword = (currentPassword, newPassword) =>
    request('/auth/change-password/', {
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword },
        fallbackError: 'Could not change your password.',
    });