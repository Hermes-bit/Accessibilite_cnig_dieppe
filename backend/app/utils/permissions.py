VALID_ROLES = [
    "admin",
    "agent_sig",
    "agent_voirie",
    "agent_collectivite",
    "prestataire",
    "association_pmr",
]

ROLE_PERMISSIONS = {
    "admin": {
        "backoffice",
        "gestion_comptes",
        "edition_donnees",
        "generation_carto",
        "consultation_carto",
        "mode_presentation",
        "controle_qualite",
    },
    "agent_sig": {
        "edition_donnees",
        "generation_carto",
        "consultation_carto",
        "mode_presentation",
        "controle_qualite",
    },
    "agent_voirie": {
        "edition_donnees",
        "consultation_carto",
        "mode_presentation",
        "controle_qualite",
    },
    "agent_collectivite": {
        "consultation_carto",
        "mode_presentation",
    },
    "prestataire": {
        "edition_donnees",
        "consultation_carto",
    },
    "association_pmr": {
        "consultation_carto",
        "mode_presentation",
    },
}


def has_permission(user_type: str, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(user_type, set())


def get_permissions(user_type: str) -> list:
    return list(ROLE_PERMISSIONS.get(user_type, set()))
