"""Control layer: authentication use-cases.

Per the BCE pattern: the controller forwards already-validated inputs from the
boundary to the entity, and returns the entity's response unchanged.
"""

from backend.entity.user_account import UserAccount
from backend.entity.user_profile import UserProfile


class AuthService:
    def __init__(self):
        self._user_account = UserAccount()
        self._user_profile = UserProfile()

    def get_profiles_for_login(self):
        return self._user_profile.list_profiles_for_login()

    def login(self, profile_id, email, password):
        return self._user_account.login(profile_id, email, password)
