import { PolymerElement } from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';

/*
    this component handles frontend scaling of currency values. the 'factor' property only has to be set on one 
    copy of this component (in the template) and all other copies of the component will automatically use the same
    scale factor.

    toHumanReadable divides its input by the scale factor, converting from integer prices to decimals.
    fromHumanReadable multiplies its input by the scale factor, converting from decimal prices to integers (rounding to make sure that
        the output is actually an integer)
*/

var _factor = 1;

class CurrencyScaler extends PolymerElement {

    static get properties() {
        return {
            factor: {
                type: Number,
                observer: '_setFactor',
            },
        }
    }

    _setFactor(factor) {
        _factor = factor;
    }

    toHumanReadable(a) {
        return a / _factor;
    }

    fromHumanReadable(a) {
        return Math.round(a * _factor);
    }
}

window.customElements.define('currency-scaler', CurrencyScaler);