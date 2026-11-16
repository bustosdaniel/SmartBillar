"""celular en formato internacional: "3001234567" pasa a "+573001234567"

Revision ID: f9c5a3b7e1d4
Revises: e8b4f2a6d3c9
Create Date: 2026-11-16 13:00:00

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f9c5a3b7e1d4'
down_revision: Union[str, Sequence[str], None] = 'e8b4f2a6d3c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Hasta ahora solo se aceptaban celulares colombianos y se guardaban sin indicativo."""
    op.execute("UPDATE usuarios SET telefono = CONCAT('+57', telefono) WHERE telefono IS NOT NULL AND telefono NOT LIKE '+%'")


def downgrade() -> None:
    """Solo los colombianos vuelven al formato anterior; los de otros países se quedan como están."""
    op.execute("UPDATE usuarios SET telefono = SUBSTRING(telefono, 4) WHERE telefono LIKE '+573%' AND CHAR_LENGTH(telefono) = 13")
