// src/api/batches.js
import { request } from './client';

export const fetchBatches = () =>
    request('/batches/', { fallbackError: 'Could not load your batches.' });

export const createBatch = (courseId, name, section) =>
    request('/batches/', {
        method: 'POST',
        body: { course: courseId, name, section },
        fallbackError: 'Could not create the batch.',
    });

export const fetchBatch = (batchId) =>
    request(`/batches/${batchId}/`, { fallbackError: 'Could not load that batch.' });

export const updateBatch = (batchId, courseId, name, section) =>
    request(`/batches/${batchId}/`, {
        method: 'PATCH',
        body: { course: courseId, name, section },
        fallbackError: 'Could not save your changes.',
    });

// Cascades — students, sessions and attendance under it go too.
export const deleteBatch = (batchId) =>
    request(`/batches/${batchId}/`, {
        method: 'DELETE',
        fallbackError: 'Could not delete that batch.',
    });