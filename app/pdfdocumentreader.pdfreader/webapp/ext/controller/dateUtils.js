// utils/dateUtils.js
sap.ui.define([], function () {
    'use strict';

    /**
     * Converts various date formats to DD/MM/YYYY format
     */
    function convertToDateFormat(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return null;
        }

        const trimmed = dateString.trim();
        
        // Month abbreviations mapping
        const monthMap = {
            'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
            'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
            'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };

        try {
            // Format: DD-MMM-YYYY (e.g., "15-JAN-2024")
            let match = trimmed.match(/^(\d{1,2})-([A-Z]{3})-(\d{4})$/i);
            if (match) {
                const day = match[1].padStart(2, '0');
                const month = monthMap[match[2].toUpperCase()];
                const year = match[3];
                if (month) {
                    return `${day}/${month}/${year}`;
                }
            }

            // Format: YYYY-MM-DD (e.g., "2024-01-15")
            match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (match) {
                const year = match[1];
                const month = match[2];
                const day = match[3];
                return `${day}/${month}/${year}`;
            }

            // Format: YYYY/MM/DD (e.g., "2024/01/15")
            match = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
            if (match) {
                const year = match[1];
                const month = match[2];
                const day = match[3];
                return `${day}/${month}/${year}`;
            }

            // Format: DD/MM/YYYY (already in target format)
            match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (match) {
                const day = match[1].padStart(2, '0');
                const month = match[2].padStart(2, '0');
                const year = match[3];
                return `${day}/${month}/${year}`;
            }

            // Format: DDMMMYY (e.g., "15JAN24")
            match = trimmed.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/i);
            if (match) {
                const day = match[1].padStart(2, '0');
                const month = monthMap[match[2].toUpperCase()];
                const year = '20' + match[3];
                if (month) {
                    return `${day}/${month}/${year}`;
                }
            }

            // Format: DD MMM YYYY (with spaces, e.g., "15 JAN 2024")
            match = trimmed.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i);
            if (match) {
                const day = match[1].padStart(2, '0');
                const month = monthMap[match[2].toUpperCase()];
                const year = match[3];
                if (month) {
                    return `${day}/${month}/${year}`;
                }
            }

            // If no pattern matches, try to parse as a standard Date
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            }

            return null;
        } catch (error) {
            console.error('Error converting date:', error);
            return null;
        }
    }

    function convertDates(etd, eta) {
        return {
            etd: convertToDateFormat(etd),
            eta: convertToDateFormat(eta)
        };
    }

    return {
        convertToDateFormat: convertToDateFormat,
        convertDates: convertDates
    };
});