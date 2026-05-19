// src/api/batches.js
const BASE_URL = 'http://127.0.0.1:8000/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('prezence_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// GET: Fetch all batches
export const fetchBatches = async () => {
    try {
        const response = await fetch(`${BASE_URL}/batches/`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
};

// POST: Create a new batch attached to a specific course
export const createBatch = async (courseId, name, section) => {
    try {
        const response = await fetch(`${BASE_URL}/batches/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ course: courseId, name, section }),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
};


// GET: Fetch a single batch and its students
export const fetchBatch = async (batchId) => {
    try {
        const token = localStorage.getItem('prezence_token');
        const response = await fetch(`${BASE_URL}/batches/${batchId}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error connecting to Django' };
    }
};