"""quién hizo cada operación de caja (#68): cajas, pagos, egresos y movimientos

Revision ID: e5b1f8a3d6c9
Revises: d4a9e7f2c5b8
Create Date: 2026-11-16 18:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e5b1f8a3d6c9'
down_revision: Union[str, Sequence[str], None] = 'd4a9e7f2c5b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (tabla, columna): todas apuntan a usuarios y quedan en NULL si se borra el empleado.
COLUMNAS = [
    ('cajas', 'registrado_por_id'),
    ('cajas', 'cerrada_por_id'),
    ('pagos', 'registrado_por_id'),
    ('pagos', 'anulado_por_id'),
    ('egresos', 'registrado_por_id'),
    ('movimientos', 'registrado_por_id'),
]


def upgrade() -> None:
    """Los registros de antes quedan sin responsable (no se sabe quién los hizo)."""
    for tabla, columna in COLUMNAS:
        op.add_column(tabla, sa.Column(columna, sa.Integer(), nullable=True))
        op.create_foreign_key(
            op.f(f'fk_{tabla}_{columna}_usuarios'), tabla, 'usuarios', [columna], ['id'], ondelete='SET NULL'
        )


def downgrade() -> None:
    """Downgrade schema."""
    for tabla, columna in reversed(COLUMNAS):
        op.drop_constraint(op.f(f'fk_{tabla}_{columna}_usuarios'), tabla, type_='foreignkey')
        op.drop_column(tabla, columna)
