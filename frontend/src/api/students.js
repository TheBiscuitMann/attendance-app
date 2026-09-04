// src/api/students.js
import { request } from './client';

export const fetchStudents = (batchId) =>
    request(`/students/?batch=${batchId}`, {
        fallbackError: 'Could not load the student list.',
    });

export const createStudent = (batchId, name, student_id) =>
    request('/students/', {
        method: 'POST',
        body: { batch: batchId, name, student_id },
        fallbackError: 'Could not add that student.',
    });

export const updateStudent = (studentId, batchId, name, student_id_string) =>
    request(`/students/${studentId}/`, {
        method: 'PUT',
        // The batch is resent so Django knows they stay where they are.
        body: { batch: batchId, name, student_id: student_id_string },
        fallbackError: 'Could not save that student.',
    });

export const deleteStudent = (studentId) =>
    request(`/students/${studentId}/`, {
        method: 'DELETE',
        fallbackError: 'Could not remove that student.',
    });