"""Add weather columns to flight_sessions

Revision ID: 004
Revises: 003
Create Date: 2026-04-08
"""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('flight_sessions', sa.Column('weather_temperature_f', sa.Float(), nullable=True))
    op.add_column('flight_sessions', sa.Column('weather_wind_speed_mph', sa.Float(), nullable=True))
    op.add_column('flight_sessions', sa.Column('weather_wind_direction', sa.String(), nullable=True))
    op.add_column('flight_sessions', sa.Column('weather_conditions', sa.String(), nullable=True))

def downgrade():
    op.drop_column('flight_sessions', 'weather_conditions')
    op.drop_column('flight_sessions', 'weather_wind_direction')
    op.drop_column('flight_sessions', 'weather_wind_speed_mph')
    op.drop_column('flight_sessions', 'weather_temperature_f')
