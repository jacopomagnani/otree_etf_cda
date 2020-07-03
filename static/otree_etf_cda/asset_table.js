import { html, PolymerElement } from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';
import '/static/otree-redwood/node_modules/@polymer/polymer/lib/elements/dom-repeat.js';
import '/static/otree-redwood/src/otree-constants/otree-constants.js';

import './currency_scaler.js';

// calc greatest common denominator of two numbers
function gcd(a, b) {
    while (a % b > 0) {
        const tmp = a % b;
        a = b;
        b = tmp;
    }
    return b;
}

class AssetTable extends PolymerElement {

    static get properties() {
        return {
            assetStructure: Object,
            stateProbabilities: Object,
            timeRemaining: Number,
            settledAssetsDict: Object,
            availableAssetsDict: Object,
            settledCash: Number,
            availableCash: Number,
            bids: Array,
            asks: Array,
            assetNames: {
                type: Array,
                computed: '_computeAssetNames(assetStructure)',
            },
            stateNames: {
                type: Array,
                computed: '_computeStateNames(stateProbabilities)',
            },
            requestedAssets: {
                type: Object,
                computed: '_computeRequestedAssets(assetNames, bids)',
            },
            offeredAssets: {
                type: Object,
                computed: '_computeOfferedAssets(assetNames, asks)',
            },
        };
    }

    static get observers() {
        return [
            '_observeBids(bids.splices)',
            '_observeAsks(asks.splices)',
        ];
    }

    static get template() {
        return html`
            <style>
                * {
                    box-sizing: border-box;
                }
                .container {
                    display: flex;
                    border: 1px solid black;
                    height: 100%;
                    padding: 10px;
                }
                .container > div {
                    display: flex;
                    flex-direction: column;
                    margin-right: 10px;
                }

                .table {
                    text-align: center;
                }
                .table > div {
                    display: flex;
                }
                .table span {
                    flex: 1;
                }
                .table .header {
                    border-bottom: 1px solid black;
                    font-weight: bold;
                }

                .asset-table {
                    width: 30em;
                }

                .aligned-text {
                    text-align: center;
                    width: 100%;
                }
                .aligned-text span {
                    display: inline-block;
                    width: 45%;
                }
                .aligned-text span:first-child {
                    text-align: right;
                }
                .aligned-text span:last-child {
                    text-align: left;
                }
            </style>

            <otree-constants
                id="constants"
            ></otree-constants>
            <currency-scaler
                id="currency_scaler"
            ></currency-scaler>

            <div class="container">
                <div>
                    <div class="table asset-table">
                        <div class="header">
                            <span>Asset</span>
                            <span>Available</span>
                            <span>Settled</span>
                            <span>Requested</span>
                            <span>Offered</span>
                        </div>
                        <template is="dom-repeat" items="{{assetNames}}" as="assetName">
                            <div>
                                <span>[[assetName]]</span>
                                <span>[[_getHeldAsset(assetName, availableAssetsDict.*)]]</span>
                                <span>[[_getHeldAsset(assetName, settledAssetsDict.*)]]</span>
                                <span>[[_getTradedAsset(assetName, requestedAssets.*)]]</span>
                                <span>[[_getTradedAsset(assetName, offeredAssets.*)]]</span>
                            </div>
                        </template>
                    </div>
                    <div class="aligned-text">
                        <div>
                            <span>Available Cash: </span>
                            <span>$[[_currencyToHumanReadable(availableCash)]]</span>
                        </div>
                        <div>
                            <span>Settled Cash: </span>
                            <span>$[[_currencyToHumanReadable(settledCash)]]</span>
                        </div>
                        <div>
                            <span>Time Remaining: </span>
                            <span>[[timeRemaining]]</span>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="table" style="width:20em;">
                        <div class="header">
                            <span></span>
                            <template is="dom-repeat" items="{{stateNames}}" as="state">
                                <span>[[state]]</span>
                            </template>
                        </div>
                        <div>
                            <span>Probability</span>
                            <template is="dom-repeat" items="{{stateNames}}" as="state">
                                <span>[[_getProbability(state, stateProbabilities)]]</span>
                            </template>
                        </div>
                        <template is="dom-repeat" items="{{assetNames}}" as="assetName">
                            <div>
                                <span>[[assetName]] Payoff</span>
                                <template is="dom-repeat" items="{{stateNames}}" as="state">
                                    <span>[[_getPayoff(assetName, state, assetStructure)]]</span>
                                </template>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        `;
    }

    ready() {
        super.ready();
        this.pcode = this.$.constants.participantCode;
    }

    _computeAssetNames(assetStructure) {
        return Object.keys(assetStructure);
    }

    _computeStateNames(stateProbabilities) {
        return Object.keys(stateProbabilities);
    }

    _computeRequestedAssets(assetNames, bids) {
        if (!assetNames) return {};

        const requested = Object.fromEntries(assetNames.map(e => [e, 0]));
        if (!bids) return requested;

        for (let order of bids) {
            if (order.pcode == this.pcode) {
                requested[order.asset_name]++;
            }
        }
        return requested;
    }

    _computeOfferedAssets(assetNames, asks) {
        if (!assetNames) return {};

        const offered = Object.fromEntries(assetNames.map(e => [e, 0]));
        if (!asks) return offered;

        for (let order of asks) {
            if (order.pcode == this.pcode) {
                offered[order.asset_name]++;
            }
        }
        return offered;
    }

    _observeBids(bid_changes) {
        if (!bid_changes) return;
        for (let splice of bid_changes.indexSplices) {
            for (let order of splice.removed) {
                if (order.pcode == this.pcode) {
                    this._updateSubproperty('requestedAssets', order.asset_name, -1);
                }
            }
            for (let i = splice.index; i < splice.index + splice.addedCount; i++) {
                const order = splice.object[i];
                if (order.pcode == this.pcode) {
                    this._updateSubproperty('requestedAssets', order.asset_name, 1);
                }
            }
        }
    }

    _observeAsks(ask_changes) {
        if (!ask_changes) return;
        for (let splice of ask_changes.indexSplices) {
            for (let order of splice.removed) {
                if (order.pcode == this.pcode) {
                    this._updateSubproperty('offeredAssets', order.asset_name, -1);
                }
            }
            for (let i = splice.index; i < splice.index + splice.addedCount; i++) {
                const order = splice.object[i];
                if (order.pcode == this.pcode) {
                    this._updateSubproperty('offeredAssets', order.asset_name, 1);
                }
            }
        }
    }

    _updateSubproperty(property, subproperty, amount) {
        const old = this.get([property, subproperty]);
        this.set([property, subproperty], old + amount);
    }

    _getHeldAsset(asset_name, assets) {
        if (!assets.base) return 0;
        return assets.base[asset_name];
    }

    _getTradedAsset(asset_name, assets) {
        const offered = assets.base ? assets.base[asset_name] : 0;
        return offered > 0 ?  offered : '-';
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

    _currencyToHumanReadable(c) {
        return this.$.currency_scaler.toHumanReadable(c);
    }
}

window.customElements.define('asset-table', AssetTable);
