"""Control layer: user profile use-cases.

Per the BCE pattern: the controller forwards already-validated inputs from the
boundary to the entity, and returns the entity's response unchanged.
"""

from backend.entity.user_profile import UserProfile


class UserProfileService:
    def __init__(self):
        self._user_profile = UserProfile()

    def get_profiles(self, search):
        return self._user_profile.list_profiles(search)

    def create(self, profile_name, description, access_control):
        return self._user_profile.create_profile(profile_name, description, access_control)

    def update(self, profile_id, profile_name, description, access_control):
        return self._user_profile.update_profile(profile_id, profile_name, description, access_control)

    def suspend(self, profile_id, suspend):
        return self._user_profile.suspend_profile(profile_id, suspend)
