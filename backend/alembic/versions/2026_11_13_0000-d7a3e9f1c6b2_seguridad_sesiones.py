"""seguridad de sesiones: intentos de login y versión de sesión

Revision ID: d7a3e9f1c6b2
Revises: c4f2d8e1b5a7
Create Date: 2026-11-13 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd7a3e9f1c6b2'
down_revision: Union[str, Sequence[str], None] = 'c4f2d8e1b5a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('usuarios', sa.Column('intentos_fallidos', sa.Integer(), server_default='0', nullable=False))
    op.add_column('usuarios', sa.Column('bloqueado_hasta', sa.DateTime(timezone=True), nullable=True))
    op.add_column('usuarios', sa.Column('version_sesion', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usuarios', 'version_sesion')
    op.drop_column('usuarios', 'bloqueado_hasta')
    op.drop_column('usuarios', 'intentos_fallidos')
