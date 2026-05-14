from datetime import datetime, timezone

from app import db


class Feedback(db.Model):
    __tablename__ = "feedback"
    __table_args__ = {"schema": "public"}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    reporter = db.Column(db.String(255), nullable=True)
    severity = db.Column(db.String(20), nullable=False, default="mineur")
    feature_area = db.Column(db.String(50), nullable=True)
    description = db.Column(db.Text, nullable=False)
    browser = db.Column(db.String(300), nullable=True)
    screen_size = db.Column(db.String(30), nullable=True)
    os_info = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="nouveau")
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "reporter": self.reporter,
            "severity": self.severity,
            "feature_area": self.feature_area,
            "description": self.description,
            "browser": self.browser,
            "screen_size": self.screen_size,
            "os_info": self.os_info,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
