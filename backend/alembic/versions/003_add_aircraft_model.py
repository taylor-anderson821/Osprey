"""Add aircraft model to flight sessions

Revision ID: 003
Revises: 002
Create Date: 2025-12-13 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add aircraft_model column to flight_sessions
    op.add_column('flight_sessions', sa.Column('aircraft_model', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('flight_sessions', 'aircraft_model')