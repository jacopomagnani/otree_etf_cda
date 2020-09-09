
def get_csv_output(session):
    # write header
    yield ['round_number', 'group_id', 'timestamp', 'price', 'asset', 'maker', 'taker']

    for subsession in session.get_subsessions():
        for group in subsession.get_groups():
            currency_scale = group.config.currency_scale
            for exchange in group.exchanges.prefetch_related('trades', 'orders').all():
                for trade in exchange.trades.all():
                    making_order = trade.making_orders.get()
                    yield [
                        group.round_number,
                        group.id_in_subsession,
                        trade.timestamp,
                        making_order.price / currency_scale,
                        exchange.asset_name,
                        making_order.pcode,
                        trade.taking_order.pcode,
                    ]
