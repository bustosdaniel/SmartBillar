"""torneo cancelado: llegó su día sin suficientes jugadores

Revision ID: b2e7c5d9a3f6
Revises: a1d6b4c8f2e5
Create Date: 2026-11-16 15:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b2e7c5d9a3f6'
down_revision: Union[str, Sequence[str], None] = 'a1d6b4c8f2e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ANTES = sa.Enum('inscripciones', 'en-curso', 'finalizado', name='estado_torneo')
DESPUES = sa.Enum('inscripciones', 'en-curso', 'finalizado', 'cancelado', name='estado_torneo')


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('torneos', 'estado', existing_type=ANTES, type_=DESPUES, existing_nullable=False)


def downgrade() -> None:
    """Los cancelados vuelven a 'finalizado' (no se jugaron, pero ya no admiten inscripciones)."""
    op.execute("UPDATE torneos SET estado = 'finalizado' WHERE estado = 'cancelado'")
    op.alter_column('torneos', 'estado', existing_type=DESPUES, type_=ANTES, existing_nullable=False)
