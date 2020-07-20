import { html, PolymerElement } from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';
import '/static/otree-redwood/node_modules/@polymer/polymer/lib/elements/dom-repeat.js';

// calc greatest common denominator of two numbers
function gcd(a, b) {
    while (a % b > 0) {
        const tmp = a % b;
        a = b;
        b = tmp;
    }
    return b;
}

class PayoffTable extends PolymerElement {

    static get properties() {
        return {
            assetStructure: Object,
            stateProbabilities: Object,
            assetNames: Array,
            stateNames: {
                type: Array,
                computed: '_computeStateNames(stateProbabilities)',
            },
        };
    }

    static get template() {
        return html`
            <style>
                .container {
                    padding: 10px;
                }
                .table {
                    text-align: center;
                    display: flex;
                }
                .table > div {
                    display: flex;
                    flex-direction: column;
                }
                .table > :first-child {
                    border-right: 1px solid black;
                    text-align: right;
                    font-weight: bold;
                }
                .table > div > :first-child{
                    border-bottom: 1px solid black;
                }
                .table span {
                    padding: 0 0.5em 0 0.5em;
                    height: 1.5em;
                }
            </style>

            <div class="container">
                <div class="table">
                    <div>
                        <span>State</span>
                        <span>Probability</span>
                        <template is="dom-repeat" items="{{assetNames}}" as="assetName">
                            <span>[[assetName]] Payoff</span>
                        </template>
                    </div>
                    <template is="dom-repeat" items="{{stateNames}}" as="stateName">
                        <div>
                            <span>[[stateName]]</span>
                            <span>[[_getProbability(stateName, stateProbabilities)]]</span>
                            <template is="dom-repeat" items="{{assetNames}}" as="assetName">
                                <span>[[_getPayoff(assetName, stateName, assetStructure)]]</span>
                            </template>
                        </div>
                    </template>
                </div>
            </div>
            
        `;
    }

    _computeStateNames(stateProbabilities) {
        return Object.keys(stateProbabilities);
    }

    _getProbability(state, stateProbabilities) {
        if (!stateProbabilities)
            return '';
        let num = stateProbabilities[state];
        if (num == 0)
            return '0';
        let denom = Object.values(stateProbabilities).reduce((a, b) => a + b, 0);
        if (num == denom)
            return '1';
        const divisor = gcd(num, denom);
        num /= divisor;
        denom /= divisor;
        return `${num}/${denom}`;
    }

    _getPayoff(assetName, state, assetStructure) {
        if (!assetStructure)
            return;
        const structure = assetStructure[assetName];
        if (structure.is_etf) {
            let payoff = 0;
            for (const [componentAsset, weight] of Object.entries(structure.etf_weights)) {
                payoff += assetStructure[componentAsset].payoffs[state] * weight;
            }
            return payoff;
        }
        else {
            return assetStructure[assetName].payoffs[state];
        }
    }

}

window.customElements.define('payoff-table', PayoffTable);