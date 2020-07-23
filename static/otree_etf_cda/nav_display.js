import { html, PolymerElement } from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';

import './currency_scaler.js';

class NAVDisplay extends PolymerElement {

    static get properties() {
        return {
            assetStructure: Object,
            etfAssetName: String,
            etfComposition: {
                type: Object,
                computed: 'computeETFComposition(assetStructure, etfAssetName)',
            },
            trades: Array,
            mostRecentTrades: {
                type: Object,
                computed: 'computeRecentTrades(trades)',
            },
            nav: {
                type: String,
                value: '-',
                computed: 'computeNAV(etfComposition, mostRecentTrades.*)',
            },
            etfCompositionDisplayString: {
                type: String,
                computed: 'computeETFCompositionDisplayString(etfComposition, etfAssetName)',
            },
        };
    }

    static get observers() {
        return [
            'updateRecentTrades(trades.splices)',
        ];
    }

    static get template() {
        return html`
            <style>
                .container {
                    text-align: center;
                }

                .nav {
                    display: inline-block;
                    min-width: 4em;
                    text-align: initial;
                }
            </style>
            
            <currency-scaler
                id="currency_scaler"
            ></currency-scaler>

            <div class="container">
                <div>
                    <span>[[etfAssetName]] Net Asset Value: </span>
                    <span class="nav">[[nav]]</span>
                </div>
                <div>
                    <span>(</span>
                    <span>[[etfCompositionDisplayString]]</span>
                    <span>)</span>
                </div>
            </div>
        `;
    }

    computeRecentTrades(trades) {
        const recentTrades = {}
        for (const trade of trades) {
            const assetName = trade.asset_name;
            if (!(assetName in recentTrades) || recentTrades[assetName].timestamp < trade.timestamp)
                recentTrades[assetName] = trade;
        }
        return recentTrades;
    }

    updateRecentTrades(changeRecord) {
        if (!changeRecord) return;
        
        const recentTrades = this.get('mostRecentTrades');
        for (const splice of changeRecord.indexSplices) {
            for (let i = splice.index; i < splice.index + splice.addedCount; i++) {
                const trade = splice.object[i];
                const assetName = trade.asset_name;
                if (!(assetName in recentTrades) || recentTrades[assetName].timestamp < trade.timestamp)
                    this.set(['mostRecentTrades', assetName], trade);
            }
        }
    }

    computeETFComposition(assetStructure, etfAssetName) {
        return assetStructure[etfAssetName].etf_weights;
    }

    computeNAV(etfComposition, recentTradesChange) {
        if (!etfComposition || !recentTradesChange.base) return;
        const recentTrades = recentTradesChange.base;
        let nav = 0;
        for (const [componentAsset, weight] of Object.entries(etfComposition)) {
            if (weight == 0) continue;
            if ( !(componentAsset in recentTrades) ) return '-';
            nav += recentTrades[componentAsset].making_orders[0].price * weight;
        }
        return '$' + this.$.currency_scaler.toHumanReadable(nav);
    }

    computeETFCompositionDisplayString(etfComposition, etfAssetName) {
        return etfAssetName + ' = ' + Object.entries(etfComposition).map(([c, w]) => `${w}${c}`).join(' + ');
    }

}

window.customElements.define('nav-display', NAVDisplay);