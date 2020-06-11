from otree.api import (
    models, BaseConstants
)
import random
from otree_markets import models as markets_models
from .configmanager import ETFConfig


class Constants(BaseConstants):
    name_in_url = 'otree_etf_cda'
    players_per_group = None
    num_rounds = 99 


class Subsession(markets_models.Subsession):

    @property
    def config(self):
        config_name = self.session.config['config_file']
        return ETFConfig.get(config_name, self.round_number)
    
    def asset_names(self):
        return list(self.config.asset_structure.keys())
    
    def allow_short(self):
        return self.config.allow_short
    
    def do_grouping(self):
        group_matrix = []
        players = self.get_players()
        ppg = self.config.players_per_group
        for i in range(0, len(players), ppg):
            group_matrix.append(players[i:i+ppg])
        self.set_group_matrix(group_matrix)

    def creating_session(self):
        if self.round_number > self.config.num_rounds:
            return
        self.do_grouping()
        return super().creating_session()


class Group(markets_models.Group):

    realized_state = models.StringField()

    def period_length(self):
        return self.subsession.config.period_length
    
    def do_realized_state_draw(self):
        states = self.subsession.config.states
        state_names = list(states.keys())
        weights = [e['prob_weight'] for e in states.values()]
        self.realized_state = random.choices(state_names, weights)[0]
    
    def set_payoffs(self):
        self.do_realized_state_draw()
        for player in self.get_players():
            player.set_payoff()


class Player(markets_models.Player):

    def asset_endowment(self):
        endowments = {}
        for asset_name, structure in self.subsession.config.asset_structure.items():
            endowment = structure['endowment']
            if isinstance(endowment, list):
                endowments[asset_name] = int(endowment[self.id_in_group-1])
            else:
                endowments[asset_name] = int(endowment)
        return endowments
    
    def cash_endowment(self):
        endowment = self.subsession.config.cash_endowment
        if isinstance(endowment, list):
            return int(endowment[self.id_in_group-1])
        else:
            return int(endowment)
    
    def set_payoff(self):
        realized_state = self.group.realized_state
        asset_structure = self.subsession.config.asset_structure
        for asset_name, structure in asset_structure.items():
            if structure['is_etf']:
                asset_value = 0
                for component_asset, weight in structure['etf_weights'].items():
                    asset_value += asset_structure[component_asset]['payoffs'][realized_state] * weight
                self.payoff += asset_value * self.settled_assets[asset_name]
            else:
                asset_value = structure['payoffs'][realized_state]
                self.payoff += asset_value * self.settled_assets[asset_name]
