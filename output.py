from otree_markets.exchange.base import OrderStatusEnum

def get_csv_output(session):
    # write header
    yield ['round_number', 'group_id', 'timestamp', 'price', 'asset', 'maker', 'taker', 'taking_order_status']

    for subsession in session.get_subsessions():
        config = subsession.config
        if subsession.round_number > config.num_rounds:
            continue
        for group in subsession.get_groups():
            start_time = group.get_start_time()
            for exchange in group.exchanges.prefetch_related('trades', 'orders').all():
                for trade in exchange.trades.all():
                    making_order = trade.making_orders.get()
                    yield [
                        group.round_number,
                        group.id_in_subsession,
                        (trade.timestamp-start_time).total_seconds(),
                        making_order.price / config.currency_scale,
                        exchange.asset_name,
                        making_order.pcode,
                        trade.taking_order.pcode,
                        OrderStatusEnum(trade.taking_order.status).name,
                    ]
