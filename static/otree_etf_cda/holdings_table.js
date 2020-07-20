import { html, PolymerElement } from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';
import '/static/otree-redwood/node_modules/@polymer/polymer/lib/elements/dom-repeat.js';
import '/static/otree-redwood/src/otree-constants/otree-constants.js';

import './currency_scaler.js';

class HoldingsTable extends PolymerElement {

    static get properties() {
        return {
            assetStructure: Object,
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
                    padding: 10px;
                }
                .container > div {
                    display: flex;
                    margin-right: 10px;
                }

                .table {
                    text-align: center;
                    display: flex;
                }
                .table > :first-child {
                    border-right: 1px solid black;
                    text-align: right;
                    font-weight: bold;
                }
                .table > div {
                    display: flex;
                    flex-direction: column;
                }
                .table > div > :first-child {
                    border-bottom: 1px solid black;
                }
                .table span {
                    padding: 0 0.5em 0 0.5em;
                    height: 1.5em;
                }

                .cash-and-time {
                    display: flex;
                }
                .cash-and-time > div {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .cash-and-time > :first-child {
                    text-align: right;
                }
                .cash-and-time > :last-child {
                    margin-left: 0.5em;
                    text-align: left;
                }
                .cash-and-time span {
                    height: 1.5em;
                }
            </style>

            <otree-constants
                id="constants"
            ></otree-constants>
            <currency-scaler
                id="currency_scaler"
            ></currency-scaler>

            <div class="container">
                <div class="table">
                    <div>
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
                <div class="cash-and-time">
                    <div>
                        <span>Settled Cash:</span>
                        <span>Available Cash:</span>
                        <span>Time Remaining:</span>
                    </div>
                    <div>
                        <span>$[[_currencyToHumanReadable(settledCash)]]</span>
                        <span>$[[_currencyToHumanReadable(availableCash)]]</span>
                        <span>[[timeRemaining]]</span>
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

    _currencyToHumanReadable(c) {
        return this.$.currency_scaler.toHumanReadable(c);
    }
}

window.customElements.define('holdings-table', HoldingsTable);
