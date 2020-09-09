from django.contrib.contenttypes.models import ContentType
from otree_markets.exchange.base import Trade, OrderStatusEnum

def get_csv_output(session):
    # write header
    yield ['round_number', 'group_id', 'timestamp', 'price', 'asset', 'maker', 'taker', 'making_order_status', 'taking_order_status']

    for subsession in session.get_subsessions():
        config = subsession.config
        if subsession.round_number > config.num_rounds:
            continue
        for group in subsession.get_groups():
            start_time = group.get_start_time()

            # can't just iterate through group.exchanges since we want the result to be ordered by timestamp.
            # instead we filter all trades to just those associated with one of this group's exchanges.
            # this gives a queryset of all the trades associated with this group which is automatically
            # ordered by timestamp (from Trade's Meta.ordering)
            exchange_ids = group.exchanges.values('id')
            trades = Trade.objects.filter(
                content_type=ContentType.objects.get_for_model(group.exchange_class),
                object_id__in=exchange_ids,
            ).prefetch_related('exchange', 'making_orders', 'taking_order')

            for trade in trades:
                making_order = trade.making_orders.get()
                # write one row for every trade
                yield [
                    group.round_number,
                    group.id_in_subsession,
                    (trade.timestamp-start_time).total_seconds(),
                    making_order.price / config.currency_scale,
                    trade.exchange.asset_name,
                    making_order.pcode,
                    trade.taking_order.pcode,
                    OrderStatusEnum(making_order.status).name,
                    OrderStatusEnum(trade.taking_order.status).name,
                ]
