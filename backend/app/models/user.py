from datetime import datetime, timezone

from werkzeug.security import generate_password_hash, check_password_hash

from app import db


class AppUser(db.Model):
    __tablename__ = "app_users"
    __table_args__ = {"schema": "public"}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    user_type = db.Column(db.String(50), nullable=False, default="viewer")
    display_name = db.Column(db.String(100), nullable=True)
    first_login = db.Column(db.Boolean, nullable=False, default=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text("now()"),
    )
    last_login = db.Column(db.DateTime, nullable=True)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "user_type": self.user_type,
            "display_name": self.display_name,
            "first_login": self.first_login,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }
