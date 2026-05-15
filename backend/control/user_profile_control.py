"""Control layer: user profile use-cases."""

from backend.entity.user_profile import UserProfile


class UserProfileService:
    def __init__(self):
        self._user_profile = UserProfile()

    def search_profiles(self, search):
        return self._user_profile.list_profiles(search)

    def view(self, profile_id):
        return self._user_profile.view_profile(profile_id)

    def create(self, profile_name, description, access_control):
        return self._user_profile.create_profile(profile_name, description, access_control)

    def update(self, profile_id, profile_name, description, access_control):
        return self._user_profile.update_profile(profile_id, profile_name, description, access_control)

    def suspend(self, profile_id, suspend):
        return self._user_profile.suspend_profile(profile_id, suspend)