// frontend/js/utils.js

const API_BASE_URL = 'http://localhost:5000';

/**
 * Shared function to show custom alerts
 */
function showAlert(message, type = 'info') {
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert alert-dismissible fade show position-fixed`;

    const BROWN_PALETTE = {
        primary: '#5D4037',
        secondary: '#8D6E63',
        light: '#D7CCC8',
        warning: '#FF9800',
        danger: '#F44336',
        background: '#FFF8F0'
    };

    const bgColor = type === 'success' ? '#E8F5E9' :
        type === 'warning' ? BROWN_PALETTE.background :
            type === 'danger' ? '#FFEBEE' : '#E3F2FD';

    const borderColor = type === 'success' ? '#4CAF50' :
        type === 'warning' ? BROWN_PALETTE.warning :
            type === 'danger' ? BROWN_PALETTE.danger : '#2196F3';

    alertDiv.style.cssText = `
    top: 20px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border-radius: 12px;
    border-left: 4px solid ${borderColor};
    background: ${bgColor};
    color: ${BROWN_PALETTE.primary};
    padding: 1rem;
    border: 1px solid ${BROWN_PALETTE.light};
  `;

    const icon = type === 'success' ? 'check-circle' :
        type === 'warning' ? 'exclamation-triangle' :
            type === 'danger' ? 'exclamation-circle' : 'info-circle';

    const iconColor = type === 'success' ? '#4CAF50' :
        type === 'warning' ? BROWN_PALETTE.warning :
            type === 'danger' ? BROWN_PALETTE.danger : '#2196F3';

    alertDiv.innerHTML = `
    <div class="d-flex align-items-center">
      <i class="fas fa-${icon} me-2" style="color: ${iconColor}; font-size: 1.2rem;"></i>
      <div style="flex: 1;">
        <strong style="color: ${BROWN_PALETTE.primary}">${type.charAt(0).toUpperCase() + type.slice(1)}!</strong>
        <div style="color: ${BROWN_PALETTE.secondary}; font-size: 0.9rem;">${message}</div>
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="alert" style="filter: invert(0.5);"></button>
    </div>
  `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Helper for API calls with token
 */
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            throw new Error('Session expired');
        }

        return response;
    } catch (error) {
        console.error(`API Fetch Error (${endpoint}):`, error);
        throw error;
    }
}

/**
 * Animate a numeric value from start to end
 */
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentVal = Math.floor(progress * (end - start) + start);
        obj.innerHTML = currentVal.toLocaleString() + ' Br';
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * Export JSON data to CSV and trigger download
 */
function exportToCSV(filename, rows) {
    if (!rows || !rows.length) return;

    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent = [
        keys.join(separator),
        ...rows.map(row => keys.map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
            return cell;
        }).join(separator))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Export if using modules, but since this is direct script usage:
// (No export needed as it will be loaded via <script> tag)
