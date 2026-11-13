"""recuperar contraseña: enlaces de un solo uso

Revision ID: e8b4f2a6d3c9
Revises: d7a3e9f1c6b2
Create Date: 2026-11-13 01:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e8b4f2a6d3c9'
down_revision: Union[str, Sequence[str], None] = 'd7a3e9f1c6b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'recuperaciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('creado', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('vence', sa.DateTime(timezone=True), nullable=False),
        sa.Column('usado_en', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ['usuario_id'], ['usuarios.id'], name=op.f('fk_recuperaciones_usuario_id_usuarios'), ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_recuperaciones')),
        sa.UniqueConstraint('token_hash', name=op.f('uq_recuperaciones_token_hash')),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('recuperaciones')
