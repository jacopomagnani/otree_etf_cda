# otree_etf_cda
Multiple asset market with an ETF, built using oTree Markets

This repo is an oTree implementation of a multiple-asset CDA market with an ETF and arbitrage bots. All of its market functionality is provided by [oTree Markets](https://github.com/Leeps-Lab/otree_markets), it simply adds an ETF, bots, and modified frontend to the multiple-asset CDA environment from oTree markets.

## Installation

The provided instructions below are for Linux or macOS installation. Some commands may be slightly different for windows.

1. __Virtual Environment__

This project uses oTree 3.x, so it works with Python 3.7 or 3.8. To contain and organize your Python installation, I recommend you use a [virtual environment](https://docs.python.org/3/library/venv.html). To do this, create a folder for your oTree installation and run the following commands in your terminal:

```bash
python3 -m venv etf_venv
source etf_venv/bin/activate
```

You'll know it worked if the text "(etf_venv)" appears at the beginning of your command line. Keep in mind that the virtual environment will deactivate when you close your terminal. This means that every time open a new terminal and want to run this project, you'll have to reactivate the virtual environment with the `source` command.

2. __Installing Dependencies__

```bash
pip install otree otree-redwood pyyaml
```

3. __Create a new oTree project__

```bash
otree startproject oTree
cd oTree
```

4. __Clone oTree Markets and this repo into oTree__

```bash
git clone https://github.com/Leeps-Lab/otree_markets.git
git clone https://github.com/Leeps-Lab/otree_etf_cda.git
```

5. __Update settings.py__

Open the `settings.py` file in your newly-created oTree project folder and make the following changes:

Add a new line to the bottom like the following
```python3
EXTENSION_APPS = ['otree_redwood', 'otree_markets']
```

Add an entry to `SESSION_CONFIGS` for the ETF project
```python3
SESSION_CONFIGS = [
    dict(
       name='otree_etf_cda',
       display_name='Market with ETF',
       num_demo_participants=2,
       app_sequence=['otree_etf_cda'],
       session_config='demo.txt',
    ),
]
```

6. __Run oTree__

Run the following command in your terminal to start oTree in development mode. If you're running this on a server, you'll want to set up a real database and use `runprodserver` instead. For instructions on doing this, check out the [oTree docs](https://otree.readthedocs.io/en/latest/server/intro.html).

```bash
otree devserver
```

## Configuration

This experiment is configured by the the configuration files contained in the [configs](./configs) folder. There are two types of config files: round configs and session configs.

A round config describes the configuration for a single round of the game and are stored in the [round_configs](./configs/round_configs) folder. They're written in YAML and have lots of different fields that control the paramaters of the game. The example round config [demo.yaml](./configs/round_configs/demo.yaml) lists all of these fields with comments describing their function.

Session configs describe the configuration of an entire session of the game and are stored in the [session_configs](./configs/session_configs) folder. These files are just text files which list a number of round config filenames. One round is run for each listed round config. These text files can optionally also contain comments on lines starting with "#"

To run a specific configuration file simply create a new ETF session, click the "Configure session" button and fill in the name of your desired session config in the "session_config_file" box.
