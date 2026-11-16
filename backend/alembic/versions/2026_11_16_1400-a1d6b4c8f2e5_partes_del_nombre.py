"""nombre en partes: primer y segundo nombre, primer y segundo apellido

Revision ID: a1d6b4c8f2e5
Revises: f9c5a3b7e1d4
Create Date: 2026-11-16 14:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1d6b4c8f2e5'
down_revision: Union[str, Sequence[str], None] = 'f9c5a3b7e1d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PARTES = ('primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido')


def _partir(nombre: str) -> tuple[str | None, str | None, str | None, str | None]:
    """Lo mejor que se puede adivinar de un nombre completo; lo que falte lo completa cada uno en su perfil."""
    palabras = [palabra[:25] for palabra in nombre.split()]
    if len(palabras) >= 4:
        return palabras[0], palabras[1], palabras[2], ' '.join(palabras[3:])[:25]
    if len(palabras) == 3:
        return palabras[0], None, palabras[1], palabras[2]
    if len(palabras) == 2:
        return palabras[0], None, palabras[1], None
    return (palabras[0] if palabras else None), None, None, None


def upgrade() -> None:
    """Upgrade schema."""
    for parte in PARTES:
        op.add_column('usuarios', sa.Column(parte, sa.String(length=25), nullable=True))
    conexion = op.get_bind()
    filas = conexion.execute(sa.text('SELECT id, nombre FROM usuarios WHERE eliminado_en IS NULL')).all()
    for id_, nombre in filas:
        valores = dict(zip(PARTES, _partir(nombre or '')))
        conexion.execute(
            sa.text(
                'UPDATE usuarios SET primer_nombre = :primer_nombre, segundo_nombre = :segundo_nombre, '
                'primer_apellido = :primer_apellido, segundo_apellido = :segundo_apellido WHERE id = :id'
            ),
            {**valores, 'id': id_},
        )


def downgrade() -> None:
    """Downgrade schema. `nombre` siempre tuvo el nombre completo: no se pierde nada."""
    for parte in reversed(PARTES):
        op.drop_column('usuarios', parte)
