// 日期时间输入管理器
export function createDateTimeInputManager(popup) {
    return {
        commitDateTimeSelection() {
            if (!popup.activeDateTimeInput || !popup.dateTimePickerElements) {
                popup.closeDateTimePicker();
                return;
            }

            const targetInput = popup.activeDateTimeInput;
            let selected = popup.dateTimePickerState.selectedDate;
            if (!selected) {
                const viewDate = popup.dateTimePickerState.viewDate;
                selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
            }

            const time = this.getSelectedTime();
            selected.setHours(time.hour, time.minute, 0, 0);

            const isoValue = this.toISOWithoutTimezone(selected);
            this.setDateTimeInputElementValue(targetInput, isoValue);

            popup.closeDateTimePicker();
            targetInput?.focus();
        },

        clearDateTimeSelection() {
            if (!popup.activeDateTimeInput) {
                popup.closeDateTimePicker();
                return;
            }
            this.setDateTimeInputElementValue(popup.activeDateTimeInput, '');
            popup.dateTimePickerState.selectedDate = null;
            popup.renderDateTimePickerDays();
            popup.closeDateTimePicker();
        },

        handleTimeSelectionChange() {
            if (!popup.dateTimePickerState.selectedDate) return;
            const time = this.getSelectedTime();
            popup.dateTimePickerState.selectedDate.setHours(time.hour, time.minute, 0, 0);
        },

        getSelectedTime() {
            if (!popup.dateTimePickerElements) {
                return { hour: 0, minute: 0 };
            }
            const hour = parseInt(popup.dateTimePickerElements.hourSelect.value, 10) || 0;
            const minute = parseInt(popup.dateTimePickerElements.minuteSelect.value, 10) || 0;
            return { hour, minute };
        },

        setDateTimeInputElementValue(input, isoValue) {
            if (!input) return;
            if (!isoValue) {
                input.dataset.isoValue = '';
                input.value = '';
                input.title = '';
                return;
            }
            const normalized = this.normalizeISODateTime(isoValue);
            input.dataset.isoValue = normalized;
            const display = this.formatDateTimeForDisplay(normalized, popup.currentLanguage);
            input.value = display;
            input.title = display;
        },

        setDateTimeInputValue(id, isoValue) {
            const input = document.getElementById(id);
            if (!input) return;
            this.setDateTimeInputElementValue(input, isoValue);
        },

        clearDateTimeInputValue(id) {
            const input = document.getElementById(id);
            if (!input) return;
            input.dataset.isoValue = '';
            input.value = '';
            input.title = '';
        },

        getDateTimeInputValue(id) {
            const input = document.getElementById(id);
            if (!input) return '';
            return input.dataset.isoValue || '';
        },

        updateDateTimeInputDisplay(input, language) {
            if (!input) return;
            const isoValue = input.dataset.isoValue || '';
            if (!isoValue) {
                input.value = '';
                input.title = '';
                return;
            }
            const display = this.formatDateTimeForDisplay(isoValue, language);
            input.value = display;
            input.title = display;
        },

        formatDateTimeForDisplay(isoValue, language) {
            if (!isoValue) return '';
            const date = this.parseISODateTime(isoValue);
            if (!date) return isoValue;
            const locale = popup.i18n?.getIntlLocale(language) || 'en-US';
            const formatter = new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            return formatter.format(date);
        },

        normalizeISODateTime(value) {
            if (!value) return '';
            let result = value.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(result)) {
                result = `${result}T00:00:00`;
            } else if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(result)) {
                result = `${result}:00:00`;
            } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(result)) {
                result = `${result}:00`;
            } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(result)) {
                result = `${result.replace(' ', 'T')}:00`;
            }
            return result;
        },

        parseISODateTime(value) {
            if (!value) return null;
            const normalized = this.normalizeISODateTime(value);
            const date = new Date(normalized);
            if (Number.isNaN(date.getTime())) {
                return null;
            }
            return date;
        },

        toISOWithoutTimezone(date) {
            if (!(date instanceof Date)) return '';
            const year = date.getFullYear();
            const month = this.padNumber(date.getMonth() + 1);
            const day = this.padNumber(date.getDate());
            const hour = this.padNumber(date.getHours());
            const minute = this.padNumber(date.getMinutes());
            const second = this.padNumber(date.getSeconds());
            return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        },

        padNumber(value) {
            return String(value).padStart(2, '0');
        }
    };
}

