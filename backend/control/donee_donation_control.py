"""Control layer: donee donation use-cases."""

from backend.entity.donee_donation import DoneeDonation


class DoneeDonationService:
    def __init__(self):
        self._donations = DoneeDonation()

    def list_donations(self, account_id, category_id, date_from, date_to, search):
        return self._donations.list_donations(
            account_id, category_id, date_from, date_to, search
        )

    def create_donation(self, account_id, activity_id, amount, donated_at):
        return self._donations.create_donation(
            account_id, activity_id, amount, donated_at
        )
