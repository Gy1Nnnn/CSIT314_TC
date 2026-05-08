"""Control layer: user account use-cases.

Per the BCE pattern: the controller forwards already-validated inputs from the
boundary to the entity, and returns the entity's response unchanged.
"""

from backend.entity.user_account import UserAccount


class UserAccountService:
    def __init__(self):
        self._user_account = UserAccount()

    def get_accounts(self, search):
        return self._user_account.list_accounts(search)

    def view(self, account_id):
        return self._user_account.view_account(account_id)

    def create(self, name, email, password, profile_id):
        return self._user_account.create_account(name, email, password, profile_id)

    def update(self, account_id, name, email, password, profile_id):
        return self._user_account.update_account(account_id, name, email, password, profile_id)

    def suspend(self, account_id, suspend):
        return self._user_account.suspend_account(account_id, suspend)
