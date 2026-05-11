"""Control layer: donee favorite use-cases."""

from backend.entity.donee_favorite import DoneeFavorite


class DoneeFavoriteService:
    def __init__(self):
        self._favorites = DoneeFavorite()

    def list_favorites(self, account_id, search):
        return self._favorites.list_favorites(account_id, search)

    def add_favorite(self, account_id, activity_id):
        return self._favorites.add_favorite(account_id, activity_id)

    def remove_favorite(self, account_id, activity_id):
        return self._favorites.remove_favorite(account_id, activity_id)
