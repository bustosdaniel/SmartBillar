"""egresos con método: solo los de efectivo salen del cajón

Revision ID: c3f8d6e1b4a7
Revises: b2e7c5d9a3f6
Create Date: 2026-11-16 16:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c3f8d6e1b4a7'
down_revision: Union[str, Sequence[str], None] = 'b2e7c5d9a3f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Los egresos que ya existen se registraron como efectivo del cajón."""
    op.add_column(
        'egresos',
        sa.Column(
            'metodo',
            sa.Enum('efectivo', 'transferencia', 'tarjeta', name='metodo_pago'),
            nullable=False,
            server_default='efectivo',
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('egresos', 'metodo')
