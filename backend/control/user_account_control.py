"""Control layer: user account use-cases."""

from backend.entity.user_account import UserAccount


class UserAccountControl:
    def __init__(self):
        self._user_account = UserAccount()

    def get_accounts(self, account_id_or_email):
        return self._user_account.get_accounts(account_id_or_email)

    def view(self, account_id):
        return self._user_account.view(account_id)

    def create(self, name, email, password, profile_id):
        return self._user_account.create(name, email, password, profile_id)

    def update(self, account_id, name, email, password, profile_id):
        return self._user_account.update(account_id, name, email, password, profile_id)

    def suspend(self, account_id, suspend):
        return self._user_account.suspend(account_id, suspend)
