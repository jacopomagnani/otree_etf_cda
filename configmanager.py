from typing import Dict
import csv
import yaml
import json
import os.path
from collections import namedtuple

# use a namedtuple to make the cache entries a little more clear
CacheEntry = namedtuple('CacheEntry', ['entry', 'mtime'])

class ETFConfig():
    '''this class manages configurations for the etf market experiment
    
    it takes two types of config files: a "session config" CSV which defines the configuration for an entire session and a "round config"
    YAML file which defines the configuration for a single round.
    
    the session config CSV only has one required column: "round_config". this column gives the name of the round config file used to configure that round.
    optionally, other columns can be added to override values set in the round config. for example, adding a "period_length" column in the session config
    and giving it a value in some row overrides the length of the period for that one round. this is convenient as it means that you don't have to rewrite
    round configs for rounds with only a few simple differences between them. just a warning though, this probably won't work for the asset_structure or state
    config fields.

    the structure of the round config YAML files is complex. for a reference of all the required fields, just look at demo.yaml in configs/round_configs.
    '''

    SESSION_CONFIG_PATH = 'otree_etf_cda/configs/session_configs/'
    ROUND_CONFIG_PATH = 'otree_etf_cda/configs/round_configs/'

    # these dicts store serialized config data so we don't have to hit the disk every time
    # we want a config field. they map a config name to a tuple containing the config entry
    # and the time that config was last modified.
    # the modified time is used so that if a config is changed while oTree is running, the cache
    # is cleared and the new version of the config is retreived.
    session_config_cache: Dict[str, CacheEntry] = {}
    round_config_cache:   Dict[str, CacheEntry] = {}
    
    @classmethod
    def _get_session_config(cls, session_config_name):
        path = cls.SESSION_CONFIG_PATH + session_config_name
        try:
            mtime = os.path.getmtime(path)
        except OSError as e:
            raise ValueError(f'session config "{session_config_name}" not found"') from e

        if session_config_name not in cls.session_config_cache or cls.session_config_cache[session_config_name].mtime < mtime:
            with open(path) as infile:
                entry = list(csv.DictReader(infile))
            cls.session_config_cache[session_config_name] = CacheEntry(entry=entry, mtime=mtime)
        return cls.session_config_cache[session_config_name].entry
    
    @classmethod
    def _get_round_config(cls, round_config_name):
        path = cls.ROUND_CONFIG_PATH + round_config_name
        try:
            mtime = os.path.getmtime(path)
        except OSError as e:
            raise ValueError(f'round config "{round_config_name}" not found"') from e

        if round_config_name not in cls.round_config_cache or cls.round_config_cache[round_config_name].mtime < mtime:
            with open(path) as infile:
                entry = yaml.load(infile)
            cls.round_config_cache[round_config_name] = CacheEntry(entry=entry, mtime=mtime)
        return cls.round_config_cache[round_config_name].entry
    
    @staticmethod
    def _add_session_config_fields(session_config_row, round_config):
        '''add keys from this row of the session config so that some params
        can be changed without updating the round config. this might be a bad
        idea, but I think it'd be convenient to be able to easily change stuff like period
        length here'''
        excluded_keys = ('round_config',)
        cleaned_row = {
            key: json.loads(value)
            for key, value in session_config_row.items()
            if key not in excluded_keys and value != ''
        }
        round_config.update(cleaned_row)

    @classmethod
    def get(cls, session_config_name, round_number):
        '''get an ETFConfig object given a specific session config name and round number'''
        session_config = cls._get_session_config(session_config_name)
        num_rounds = len(session_config)
        if round_number > num_rounds:
            return cls(num_rounds, None)
        session_config_row = session_config[round_number-1]
        round_config_name = session_config_row['round_config']
        round_config = cls._get_round_config(round_config_name)
        cls._add_session_config_fields(session_config_row, round_config)
        return cls(num_rounds, round_config)

    def __init__(self, num_rounds, round_data):
        self.num_rounds = num_rounds
        self.round_data = round_data
        
    def __getattr__(self, field):
        if field not in self.round_data:
            raise ValueError(f'invalid round config: field "{field}" is missing')
        return self.round_data[field]
