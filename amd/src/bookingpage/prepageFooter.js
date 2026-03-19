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

/**
 * @module     mod_booking/bookingpage/prepageFooter
 * @copyright  Wunderbyte GmbH
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {continueToNextPage, backToPreviousPage, setBackModalVariables} from 'mod_booking/bookit';
import {reloadAllTables} from 'local_wunderbyte_table/reload';

const SELECTORS = {
    MODALID: 'sbPrePageModal_',
    INLINEID: 'sbPrePageInline_',
    INMODALDIV: ' div.modalMainContent',
    INMODALFOOTER: ' div.prepage-booking-footer',
    FOOTERACTIONLINK: '.prepage-booking-footer a',
    INMODALBUTTON: 'div.in-modal-button',
    BOOKITBUTTON: 'div.booking-button-area',
    STATICBACKDROP: 'div.modal-backdrop',
};

var footerbuttonconfig = {};

/**
 * Extract option id from nearest modal/inline prepage container.
 * @param {HTMLElement} element
 * @returns {integer|null}
 */
function getOptionidFromContainer(element) {
    const container = element.closest('[id^="' + SELECTORS.MODALID + '"] , [id^="' + SELECTORS.INLINEID + '"]');
    if (!container || !container.id) {
        return null;
    }

    const matcher = new RegExp('^' + SELECTORS.MODALID + '(\\d+)_|^' + SELECTORS.INLINEID + '(\\d+)_');
    const match = container.id.match(matcher);

    if (!match) {
        return null;
    }

    const optionid = match[1] || match[2];

    if (!optionid) {
        return null;
    }

    return parseInt(optionid, 10);
}

/**
 * Optional shopping cart re-init for actions that may redirect or close views.
 * @param {boolean} shoppingcartisinstalled
 */
function runShoppingCartPreActions(shoppingcartisinstalled) {
    if (!shoppingcartisinstalled) {
        return;
    }

    import('local_shopping_cart/cart')
        .then(module => {
            const cart = module.default ?? module;
            const oncashier = window.location.href.indexOf('cashier.php');

            if (typeof cart.reinit === 'function') {
                if (oncashier > 0) {
                    const params = new URLSearchParams(window.location.search);
                    const userid = params.get('userid') || -1;
                    cart.reinit(userid);
                } else {
                    cart.reinit();
                }
            }
        })
        .catch(() => {
            // eslint-disable-next-line no-console
            console.log('local_shopping_cart/cart could not be loaded');
        });
}

/**
 * Register delegated footer listeners once on body.
 */
function registerDelegatedFooterListeners() {
    const container = document.querySelector('body');
    if (!container || container.dataset.prepageFooterDelegated) {
        return;
    }

    container.dataset.prepageFooterDelegated = 'true';

    container.addEventListener('hide.bs.modal', event => {
        const modal = event.target.closest('[id^="' + SELECTORS.MODALID + '"]');
        if (!modal) {
            return;
        }

        const optionid = getOptionidFromContainer(modal);
        if (optionid !== null) {
            setBackModalVariables(optionid);
        }
    });

    container.addEventListener('click', event => {
        const element = event.target.closest(SELECTORS.FOOTERACTIONLINK);
        if (!element) {
            return;
        }

        if (element.classList.contains('hidden') || element.dataset.blocked === 'true') {
            return;
        }

        const optionid = getOptionidFromContainer(element);
        if (optionid === null) {
            return;
        }

        const action = element.dataset.action;
        const config = footerbuttonconfig[optionid] ?? {};
        const userid = config.userid;
        const shoppingcartisinstalled = !!config.shoppingcartisinstalled;

        event.preventDefault();
        event.stopImmediatePropagation();

        switch (action) {
            case 'closeinline':
            case 'continuepost':
            case 'checkout':
            case 'closemodal':
                runShoppingCartPreActions(shoppingcartisinstalled);
                break;
            default:
                break;
        }

        switch (action) {
            case 'back':
                backToPreviousPage(optionid, userid);
                break;
            case 'continue':
            case 'continuepost':
                continueToNextPage(optionid, userid);
                break;
            case 'checkout':
                closeModal(optionid);
                if (element.dataset.href) {
                    window.location.href = element.dataset.href;
                }
                break;
            case 'closemodal':
                reloadOnBookingView();
                closeModal(optionid);
                break;
            case 'closeinline':
                reloadOnBookingView();
                closeInline(optionid);
                break;
            default:
                break;
        }
    }, true);
}

/**
 * Add the click listener to a prepage modal button.
 * @param {integer} optionid
 * @param {integer} userid
 * @param {boolean} shoppingcartisinstalled
 */
export function initFooterButtons(optionid, userid, shoppingcartisinstalled) {
    footerbuttonconfig[optionid] = {
        userid,
        shoppingcartisinstalled: !!shoppingcartisinstalled,
    };

    registerDelegatedFooterListeners();
}

/**
 * Close bootstrap modal(s) whose id starts with SELECTORS.MODALID + optionid + '_'
 *
 * @param {int} optionid
 * @param {bool} reloadTables
 */
export function closeModal(optionid, reloadTables = true) {
    const modalSelectorAll = '[id^="' + SELECTORS.MODALID + optionid + '_"]';
    const modalEls = Array.from(document.querySelectorAll(modalSelectorAll));

    modalEls.forEach(modalEl => {
        try {
            const modalCtor = window.bootstrap?.Modal;

            if (!modalCtor || typeof modalCtor.getOrCreateInstance !== 'function') {
                hideModalFallback(modalEl);
                if (reloadTables) {
                    reloadAllTables();
                }
                return;
            }

            const modalInstance = modalCtor.getOrCreateInstance(modalEl);
            const onHidden = () => {
                if (reloadTables) {
                    reloadAllTables();
                }
            };

            modalEl.addEventListener('hidden.bs.modal', onHidden, {once: true});

            // If modal is currently visible, hide via BS5 API.
            if (modalEl.classList.contains('show')) {
                modalInstance.hide();
            } else {
                // Already hidden; mimic completion callback behavior.
                onHidden();
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Error hiding bootstrap modal instance', err);
            hideModalFallback(modalEl);
            if (reloadTables) {
                reloadAllTables();
            }
        }
    });
}

/**
 * DOM fallback to hide a modal element and remove backdrop/body state.
 * Also dispatches bootstrap-like events so other listeners get notified.
 *
 *  @param {HTMLElement} modalEl
 */
export function hideModalFallback(modalEl) {
    if (!modalEl) {
        return;
    }

    // Remove modal "visible" styling.
    modalEl.classList.remove('show');
    modalEl.style.display = 'none';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.removeAttribute('aria-modal');
    modalEl.removeAttribute('role');

    // Remove modal-open class from body (undo scroll lock).
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('overflow');

    // Remove any modal-backdrop elements left behind.
    const backdrops = Array.from(document.querySelectorAll('.modal-backdrop'));
    backdrops.forEach(backdrop => {
        if (backdrop.parentNode) {
            backdrop.parentNode.removeChild(backdrop);
        }
    });

    // Dispatch events similar to Bootstrap so other code will react.
    // Bootstrap uses CustomEvent with namespaced names; we emulate them.
    try {
        const hiddenEvent = new CustomEvent('hidden.bs.modal', {bubbles: true, cancelable: true});
        modalEl.dispatchEvent(hiddenEvent);
    } catch (e) {
        // If CustomEvent is not supported (ancient browsers), ignore.
    }
}

/**
 * Close inline collapse area(s) whose id starts with SELECTORS.INLINEID + optionid + '_'
 *
 * @param {int} optionid
 * @param {bool} reloadTables
 */
export function closeInline(optionid, reloadTables = true) {
    const inlineSelectorAll = '[id^="' + SELECTORS.INLINEID + optionid + '_"]';
    const inlineEls = Array.from(document.querySelectorAll(inlineSelectorAll));

    inlineEls.forEach(inlineEl => {
        const onShown = (e) => {
            inlineEl.removeEventListener('shown.bs.collapse', onShown);
            // eslint-disable-next-line no-console
            console.log('collapse hide after shown', e);

            try {
                let collapseInstance = window.bootstrap?.Collapse.getInstance(inlineEl) ?? null;
                if (!collapseInstance && typeof window.bootstrap !== 'undefined') {
                    collapseInstance = new window.bootstrap.Collapse(inlineEl, { toggle: false });
                }
                if (collapseInstance) {
                    // toggle will hide it if shown
                    collapseInstance.toggle();
                } else {
                    // fallback toggle: toggle class 'show'
                    inlineEl.classList.toggle('show');
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('Error toggling bootstrap collapse instance', err);
            }

            if (reloadTables) {
                reloadAllTables();
            }
        };

        inlineEl.addEventListener('shown.bs.collapse', onShown);

        // Now trigger hide/toggle immediately as well.
        try {
            let collapseInstance = window.bootstrap?.Collapse.getInstance(inlineEl) ?? null;
            if (!collapseInstance && typeof window.bootstrap !== 'undefined') {
                collapseInstance = new window.bootstrap.Collapse(inlineEl, { toggle: false });
            }
            if (collapseInstance) {
                collapseInstance.toggle();
            } else {
                inlineEl.classList.toggle('show');
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Error toggling bootstrap collapse instance (immediate)', err);
        }

        if (reloadTables) {
            reloadAllTables();
        }
    });
}

/**
 * Reload on booking view
 *
 */
function reloadOnBookingView() {
    const onbookondetail = window.location.href.indexOf('optionview.php');

    if (onbookondetail >= 0) {
        window.location.reload();
    }
}
