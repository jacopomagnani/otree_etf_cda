from django.db import models
from jsonfield import JSONField

def pcode_is_bot(pcode):
    '''this method returns true if its argument is a pcode associated with a bot'''
    return pcode.startswith('bot-')

class BaseBot(models.Model):
    '''this class is the base class for all automated trading bots

    the three methods on_order_entered, on_trade, and on_order_canceled are called for each bot
    when an order is entered, transacted or canceled respectively. the bot can then interact with
    the market through self.group, either by calling Group's message handlers, or by directly manipulating
    the exchange with Group.exchanges
    '''

    group = models.ForeignKey('Group', related_name='bots', on_delete=models.CASCADE)
    
    class Meta():
        abstract = True
    
    @property
    def pcode(self):
        return 'bot-{}-{}'.format(type(self).__name__, self.id)
    
    def on_order_entered(self, order_dict):
        pass

    def on_trade(self, timestamp, asset_name, taking_order, making_orders):
        pass

    def on_order_canceled(self, order_dict):
        pass


class ETFMakerBot(BaseBot):
    '''this bot operates as a market maker in an etf
    
    it watches the markets for the assets which make up the etf, entering a bid/ask to the etf
    that's the sum of the Nth best bids/asks in each market where N is the weight of that asset
    in the etf. the parameter 'profit' offsets these etf bids/asks to create a profit margin for the bot.

    if a player buys one of these etf bids/asks, the bot then goes to the component asset markets and
    enters market orders to buy all of the orders it used to calculate its position.
    '''

    etf_name = models.CharField(max_length=32)
    '''the asset name of the etf this bot operates in'''
    etf_composition = JSONField()
    '''a dict mapping names of component assets of the etf to that asset's weight'''

    profit = models.IntegerField()

    active_bid_id = models.IntegerField(null=True)
    '''the id of this bot's currently active bid in the etf or None if no bid is currently entered'''
    active_ask_id = models.IntegerField(null=True)
    '''the id of this bot's currently active ask in the etf or None if no ask is currently entered'''

    bid_position = models.IntegerField(null=True)
    '''the price of the bot's current bid in the etf (not including profit) or None if no bid is currently entered'''
    ask_position = models.IntegerField(null=True)
    '''the price of the bot's current ask in the etf (not including profit) or None if no ask is currently entered'''

    def on_order_entered(self, order_dict):
        if order_dict['pcode'] == self.pcode:
            if order_dict['is_bid']:
                self.active_bid_id = order_dict['order_id']
            else:
                self.active_ask_id = order_dict['order_id']
            self.save()
            return
        elif order_dict['asset_name'] not in self.etf_composition:
            return

        if order_dict['is_bid']:
            self.reevaluate_bid_position()
        else:
            self.reevaluate_ask_position()

    def on_trade(self, timestamp, asset_name, taking_order, making_orders):
        if taking_order['pcode'] == self.pcode:
            return

        my_making_orders = [o for o in making_orders if o['pcode'] == self.pcode]
        if len(my_making_orders) != 0:
            assert len(my_making_orders) == 1, 'bot had more than one simultaneous transaction'
            assert asset_name == self.etf_name, 'bot was maker in non-etf market'

            is_bid = my_making_orders[0]['is_bid']
            if is_bid:
                self.active_bid_id = None
                self.bid_position = None
            else:
                self.active_ask_id = None
                self.ask_position = None
            self.save()

            for component_asset, weight in self.etf_composition.items():
                exchange = self.group.exchanges.get(asset_name=component_asset)
                for _ in range(weight):
                    exchange.enter_market_order(1, not is_bid, self.pcode)
            
        self.reevaluate_bid_position()
        self.reevaluate_ask_position()

    def on_order_canceled(self, order_dict):
        if order_dict['pcode'] == self.pcode:
            if order_dict['is_bid']:
                self.active_bid_id = None
            else:
                self.active_ask_id = None
            self.save()
            return
        elif order_dict['asset_name'] not in self.etf_composition:
            return

        if order_dict['is_bid']:
            self.reevaluate_bid_position()
        else:
            self.reevaluate_ask_position()
    
    def cancel_active_bid(self):
        '''cancel the currently active bid. does nothing if there is no active bid'''
        if self.active_bid_id is None:
            return
        exchange = self.group.exchanges.get(asset_name=self.etf_name)
        exchange.cancel_order(is_bid=True, order_id=self.active_bid_id)
        self.active_bid_id = None

    def reevaluate_bid_position(self):
        '''calculate the current bid position for this bot, entering an order if the position has changed'''
        bid_position = 0
        for component_asset, weight in self.etf_composition.items():
            exchange = self.group.exchanges.get(asset_name=component_asset)
            best_bids = exchange._get_bids_qset()[:weight]
            if len(best_bids) < weight:
                # if there aren't enough bids, just remove the currently active bid (if any) and exit
                self.bid_position = None
                self.cancel_active_bid()
                self.save()
                return
            bid_position += sum(o.price for o in best_bids)

        if self.bid_position is None or bid_position != self.bid_position:
            self.cancel_active_bid()
            self.bid_position = bid_position
            self.save()
            exchange = self.group.exchanges.get(asset_name=self.etf_name)
            exchange.enter_order(
                price = bid_position - self.profit,
                volume = 1,
                is_bid = True,
                pcode = self.pcode
            )

    def cancel_active_ask(self):
        '''cancel the currently active ask. does nothing if there is no active ask'''
        if self.active_ask_id is None:
            return
        exchange = self.group.exchanges.get(asset_name=self.etf_name)
        exchange.cancel_order(is_bid=False, order_id=self.active_ask_id)
        self.active_ask_id = None

    def reevaluate_ask_position(self):
        '''calculate the current ask position for this bot, entering an order if the position has changed'''
        ask_position = 0
        for component_asset, weight in self.etf_composition.items():
            exchange = self.group.exchanges.get(asset_name=component_asset)
            best_asks = exchange._get_asks_qset()[:weight]
            if len(best_asks) < weight:
                # if there aren't enough asks, just remove the currently active ask (if any) and exit
                self.ask_position = None
                self.cancel_active_ask()
                self.save()
                return
            ask_position += sum(o.price for o in best_asks)

        if self.ask_position is None or ask_position != self.ask_position:
            self.cancel_active_ask()
            self.ask_position = ask_position
            self.save()
            exchange = self.group.exchanges.get(asset_name=self.etf_name)
            exchange.enter_order(
                price = ask_position + self.profit,
                volume = 1,
                is_bid = False,
                pcode = self.pcode
            )