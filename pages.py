from ._builtin import Page, WaitPage
from otree_markets.pages import BaseMarketPage

class Market(BaseMarketPage):

    def is_displayed(self):
        return self.round_number <= self.subsession.config.num_rounds
    

class ResultsWaitPage(WaitPage):

    def is_displayed(self):
        return self.round_number <= self.subsession.config.num_rounds
    
    after_all_players_arrive = 'set_payoffs'


class Results(Page):

    def is_displayed(self):
        return self.round_number <= self.subsession.config.num_rounds


page_sequence = [Market, ResultsWaitPage, Results]