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
export const importStudents = (batchId, file, { preview = false } = {}) => {
    const form = new FormData();
    form.append('batch', batchId);
    form.append('file', file);
    if (preview) form.append('preview', '1');
    return request('/students/import/', {
        method: 'POST',
        body: form,
        fallbackError: 'Could not import that file.',
    });
};

// Second half of the PDF flow: the rows the teacher approved in the
// preview are sent back to be created.
export const confirmImportStudents = (batchId, students) =>
    request('/students/import/', {
        method: 'POST',
        body: { batch: batchId, students },
        fallbackError: 'Could not import those students.',
    });