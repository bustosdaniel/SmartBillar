"""administrar mesas: mesas retiradas y nombre único solo entre activas
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c4f2d8e1b5a7'
down_revision: Union[str, Sequence[str], None] = 'b3e1c7d9a2f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('mesas', sa.Column('retirada_en', sa.DateTime(timezone=True), nullable=True))
    # Una mesa retirada conserva su nombre en el historial; una nueva puede volver a usarlo.
    op.drop_constraint(op.f('uq_mesas_nombre'), 'mesas', type_='unique')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_unique_constraint(op.f('uq_mesas_nombre'), 'mesas', ['nombre'])
    op.drop_column('mesas', 'retirada_en')
