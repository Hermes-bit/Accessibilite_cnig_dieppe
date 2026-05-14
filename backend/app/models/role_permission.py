from app import db


class RolePermission(db.Model):
    __tablename__ = "role_permissions"
    __table_args__ = {"schema": "public"}

    role = db.Column(db.String(50), primary_key=True)
    permissions = db.Column(db.JSON, nullable=False, default=list)

    @classmethod
    def get(cls, role: str) -> list:
        try:
            rp = cls.query.get(role)
            if rp is not None:
                return list(rp.permissions or [])
        except Exception:
            pass
        from app.utils.permissions import ROLE_PERMISSIONS

        return list(ROLE_PERMISSIONS.get(role, set()))

    @classmethod
    def has(cls, role: str, permission: str) -> bool:
        return permission in cls.get(role)

    @classmethod
    def seed_defaults(cls):
        from app.utils.permissions import ROLE_PERMISSIONS, VALID_ROLES

        changed = False
        for role in VALID_ROLES:
            if not cls.query.get(role):
                rp = cls(role=role, permissions=list(ROLE_PERMISSIONS.get(role, set())))
                db.session.add(rp)
                changed = True
        if changed:
            db.session.commit()
