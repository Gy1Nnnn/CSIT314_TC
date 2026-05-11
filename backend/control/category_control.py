"""Control layer: category use-cases.

Per the BCE pattern: the controller forwards already-validated inputs from the
boundary to the entity, and returns the entity's response unchanged.
"""

from backend.entity.category import Category


class CategoryService:
    def __init__(self):
        self._category = Category()

    def get_categories(self, search):
        return self._category.list_categories(search)

    def get_categories_with_public_activities(self):
        return self._category.list_categories_with_public_activities()

    def create(self, category_name, description):
        return self._category.create_category(category_name, description)

    def update(self, category_id, category_name, description):
        return self._category.update_category(category_id, category_name, description)

    def suspend(self, category_id, suspend):
        return self._category.suspend_category(category_id, suspend)
