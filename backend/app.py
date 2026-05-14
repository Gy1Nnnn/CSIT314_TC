from flask import Flask
from flask_cors import CORS

if __package__ in (None, ""):
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.entity.db import init_db
from backend.boundary.auth_boundary import auth_bp
from backend.boundary.user_profile_boundary import user_profile_bp
from backend.boundary.user_account_boundary import user_account_bp
from backend.boundary.fra_boundary import fra_bp
from backend.boundary.category_boundary import category_bp
from backend.boundary.donee_favorite_boundary import donee_favorite_bp
from backend.boundary.donee_donation_boundary import donee_donation_bp
from backend.boundary.report_boundary import report_bp


def create_app():
    init_db()
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_profile_bp)
    app.register_blueprint(user_account_bp)
    app.register_blueprint(fra_bp)
    app.register_blueprint(category_bp)
    app.register_blueprint(donee_favorite_bp)
    app.register_blueprint(donee_donation_bp)
    app.register_blueprint(report_bp)
    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
