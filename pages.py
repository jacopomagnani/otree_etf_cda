from ._builtin import Page, WaitPage
from otree_markets.pages import BaseMarketPage
import json

class Market(BaseMarketPage):

    def is_displayed(self):
        return self.round_number <= self.subsession.config.num_rounds
    
    def vars_for_template(self):
        config = self.subsession.config
        state_probabilities = {k: v['prob_weight'] for k, v in config.states.items()}
        return {
            'asset_structure': json.dumps(config.asset_structure),
            'state_probabilities': json.dumps(state_probabilities)
        }
    

class ResultsWaitPage(WaitPage):

    def is_displayed(self):
        return self.round_number <= self.subsession.config.num_rounds
    
    after_all_players_arrive = 'set_payoffs'


class Results(Page):

    def is_displayed(self):
        return self.round_number <= self.subsession.config.num_rounds

    def vars_for_template(self):
        final_cash = self.player.settled_cash / self.subsession.config.currency_scale
        return {
            'final_cash': final_cash,
        }


page_sequence = [Market, ResultsWaitPage, Results]