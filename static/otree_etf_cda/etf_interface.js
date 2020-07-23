import { html, PolymerElement } from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';
import '/static/otree-redwood/node_modules/@polymer/polymer/lib/elements/dom-repeat.js';
import '/static/otree-redwood/src/redwood-period/redwood-period.js';

import '/static/otree_markets/trader_state.js';
import '/static/otree_markets/simple_modal.js';
import '/static/otree_markets/event_log.js';

import './asset_cell.js';
import './holdings_table.js';
import './payoff_table.js';
import './nav_display.js';
import './currency_scaler.js';

class ETFInterface extends PolymerElement {

    static get properties() {
        return {
            assetStructure: Object,
            stateProbabilities: Object,
            currencyDisplayScale: Number,
            timeRemaining: Number,
            bids: Array,
            asks: Array,
            trades: Array,
            settledAssetsDict: Object,
            availableAssetsDict: Object,
            settledCash: Number,
            availableCash: Number,
            assetNames: {
                type: Array,
                computed: '_compute_asset_names(assetStructure)',
            },
        };
    }

    static get template() {
        return html`
            <style>
                * {
                    box-sizing: border-box;
                }
                .full-width {
                    width: 100vw;
                    margin-left: 50%;
                    transform: translateX(-50%);
                }

                .main-container {
                    width: 100%;
                    margin-top: 20px;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-evenly;
                }
                .main-container > div {
                    flex: 0 0 48%;
                    margin-bottom: 20px;
                    height: 30vh;
                }

                .border {
                    border: 1px solid black;
                }

                .flex-row {
                    display: flex;
                    flex-direction: row;
                }
                .flex-row > :not(:first-child) {
                    margin-left: 10px;
                }
                .flex-col {
                    display: flex;
                    flex-direction: column;
                }
                .flex-col > :not(:first-child) {
                    margin-top: 10px;
                }
                .flex-fill {
                    flex: 1;
                    min-height: 0;
                    min-width: 0;
                }

                .time-display {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .time-display span:last-child {
                    display: inline-block;
                    min-width: 3em;
                }

                .info-container {
                    padding: 0 1.33% 0 1.33%;
                    width: 100%;
                    height: 30vh;
                }
                .nav-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
            </style>

            <simple-modal
                id="modal"
            ></simple-modal>
            <trader-state
                id="trader_state"
                bids="{{bids}}"
                asks="{{asks}}"
                trades="{{trades}}"
                settled-assets-dict="{{settledAssetsDict}}"
                available-assets-dict="{{availableAssetsDict}}"
                settled-cash="{{settledCash}}"
                available-cash="{{availableCash}}"
                time-remaining="{{timeRemaining}}"
                on-confirm-trade="_confirm_trade"
                on-confirm-cancel="_confirm_cancel"
                on-error="_handle_error"
            ></trader-state>
            <currency-scaler
                id="currency_scaler"
            ></currency-scaler>

            <div class="full-width">
                <div class="main-container">
                    <template is="dom-repeat" items="{{assetNames}}">
                        <div>
                            <asset-cell
                                asset-name="[[item]]"
                                bids="[[bids]]"
                                asks="[[asks]]"
                                trades="[[trades]]"
                                on-order-entered="_order_entered"
                                on-order-canceled="_order_canceled"
                                on-order-accepted="_order_accepted"
                            ></asset-cell>
                        </div>
                    </template>
                </div>
                <div class="info-container flex-row">
                    <div class="flex-col flex-fill">
                        <div class="flex-row">
                            <div class="border">
                                <holdings-table
                                    asset-structure="[[assetStructure]]"
                                    settled-assets-dict="[[settledAssetsDict]]"
                                    available-assets-dict="[[availableAssetsDict]]"
                                    settled-cash="[[settledCash]]"
                                    available-cash="[[availableCash]]"
                                    bids="[[bids]]"
                                    asks="[[asks]]"
                                ></holdings-table>
                            </div>
                            <div class="border flex-fill nav-container">
                                <template is="dom-repeat" items="{{assetNames}}" as="assetName" filter="_filter_etf_names">
                                    <nav-display
                                        asset-structure="[[assetStructure]]"
                                        etf-asset-name="[[assetName]]"
                                        trades='[[trades]]'
                                    ></nav-display>
                                </template>
                            </div>
                            <div class="border flex-fill time-display">
                                <div>
                                    <span>Time Remaining: </span>
                                    <span>[[ _format_time_remaining(timeRemaining) ]]</span>
                                </div>
                            </div>
                        </div>
                        <div class="border flex-fill">
                            <event-log
                                id="log"
                                max-entries=100
                            ></event-log>
                        </div>
                    </div>
                    <div class="border">
                        <payoff-table
                            asset-structure="[[assetStructure]]"
                            state-probabilities="[[stateProbabilities]]"
                            asset-names="[[assetNames]]"
                        ></payoff-table>
                    </div>
                </div>
            </div>
        `;
    }

    _compute_asset_names(assetStructure) {
        return Object.keys(assetStructure);
    }

    _filter_etf_names(assetName) {
        return this.get(['assetStructure', assetName]).is_etf;
    }

    _format_time_remaining(timeRemaining) {
        if (typeof timeRemaining != "number") return '';
        const minutes = '' + Math.floor(timeRemaining / 60)
        let seconds = '' + timeRemaining % 60;
        seconds = seconds.length == 1 ? '0' + seconds : seconds;
        return `${minutes}:${seconds}`;
    }

    // triggered when this player enters an order
    // sends an order enter message to the backend
    _order_entered(event) {
        const order = event.detail;
        if (isNaN(order.price)) {
            this.$.log.info('Invalid order entered');
            return;
        }
        this.$.trader_state.enter_order(order.price, 1, order.is_bid, order.asset_name);
    }

    // triggered when this player cancels an order
    // sends an order cancel message to the backend
    _order_canceled(event) {
        const order = event.detail;

        this.$.modal.modal_text = 'Are you sure you want to remove this order?';
        this.$.modal.on_close_callback = (accepted) => {
            if (!accepted)
                return;

            this.$.trader_state.cancel_order(order)
        };
        this.$.modal.show();
    }

    _order_accepted(event) {
        const order = event.detail;
        if (order.pcode == this.pcode)
            return;

        const price_scaled = this.$.currency_scaler.toHumanReadable(order.price);
        this.$.modal.modal_text = `Do you want to ${order.is_bid ? 'sell' : 'buy'} asset ${order.asset_name} for $${price_scaled}?`
        this.$.modal.on_close_callback = (accepted) => {
            if (!accepted)
                return;

            this.$.trader_state.accept_order(order);
        };
        this.$.modal.show();
    }

    // react to the backend confirming that a trade occurred
    _confirm_trade(event) {
        const trade = event.detail;
        // since we're doing unit volume, there can only ever be one making order
        const all_orders = [trade.making_orders[0], trade.taking_order];
        for (let order of all_orders) {
            if (order.pcode == this.pcode) {
                const price_scaled = this.$.currency_scaler.toHumanReadable(trade.making_orders[0].price);
                this.$.log.info(`You ${order.is_bid ? 'bought' : 'sold'} asset ${order.asset_name} for $${price_scaled}`);
            }
        }
    }

    // react to the backend confirming that an order was canceled
    _confirm_cancel(event) {
        const order = event.detail;
        if (order.pcode == this.pcode) {
            this.$.log.info(`You canceled your ${msg.is_bid ? 'bid' : 'ask'}`);
        }
    }

    // handle an error sent from the backend
    _handle_error(event) {
        const message = event.detail;
        this.$.log.info(message);
    }
}

window.customElements.define('etf-interface', ETFInterface);
