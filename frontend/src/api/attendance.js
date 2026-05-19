
const BASE_URL = 'http://127.0.0.1:8000/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('prezence_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// date n topic
export const createSession = async (batchId, date, topic) => {
    try {
        const response = await fetch(`${BASE_URL}/sessions/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ batch: batchId, date, topic }),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
};

// Fetch Session History
export const fetchSessions = async (batchId) => {
    try {
        const response = await fetch(`${BASE_URL}/sessions/?batch=${batchId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
};

// Save the actual Attendance marks
export const saveAttendance = async (sessionId, records) => {
    try {
        const response = await fetch(`${BASE_URL}/attendance/save/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ session_id: sessionId, records }),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
};

// Get the Attendance Summary (Percentages)
export const fetchSummary = async (batchId) => {
    try {
        const response = await fetch(`${BASE_URL}/attendance/summary/?batch=${batchId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
};