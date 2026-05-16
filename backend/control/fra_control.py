"""Control layer: fundraising activity (FRA) use-cases."""

from backend.entity.fra import FRA


class FRAControl:
    def __init__(self):
        self._fra = FRA()

    def get_activities(
        self,
        account_id,
        activity_id_or_activity_name,
        category_id=None,
        status_filter=None,
        date_from=None,
        date_to=None,
    ):
        return self._fra.list_activities(
            account_id,
            activity_id_or_activity_name,
            category_id,
            status_filter,
            date_from,
            date_to,
        )

    def list_completed_history(
        self, account_id, activity_id_or_activity_name, category_id, date_from, date_to
    ):
        return self._fra.list_completed_history(
            account_id, activity_id_or_activity_name, category_id, date_from, date_to
        )

    def list_public(self, search):
        return self._fra.list_public_activities(search)

    def view_public(self, activity_id):
        return self._fra.view_public_activity(activity_id)

    def view(self, activity_id, account_id):
        return self._fra.view_activity(activity_id, account_id)

    def create(
        self,
        account_id,
        activity_name,
        category_id,
        description,
        start_date,
        end_date,
        target_amount,
        status,
    ):
        return self._fra.create_activity(
            account_id,
            activity_name,
            category_id,
            description,
            start_date,
            end_date,
            target_amount,
            status,
        )

    def update(
        self,
        activity_id,
        account_id,
        activity_name,
        category_id,
        description,
        start_date,
        end_date,
        target_amount,
        status,
    ):
        return self._fra.update_activity(
            activity_id,
            account_id,
            activity_name,
            category_id,
            description,
            start_date,
            end_date,
            target_amount,
            status,
        )

    def delete(self, activity_id, account_id):
        return self._fra.delete_activity(activity_id, account_id)
