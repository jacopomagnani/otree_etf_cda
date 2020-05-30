import {TraderState} from '/static/otree_markets/trader_state.js';

class TraderStateWithETF extends TraderState {
    static get is() { return 'trader-state-etf'; }

    static get properties() {
        return {
            etfAssetName: String,
            etfComposition: Object,
        };
    }

    update_holdings_trade(price, volume, is_bid, asset_name) {
        // if this isn't for the etf asset, just use the regular update
        if (asset_name != this.etfAssetName)
            return super.update_holdings_trade(price, volume, is_bid, asset_name);

        if (is_bid) {
            // since this is for the etf, we need to update each asset according to the etf composition
            for (const [asset, amount] of Object.entries(this.etfComposition)) {
                this._update_subproperty('availableAssetsDict', asset, volume * amount);
                this._update_subproperty('settledAssetsDict', asset, volume * amount);
            }

            this.availableCash -= price * volume;
            this.settledCash -= price * volume;
        }
        else {
            for (const [asset, amount] of Object.entries(this.etfComposition)) {
                this._update_subproperty('availableAssetsDict', asset, -volume * amount);
                this._update_subproperty('settledAssetsDict', asset, -volume * amount);
            }

            this.availableCash += price * volume;
            this.settledCash += price * volume;
        }
    }

    update_holdings_available(order, removed) {
        // if the order is a bid or was for a non-etf asset, just use the regular update method
        if (order.is_bid || order.asset_name != this.etfAssetName)
            return super.update_holdings_available(order, removed);
        
        // if this is an ask for the etf asset, we need to update each asset according to the etf composition
        const sign = removed ? 1 : -1;
        for (const [asset, amount] of Object.entries(this.etfComposition)) {
            this._update_subproperty('availableAssetsDict', asset, order.volume * amount * sign)
        }
    }
}

window.customElements.define(TraderStateWithETF.is, TraderStateWithETF);
