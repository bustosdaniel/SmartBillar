"""pagos por transferencia con la referencia del comprobante

Revision ID: d4a9e7f2c5b8
Revises: c3f8d6e1b4a7
Create Date: 2026-11-16 17:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd4a9e7f2c5b8'
down_revision: Union[str, Sequence[str], None] = 'c3f8d6e1b4a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Los pagos anteriores quedan sin referencia."""
    op.add_column('pagos', sa.Column('referencia', sa.String(length=40), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('pagos', 'referencia')
