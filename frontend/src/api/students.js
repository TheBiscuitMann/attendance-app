// src/api/students.js
const BASE_URL = 'http://127.0.0.1:8000/api';

export const createStudent = async (batchId, name, student_id) => {
    try {
        const token = localStorage.getItem('prezence_token');
        const response = await fetch(`${BASE_URL}/students/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ batch: batchId, name, student_id }),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error connecting to Django' };
    }
};

// NEW: Update an existing student
export const updateStudent = async (studentId, batchId, name, student_id_string) => {
    try {
        const token = localStorage.getItem('prezence_token');
        const response = await fetch(`${BASE_URL}/students/${studentId}/`, {
            method: 'PUT', // PUT means "update this record"
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            // We have to send the batch ID again so Django knows they stay in the same batch
            body: JSON.stringify({ batch: batchId, name: name, student_id: student_id_string }),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
};