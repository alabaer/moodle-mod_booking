// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/*
 * @package    mod_booking
 * @copyright  Wunderbyte GmbH <info@wunderbyte.at>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import DynamicForm from 'core_form/dynamicform';
import {showNotification} from 'mod_booking/notifications';
import {get_string as getString} from 'core/str';
import Templates from 'core/templates';

const SELECTORS = {
    FORMCONTAINER: '#mbo_csv_import_form',
    PREVIEWCONTAINER: '#mbo_csv_import_preview',
    PREVIEWMODE: '[name="previewmode"]',
    PREVIEWBUTTON: '[name="previewbutton"]',
    SUBMITBUTTON: '[name="submitbutton"]',
};

/**
 * Render post-preview actions so users can either go back or submit directly.
 *
 * @param {HTMLElement} formContainer
 * @param {HTMLElement} previewContainer
 */
const renderPreviewActions = (formContainer, previewContainer) => {
    const submitButton = formContainer.querySelector(SELECTORS.SUBMITBUTTON);
    const previewButton = formContainer.querySelector(SELECTORS.PREVIEWBUTTON);

    if (!submitButton) {
        return;
    }

    const actions = document.createElement('div');
    actions.className = 'd-flex gap-2 mt-3 mb-4';
    actions.id = 'mbo_csv_preview_actions';

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'btn btn-secondary';
    backButton.textContent = previewButton ? previewButton.value : 'Back';
    backButton.addEventListener('click', () => {
        previewContainer.innerHTML = '';
        if (previewButton) {
            previewButton.focus();
        } else {
            submitButton.focus();
        }
    });

    const confirmSubmitButton = document.createElement('button');
    confirmSubmitButton.type = 'button';
    confirmSubmitButton.className = 'btn btn-primary';
    confirmSubmitButton.textContent = submitButton.value;
    confirmSubmitButton.addEventListener('click', () => {
        submitButton.click();
    });

    actions.appendChild(backButton);
    actions.appendChild(confirmSubmitButton);
    previewContainer.appendChild(actions);
};

/**
 * Build a template context object from a preview API response.
 *
 * @param {object} response
 * @returns {object}
 */
const buildPreviewContext = (response) => {
    const columns = (response.columns || []).map(col => ({name: col}));
    const validrows = (response.validrows || []).map(row => ({
        cells: (response.columns || []).map(col => ({value: row[col] !== undefined ? row[col] : ''}))
    }));
    const skippedrows = (response.skippedrows || []).map(row => ({
        cells: (response.columns || []).map(col => ({
            value: row.data && row.data[col] !== undefined ? row.data[col] : ''
        })),
        reason: row.reason || ''
    }));
    return {
        columns,
        validcount: validrows.length,
        skippedcount: skippedrows.length,
        validrows,
        skippedrows,
        hasvalidrows: validrows.length > 0,
        hasskippedrows: skippedrows.length > 0,
    };
};

/**
 * Add event listener to form.
 */
export const init = () => {

    const formContainer = document.querySelector(SELECTORS.FORMCONTAINER);

    // Create a preview container after the form container if it does not already exist.
    let previewContainer = document.querySelector(SELECTORS.PREVIEWCONTAINER);
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'mbo_csv_import_preview';
        formContainer.insertAdjacentElement('afterend', previewContainer);
    }

    // Initialize the form - pass the container element and the form class name.
    const dynamicForm = new DynamicForm(formContainer,
        'mod_booking\\form\\csvimport'
    );

    // Use event delegation to set previewmode before the dynamic form serialises the data.
    formContainer.addEventListener('click', (e) => {
        const previewField = formContainer.querySelector(SELECTORS.PREVIEWMODE);
        if (!previewField) {
            return;
        }
        if (e.target.matches(SELECTORS.PREVIEWBUTTON)) {
            previewField.value = '1';
        } else if (e.target.matches(SELECTORS.SUBMITBUTTON)) {
            previewField.value = '0';
        }
    }, true); // Capture phase so it fires before the form submit handler.

    // If a user imports an element, trigger treatment of input.
    dynamicForm.addEventListener(dynamicForm.events.FORM_SUBMITTED, (e) => {

        const response = e.detail;

        // Always reset the previewmode field so subsequent imports work normally.
        const previewField = formContainer.querySelector(SELECTORS.PREVIEWMODE);
        if (previewField) {
            previewField.value = '0';
        }

        if (response.preview) {
            // Preview mode: render the preview table without reloading the form.
            const errors = response.errors;
            if (errors && errors.generalerrors) {
                errors.generalerrors.forEach(
                    (error) => showNotification(error, 'danger', false));
            }

            const templateContext = buildPreviewContext(response);
            Templates.renderForPromise('mod_booking/importer/csvpreview', templateContext).then(({html, js}) => {
                Templates.replaceNodeContents(previewContainer, html, js);
                renderPreviewActions(formContainer, previewContainer);
                previewContainer.scrollIntoView({behavior: 'smooth', block: 'start'});
                return;
            }).catch(err => {
                // eslint-disable-next-line no-console
                console.error(err);
            });

        } else {
            // Normal import: clear any previous preview, reload form, show result notifications.
            previewContainer.innerHTML = '';

            const errors = response.errors;

            dynamicForm.load({
                id: response.id,
                cmid: response.cmid,
                settingscallback: response.settingscallback,
                previewcallback: response.previewcallback,
            });

            // Display errors notifications if defined.
            if (errors != [] && errors !== undefined) {

                // eslint-disable-next-line no-console
                console.log("errors.warnings: ", errors.warnings);

                if (errors.warnings !== undefined && errors.warnings != []) {
                    errors.warnings.forEach(
                        (warning) => showNotification(warning, "warning", false));
                }
                if (errors.lineerrors !== undefined) {
                    errors.lineerrors.forEach(
                        (error) => showNotification(error, "danger", false));
                }
                if (errors.generalerrors !== undefined) {
                    errors.generalerrors.forEach(
                        (error) => showNotification(error, "danger", false));
                }
            }

            // Display general success status.
            if (response.success == 1) {

                getString('importsuccess', 'mod_booking', response.numberofsuccessfullyupdatedrecords).then(message => {
                    showNotification(message, 'success', false);
                    return;
                }).catch(err => {
                    // eslint-disable-next-line no-console
                    console.error(err);
                });
                if (response.callbackresponse !== null && response.callbackresponse !== undefined
                        && response.callbackresponse.message !== null) {
                    showNotification(response.callbackresponse.message, 'success', false);
                }
            } else {
                getString('importfailed', 'mod_booking').then(message => {
                    showNotification(message, 'danger', false);
                    return;
                }).catch(err => {
                    // eslint-disable-next-line no-console
                    console.error(err);
                });
            }
        }
    });

    // Cancel button triggers reload of empty form.
    dynamicForm.addEventListener(dynamicForm.events.FORM_CANCELLED, (e) => {
        e.preventDefault();
        dynamicForm.load({});
    });

};