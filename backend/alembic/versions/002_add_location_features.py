"""Add location features

Revision ID: 002
Revises: 001
Create Date: 2024-12-07 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add country column to flying_locations
    op.add_column('flying_locations', sa.Column('country', sa.String(), nullable=True))
    
    # Add location_id to flight_sessions
    op.add_column('flight_sessions', sa.Column('location_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_flight_sessions_location', 'flight_sessions', 'flying_locations', ['location_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_flight_sessions_location', 'flight_sessions', type_='foreignkey')
    op.drop_column('flight_sessions', 'location_id')
    op.drop_column('flying_locations', 'country')
