"""Control layer: user profile use-cases."""

from backend.entity.user_profile import UserProfile


class UserProfileControl:
    def __init__(self):
        self._user_profile = UserProfile()

    def search_profiles(self, profile_id_or_profile_name):
        return self._user_profile.search_profiles(profile_id_or_profile_name)

    def view(self, profile_id):
        return self._user_profile.view(profile_id)

    def create(self, profile_name, description, access_control):
        return self._user_profile.create(profile_name, description, access_control)

    def update(self, profile_id, profile_name, description, access_control):
        return self._user_profile.update(profile_id, profile_name, description, access_control)

    def suspend(self, profile_id, suspend):
        return self._user_profile.suspend(profile_id, suspend)