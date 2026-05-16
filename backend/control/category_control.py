"""Control layer: category use-cases."""

from backend.entity.category import Category


class CategoryControl:
    def __init__(self):
        self._category = Category()

    def get_categories(self, search):
        return self._category.get_categories(search)

    def get_categories_with_public_activities(self):
        return self._category.get_categories_with_public_activities()

    def create(self, category_name, description):
        return self._category.create(category_name, description)

    def update(self, category_id, category_name, description):
        return self._category.update(category_id, category_name, description)

    def suspend(self, category_id, suspend):
        return self._category.suspend(category_id, suspend)

    def delete(self, category_id):
        return self._category.delete(category_id)
