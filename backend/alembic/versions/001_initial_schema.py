"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2024-12-06 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create flying_locations table
    op.create_table('flying_locations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('submitted_by', sa.String(), nullable=True),
        sa.Column('approved', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_flying_locations_id'), 'flying_locations', ['id'], unique=False)
    op.create_index(op.f('ix_flying_locations_name'), 'flying_locations', ['name'], unique=False)
    
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('first_name', sa.String(), nullable=True),
        sa.Column('last_name', sa.String(), nullable=True),
        sa.Column('photo_url', sa.String(), nullable=True),
        sa.Column('home_location_id', sa.Integer(), nullable=True),
        sa.Column('role', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['home_location_id'], ['flying_locations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    
    # Add foreign key to flying_locations
    op.create_foreign_key('fk_flying_locations_submitted_by', 'flying_locations', 'users', ['submitted_by'], ['id'])
    
    # Create flight_sessions table
    op.create_table('flight_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('launch_count', sa.Integer(), nullable=True),
        sa.Column('thermal_count', sa.Integer(), nullable=True),
        sa.Column('total_thermal_gain', sa.Float(), nullable=True),
        sa.Column('total_thermal_duration', sa.Float(), nullable=True),
        sa.Column('thermal_launch_ratio', sa.Float(), nullable=True),
        sa.Column('altitude_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_flight_sessions_id'), 'flight_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_flight_sessions_user_id'), 'flight_sessions', ['user_id'], unique=False)
    
    # Create thermals table
    op.create_table('thermals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=True),
        sa.Column('thermal_number', sa.Integer(), nullable=True),
        sa.Column('start_time', sa.Float(), nullable=True),
        sa.Column('end_time', sa.Float(), nullable=True),
        sa.Column('start_altitude', sa.Float(), nullable=True),
        sa.Column('end_altitude', sa.Float(), nullable=True),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('altitude_gain', sa.Float(), nullable=True),
        sa.Column('avg_climb_rate', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['flight_sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_thermals_id'), 'thermals', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_thermals_id'), table_name='thermals')
    op.drop_table('thermals')
    op.drop_index(op.f('ix_flight_sessions_user_id'), table_name='flight_sessions')
    op.drop_index(op.f('ix_flight_sessions_id'), table_name='flight_sessions')
    op.drop_table('flight_sessions')
    op.drop_constraint('fk_flying_locations_submitted_by', 'flying_locations', type_='foreignkey')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_flying_locations_name'), table_name='flying_locations')
    op.drop_index(op.f('ix_flying_locations_id'), table_name='flying_locations')
    op.drop_table('flying_locations')
