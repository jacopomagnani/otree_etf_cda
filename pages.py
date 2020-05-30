from otree_markets.pages import BaseMarketPage
import json

class Market(BaseMarketPage):

    def vars_for_template(self):
        return {
            'etf_composition': json.dumps(self.subsession.etf_composition())
        }

    def is_displayed(self):
        return self.round_number <= self.subsession.config.num_rounds

page_sequence = [Market]
